"use client";

import { useEffect, useState } from "react";
import type { TheftEvent, User } from "@/lib/api";

export type PhoneState = "idle" | "alerting" | "locked";

interface Props {
  user?: Pick<User, "name"> | null;
  event?: TheftEvent | null;
  state: PhoneState;
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function PhoneView({ user, state }: Props) {
  const now = useClock();
  const time = now.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="relative mx-auto w-full max-w-[340px] select-none">
      <div className="relative rounded-[42px] bg-neutral-900 p-[8px] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.35)]">
        <div className="rounded-[36px] bg-paper overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-4 pb-2 text-[11px] font-mono tracking-wider text-ink">
            <span>{time}</span>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-1 w-1 rounded-full bg-ink" />
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-ink" />
              <span className="inline-block h-2 w-2 rounded-full bg-ink" />
              <span className="ml-1">MTN</span>
            </div>
          </div>

          <div className="flex flex-col items-center px-6 pb-10 pt-6 min-h-[520px]">
            {state === "idle" && <IdleScreen name={user?.name ?? "Kemi"} date={dateLabel} time={time} />}
            {state === "alerting" && <AlertingScreen />}
            {state === "locked" && <LockedScreen name={user?.name ?? "Kemi"} />}
          </div>
        </div>
      </div>
      <div className="mt-4 text-center font-mono text-[10px] tracking-[0.2em] uppercase text-soft">
        Kemi&apos;s phone
      </div>
    </div>
  );
}

function IdleScreen({ name, date, time }: { name: string; date: string; time: string }) {
  return (
    <div className="flex-1 w-full flex flex-col justify-between py-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-soft">
          Protected on your network
        </span>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-card border border-hairline px-3 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-safe-ink" />
          <span className="text-[11px] text-muted">All clear</span>
        </div>
      </div>

      <div className="text-center">
        <div className="text-[68px] leading-none font-light tracking-tight text-ink tabular-nums">
          {time}
        </div>
        <div className="mt-2 text-sm text-muted">{date}</div>
      </div>

      <div className="text-center">
        <p className="text-xs text-soft">Good evening, {name.split(" ")[0]}.</p>
      </div>
    </div>
  );
}

function AlertingScreen() {
  return (
    <div className="flex-1 w-full flex flex-col justify-center items-center gap-8 py-10 text-center">
      <div className="inline-flex items-center gap-1 rounded-full bg-warn-bg px-3 py-1">
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-warn-ink">
          Checking
        </span>
      </div>

      <div className="flex items-end gap-2 h-6">
        <span className="sankofa-dot inline-block h-2 w-2 rounded-full bg-ink" style={{ animationDelay: "0s" }} />
        <span className="sankofa-dot inline-block h-2 w-2 rounded-full bg-ink" style={{ animationDelay: "0.2s" }} />
        <span className="sankofa-dot inline-block h-2 w-2 rounded-full bg-ink" style={{ animationDelay: "0.4s" }} />
      </div>

      <div className="space-y-2 max-w-[240px]">
        <h3 className="text-xl font-medium text-ink leading-snug">
          We noticed something unusual.
        </h3>
        <p className="text-sm text-muted leading-relaxed">
          Your SIM just changed in a place you don&apos;t normally go. Hold tight — we&apos;re checking.
        </p>
      </div>
    </div>
  );
}

function LockedScreen({ name }: { name: string }) {
  return (
    <div className="flex-1 w-full flex flex-col justify-center items-center gap-8 py-6 text-center">
      <div className="h-16 w-16 rounded-full bg-safe-bg flex items-center justify-center">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-safe-ink"
          aria-hidden="true"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div className="space-y-3 max-w-[260px]">
        <h3 className="text-2xl font-medium tracking-tight text-ink leading-snug">
          You&apos;re safe, {name.split(" ")[0]}.
        </h3>
        <p className="text-sm text-muted leading-relaxed">
          We&apos;ve locked your phone across every network. Your wallet is frozen.
          No one can use or sell this device.
        </p>
      </div>

      <div className="w-full space-y-2 pt-6 border-t border-hairline">
        <Row label="Your money" value="Frozen & safe" />
        <Row label="This phone" value="Blocked everywhere" />
        <Row label="Trusted contact" value="Alerted" />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-soft">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}
