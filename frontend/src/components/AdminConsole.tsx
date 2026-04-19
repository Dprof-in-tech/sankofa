"use client";

import type React from "react";
import type { ActivityItem, Device, TheftEvent, Tier, User } from "@/lib/api";

interface Props {
  user: User | null;
  device: Device | null;
  latestEvent: TheftEvent | null;
  activity: ActivityItem[];
  location: { latitude: number; longitude: number } | null;
  working: boolean;
}

export function AdminConsole({ user, device, latestEvent, activity, location, working }: Props) {
  const status: "calm" | "investigating" | "lockdown" = working
    ? "investigating"
    : latestEvent?.tier === "HIGH"
      ? "lockdown"
      : latestEvent
        ? "investigating"
        : "calm";

  return (
    <div className="w-full h-full flex flex-col bg-card border border-hairline rounded-2xl overflow-hidden">
      <Header status={status} />
      <div className="flex-1 overflow-y-auto divide-y divide-hairline">
        <IdentityBlock user={user} device={device} location={location} />
        <EventBlock event={latestEvent} working={working} />
        <TimelineBlock activity={activity} />
      </div>
    </div>
  );
}

function Header({ status }: { status: "calm" | "investigating" | "lockdown" }) {
  const label =
    status === "calm" ? "All quiet" : status === "investigating" ? "Investigating" : "Lockdown active";
  const dot =
    status === "calm" ? "bg-safe-ink" : status === "investigating" ? "bg-warn-ink" : "bg-red-700";
  return (
    <div className="px-6 py-4 border-b border-hairline flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-ink" />
          <span className="font-medium tracking-tight">Sankofa Console</span>
        </div>
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-soft">
          Operator view
        </span>
      </div>
      <div className="inline-flex items-center gap-2 rounded-full border border-hairline px-3 py-1">
        <span className={`h-1.5 w-1.5 rounded-full ${dot} ${status !== "calm" ? "sankofa-pulse" : ""}`} />
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted">{label}</span>
      </div>
    </div>
  );
}

function IdentityBlock({
  user,
  device,
  location,
}: {
  user: User | null;
  device: Device | null;
  location: { latitude: number; longitude: number } | null;
}) {
  return (
    <div className="px-6 py-5 grid grid-cols-2 gap-5">
      <Field label="Protected person" value={user?.name ?? "—"} sub={user?.phoneE164 ?? ""} />
      <Field
        label="Wallet"
        value={user?.walletFrozen ? "Frozen" : "Active"}
        tone={user?.walletFrozen ? "warn" : "safe"}
      />
      <Field label="Device IMEI" value={device?.imei ?? "—"} mono />
      <Field
        label="Device status"
        value={device?.blacklisted ? "Blacklisted" : "Clean"}
        tone={device?.blacklisted ? "warn" : "safe"}
      />
      <Field
        label="Home"
        value={user ? `${user.homeCenterLat.toFixed(3)}, ${user.homeCenterLng.toFixed(3)}` : "—"}
        sub={user ? `within ${user.homeRadiusKm} km` : ""}
        mono
      />
      <Field
        label="Last known location"
        value={location ? `${location.latitude.toFixed(3)}, ${location.longitude.toFixed(3)}` : "—"}
        sub={location ? "via CAMARA Location Retrieval" : "no event yet"}
        mono
      />
    </div>
  );
}

function Field({
  label,
  value,
  sub,
  mono,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  mono?: boolean;
  tone?: "safe" | "warn";
}) {
  const valueTone =
    tone === "warn" ? "text-warn-ink" : tone === "safe" ? "text-safe-ink" : "text-ink";
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-soft">{label}</span>
      <span className={`${mono ? "font-mono text-sm" : "text-sm"} ${valueTone} truncate`}>{value}</span>
      {sub && <span className="text-[11px] text-soft">{sub}</span>}
    </div>
  );
}

function EventBlock({ event, working }: { event: TheftEvent | null; working: boolean }) {
  if (working && !event) {
    return (
      <div className="px-6 py-8 flex items-center gap-3">
        <div className="flex gap-1.5">
          <span className="sankofa-dot h-1.5 w-1.5 rounded-full bg-ink" />
          <span className="sankofa-dot h-1.5 w-1.5 rounded-full bg-ink" style={{ animationDelay: "0.2s" }} />
          <span className="sankofa-dot h-1.5 w-1.5 rounded-full bg-ink" style={{ animationDelay: "0.4s" }} />
        </div>
        <span className="text-sm text-muted">Reading CAMARA signals…</span>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="px-6 py-8">
        <p className="text-sm text-muted">
          No events yet. Press <span className="text-ink">Simulate theft</span> to see Sankofa respond in real time.
        </p>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-soft mb-1">
            Latest decision
          </div>
          <h3 className="text-lg font-medium tracking-tight">
            {triggerLabel(event.trigger)} — scored {Math.round(event.aiScore * 100)}%
          </h3>
        </div>
        <TierBadge tier={event.tier} />
      </div>

      <div className="rounded-xl bg-paper border border-hairline p-5">
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-soft mb-3">
          Why Sankofa thinks this is theft
        </div>
        <Reasoning text={event.reasoning} />
      </div>

      <div className="flex items-center gap-3 text-[11px] text-soft">
        <span>Trigger: {event.trigger.replace(/_/g, " ").toLowerCase()}</span>
        <span>·</span>
        <span>{formatTime(event.createdAt)}</span>
      </div>
    </div>
  );
}

function TierBadge({ tier }: { tier: Tier }) {
  const styles: Record<Tier, string> = {
    LOW: "bg-paper text-muted border-hairline",
    MEDIUM: "bg-warn-bg text-warn-ink border-transparent",
    HIGH: "bg-red-50 text-red-700 border-red-100",
  };
  const label: Record<Tier, string> = {
    LOW: "Low · watch",
    MEDIUM: "Medium · challenge",
    HIGH: "High · full lockdown",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium tracking-tight ${styles[tier]}`}
    >
      {label[tier]}
    </span>
  );
}

function TimelineBlock({ activity }: { activity: ActivityItem[] }) {
  return (
    <div className="px-6 py-5">
      <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-soft mb-3">
        Activity
      </div>
      {activity.length === 0 ? (
        <p className="text-sm text-soft">Nothing on the timeline yet.</p>
      ) : (
        <ul className="space-y-4">
          {activity.slice(0, 6).map((a) => (
            <li key={a.id} className="flex gap-3">
              <div className="pt-1.5">
                <span className="block h-1.5 w-1.5 rounded-full bg-ink" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-ink leading-snug">{a.message}</div>
                <div className="font-mono text-[10px] tracking-[0.15em] uppercase text-soft mt-0.5">
                  {a.kind.replace(/_/g, " ")} · {formatTime(a.createdAt)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Renders Claude's reasoning text as a readable list. The model tends to
// structure the decision as "(1) ... (2) ... (3) ..." with **bold** emphasis
// and dense prose. We split on the numbered markers and render each point as
// its own paragraph so the console doesn't become a wall of text.
function Reasoning({ text }: { text: string }) {
  const points = splitReasoning(text);

  if (points.length <= 1) {
    return (
      <p className="text-[13px] text-ink leading-relaxed">{renderInline(text)}</p>
    );
  }

  return (
    <ol className="space-y-3">
      {points.map((p, i) => (
        <li key={i} className="flex gap-3">
          <span className="font-mono text-[10px] tracking-[0.12em] text-soft pt-1 w-5 shrink-0">
            {String(i + 1).padStart(2, "0")}
          </span>
          <p className="text-[13px] text-ink leading-relaxed flex-1">
            {renderInline(p)}
          </p>
        </li>
      ))}
    </ol>
  );
}

function splitReasoning(text: string): string[] {
  // Split on "(1)", "(2)", ... preserving the content between markers. If the
  // model didn't use numbered points, fall back to splitting on sentences-that-
  // start-a-new-idea (". **Label**: …") so we still break it up visually.
  const numbered = text.split(/\s*\(\d+\)\s*/).map((s) => s.trim()).filter(Boolean);
  if (numbered.length >= 2) return numbered;

  const labeled = text
    .split(/(?<=\.)\s+(?=\*\*[^*]+\*\*:)/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (labeled.length >= 2) return labeled;

  return [text];
}

function renderInline(text: string): React.ReactNode[] {
  // Minimal inline markdown — just **bold**. Anything else passes through.
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong key={i} className="font-medium text-ink">
          {p.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

function triggerLabel(t: string) {
  switch (t) {
    case "SIM_SWAP":
      return "SIM swap detected";
    case "DEVICE_SWAP":
      return "Device swap detected";
    case "DEVICE_OFFLINE":
      return "Device went offline";
    case "MANUAL":
      return "Manual trigger";
    default:
      return t;
  }
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
