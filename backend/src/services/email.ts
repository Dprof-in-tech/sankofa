/**
 * Email notifications via Resend.
 *
 * Called from the theft-trigger pipeline at MEDIUM/HIGH tiers. Sends:
 *   1. An owner alert — readable from any borrowed device (internet cafe,
 *      family member's phone). Tells Kemi what we saw, what we've done, and
 *      what she can do next.
 *   2. A trusted-contact alert — so Tunde knows Kemi may call from an
 *      unknown number and why.
 *
 * If RESEND_API_KEY is missing we log and return — the demo still works, just
 * without real emails.
 */
import { Resend } from 'resend';

const KEY = process.env.RESEND_API_KEY;
const FROM =
  process.env.RESEND_FROM ||
  // Resend's default sandbox sender — works without a verified domain.
  'Sankofa <onboarding@resend.dev>';

const resend = KEY ? new Resend(KEY) : null;

export interface TheftEmailInput {
  ownerName: string;
  ownerEmail: string;
  trustedContactName?: string | null;
  trustedContactEmail?: string | null;
  tier: 'LOW' | 'MEDIUM' | 'HIGH';
  reasoning: string;
  trigger: string;
  location: { latitude: number; longitude: number };
  occurredAt: Date;
  eventId: string;
}

// Undo links go through the frontend's /api rewrite so the email opens on
// whichever public host the demo is being served from (tunnel or not). Set
// PUBLIC_APP_URL to the tunnel URL when demoing remotely, e.g.
// PUBLIC_APP_URL=https://imposed-sticky-insured-satin.trycloudflare.com
const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL || 'http://localhost:3000';

function resolveUrl(eventId: string): string {
  return `${PUBLIC_APP_URL}/api/theft/${eventId}/resolve`;
}

export interface SendResult {
  ownerSent: boolean;
  trustedSent: boolean;
  skipped?: string;
}

export async function sendTheftAlerts(input: TheftEmailInput): Promise<SendResult> {
  if (!resend) {
    console.log('[email] RESEND_API_KEY missing — skipping emails.');
    return { ownerSent: false, trustedSent: false, skipped: 'no-api-key' };
  }
  if (input.tier === 'LOW') {
    return { ownerSent: false, trustedSent: false, skipped: 'low-tier' };
  }

  const ownerFirst = input.ownerName.split(' ')[0] ?? input.ownerName;
  const triggerLabel = prettyTrigger(input.trigger);
  const mapsUrl = `https://www.google.com/maps?q=${input.location.latitude},${input.location.longitude}`;
  const when = input.occurredAt.toLocaleString(undefined, { timeZoneName: 'short' });
  const undoUrl = resolveUrl(input.eventId);

  const ownerResult = await resend.emails
    .send({
      from: FROM,
      to: input.ownerEmail,
      subject:
        input.tier === 'HIGH'
          ? `Your phone may have been stolen — we've already locked it`
          : `We noticed something on your phone — please confirm it's you`,
      html: ownerHtml({ ...input, ownerFirst, triggerLabel, mapsUrl, when, undoUrl }),
    })
    .catch((e: unknown) => {
      console.error('[email] owner send failed:', e);
      return null;
    });

  let trustedResult: unknown = null;
  if (input.trustedContactEmail) {
    trustedResult = await resend.emails
      .send({
        from: FROM,
        to: input.trustedContactEmail,
        subject: `${ownerFirst}'s phone may have just been stolen`,
        html: trustedHtml({ ...input, ownerFirst, triggerLabel, mapsUrl, when, undoUrl }),
      })
      .catch((e: unknown) => {
        console.error('[email] trusted send failed:', e);
        return null;
      });
  }

  return {
    ownerSent: !!ownerResult,
    trustedSent: !!trustedResult,
  };
}

function prettyTrigger(t: string): string {
  switch (t) {
    case 'SIM_SWAP':
      return 'a SIM swap';
    case 'DEVICE_SWAP':
      return 'a device swap';
    case 'DEVICE_OFFLINE':
      return 'your phone going offline unexpectedly';
    default:
      return 'unusual network activity';
  }
}

interface RenderInput extends TheftEmailInput {
  ownerFirst: string;
  triggerLabel: string;
  mapsUrl: string;
  when: string;
  undoUrl: string;
}

function wrap(innerHtml: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#fafaf9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0a0a0a;">
  <div style="max-width:560px;margin:0 auto;padding:40px 28px;">
    <div style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#737373;margin-bottom:24px;">Sankofa</div>
    ${innerHtml}
    <div style="margin-top:40px;padding-top:24px;border-top:1px solid #e7e5e4;font-size:12px;color:#737373;line-height:1.6;">
      Sankofa protects phones at the carrier network layer. You're receiving this because Sankofa detected a change on a line registered to you or someone who trusts you as a recovery contact.
    </div>
  </div></body></html>`;
}

function ownerHtml(r: RenderInput): string {
  const headline =
    r.tier === 'HIGH'
      ? `Your phone may have been stolen, ${r.ownerFirst}.`
      : `We noticed something, ${r.ownerFirst}.`;
  const actionLine =
    r.tier === 'HIGH'
      ? `We've already frozen your wallet and blacklisted the phone across every network. Your money is safe. No one can resell or reuse this device.`
      : `This might be you — if you just swapped your SIM or got a new phone, no action is needed. Otherwise, please confirm so we can protect your wallet.`;

  return wrap(`
    <h1 style="font-size:28px;line-height:1.15;font-weight:600;margin:0 0 18px;letter-spacing:-0.02em;">${headline}</h1>
    <p style="font-size:16px;line-height:1.65;color:#525252;margin:0 0 18px;">At ${r.when}, Sankofa detected ${r.triggerLabel} on your line.</p>
    <p style="font-size:16px;line-height:1.65;color:#525252;margin:0 0 24px;">${actionLine}</p>

    <div style="background:#ffffff;border:1px solid #e7e5e4;border-radius:14px;padding:20px 22px;margin:0 0 24px;">
      <div style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#737373;margin-bottom:10px;">Why Sankofa thinks this is ${r.tier === 'HIGH' ? 'theft' : 'worth checking'}</div>
      <div style="font-size:14px;line-height:1.65;color:#0a0a0a;">${escapeHtml(r.reasoning)}</div>
    </div>

    <div style="font-size:14px;line-height:1.8;color:#525252;margin:0 0 28px;">
      <div><span style="color:#737373;">Trigger:</span> ${r.triggerLabel}</div>
      <div><span style="color:#737373;">Last known location:</span> <a href="${r.mapsUrl}" style="color:#0a0a0a;text-decoration:underline;">${r.location.latitude.toFixed(4)}, ${r.location.longitude.toFixed(4)}</a></div>
      <div><span style="color:#737373;">Detected at:</span> ${r.when}</div>
    </div>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
      <td style="padding-right:8px;"><a href="${r.mapsUrl}" style="display:inline-block;background:#0a0a0a;color:#fafaf9;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:500;font-size:14px;">See live location</a></td>
      <td><a href="${r.undoUrl}" style="display:inline-block;background:#ffffff;color:#0a0a0a;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:500;font-size:14px;border:1px solid #e7e5e4;">This was me — undo</a></td>
    </tr></table>
  `);
}

function trustedHtml(r: RenderInput): string {
  return wrap(`
    <h1 style="font-size:26px;line-height:1.2;font-weight:600;margin:0 0 18px;letter-spacing:-0.02em;">${r.ownerFirst}'s phone may have just been stolen.</h1>
    <p style="font-size:16px;line-height:1.65;color:#525252;margin:0 0 18px;">You're listed as ${r.ownerFirst}'s trusted recovery contact on Sankofa. At ${r.when}, we detected ${r.triggerLabel} on their line.</p>
    <p style="font-size:16px;line-height:1.65;color:#525252;margin:0 0 24px;">${r.ownerFirst} may try to reach you from an unfamiliar number. Please pick up — their wallet is safe and their phone is locked on every carrier, but they may need help getting home or contacting the police.</p>

    <div style="background:#ffffff;border:1px solid #e7e5e4;border-radius:14px;padding:18px 22px;margin:0 0 24px;font-size:14px;line-height:1.7;color:#525252;">
      <div><span style="color:#737373;">Last known location:</span> <a href="${r.mapsUrl}" style="color:#0a0a0a;text-decoration:underline;">${r.location.latitude.toFixed(4)}, ${r.location.longitude.toFixed(4)}</a></div>
      <div><span style="color:#737373;">Detected at:</span> ${r.when}</div>
    </div>

    <a href="${r.mapsUrl}" style="display:inline-block;background:#0a0a0a;color:#fafaf9;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:500;font-size:14px;">See live location</a>
  `);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface MovementAlertInput {
  ownerName: string;
  ownerEmail: string;
  trustedContactName?: string | null;
  trustedContactEmail?: string | null;
  tier: 'LOW' | 'MEDIUM' | 'HIGH';
  trigger: string;
  location: { latitude: number; longitude: number };
  movedMeters: number;
  eventId: string;
}

export async function sendMovementAlert(input: MovementAlertInput): Promise<SendResult> {
  if (!resend) {
    console.log('[email] RESEND_API_KEY missing — skipping movement email.');
    return { ownerSent: false, trustedSent: false, skipped: 'no-api-key' };
  }

  const ownerFirst = input.ownerName.split(' ')[0] ?? input.ownerName;
  const mapsUrl = `https://www.google.com/maps?q=${input.location.latitude},${input.location.longitude}`;
  const undoUrl = resolveUrl(input.eventId);
  const movedKm = (input.movedMeters / 1000).toFixed(1);

  const body = (first: string, prefix: string) => wrap(`
    <h1 style="font-size:26px;line-height:1.2;font-weight:600;margin:0 0 18px;letter-spacing:-0.02em;">${prefix} phone is moving, ${first}.</h1>
    <p style="font-size:16px;line-height:1.65;color:#525252;margin:0 0 18px;">Since the last alert, the device has moved ${movedKm} km. Sankofa is still tracking it — here is the latest location the network has for it.</p>
    <div style="font-size:14px;line-height:1.8;color:#525252;margin:0 0 24px;">
      <div><span style="color:#737373;">Latest location:</span> <a href="${mapsUrl}" style="color:#0a0a0a;text-decoration:underline;">${input.location.latitude.toFixed(4)}, ${input.location.longitude.toFixed(4)}</a></div>
      <div><span style="color:#737373;">Moved since last ping:</span> ${movedKm} km</div>
    </div>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
      <td style="padding-right:8px;"><a href="${mapsUrl}" style="display:inline-block;background:#0a0a0a;color:#fafaf9;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:500;font-size:14px;">Open map</a></td>
      <td><a href="${undoUrl}" style="display:inline-block;background:#ffffff;color:#0a0a0a;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:500;font-size:14px;border:1px solid #e7e5e4;">Found it — stop tracking</a></td>
    </tr></table>
  `);

  const ownerResult = await resend.emails
    .send({
      from: FROM,
      to: input.ownerEmail,
      subject: `Your phone is on the move — ${movedKm} km since the last ping`,
      html: body(ownerFirst, 'Your'),
    })
    .catch((e: unknown) => {
      console.error('[email] movement owner send failed:', e);
      return null;
    });

  let trustedResult: unknown = null;
  if (input.trustedContactEmail) {
    trustedResult = await resend.emails
      .send({
        from: FROM,
        to: input.trustedContactEmail,
        subject: `${ownerFirst}'s phone is on the move`,
        html: body(ownerFirst, `${ownerFirst}'s`),
      })
      .catch((e: unknown) => {
        console.error('[email] movement trusted send failed:', e);
        return null;
      });
  }

  return { ownerSent: !!ownerResult, trustedSent: !!trustedResult };
}
