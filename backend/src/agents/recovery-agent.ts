/**
 * Sankofa Agentic Recovery Loop.
 *
 * After scoring a theft event, this agent decides what to do next — freeze
 * wallet, locate device, alert owner, escalate to trusted contact, blacklist —
 * without a fixed if/else script. Claude reasons about the signals and calls
 * tools in whatever order makes sense, up to maxSteps.
 *
 * Run without await from theft.controller.ts so the HTTP response returns
 * immediately. The agent runs in background inside the persistent Express
 * process, same as the location tracker it replaces.
 *
 * AI SDK v6 API note: tools use `inputSchema` (not `parameters`), and
 * generateText uses `stopWhen: stepCountIs(N)` (not `maxSteps`).
 */
import { generateText, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { getLocation, checkReachability } from '../services/camara.js';
import { freezeWallet as actionFreezeWallet, blacklistDevice as actionBlacklist } from '../services/recovery-actions.js';
import { sendAgentEmail } from '../services/email.js';

const MODEL = 'anthropic/claude-sonnet-4.6';
const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL || 'http://localhost:3000';

export interface RecoveryAgentContext {
  eventId: string;
  userId: string;
  deviceId: string;
  phoneNumber: string;
  imei: string;
  homeLat: number;
  homeLng: number;
  detectedAt: Date;
  score: number;
  tier: string;
  reasoning: string;
  signals: Record<string, unknown>;
  resolveToken?: string;
  demoEmail?: string;
}

const SYSTEM = `You are Sankofa's theft response agent operating in Sub-Saharan Africa.

HARD CONSTRAINTS — not preferences, facts about the environment:
- You have NO map API. Never generate a Google Maps or any map URL. Use describeLocation to translate coordinates into plain language.
- There is no programmatic Nigerian address database. Never resolve coordinates to a street address.
- There is no police API. Do not promise or mention police integration.
- Nokia CAMARA location uses cell-tower triangulation: accuracy is 300m–2km in Lagos. Use it for directional reasoning, not precision.

OPERATING PRINCIPLE:
African theft response works through human networks — the victim's trusted contact is your primary escalation path. Every message you send reaches a person who can act. Be direct and calm; the victim is already distressed.

DECISION RULES:
- HIGH tier: freeze wallet immediately, locate device, describe location in plain language, alert owner with resolve link, alert trusted contact with urgency HIGH. If device goes offline (NOT_CONNECTED), blacklist IMEI.
- MEDIUM tier: alert owner and trusted contact (NORMAL urgency), monitor reachability. Escalate to HIGH behaviour if device goes offline.
- LOW tier: check owner resolved, then stop. Do not freeze, alert, or blacklist.

TERMINATION: stop calling tools when (a) checkOwnerResolved returns true, (b) device is blacklisted and trusted contact notified, or (c) you have taken all reasonable actions.`;

async function log(deviceId: string, kind: string, message: string): Promise<void> {
  await prisma.activityLog.create({ data: { deviceId, kind, message } }).catch(() => {});
}

export async function runRecoveryAgent(ctx: RecoveryAgentContext): Promise<void> {
  await log(ctx.deviceId, 'AGENT_STARTED', `Recovery agent started — score ${ctx.score.toFixed(2)}, tier ${ctx.tier}.`);

  const user = await prisma.user.findUnique({ where: { id: ctx.userId } }).catch(() => null);
  if (!user) {
    await log(ctx.deviceId, 'AGENT_ERROR', 'Recovery agent: user not found, aborting.');
    return;
  }

  const ownerEmail = ctx.demoEmail ?? user.email;
  const ownerName = user.name;
  const trustedEmail = ctx.demoEmail ? null : user.trustedContactEmail;
  const trustedName = ctx.demoEmail ? null : user.trustedContactName;
  const resolveUrl = `${PUBLIC_APP_URL}/api/theft/${ctx.eventId}/resolve`;
  const trustedConfirmUrl = ctx.resolveToken
    ? `${PUBLIC_APP_URL}/api/theft/${ctx.eventId}/trusted-confirm?token=${ctx.resolveToken}`
    : null;

  const tools = {
    checkDeviceReachability: tool({
      description:
        'Check whether the stolen device SIM is currently active on the Nokia NaC carrier network. Returns CONNECTED, NOT_CONNECTED, or UNKNOWN. Call this to know whether the thief still has the SIM in the phone.',
      inputSchema: z.object({ phoneNumber: z.string() }),
      execute: async ({ phoneNumber }) => {
        try {
          const r = await checkReachability(phoneNumber);
          const status = r.reachable ? 'CONNECTED' : 'NOT_CONNECTED';
          await log(ctx.deviceId, 'AGENT_TOOL', `Nokia NaC reachability: device is ${status}.`);
          return { reachable: r.reachable, status };
        } catch {
          await log(ctx.deviceId, 'AGENT_TOOL', 'Nokia NaC reachability: UNKNOWN (NaC unavailable).');
          return { reachable: null, status: 'UNKNOWN' };
        }
      },
    }),

    getDeviceLocation: tool({
      description:
        'Get the current cell-tower location of the stolen device via Nokia NaC CAMARA Location Retrieval. Returns lat, lng, and accuracy in metres (typically 300–2000m in Nigerian cities). Always call describeLocation after this before including location in any message.',
      inputSchema: z.object({ phoneNumber: z.string() }),
      execute: async ({ phoneNumber }) => {
        try {
          const loc = await getLocation(phoneNumber);
          await prisma.device
            .update({
              where: { id: ctx.deviceId },
              data: { lastSeenLat: loc.latitude, lastSeenLng: loc.longitude, lastSeenAt: new Date() },
            })
            .catch(() => {});
          await log(
            ctx.deviceId,
            'LOCATION_PING',
            `Agent location: ${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)} (±${Math.round(loc.accuracyMeters)}m).`,
          );
          return { lat: loc.latitude, lng: loc.longitude, accuracyMetres: loc.accuracyMeters };
        } catch {
          await log(ctx.deviceId, 'AGENT_TOOL', 'getDeviceLocation: NaC location unavailable.');
          return null;
        }
      },
    }),

    describeLocation: tool({
      description:
        'Given latitude/longitude in Nigeria, produce a plain-language description of the approximate area that a non-technical person can act on — using recognisable landmarks, markets, or area names. Never generates coordinates or map links. Always call this before putting location information in any message.',
      inputSchema: z.object({ lat: z.number(), lng: z.number(), accuracyMetres: z.number() }),
      execute: async ({ lat, lng, accuracyMetres }) => {
        try {
          const { text } = await generateText({
            model: MODEL,
            system:
              'You describe Nigerian locations in plain language for non-technical people. Be honest about uncertainty when accuracy is poor.',
            prompt: `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}. Accuracy: ±${Math.round(accuracyMetres)}m. Describe the approximate area in 1–2 sentences using Lagos landmarks, markets, or neighbourhood names a local resident would recognise. No coordinates, no technical terms, no map links.`,
            maxOutputTokens: 150,
          });
          const description = text.trim();
          await log(ctx.deviceId, 'AGENT_TOOL', `Location described: "${description.slice(0, 120)}"`);
          return { description };
        } catch {
          const fallback = `Approximately ${lat.toFixed(3)}, ${lng.toFixed(3)} (accuracy ±${Math.round(accuracyMetres)}m).`;
          await log(ctx.deviceId, 'AGENT_TOOL', 'describeLocation: LLM unavailable, using coordinate fallback.');
          return { description: fallback };
        }
      },
    }),

    freezeWallet: tool({
      description:
        "Freeze the victim's mobile money wallet to prevent the thief from spending their money. Call immediately for HIGH tier. For MEDIUM tier, only freeze if the device goes NOT_CONNECTED and location confirms it is far from home.",
      inputSchema: z.object({
        userId: z.string(),
        reason: z.string(),
      }),
      execute: async ({ userId, reason }) => actionFreezeWallet(userId, ctx.deviceId, reason),
    }),

    sendOwnerAlert: tool({
      description:
        "Send an email to the device owner. The owner does not have their phone — they will read this from a borrowed device. Use this to inform them what happened, what actions have been taken, and how to undo the alert if it was a false alarm.",
      inputSchema: z.object({
        subject: z.string(),
        messageBody: z.string().describe('Your message to the owner. Plain text or simple HTML.'),
        includeResolveLink: z.boolean().describe('Set true to add the "This was me — undo" button.'),
      }),
      execute: async ({ subject, messageBody, includeResolveLink }) => {
        const body = includeResolveLink
          ? `<p style="font-size:16px;line-height:1.65;color:#525252;">${messageBody}</p><br><a href="${resolveUrl}" style="display:inline-block;background:#0a0a0a;color:#fafaf9;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:500;font-size:14px;">This was me — undo</a>`
          : `<p style="font-size:16px;line-height:1.65;color:#525252;">${messageBody}</p>`;
        const sent = await sendAgentEmail(ownerEmail, subject, body);
        await log(ctx.deviceId, 'EMAIL_ALERT', `Agent emailed owner (${ownerEmail}): "${subject}"`);
        return { sent, to: ownerEmail };
      },
    }),

    sendTrustedContactAlert: tool({
      description:
        "Send an alert to the victim's pre-registered trusted contact — a family member or close friend who can physically help or coordinate a community response. Messages should be plain, urgent, and actionable. Include the plain-language location description if you have one. For HIGH/CRITICAL urgency, set includeConfirmLink=true to add the confirm-false-alarm button (only the trusted contact can undo HIGH-tier protection). Returns { sent: false } if no trusted contact is registered.",
      inputSchema: z.object({
        message: z.string().describe('Your message to the trusted contact. Plain, direct, actionable.'),
        urgencyLevel: z.enum(['NORMAL', 'HIGH', 'CRITICAL']),
        includeConfirmLink: z.boolean().describe('Set true for HIGH events to let the trusted contact undo all protections if it was a false alarm.'),
      }),
      execute: async ({ message, urgencyLevel, includeConfirmLink }) => {
        if (!trustedEmail) {
          return { sent: false as const, reason: 'no trusted contact registered' };
        }
        const subject =
          urgencyLevel === 'CRITICAL'
            ? `URGENT: ${ownerName}'s phone may have been stolen`
            : urgencyLevel === 'HIGH'
              ? `${ownerName}'s phone — urgent Sankofa alert`
              : `${ownerName}'s phone — Sankofa alert`;
        const confirmHtml =
          includeConfirmLink && trustedConfirmUrl
            ? `<p style="font-size:15px;line-height:1.65;color:#525252;margin-top:24px;">If ${ownerName} contacts you and confirms this was a false alarm, click below to undo all protections. Only you can do this — the thief cannot reach your inbox.</p><a href="${trustedConfirmUrl}" style="display:inline-block;background:#ffffff;color:#0a0a0a;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:500;font-size:14px;border:1px solid #e7e5e4;">Confirm false alarm — undo all →</a>`
            : '';
        const sent = await sendAgentEmail(
          trustedEmail,
          subject,
          `<p style="font-size:16px;line-height:1.65;color:#525252;">${message}</p>${confirmHtml}<p style="font-size:13px;color:#737373;margin-top:20px;">You are listed as ${ownerName}'s trusted contact on Sankofa.</p>`,
        );
        const preview = message.slice(0, 80) + (message.length > 80 ? '…' : '');
        await log(ctx.deviceId, 'EMAIL_ALERT', `Agent emailed trusted contact ${trustedName ?? ''} [${urgencyLevel}]: "${preview}"`);
        return { sent, to: trustedEmail };
      },
    }),

    blacklistDevice: tool({
      description:
        "Blacklist the stolen device IMEI in Sankofa's registry. Do this when the device has gone NOT_CONNECTED (SIM removed) and recovery is unlikely, or when the owner has not resolved the event and significant time has elapsed. A blacklisted device is flagged as STOLEN by any vendor using the Sankofa device check.",
      inputSchema: z.object({
        deviceId: z.string(),
        reason: z.string(),
      }),
      execute: async ({ deviceId, reason }) => actionBlacklist(deviceId, ctx.imei, reason),
    }),

    checkOwnerResolved: tool({
      description:
        'Check whether the device owner has clicked the resolve link in their email, confirming the alert was a false alarm. If resolved is true, stop all further actions immediately.',
      inputSchema: z.object({ eventId: z.string() }),
      execute: async ({ eventId }) => {
        const event = await prisma.theftEvent.findUnique({ where: { id: eventId } }).catch(() => null);
        return { resolved: event?.resolved ?? false };
      },
    }),
  };

  const trustedLine = trustedName
    ? `Trusted contact: ${trustedName} <${trustedEmail}>`
    : 'Trusted contact: none registered';

  const prompt = [
    'A theft event has been detected. Take appropriate recovery actions.',
    '',
    `Event ID: ${ctx.eventId}`,
    `User ID: ${ctx.userId}`,
    `Device ID: ${ctx.deviceId}`,
    `Phone: ${ctx.phoneNumber}`,
    `IMEI: ${ctx.imei}`,
    `Owner: ${ownerName} (email: ${ownerEmail})`,
    trustedLine,
    `Home coordinates: ${ctx.homeLat.toFixed(4)}, ${ctx.homeLng.toFixed(4)}`,
    `Detected at: ${ctx.detectedAt.toISOString()}`,
    `AI theft score: ${ctx.score.toFixed(2)} (tier: ${ctx.tier})`,
    `AI reasoning: ${ctx.reasoning}`,
    `Initial CAMARA signals: ${JSON.stringify(ctx.signals, null, 2)}`,
    '',
    'Begin.',
  ].join('\n');

  try {
    await generateText({
      model: MODEL,
      system: SYSTEM,
      prompt,
      tools,
      stopWhen: stepCountIs(12),
    });
    await log(ctx.deviceId, 'AGENT_DONE', 'Recovery agent completed.');
  } catch (e) {
    await log(ctx.deviceId, 'AGENT_ERROR', `Recovery agent error: ${String(e).slice(0, 200)}`);
    throw e;
  }
}
