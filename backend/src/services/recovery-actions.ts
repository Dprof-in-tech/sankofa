import { prisma } from '../lib/prisma.js';
import { freezeWallet as callMockBankFreeze } from '../controllers/webhook.controller.js';

/**
 * Freeze the victim's mobile money wallet and log the action.
 * Single implementation shared by the recovery agent and the fallback script.
 */
export async function freezeWallet(
  userId: string,
  deviceId: string,
  reason: string,
): Promise<{ success: boolean }> {
  try {
    await callMockBankFreeze(userId);
    await prisma.activityLog.create({
      data: { deviceId, kind: 'LOCKDOWN', message: `Wallet frozen. ${reason}` },
    });
    return { success: true };
  } catch (e) {
    await prisma.activityLog
      .create({ data: { deviceId, kind: 'AGENT_ERROR', message: `freezeWallet failed: ${String(e).slice(0, 100)}` } })
      .catch(() => {});
    return { success: false };
  }
}

/**
 * Blacklist the device IMEI in Sankofa's registry and log the action.
 * Single implementation shared by the recovery agent and the fallback script.
 */
export async function blacklistDevice(
  deviceId: string,
  imei: string,
  reason: string,
): Promise<{ success: boolean }> {
  try {
    await prisma.device.update({ where: { id: deviceId }, data: { blacklisted: true } });
    await prisma.activityLog.create({
      data: { deviceId, kind: 'LOCKDOWN', message: `IMEI ${imei.slice(0, 8)}… blacklisted. ${reason}` },
    });
    return { success: true };
  } catch (e) {
    await prisma.activityLog
      .create({ data: { deviceId, kind: 'AGENT_ERROR', message: `blacklistDevice failed: ${String(e).slice(0, 100)}` } })
      .catch(() => {});
    return { success: false };
  }
}
