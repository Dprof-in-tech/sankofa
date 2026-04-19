"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AdminConsole } from "@/components/AdminConsole";
import { PhoneView, type PhoneState } from "@/components/PhoneView";
import { api, type ActivityItem, type Device, type TheftEvent, type User } from "@/lib/api";

export default function DemoPage() {
  const [user, setUser] = useState<User | null>(null);
  const [device, setDevice] = useState<Device | null>(null);
  const [events, setEvents] = useState<TheftEvent[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [phoneState, setPhoneState] = useState<PhoneState>("idle");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lockedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const latestEvent = events[0] ?? null;
  const latestLocation =
    (latestEvent?.id &&
      (activity.find((a) => a.kind === "THEFT_TRIGGER")?.meta as
        | { location?: { latitude: number; longitude: number } }
        | null)
        ?.location) ||
    null;

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

      // Reflect backend state in the phone view at load time.
      if (evs.length === 0) {
        setPhoneState("idle");
      } else if (evs[0].tier === "HIGH") {
        setPhoneState("locked");
      } else {
        setPhoneState("alerting");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reach the backend.");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // While a theft event is open, poll every 5s so judges see location pings
  // and movement emails land on the timeline in near-real time. Stops once
  // the latest event is resolved (owner clicked undo in the email).
  useEffect(() => {
    if (!latestEvent || latestEvent.resolved) return;
    const id = setInterval(() => {
      refresh();
    }, 5_000);
    return () => clearInterval(id);
  }, [latestEvent, refresh]);

  const onSimulate = useCallback(async () => {
    if (!device || working) return;
    setWorking(true);
    setPhoneState("alerting");
    try {
      const result = await api.triggerTheft(device.imei, "SIM_SWAP");
      // Let the phone sit in "alerting" briefly so the transition feels real.
      if (lockedTimer.current) clearTimeout(lockedTimer.current);
      lockedTimer.current = setTimeout(() => {
        setPhoneState(result.score.tier === "HIGH" ? "locked" : "alerting");
      }, 1800);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPhoneState("idle");
    } finally {
      setWorking(false);
    }
  }, [device, working, refresh]);

  const onReset = useCallback(async () => {
    if (working) return;
    setWorking(true);
    try {
      await api.resetDemo();
      if (lockedTimer.current) clearTimeout(lockedTimer.current);
      setPhoneState("idle");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed.");
    } finally {
      setWorking(false);
    }
  }, [working, refresh]);

  // MANUAL trigger — Kemi realizes her phone is gone and hits a panic button
  // from any browser. Same pipeline as SIM_SWAP but the AI weighs the fact
  // that the owner self-reported, not the network.
  const onReportStolen = useCallback(async () => {
    if (!device || working) return;
    setWorking(true);
    setPhoneState("alerting");
    try {
      const result = await api.triggerTheft(device.imei, "MANUAL");
      if (lockedTimer.current) clearTimeout(lockedTimer.current);
      lockedTimer.current = setTimeout(() => {
        setPhoneState(result.score.tier === "HIGH" ? "locked" : "alerting");
      }, 1800);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Report failed.");
      setPhoneState("idle");
    } finally {
      setWorking(false);
    }
  }, [device, working, refresh]);

  return (
    <main className="flex-1 flex flex-col">
      <nav className="px-8 sm:px-12 pt-8 flex items-center justify-between">
        <Link
          href="/"
          className="font-mono text-[11px] tracking-[0.2em] uppercase text-soft hover:text-ink"
        >
          ← Sankofa
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            disabled={working}
            className="h-10 rounded-full border border-hairline bg-card px-4 text-sm text-ink hover:bg-paper transition-colors disabled:opacity-50"
          >
            Reset
          </button>
          <button
            onClick={onReportStolen}
            disabled={!device || working}
            title="Kemi's phone is missing but no SIM/device swap has fired yet. She reports it manually from any browser."
            className="h-10 rounded-full border border-hairline bg-card px-4 text-sm text-ink hover:bg-paper transition-colors disabled:opacity-40"
          >
            Report stolen
          </button>
          <button
            onClick={onSimulate}
            disabled={!device || working}
            className="h-10 rounded-full bg-ink px-5 text-sm text-paper font-medium hover:opacity-85 transition-opacity disabled:opacity-40"
          >
            {working ? "Running…" : "Simulate theft"}
          </button>
        </div>
      </nav>

      <div className="px-8 sm:px-12 pt-8 pb-4">
        <div className="max-w-xl">
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-soft mb-3">
            Live demo · Kemi on Third Mainland Bridge
          </p>
          <h1 className="text-2xl sm:text-3xl leading-tight tracking-tight text-ink font-medium">
            Watch both sides of the theft, in real time.
          </h1>
          <p className="mt-3 text-[15px] text-muted leading-relaxed">
            On the left is Kemi&apos;s phone. On the right is the Sankofa console that
            a carrier operator would see. Press <span className="text-ink">Simulate theft</span> to
            trigger the real CAMARA pipeline.
          </p>
        </div>
      </div>

      {error && (
        <div className="mx-8 sm:mx-12 mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <section className="flex-1 px-8 sm:px-12 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-8 items-start">
          <div className="flex justify-center py-10">
            <PhoneView user={user} event={latestEvent} state={phoneState} />
          </div>
          <div className="min-h-[640px]">
            <AdminConsole
              user={user}
              device={device}
              latestEvent={latestEvent}
              activity={activity}
              location={latestLocation}
              working={working}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
