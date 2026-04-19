// Default to the same-origin /api prefix, which next.config.ts rewrites to the
// Express backend. This keeps every browser fetch same-origin, so the demo
// works identically whether you load it at localhost:3000 or through a
// cloudflare tunnel — no backend URL ever leaves the dev machine.
const BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "/api";

export type Tier = "LOW" | "MEDIUM" | "HIGH";
export type TriggerType = "SIM_SWAP" | "DEVICE_SWAP" | "DEVICE_OFFLINE" | "MANUAL";

export interface Device {
  id: string;
  imei: string;
  currentSim: string;
  lastSeenLat: number | null;
  lastSeenLng: number | null;
  lastSeenAt: string | null;
  blacklisted: boolean;
  saleInitiated: boolean;
}

export interface User {
  id: string;
  name: string;
  phoneE164: string;
  homeCenterLat: number;
  homeCenterLng: number;
  homeRadiusKm: number;
  trustedContactPhone: string | null;
  walletFrozen: boolean;
}

export interface TheftEvent {
  id: string;
  deviceId: string;
  userId: string;
  trigger: TriggerType;
  aiScore: number;
  tier: Tier;
  reasoning: string;
  resolved: boolean;
  createdAt: string;
  device?: Device;
  user?: User;
}

export interface ActivityItem {
  id: string;
  deviceId: string | null;
  kind: string;
  message: string;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

export interface TriggerResult {
  event: TheftEvent;
  score: { score: number; tier: Tier; reasoning: string };
  location: { latitude: number; longitude: number; accuracyMeters: number };
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    cache: "no-store",
    headers: { "content-type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${path}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  triggerTheft: (imei: string, trigger: TriggerType = "SIM_SWAP") =>
    // Accepts SIM_SWAP / DEVICE_SWAP / DEVICE_OFFLINE / MANUAL — MANUAL is what
    // the "I've lost my phone" button sends when the thief hasn't swapped yet.
    call<TriggerResult>("/theft/trigger", {
      method: "POST",
      body: JSON.stringify({ imei, trigger }),
    }),
  listEvents: () => call<TheftEvent[]>("/events"),
  listActivity: (deviceId?: string) =>
    call<ActivityItem[]>(
      deviceId ? `/activity?deviceId=${encodeURIComponent(deviceId)}` : "/activity",
    ),
  getDevice: (id: string) =>
    call<Device & { user: User; theftEvents: TheftEvent[] }>(`/devices/${id}`),
  resetDemo: () => call<{ ok: true }>("/demo/reset", { method: "POST" }),
  demoState: () => call<{ user: User; device: Device }>("/demo/state"),
  markAsSold: (imei: string) =>
    call<{ ok: true; deviceId: string }>("/hooks/sale-initiated", {
      method: "POST",
      body: JSON.stringify({ imei }),
    }),
};
