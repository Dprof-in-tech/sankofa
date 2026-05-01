import { useCallback, useEffect, useRef, useState } from "react";
import { api, type ActivityItem, type Device, type TheftEvent, type TriggerType, type User } from "./api";
import type { PhoneState } from "@/components/PhoneView";

export type DemoPhase = "setup" | "activating" | "live";

export interface DemoOrchestrator {
  // State
  phase: DemoPhase;
  user: User | null;
  device: Device | null;
  events: TheftEvent[];
  activity: ActivityItem[];
  phoneState: PhoneState;
  working: boolean;
  error: string | null;
  demoEmail: string;
  latestEvent: TheftEvent | null;
  // Actions
  setDemoEmail: (email: string) => void;
  onActivate: () => void;
  onSimulate: () => Promise<void>;
  onReset: () => Promise<void>;
  onReportStolen: () => Promise<void>;
  onRegisterSale: () => Promise<void>;
}

// 1800ms: accounts for Claude scoring latency before updating the phone state.
const TRIGGER_SETTLE_MS = 1800;
// Poll while an unresolved event is active so the admin console stays live.
const POLL_INTERVAL_MS = 5_000;

export function useDemoOrchestrator(): DemoOrchestrator {
  const [phase, setPhase] = useState<DemoPhase>("setup");
  const [user, setUser] = useState<User | null>(null);
  const [device, setDevice] = useState<Device | null>(null);
  const [events, setEvents] = useState<TheftEvent[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [phoneState, setPhoneState] = useState<PhoneState>("idle");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoEmail, setDemoEmail] = useState("");
  const lockedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const latestEvent = events[0] ?? null;

  const refresh = useCallback(async () => {
    try {
      const [state, evs, act] = await Promise.all([
        api.demoState(),
        api.listEvents(),
        api.listActivity(),
      ]);
      setUser(state.user);
      setDevice(state.device);
      setEvents(evs);
      setActivity(act);
      setError(null);

      // If events already exist from a previous run, skip setup and restore state.
      if (evs.length > 0) {
        setPhase("live");
        if (evs[0].tier === "HIGH") setPhoneState("locked");
        else if (evs[0].tier === "MEDIUM") setPhoneState("alerting");
        else setPhoneState("idle");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reach the backend.");
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!latestEvent || latestEvent.resolved) return;
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [latestEvent, refresh]);

  const onActivate = useCallback(() => {
    setPhase("activating");
    setTimeout(() => {
      setPhase("live");
      setPhoneState("idle");
    }, 700);
  }, []);

  // Shared trigger flow — both "simulate theft" and "report stolen" go through here.
  const triggerFlow = useCallback(
    async (trigger: TriggerType) => {
      if (!device || working) return;
      setWorking(true);
      setPhoneState("alerting");
      try {
        const result = await api.triggerTheft(device.imei, trigger, demoEmail || undefined);
        if (lockedTimer.current) clearTimeout(lockedTimer.current);
        lockedTimer.current = setTimeout(() => {
          setPhoneState(
            result.score.tier === "HIGH" ? "locked"
            : result.score.tier === "MEDIUM" ? "alerting"
            : "idle",
          );
        }, TRIGGER_SETTLE_MS);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
        setPhoneState("idle");
      } finally {
        setWorking(false);
      }
    },
    [device, working, demoEmail, refresh],
  );

  const onSimulate = useCallback(() => triggerFlow("SIM_SWAP"), [triggerFlow]);
  const onReportStolen = useCallback(() => triggerFlow("MANUAL"), [triggerFlow]);

  const onReset = useCallback(async () => {
    if (working) return;
    setWorking(true);
    try {
      await api.resetDemo();
      if (lockedTimer.current) clearTimeout(lockedTimer.current);
      setPhoneState("idle");
      setDemoEmail("");
      setPhase("setup");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed.");
    } finally {
      setWorking(false);
    }
  }, [working, refresh]);

  const onRegisterSale = useCallback(async () => {
    if (!device || working) return;
    setWorking(true);
    try {
      await api.markAsSold(device.imei);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Register sale failed.");
    } finally {
      setWorking(false);
    }
  }, [device, working, refresh]);

  return {
    phase, user, device, events, activity, phoneState, working, error, demoEmail, latestEvent,
    setDemoEmail, onActivate, onSimulate, onReset, onReportStolen, onRegisterSale,
  };
}
