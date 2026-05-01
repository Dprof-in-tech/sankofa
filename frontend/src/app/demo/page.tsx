"use client";

import Link from "next/link";
import { AdminConsole } from "@/components/AdminConsole";
import { PhoneView } from "@/components/PhoneView";
import { useDemoOrchestrator } from "@/lib/use-demo-orchestrator";

export default function DemoPage() {
  const {
    phase, user, device, activity,
    phoneState, working, error, demoEmail, latestEvent,
    setDemoEmail, onActivate, onSimulate, onReset, onReportStolen, onRegisterSale,
  } = useDemoOrchestrator();

  const activeTheftEvent = latestEvent && !latestEvent.resolved ? latestEvent : null;

  const latestLocation =
    (latestEvent?.id &&
      (activity.find((a) => a.kind === "THEFT_TRIGGER")?.meta as
        | { location?: { latitude: number; longitude: number } }
        | null)
        ?.location) ||
    null;

  if (phase === "setup" || phase === "activating") {
    return (
      <main className="flex-1 flex flex-col">
        <nav className="px-8 sm:px-12 pt-8 flex items-center justify-between">
          <Link
            href="/"
            className="font-mono text-[11px] tracking-[0.2em] uppercase text-soft hover:text-ink transition-colors"
          >
            ← Sankofa
          </Link>
          <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-soft">
            Live demo
          </span>
        </nav>

        <section className="flex-1 px-8 sm:px-12 py-12 flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-20 items-center w-full max-w-5xl mx-auto">

            <div className="w-full max-w-md mx-auto lg:mx-0">
              <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-soft mb-3">
                Registration
              </p>
              <h2 className="text-3xl font-medium tracking-tight text-ink mb-2">
                Meet Kemi.
              </h2>
              <p className="text-[15px] text-muted leading-relaxed mb-8">
                She&apos;s about to cross Third Mainland Bridge at 7pm. Before that,
                she registered her phone with Sankofa. Here&apos;s what that looks like.
              </p>

              <div className="rounded-2xl border border-hairline bg-card divide-y divide-hairline mb-6">
                <RegRow label="Name" value={user?.name ?? "Kemi Adeyemi"} />
                <RegRow label="Phone" value={user?.phoneE164 ?? "+99999991000"} mono />
                <RegRow
                  label="IMEI"
                  value={(() => {
                    const imei = device?.imei ?? "867530999123456";
                    return `${imei.slice(0, 2)} ${imei.slice(2, 8)} ******* ${imei.slice(-1)}`;
                  })()}
                  mono
                />
                <RegRow label="Trusted contact" value="Tunde (husband)" />
                <RegRow label="Resolve PIN" value="●●●●●●" mono />
              </div>

              <div className="mb-8 rounded-xl border border-hairline bg-paper px-5 py-4 text-[13px] text-muted leading-relaxed">
                <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-soft mb-2">
                  What happens now
                </p>
                Sankofa registers Kemi&apos;s IMEI at the carrier level and starts
                watching for SIM swaps, device swaps, and connectivity changes on her
                line — all via Nokia&apos;s CAMARA APIs. No app installed. Nothing on
                the device.
              </div>

              <button
                onClick={onActivate}
                disabled={phase === "activating"}
                className="h-14 w-full rounded-full bg-ink text-paper font-medium text-base hover:opacity-85 transition-opacity disabled:opacity-60"
              >
                {phase === "activating" ? "Activating protection…" : "Activate protection →"}
              </button>
            </div>

            <div className="hidden lg:flex justify-center">
              <SetupPhonePreview activating={phase === "activating"} />
            </div>

          </div>
        </section>
      </main>
    );
  }

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
            onClick={onRegisterSale}
            disabled={!device || working || !!device?.saleInitiated || !!activeTheftEvent}
            title="Mark device as being legitimately sold — next theft trigger should score LOW."
            className="h-10 rounded-full border border-hairline bg-card px-4 text-sm text-ink hover:bg-paper transition-colors disabled:opacity-40"
          >
            {device?.saleInitiated ? "Sale registered" : "Register sale"}
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
            Left is Kemi&apos;s phone. Right is the Sankofa console a carrier operator would see.
            Press <span className="text-ink">Simulate theft</span> to trigger the real CAMARA pipeline.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 max-w-lg">
            <div className="rounded-xl border border-hairline bg-card px-4 py-3">
              <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-soft mb-1.5">Scenario A</p>
              <p className="text-sm font-medium text-ink">Genuine theft</p>
              <p className="text-xs text-muted mt-1 leading-relaxed">Simulate theft → AI scores HIGH → wallet frozen, IMEI blacklisted.</p>
            </div>
            <div className={`rounded-xl border px-4 py-3 transition-colors ${device?.saleInitiated ? "border-hairline bg-safe-bg" : "border-hairline bg-card"}`}>
              <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-soft mb-1.5">Scenario B</p>
              <p className="text-sm font-medium text-ink">False positive suppressed</p>
              <p className="text-xs text-muted mt-1 leading-relaxed">Register sale → Simulate theft → AI scores LOW → no freeze.</p>
              {device?.saleInitiated && (
                <p className="text-xs font-medium text-safe-ink mt-1.5">Sale registered</p>
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-col items-start gap-3">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-soft shrink-0">
              Receive alerts
            </span>
            <input
              type="email"
              value={demoEmail}
              onChange={(e) => setDemoEmail(e.target.value)}
              placeholder="Enter your email to receive the alerts we send"
              className="h-8.5 w-85 rounded-lg border border-hairline bg-card px-3 py-2 text-sm text-ink placeholder:text-soft focus:outline-none focus:ring-1 focus:ring-ink"
            />
          </div>
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
          <div className="min-h-160">
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

// ─── Setup phase phone preview ───────────────────────────────────────────────

function SetupPhonePreview({ activating }: { activating: boolean }) {
  const time = new Date().toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <div className="relative mx-auto w-full max-w-[320px] select-none">
      <div className="relative rounded-[42px] bg-neutral-900 p-2 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.35)]">
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

          <div className="flex flex-col items-center justify-center px-6 pb-10 pt-4 min-h-120 text-center gap-5">
            {activating ? (
              <>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-warn-bg px-3 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-warn-ink" />
                  <span className="font-mono text-[10px] tracking-widest uppercase text-warn-ink">
                    Activating
                  </span>
                </div>
                <div className="flex items-end gap-2 h-6">
                  <span className="sankofa-dot inline-block h-2 w-2 rounded-full bg-ink" style={{ animationDelay: "0s" }} />
                  <span className="sankofa-dot inline-block h-2 w-2 rounded-full bg-ink" style={{ animationDelay: "0.2s" }} />
                  <span className="sankofa-dot inline-block h-2 w-2 rounded-full bg-ink" style={{ animationDelay: "0.4s" }} />
                </div>
                <p className="text-xs text-soft leading-relaxed max-w-48">
                  Registering IMEI with the carrier network…
                </p>
              </>
            ) : (
              <>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-card border border-hairline px-3 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-hairline" />
                  <span className="text-[11px] text-soft">Not yet protected</span>
                </div>
                <p className="text-2xl font-light text-ink">Kemi&apos;s phone</p>
                <p className="text-xs text-soft leading-relaxed max-w-48">
                  Activate protection to register this device at the carrier level.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="mt-4 text-center font-mono text-[10px] tracking-[0.2em] uppercase text-soft">
        Kemi&apos;s phone
      </div>
    </div>
  );
}

// ─── Shared ──────────────────────────────────────────────────────────────────

function RegRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 gap-4">
      <span className="text-[13px] text-soft shrink-0">{label}</span>
      <span className={`text-[13px] text-ink text-right ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}
