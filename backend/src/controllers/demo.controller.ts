import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { stopAll } from '../services/location-tracker.js';

/**
 * Reset demo-visible state so the Kemi scenario can be rerun from a clean
 * slate without losing the seeded user/device identities.
 */
export async function resetDemo(_req: Request, res: Response) {
  const stopped = stopAll();
  await prisma.activityLog.deleteMany({});
  await prisma.theftEvent.deleteMany({});
  await prisma.device.updateMany({
    data: { blacklisted: false, saleInitiated: false },
  });
  await prisma.user.updateMany({ data: { walletFrozen: false } });
  res.json({ ok: true, trackersStopped: stopped });
}

/**
 * Return the single demo user + their primary device in one shot.
 * The frontend uses this to hydrate both panels without having to know IDs.
 */
export async function demoState(_req: Request, res: Response) {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!user) return res.status(404).json({ error: 'demo not seeded' });
  const device = await prisma.device.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' },
  });
  if (!device) return res.status(404).json({ error: 'demo device missing' });
  res.json({ user, device });
}
