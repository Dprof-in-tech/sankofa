/**
 * CAMARA API client — Nokia Network-as-Code TypeScript SDK.
 *
 * Auth: set NAC_TOKEN (Nokia application key). Optional NAC_ENV = "dev" | "staging" | "prod".
 * Sandbox test phone numbers documented by Nokia:
 *   +99999991000 → SIM/device swap DID occur
 *   +99999991001 → SIM/device swap did NOT occur
 */
import { NetworkAsCodeClient } from 'network-as-code';

const TOKEN = process.env.NAC_TOKEN;
const ENV_MODE = process.env.NAC_ENV; // "dev" | "staging" | undefined (= prod)

if (!TOKEN) {
  throw new Error(
    'NAC_TOKEN is not set. Register at https://networkascode.nokia.io and drop the application key in backend/.env',
  );
}

const client = new NetworkAsCodeClient(TOKEN, ENV_MODE);

// Device lookups are per-phone; cache within the process so we don't re-fetch
// on every CAMARA call during a single theft-trigger pipeline.
const deviceCache = new Map<string, ReturnType<typeof client.devices.get>>();

function device(phoneNumber: string) {
  let d = deviceCache.get(phoneNumber);
  if (!d) {
    d = client.devices.get({ phoneNumber });
    deviceCache.set(phoneNumber, d);
  }
  return d;
}

// ── Theft Detection ──────────────────────────────────────────────────────────

export interface SimSwapResult {
  swapped: boolean;
  latestSwapAt?: string;
}
export async function checkSimSwap(phone: string, maxAgeHours = 24): Promise<SimSwapResult> {
  const d = await device(phone);
  const [swapped, latestSwap] = await Promise.all([
    d.verifySimSwap(maxAgeHours),
    d.getSimSwapDate().catch(() => null),
  ]);
  return {
    swapped,
    ...(latestSwap ? { latestSwapAt: latestSwap.toISOString() } : {}),
  };
}

export interface DeviceSwapResult {
  swapped: boolean;
  swappedAt?: string;
}
export async function checkDeviceSwap(phone: string, maxAgeHours = 24): Promise<DeviceSwapResult> {
  const d = await device(phone);
  const [swapped, swapDate] = await Promise.all([
    d.verifyDeviceSwap(maxAgeHours),
    d.getDeviceSwapDate().catch(() => null),
  ]);
  return {
    swapped,
    ...(swapDate ? { swappedAt: swapDate.toISOString() } : {}),
  };
}

export interface DeviceStatusResult {
  online: boolean;
  connectivity: string;
}
export async function getDeviceStatus(phone: string): Promise<DeviceStatusResult> {
  const d = await device(phone);
  const connectivity = await d.getConnectivity();
  return {
    online: connectivity === 'CONNECTED_DATA' || connectivity === 'CONNECTED_SMS',
    connectivity,
  };
}

// ── Location Intelligence ────────────────────────────────────────────────────

export interface LocationResult {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
}
export async function getLocation(phone: string, maxAgeSeconds = 60): Promise<LocationResult> {
  const d = await device(phone);
  const loc = await d.getLocation(maxAgeSeconds);
  return {
    latitude: loc.latitude,
    longitude: loc.longitude,
    accuracyMeters: loc.radius ?? 0,
  };
}

export interface ReachabilityResult {
  reachable: boolean;
}
export async function checkReachability(phone: string): Promise<ReachabilityResult> {
  const d = await device(phone);
  const connectivity = await d.getConnectivity();
  return { reachable: connectivity !== 'NOT_CONNECTED' };
}

// ── Device Offline Subscription ─────────────────────────────────────────────

const CONNECTIVITY_DISCONNECTED = 'org.camaraproject.device-status.v0.connectivity-disconnected';

/**
 * Subscribe to a CAMARA device-offline event for the given phone. The carrier
 * fires a webhook to `webhookUrl` when the device drops off the network (SIM
 * removed or device powered off). Subscription expires after 24 hours.
 *
 * Returns the subscription ID — store it on TheftEvent.camaraSubscriptionId so
 * it can be cleaned up when the event resolves.
 */
export async function subscribeToDeviceOffline(
  phone: string,
  webhookUrl: string,
  authToken: string,
): Promise<string> {
  const d = await device(phone);
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const subscription = await client.deviceStatus.subscribe(
    d,
    CONNECTIVITY_DISCONNECTED,
    webhookUrl,
    { notificationAuthToken: authToken, subscriptionExpireTime: expiry },
  );
  return subscription.eventSubscriptionId;
}

/**
 * Delete a device-status subscription by ID. Call when the event resolves or
 * when the device goes offline (subscription has served its purpose).
 */
export async function deleteDeviceSubscription(subscriptionId: string): Promise<void> {
  const subscription = await client.deviceStatus.get(subscriptionId);
  await subscription.delete();
}

// ── Roaming / Home Zone ──────────────────────────────────────────────────────

export interface HomeZoneResult {
  onHomeNetwork: boolean;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  roamingCountry?: string | null;
}

/**
 * Network-native home zone detection.
 *
 * If the device is on its home network (not roaming), its current cell-tower
 * position is recorded as the home area — no user input required. This is the
 * production path when Sankofa runs inside a carrier: the network already
 * knows where a subscriber's home zone is from registration-time location.
 *
 * If the device is roaming, we return the country it's visiting so the
 * onboarding flow can ask the user to set home manually instead.
 *
 * Roaming subscription events (ROAMING_OFF) can also be used to
 * automatically update the home zone when the device returns home.
 */
export async function detectHomeZone(phone: string): Promise<HomeZoneResult> {
  const d = await device(phone);
  const roaming = await d.getRoaming();

  if (roaming.roaming) {
    return {
      onHomeNetwork: false,
      roamingCountry: roaming.countryName?.[0] ?? null,
    };
  }

  // On home network — current location is the home zone.
  const loc = await d.getLocation(300).catch(() => null);
  return {
    onHomeNetwork: true,
    ...(loc ? {
      latitude: loc.latitude,
      longitude: loc.longitude,
      accuracyMeters: loc.radius ?? 0,
    } : {}),
  };
}

// ── Identity Assurance ───────────────────────────────────────────────────────

export interface NumberVerificationResult {
  verified: boolean;
}
/**
 * CAMARA Number Verification uses a CIBA OAuth flow — `code` and `state` come
 * from an authorization callback, not the user's phone. Not on the Kemi
 * demo critical path; exposed here for completeness.
 */
export async function verifyNumber(
  phone: string,
  code: string,
  state: string,
): Promise<NumberVerificationResult> {
  const d = await device(phone);
  const verified = await d.verifyNumber(code, state);
  return { verified };
}

export interface KycMatchResult {
  raw: unknown;
}
export async function kycMatch(phone: string, legalName: string): Promise<KycMatchResult> {
  const d = await device(phone);
  const raw = await d.matchCustomer({ phoneNumber: phone, name: legalName });
  return { raw };
}
