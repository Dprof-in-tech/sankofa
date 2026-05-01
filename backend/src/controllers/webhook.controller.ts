import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { checkSimSwap, checkDeviceSwap, deleteDeviceSubscription } from '../services/camara.js';
import { stopTracking } from '../services/location-tracker.js';

/**
 * Inbound from MNO / retail partner: "this phone was just sold, don't panic
 * when the SIM swaps next." Suppresses false-positive theft scores.
 */
export async function saleInitiated(req: Request, res: Response) {
  const { imei } = (req.body ?? {}) as { imei?: string };
  if (!imei) return res.status(400).json({ error: 'imei required' });

  const device = await prisma.device.update({
    where: { imei },
    data: { saleInitiated: true },
  });

  await prisma.activityLog.create({
    data: {
      deviceId: device.id,
      kind: 'SALE_INITIATED',
      message: 'Partner retailer flagged device as being sold — theft scoring suppressed.',
    },
  });

  res.json({ ok: true, deviceId: device.id });
}

/**
 * Outbound: freeze a user's mobile-money wallet.
 * For the demo, this calls our own /mock-bank/freeze endpoint so the whole
 * round-trip appears on the admin dashboard timeline.
 */
export async function freezeWallet(userId: string): Promise<{ ok: boolean; frozenAt: string }> {
  const target = process.env.MOCK_BANK_URL || 'http://localhost:3001/mock-bank/freeze';
  const res = await fetch(target, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userId, at: new Date().toISOString() }),
  });

  await prisma.user.update({ where: { id: userId }, data: { walletFrozen: true } });

  return res.json() as Promise<{ ok: boolean; frozenAt: string }>;
}

/**
 * CAMARA device-offline webhook — fired when the stolen device drops off the
 * network (SIM removed, phone powered off, or factory reset).
 *
 * At this point we can no longer track the device. We cancel the CAMARA
 * subscription and stop the location tracker. Finance protection (frozen wallet,
 * IMEI blacklist) stays active — that's where the real damage was going to
 * happen anyway.
 *
 * Auth: Nokia sends the token we provided at subscribe time in Authorization: Bearer <token>.
 */
export async function deviceOfflineWebhook(req: Request, res: Response) {
  const authHeader = req.headers.authorization as string | undefined;
  const expected = process.env.CAMARA_WEBHOOK_TOKEN;
  if (expected && authHeader !== `Bearer ${expected}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const body = req.body as { device?: { phoneNumber?: string } };
  const phone = body.device?.phoneNumber;
  if (!phone) return res.status(400).json({ error: 'missing device.phoneNumber' });

  const dbDevice = await prisma.device.findFirst({
    where: { user: { phoneE164: phone } },
    include: {
      theftEvents: {
        where: { resolved: false },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  const activeEvent = dbDevice?.theftEvents[0];
  if (!activeEvent) {
    return res.status(200).json({ status: 'no-active-event' });
  }

  await prisma.activityLog.create({
    data: {
      deviceId: dbDevice.id,
      kind: 'DEVICE_OFFLINE',
      message: 'CAMARA: device dropped off network — location tracking ended. Finance protection remains active.',
    },
  });

  // Run one last swap check to update the record before tracking ends.
  const [simSwap, deviceSwap] = await Promise.all([
    checkSimSwap(phone).catch(() => null),
    checkDeviceSwap(phone).catch(() => null),
  ]);
  if (simSwap || deviceSwap) {
    await prisma.activityLog.create({
      data: {
        deviceId: dbDevice.id,
        kind: 'OFFLINE_SWAP_CHECK',
        message: [
          simSwap?.swapped ? 'SIM swap confirmed at offline time.' : null,
          deviceSwap?.swapped ? 'Device swap confirmed at offline time.' : null,
        ].filter(Boolean).join(' ') || 'No additional swap signals at offline time.',
        meta: { simSwap, deviceSwap } as object,
      },
    });
  }

  stopTracking(activeEvent.id);

  if (activeEvent.camaraSubscriptionId) {
    deleteDeviceSubscription(activeEvent.camaraSubscriptionId).catch((e) =>
      console.error('[camara] delete subscription failed after device-offline:', e),
    );
    await prisma.theftEvent.update({
      where: { id: activeEvent.id },
      data: { camaraSubscriptionId: null },
    });
  }

  res.json({ status: 'processed' });
}

/**
 * Mock bank receiver — stands in for Opay / MTN MoMo / M-Pesa for the demo.
 */
export async function mockBankFreeze(req: Request, res: Response) {
  const { userId } = req.body as { userId?: string };
  console.log('[mock-bank] freeze request for', userId);
  res.json({ ok: true, frozenAt: new Date().toISOString() });
}
