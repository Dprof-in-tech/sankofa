import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

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
 * Mock bank receiver — stands in for Opay / MTN MoMo / M-Pesa for the demo.
 */
export async function mockBankFreeze(req: Request, res: Response) {
  const { userId } = req.body as { userId?: string };
  console.log('[mock-bank] freeze request for', userId);
  res.json({ ok: true, frozenAt: new Date().toISOString() });
}
