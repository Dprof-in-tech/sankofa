/**
 * Keeps pinging CAMARA Location Retrieval for an open theft event so the
 * admin dashboard shows the thief moving in real time. Sends a follow-up
 * email only when the device has moved meaningfully (default 500m) to avoid
 * training the owner to ignore Sankofa alerts.
 *
 * Lives in-process; state evaporates on restart. Fine for the demo — real
 * deployment would park this on a durable queue. Call stopAll() from the
 * demo reset path so pollers from stale runs don't leak across sessions.
 */
import { prisma } from '../lib/prisma.js';
import { getLocation } from './camara.js';
import { sendMovementAlert } from './email.js';
import type { TriggerType, ResponseTier } from '../generated/prisma/index.js';

interface TrackerState {
  timer: ReturnType<typeof setInterval>;
  lastLat: number;
  lastLng: number;
  startedAt: number;
}

const POLL_MS = Number(process.env.LOCATION_POLL_MS) || 30_000; // 30s by default — tight enough to look live on the dashboard during a 3-min demo
const MOVEMENT_EMAIL_METERS = 500;
const MAX_DURATION_MS = 24 * 60 * 60 * 1000;

const active = new Map<string, TrackerState>();

function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6_371_000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

export interface StartTrackingArgs {
  eventId: string;
  deviceId: string;
  phone: string;
  initialLat: number;
  initialLng: number;
  owner: { name: string; email: string };
  trusted?: { name: string | null; email: string | null };
  tier: ResponseTier;
  trigger: TriggerType;
}

export function startTracking(args: StartTrackingArgs): void {
  if (active.has(args.eventId)) return;

  const state: TrackerState = {
    timer: setInterval(() => tick(args.eventId, args).catch((e) => {
      console.error('[tracker] tick failed', e);
    }), POLL_MS),
    lastLat: args.initialLat,
    lastLng: args.initialLng,
    startedAt: Date.now(),
  };
  active.set(args.eventId, state);
  console.log(`[tracker] started for event ${args.eventId}, polling every ${POLL_MS}ms`);
}

async function tick(eventId: string, args: StartTrackingArgs): Promise<void> {
  const state = active.get(eventId);
  if (!state) return;

  // Auto-stop after 24h so a forgotten event doesn't burn API calls forever.
  if (Date.now() - state.startedAt > MAX_DURATION_MS) {
    stopTracking(eventId);
    return;
  }

  // Bail if the event was resolved between ticks (e.g. owner clicked undo).
  const event = await prisma.theftEvent.findUnique({ where: { id: eventId } });
  if (!event || event.resolved) {
    stopTracking(eventId);
    return;
  }

  const loc = await getLocation(args.phone).catch((e) => {
    console.error('[tracker] location poll failed', e);
    return null;
  });
  if (!loc) return;

  const movedMeters = distanceMeters(state.lastLat, state.lastLng, loc.latitude, loc.longitude);

  await prisma.activityLog.create({
    data: {
      deviceId: args.deviceId,
      kind: 'LOCATION_PING',
      message: `Live location updated · moved ${movedMeters.toFixed(0)}m since last ping.`,
      meta: { latitude: loc.latitude, longitude: loc.longitude, movedMeters } as object,
    },
  });

  if (movedMeters >= MOVEMENT_EMAIL_METERS) {
    await sendMovementAlert({
      ownerName: args.owner.name,
      ownerEmail: args.owner.email,
      trustedContactName: args.trusted?.name ?? null,
      trustedContactEmail: args.trusted?.email ?? null,
      tier: args.tier,
      trigger: args.trigger,
      location: { latitude: loc.latitude, longitude: loc.longitude },
      movedMeters,
      eventId,
    }).catch((e: unknown) => console.error('[tracker] movement email failed', e));

    await prisma.activityLog.create({
      data: {
        deviceId: args.deviceId,
        kind: 'EMAIL_MOVEMENT',
        message: `Movement alert email sent — device moved ${movedMeters.toFixed(0)}m.`,
      },
    });

    state.lastLat = loc.latitude;
    state.lastLng = loc.longitude;
  }
}

export function stopTracking(eventId: string): boolean {
  const state = active.get(eventId);
  if (!state) return false;
  clearInterval(state.timer);
  active.delete(eventId);
  console.log(`[tracker] stopped for event ${eventId}`);
  return true;
}

export function stopAll(): number {
  const n = active.size;
  for (const [id, state] of active) {
    clearInterval(state.timer);
    active.delete(id);
  }
  return n;
}
