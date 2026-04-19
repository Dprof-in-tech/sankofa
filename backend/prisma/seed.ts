/**
 * Seeds the demo dataset: Kemi on the Third Mainland Bridge.
 * Run after `npm run db:push` with `npm run db:seed`.
 */
import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const prisma = new PrismaClient({ adapter: new PrismaPg(url) });

async function main() {
  // Yaba, Lagos — Kemi's home neighborhood.
  // Phone is Nokia's sandbox test number that always reports a SIM/device swap.
  // (Flip to +99999991001 to simulate the "no swap" legitimate path.)
  // ⚠️ Swap these to real inboxes you control before demoing — both addresses
  // receive a real Resend email when the pipeline fires at MEDIUM/HIGH.
  const ownerEmail = process.env.DEMO_OWNER_EMAIL || 'amaechiisaac450@gmail.com';
  const trustedEmail = process.env.DEMO_TRUSTED_EMAIL || 'amaechiisaac450@gmail.com';

  const kemi = await prisma.user.upsert({
    where: { phoneE164: '+99999991000' },
    update: { email: ownerEmail, trustedContactEmail: trustedEmail },
    create: {
      name: 'Kemi Adeyemi',
      phoneE164: '+99999991000',
      email: ownerEmail,
      homeCenterLat: 6.5095,
      homeCenterLng: 3.3711,
      homeRadiusKm: 4.0,
      trustedContactName: 'Tunde (husband)',
      trustedContactEmail: trustedEmail,
    },
  });

  const device = await prisma.device.upsert({
    where: { imei: '867530999123456' },
    update: {},
    create: {
      imei: '867530999123456',
      userId: kemi.id,
      currentSim: '+2348012345678',
      lastSeenLat: 6.5095,
      lastSeenLng: 3.3711,
      lastSeenAt: new Date(),
    },
  });

  console.log('Seeded:');
  console.log('  user  :', kemi.id, kemi.name, kemi.phoneE164);
  console.log('  device:', device.id, device.imei);
  console.log('\nSmoke test the pipeline:');
  console.log(`  curl -X POST http://localhost:3001/theft/trigger \\`);
  console.log(`    -H 'content-type: application/json' \\`);
  console.log(`    -d '{"imei":"${device.imei}","trigger":"SIM_SWAP"}'`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
