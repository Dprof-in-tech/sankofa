import { randomBytes } from 'crypto';
import type { Request, Response } from 'express';
import { TriggerType } from '../generated/prisma/index.js';
import { prisma } from '../lib/prisma.js';
import { scoreTheft, type Tier } from '../services/ai.js';
import { subscribeToDeviceOffline } from '../services/camara.js';
import { sendTheftAlerts } from '../services/email.js';
import { startTracking } from '../services/location-tracker.js';
import { collectSignals } from '../services/signals.js';
import { freezeWallet, blacklistDevice } from '../services/recovery-actions.js';
import {
  ownerResolutionMethod,
  validatePin,
  validateTrustedToken,
  applyResolution,
} from '../services/resolve-protocol.js';
import { runRecoveryAgent } from '../agents/recovery-agent.js';

export async function triggerTheft(req: Request, res: Response) {
  const body = (req.body ?? {}) as { imei?: string; trigger?: TriggerType; demoEmail?: string };
  const { imei, trigger, demoEmail: rawDemoEmail } = body;
  const demoEmail = rawDemoEmail?.trim() || undefined;
  if (!imei || !trigger) return res.status(400).json({ error: 'imei and trigger required' });

  const device = await prisma.device.findUnique({
    where: { imei },
    include: { user: true },
  });
  if (!device) return res.status(404).json({ error: 'device not found' });

  const { scoreInput, location, locationAvailable } = await collectSignals(device, trigger);
  const score = await scoreTheft(scoreInput);

  const event = await prisma.theftEvent.create({
    data: {
      deviceId: device.id,
      userId: device.userId,
      trigger,
      aiScore: score.score,
      tier: score.tier,
      reasoning: score.reasoning,
    },
  });

  await prisma.activityLog.create({
    data: {
      deviceId: device.id,
      kind: 'THEFT_TRIGGER',
      message: `Trigger: ${trigger} · Score: ${score.score.toFixed(2)} · Tier: ${score.tier}`,
      meta: {
        reasoning: score.reasoning,
        location: locationAvailable ? { ...location } : null,
        reachable: scoreInput.signals.reachable ?? null,
      },
    },
  });

  // HIGH-tier events require a resolve token — only the trusted contact's email
  // carries it, so the thief cannot self-resolve even with the unlocked phone.
  let resolveToken: string | undefined;
  if (score.tier === 'HIGH') {
    resolveToken = randomBytes(32).toString('hex');
  }

  const phone = device.user.phoneE164;
  let camaraSubscriptionId: string | undefined;
  if (score.tier !== 'LOW' && process.env.PUBLIC_BACKEND_URL && process.env.CAMARA_WEBHOOK_TOKEN) {
    camaraSubscriptionId = await subscribeToDeviceOffline(
      phone,
      `${process.env.PUBLIC_BACKEND_URL}/hooks/device-offline`,
      process.env.CAMARA_WEBHOOK_TOKEN,
    ).catch((e) => { console.error('[camara] device offline subscribe failed', e); return undefined; });
    if (camaraSubscriptionId) {
      await prisma.activityLog.create({
        data: {
          deviceId: device.id,
          kind: 'CAMARA_SUBSCRIBED',
          message: 'CAMARA device-offline subscription active — will alert when phone drops off network.',
        },
      });
    }
  }

  if (resolveToken || camaraSubscriptionId) {
    await prisma.theftEvent.update({
      where: { id: event.id },
      data: {
        ...(resolveToken ? { resolveToken } : {}),
        ...(camaraSubscriptionId ? { camaraSubscriptionId } : {}),
      },
    });
  }

  // Recovery agent handles all post-scoring actions by reasoning about the
  // signals. Fired without await so the HTTP response returns immediately.
  if (process.env.AI_GATEWAY_API_KEY && process.env.AI_MOCK !== '1') {
    runRecoveryAgent({
      eventId: event.id,
      userId: device.userId,
      deviceId: device.id,
      phoneNumber: phone,
      imei: device.imei,
      homeLat: device.user.homeCenterLat,
      homeLng: device.user.homeCenterLng,
      detectedAt: event.createdAt,
      score: score.score,
      tier: score.tier,
      reasoning: score.reasoning,
      signals: scoreInput.signals as Record<string, unknown>,
      ...(resolveToken ? { resolveToken } : {}),
      ...(demoEmail ? { demoEmail } : {}),
    }).catch((err) => console.error('[agent] recovery agent failed:', err));
  } else {
    // Fallback when no Claude API key — fixed rule-based response.
    if (score.tier === 'HIGH') {
      await blacklistDevice(device.id, device.imei, 'HIGH-tier event, no agent.');
      await freezeWallet(device.userId, device.id, 'HIGH-tier event, no agent.');
    }
    if (score.tier !== 'LOW') {
      const alertEmail = demoEmail ?? device.user.email;
      const emailResult = await sendTheftAlerts({
        ownerName: device.user.name,
        ownerEmail: alertEmail,
        trustedContactName: demoEmail ? null : device.user.trustedContactName,
        trustedContactEmail: demoEmail ? null : device.user.trustedContactEmail,
        tier: score.tier,
        reasoning: score.reasoning,
        trigger,
        location: { latitude: location.latitude, longitude: location.longitude },
        occurredAt: event.createdAt,
        eventId: event.id,
        ...(resolveToken ? { resolveToken } : {}),
      }).catch((e: unknown) => {
        console.error('[email] sendTheftAlerts failed', e);
        return { ownerSent: false, trustedSent: false, skipped: 'error' as const };
      });
      const parts: string[] = [];
      if (emailResult.ownerSent) parts.push(`owner (${alertEmail})`);
      if (emailResult.trustedSent && device.user.trustedContactEmail)
        parts.push(`trusted contact (${device.user.trustedContactEmail})`);
      await prisma.activityLog.create({
        data: {
          deviceId: device.id,
          kind: 'EMAIL_ALERT',
          message: parts.length
            ? `Email alert sent to ${parts.join(' and ')}.`
            : `Email alert skipped (${emailResult.skipped ?? 'unknown'}).`,
          meta: emailResult as unknown as object,
        },
      });
      startTracking({
        eventId: event.id,
        deviceId: device.id,
        phone: device.user.phoneE164,
        initialLat: location.latitude,
        initialLng: location.longitude,
        owner: { name: device.user.name, email: demoEmail ?? device.user.email },
        ...(demoEmail ? {} : { trusted: { name: device.user.trustedContactName, email: device.user.trustedContactEmail } }),
        tier: score.tier,
        trigger,
      });
      await prisma.activityLog.create({
        data: {
          deviceId: device.id,
          kind: 'TRACKING_STARTED',
          message: 'Continuous location tracking engaged until the owner confirms it was them.',
        },
      });
    }
  }

  res.json({ event, score, location });
}

/**
 * GET /theft/:id/resolve
 *
 * Dispatches by tier:
 *   LOW    → auto-resolve (no auth needed)
 *   MEDIUM → PIN entry form
 *   HIGH   → owner cannot self-resolve; shows "call your trusted contact" message
 */
export async function resolveEvent(req: Request, res: Response) {
  const id = req.params.id as string;
  const event = await prisma.theftEvent.findUnique({
    where: { id },
    include: { device: true, user: true },
  });
  if (!event) return res.status(404).send(resolvePage('Event not found', false));

  if (event.resolved) {
    return res.set('content-type', 'text/html; charset=utf-8').send(resolvePage(event.user.name, true));
  }

  const method = ownerResolutionMethod(event.tier as Tier);

  if (method === 'none') {
    return res
      .set('content-type', 'text/html; charset=utf-8')
      .send(highOwnerPage(event.user.name, event.user.trustedContactName));
  }

  if (method === 'pin') {
    return res.set('content-type', 'text/html; charset=utf-8').send(pinFormPage(id));
  }

  // auto (LOW)
  await applyResolution(event);
  res.set('content-type', 'text/html; charset=utf-8').send(resolvePage(event.user.name, true));
}

/**
 * POST /theft/:id/resolve — PIN submission for MEDIUM-tier events.
 */
export async function submitResolvePin(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body as { pin?: string };
  const pin = body.pin?.trim();

  if (!pin) {
    return res.status(400).set('content-type', 'text/html; charset=utf-8').send(pinFormPage(id, 'PIN is required.'));
  }

  const event = await prisma.theftEvent.findUnique({
    where: { id },
    include: { device: true, user: true },
  });
  if (!event) return res.status(404).send(resolvePage('Event not found', false));

  if (event.resolved) {
    return res.set('content-type', 'text/html; charset=utf-8').send(resolvePage(event.user.name, true));
  }

  if (ownerResolutionMethod(event.tier as Tier) !== 'pin') {
    return res
      .status(400)
      .set('content-type', 'text/html; charset=utf-8')
      .send(resolvePage('This event requires a different resolution method.', false));
  }

  if (!event.user.resolvePinHash) {
    return res
      .status(400)
      .set('content-type', 'text/html; charset=utf-8')
      .send(pinFormPage(id, 'No resolve PIN is set for this account. Contact support.'));
  }

  const valid = await validatePin(event.user.resolvePinHash, pin);
  if (!valid) {
    return res
      .status(403)
      .set('content-type', 'text/html; charset=utf-8')
      .send(pinFormPage(id, 'Incorrect PIN — try again.'));
  }

  await applyResolution(event);
  res.set('content-type', 'text/html; charset=utf-8').send(resolvePage(event.user.name, true));
}

/**
 * GET /theft/:id/trusted-confirm?token=<resolveToken>
 *
 * Only the trusted contact's email carries this token. The thief cannot
 * access the trusted contact's inbox, so this resolve path is unreachable
 * even with the unlocked phone.
 */
export async function trustedConfirm(req: Request, res: Response) {
  const id = req.params.id as string;
  const { token } = req.query as { token?: string };

  const event = await prisma.theftEvent.findUnique({
    where: { id },
    include: { device: true, user: true },
  });
  if (!event) return res.status(404).send(resolvePage('Event not found', false));

  if (event.resolved) {
    return res.set('content-type', 'text/html; charset=utf-8').send(resolvePage(event.user.name, true));
  }

  if (event.tier !== 'HIGH') {
    return res
      .status(400)
      .set('content-type', 'text/html; charset=utf-8')
      .send(resolvePage('This event does not use trusted-contact confirmation.', false));
  }

  if (!validateTrustedToken(event.resolveToken, token)) {
    return res
      .status(403)
      .set('content-type', 'text/html; charset=utf-8')
      .send(resolvePage('Invalid or expired confirmation link.', false));
  }

  await applyResolution(event);

  await prisma.activityLog.create({
    data: {
      deviceId: event.deviceId,
      kind: 'TRUSTED_CONFIRMED',
      message: `Trusted contact confirmed false alarm — all protections lifted.`,
    },
  });

  res.set('content-type', 'text/html; charset=utf-8').send(trustedResolvePage(event.user.name));
}

// ── HTML page templates ──────────────────────────────────────────────────────

function pageShell(content: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#fafaf9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0a0a0a;">
  <div style="max-width:520px;margin:0 auto;padding:80px 28px;">
    <div style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#737373;margin-bottom:28px;">Sankofa</div>
    ${content}
  </div></body></html>`;
}

function resolvePage(nameOrMessage: string, ok: boolean): string {
  const first = nameOrMessage.split(' ')[0] ?? nameOrMessage;
  const headline = ok ? `You're all set, ${first}.` : nameOrMessage;
  const body = ok
    ? `Your wallet has been unfrozen, the phone is back on the network, and we've stopped tracking it. Sorry for the scare — you can close this tab.`
    : `We couldn't process this request. It may already have been resolved or the link may have expired.`;
  return pageShell(`
    <h1 style="font-size:32px;line-height:1.15;font-weight:600;margin:0 0 18px;letter-spacing:-0.02em;">${headline}</h1>
    <p style="font-size:16px;line-height:1.65;color:#525252;margin:0;">${body}</p>
  `);
}

function trustedResolvePage(ownerName: string): string {
  const first = ownerName.split(' ')[0] ?? ownerName;
  return pageShell(`
    <h1 style="font-size:32px;line-height:1.15;font-weight:600;margin:0 0 18px;letter-spacing:-0.02em;">Done — ${first}'s account is back to normal.</h1>
    <p style="font-size:16px;line-height:1.65;color:#525252;margin:0;">You've confirmed it was a false alarm. ${first}'s wallet is unfrozen, the IMEI flag is cleared, and tracking has stopped. You can close this tab.</p>
  `);
}

function highOwnerPage(ownerName: string, trustedContactName?: string | null): string {
  const first = ownerName.split(' ')[0] ?? ownerName;
  const contact = trustedContactName ?? 'your trusted contact';
  return pageShell(`
    <h1 style="font-size:32px;line-height:1.15;font-weight:600;margin:0 0 18px;letter-spacing:-0.02em;">Your account is protected, ${first}.</h1>
    <p style="font-size:16px;line-height:1.65;color:#525252;margin:0 0 16px;">Your wallet is frozen and the phone is flagged across carrier networks. Your money is safe.</p>
    <p style="font-size:16px;line-height:1.65;color:#525252;margin:0;">Because this was a high-confidence alert, only <strong>${contact}</strong> can undo these protections — we've sent them a separate confirmation link. Call or message them from any device to confirm it was you, then ask them to click the link in their Sankofa email.</p>
  `);
}

function pinFormPage(eventId: string, error?: string): string {
  const errorHtml = error
    ? `<p style="font-size:14px;color:#dc2626;margin:0 0 16px;">${error}</p>`
    : '';
  return pageShell(`
    <h1 style="font-size:32px;line-height:1.15;font-weight:600;margin:0 0 12px;letter-spacing:-0.02em;">Confirm it was you.</h1>
    <p style="font-size:16px;line-height:1.65;color:#525252;margin:0 0 28px;">Enter the 6-digit resolve PIN you set when you registered with Sankofa.</p>
    ${errorHtml}
    <form method="POST" action="/api/theft/${eventId}/resolve">
      <input
        type="password"
        name="pin"
        inputmode="numeric"
        maxlength="6"
        placeholder="6-digit PIN"
        autofocus
        style="width:100%;box-sizing:border-box;font-size:24px;letter-spacing:0.3em;padding:16px 18px;border:1px solid #e7e5e4;border-radius:12px;outline:none;margin-bottom:16px;background:#ffffff;"
      />
      <button type="submit" style="width:100%;background:#0a0a0a;color:#fafaf9;border:none;padding:16px;border-radius:999px;font-size:16px;font-weight:500;cursor:pointer;">
        Confirm &amp; undo alert →
      </button>
    </form>
  `);
}

export async function listEvents(_req: Request, res: Response) {
  const events = await prisma.theftEvent.findMany({
    take: 50,
    orderBy: { createdAt: 'desc' },
    include: { device: true, user: true },
  });
  res.json(events);
}

export async function listActivity(req: Request, res: Response) {
  const deviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId : undefined;
  const activity = await prisma.activityLog.findMany({
    ...(deviceId ? { where: { deviceId } } : {}),
    take: 100,
    orderBy: { createdAt: 'desc' },
  });
  res.json(activity);
}

export async function getDevice(req: Request, res: Response) {
  const id = req.params.id as string;
  const device = await prisma.device.findUnique({
    where: { id },
    include: { user: true, theftEvents: { take: 10, orderBy: { createdAt: 'desc' } } },
  });
  if (!device) return res.status(404).json({ error: 'not found' });
  res.json(device);
}
