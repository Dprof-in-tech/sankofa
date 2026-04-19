/**
 * Agentic theft scorer — Claude Sonnet 4.6 via Vercel AI Gateway.
 * Produces an explainable theft-confidence score. Reasoning shows on dashboard.
 */
import { generateText, Output } from 'ai';
import { z } from 'zod';

const MODEL = 'anthropic/claude-sonnet-4.6';

export type Tier = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ScoreInput {
  trigger: 'SIM_SWAP' | 'DEVICE_SWAP' | 'DEVICE_OFFLINE' | 'MANUAL';
  user: {
    name: string;
    phone: string;
    homeCenterLat: number;
    homeCenterLng: number;
    homeRadiusKm: number;
  };
  device: {
    imei: string;
    saleInitiated: boolean;
    lastSeenLat?: number | null;
    lastSeenLng?: number | null;
  };
  signals: {
    eventTime: string;
    eventLat?: number;
    eventLng?: number;
    distanceFromHomeKm?: number;
    hoursSinceLastActivity?: number;
    areaTheftCluster?: boolean;
    // Directly from CAMARA — confirms or denies the raw trigger.
    simSwappedRecently?: boolean;
    deviceSwappedRecently?: boolean;
    reachable?: boolean;
  };
}

export interface ScoreOutput {
  score: number;
  tier: Tier;
  reasoning: string;
}

const schema = z.object({
  score: z.number().min(0).max(1).describe('Theft confidence, 0 = legitimate, 1 = certain theft'),
  tier: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  reasoning: z.string().describe('One short paragraph explaining the decision for the admin dashboard'),
});

const SYSTEM = `You are Sankofa's theft-detection agent for Sub-Saharan Africa.
You decide whether a SIM/device-swap event is theft or a legitimate upgrade.

Tier thresholds:
- LOW  (score < 0.4): silent notification only
- MEDIUM (0.4–0.75): challenge user before next mobile-money transaction
- HIGH (> 0.75): full lockdown, wallet freeze, location tracking, alert trusted contact

Weigh signals: sale-initiation webhook on old device (strong negative — user is upgrading),
CAMARA sim-swap / device-swap confirmation (independent proof the trigger is real — big positive),
reachability false on the old device (classic post-snatch behavior — phone off or boxed up),
distance from home (far = suspicious), time of day (late-night snatching patterns),
hours since last activity (sudden silence is suspicious), area theft cluster (trending hotspot),
device last-seen movement.

Always return an explanation a judge can follow without ML background.`;

export async function scoreTheft(input: ScoreInput): Promise<ScoreOutput> {
  // Dev fallback: when no gateway key is configured, return a deterministic
  // heuristic score so the pipeline still demos end-to-end. Remove AI_MOCK
  // (or set AI_GATEWAY_API_KEY) for the real Claude-powered path.
  if (!process.env.AI_GATEWAY_API_KEY || process.env.AI_MOCK === '1') {
    return heuristicScore(input);
  }

  const { output } = await generateText({
    model: MODEL,
    system: SYSTEM,
    prompt: `Theft signal to score:\n\n${JSON.stringify(input, null, 2)}`,
    output: Output.object({ schema }),
  });

  return output as ScoreOutput;
}

function heuristicScore(input: ScoreInput): ScoreOutput {
  let score = 0.5;
  const notes: string[] = [];

  if (input.device.saleInitiated) {
    score -= 0.45;
    notes.push('old device pinged sale-initiated — likely a legitimate upgrade');
  }
  const far = input.signals.distanceFromHomeKm ?? 0;
  if (far > input.user.homeRadiusKm * 2) {
    score += 0.25;
    notes.push(`event is ${far.toFixed(1)}km from home (radius ${input.user.homeRadiusKm}km)`);
  }
  if (input.signals.areaTheftCluster) {
    score += 0.15;
    notes.push('area theft cluster active');
  }
  if (input.trigger === 'DEVICE_SWAP' || input.trigger === 'SIM_SWAP') {
    score += 0.1;
  }
  if (input.signals.simSwappedRecently) {
    score += 0.2;
    notes.push('CAMARA confirms SIM was swapped recently');
  }
  if (input.signals.deviceSwappedRecently) {
    score += 0.2;
    notes.push('CAMARA confirms device was swapped recently');
  }
  if (input.signals.reachable === false) {
    score += 0.15;
    notes.push('old device is unreachable on the network');
  }

  score = Math.max(0, Math.min(1, score));
  const tier: Tier = score > 0.75 ? 'HIGH' : score >= 0.4 ? 'MEDIUM' : 'LOW';

  return {
    score,
    tier,
    reasoning: `[heuristic fallback] ${notes.join('; ') || 'default weighting'}. Set AI_GATEWAY_API_KEY for Claude-powered scoring.`,
  };
}
