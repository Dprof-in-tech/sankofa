import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { stopTracking } from './location-tracker.js';
import { deleteDeviceSubscription } from './camara.js';
import type { Tier } from './ai.js';

interface ResolvableEvent {
  id: string;
  deviceId: string;
  userId: string;
  camaraSubscriptionId: string | null;
  device: { blacklisted: boolean };
  user: { walletFrozen: boolean; resolvePinHash: string | null };
}

/**
 * Returns how the device owner (not trusted contact) may resolve an alert by tier.
 *
 *   'auto' — LOW: auto-resolve with no auth
 *   'pin'  — MEDIUM: owner submits their 6-digit resolve PIN
 *   'none' — HIGH: owner cannot self-resolve; only trusted contact's confirm link works
 */
export function ownerResolutionMethod(tier: Tier): 'auto' | 'pin' | 'none' {
  if (tier === 'LOW') return 'auto';
  if (tier === 'MEDIUM') return 'pin';
  return 'none';
}

export async function validatePin(resolvePinHash: string | null, pin: string): Promise<boolean> {
  if (!resolvePinHash) return false;
  return bcrypt.compare(pin, resolvePinHash);
}

export function validateTrustedToken(
  storedToken: string | null,
  suppliedToken: string | undefined,
): boolean {
  if (!suppliedToken || !storedToken) return false;
  return storedToken === suppliedToken;
}

/**
 * Apply all resolution side effects: mark event resolved, unfreeze wallet,
 * un-blacklist device, stop location tracking, delete CAMARA subscription, log.
 */
export async function applyResolution(event: ResolvableEvent): Promise<void> {
  await prisma.theftEvent.update({ where: { id: event.id }, data: { resolved: true } });

  if (event.device.blacklisted) {
    await prisma.device.update({ where: { id: event.deviceId }, data: { blacklisted: false } });
  }
  if (event.user.walletFrozen) {
    await prisma.user.update({ where: { id: event.userId }, data: { walletFrozen: false } });
  }

  stopTracking(event.id);

  if (event.camaraSubscriptionId) {
    deleteDeviceSubscription(event.camaraSubscriptionId).catch((e) =>
      console.error('[camara] subscription delete on resolve failed:', e),
    );
  }

  await prisma.activityLog.create({
    data: {
      deviceId: event.deviceId,
      kind: 'RESOLVED',
      message: 'Owner confirmed "This was me" — wallet unfrozen, device un-blacklisted, tracking stopped.',
    },
  });
}
