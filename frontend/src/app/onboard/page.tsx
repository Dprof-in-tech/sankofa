"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type Step = 1 | 2 | 3 | 4 | 5;

interface HomeLocation {
  lat: number;
  lng: number;
  label: string;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  imei: string;
  homeLocation: HomeLocation | null;
  trustedName: string;
  trustedEmail: string;
  pin: string[];
  pinConfirm: string[];
}

const EMPTY: FormState = {
  name: "", email: "", phone: "", imei: "",
  homeLocation: null,
  trustedName: "", trustedEmail: "",
  pin: ["", "", "", "", "", ""],
  pinConfirm: ["", "", "", "", "", ""],
};

const STEP_LABELS = ["Your details", "Your device", "Home area", "Safety net", "Resolve PIN"];

export default function OnboardPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [pinError, setPinError] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);

  const set = (field: keyof Omit<FormState, "pin" | "pinConfirm">) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));

  const canAdvance = (): boolean => {
    switch (step) {
      case 1: return !!form.name.trim() && !!form.email.trim() && !!form.phone.trim();
      case 2: return form.imei.replace(/\s/g, "").length === 15;
      case 3: return form.homeLocation !== null;
      case 4: return !!form.trustedName.trim() && !!form.trustedEmail.trim();
      case 5: {
        const pin = form.pin.join("");
        const confirm = form.pinConfirm.join("");
        return pin.length === 6 && confirm.length === 6 && pin === confirm;
      }
    }
  };

  const advance = () => {
    if (step === 5) {
      if (form.pin.join("") !== form.pinConfirm.join("")) {
        setPinError("PINs don't match — try again.");
        return;
      }
      setPinError(null);
      setActivating(true);
      setTimeout(() => router.push("/demo"), 400);
      return;
    }
    setStep((step + 1) as Step);
  };

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
          Step {step} of 5
        </span>
      </nav>

      <section className="flex-1 px-8 sm:px-12 py-12 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-20 items-center w-full max-w-5xl mx-auto">

          {/* ── Form column ── */}
          <div className="w-full max-w-md mx-auto lg:mx-0">

            {/* Step dots */}
            <div className="flex items-center gap-1.5 mb-10">
              {STEP_LABELS.map((_, i) => {
                const n = i + 1;
                return (
                  <div key={n} className="flex items-center gap-1.5">
                    <div
                      className={[
                        "h-1.5 rounded-full transition-all duration-300",
                        step > n
                          ? "w-1.5 bg-safe-ink"
                          : step === n
                            ? "w-4 bg-ink"
                            : "w-1.5 bg-hairline",
                      ].join(" ")}
                    />
                  </div>
                );
              })}
            </div>

            {step === 1 && <StepDetails form={form} set={set} />}
            {step === 2 && <StepDevice form={form} set={set} />}
            {step === 3 && <StepHomeArea form={form} setForm={setForm} />}
            {step === 4 && <StepTrusted form={form} set={set} />}
            {step === 5 && (
              <StepPin form={form} setForm={setForm} pinError={pinError} />
            )}

            <div className="mt-8 flex flex-col gap-3">
              <button
                onClick={advance}
                disabled={!canAdvance() || activating}
                className="h-14 w-full rounded-full bg-ink text-paper font-medium text-base hover:opacity-85 transition-opacity disabled:opacity-30"
              >
                {activating
                  ? "Activating…"
                  : step === 5
                    ? "Activate protection"
                    : "Continue"}
              </button>
              {step > 1 && !activating && (
                <button
                  onClick={() => setStep((step - 1) as Step)}
                  className="h-10 w-full rounded-full border border-hairline text-sm text-soft hover:text-ink transition-colors"
                >
                  Back
                </button>
              )}
            </div>
          </div>

          {/* ── Phone preview column ── */}
          <div className="hidden lg:flex justify-center">
            <OnboardPhonePreview step={step} form={form} />
          </div>

        </div>
      </section>
    </main>
  );
}

// ─── Step 1: Your details ────────────────────────────────────────────────────

function StepDetails({
  form,
  set,
}: {
  form: FormState;
  set: (f: keyof Omit<FormState, "pin" | "pinConfirm">) => (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-soft mb-3">
        Step 1 — Your details
      </p>
      <h2 className="text-3xl font-medium tracking-tight text-ink mb-2">
        Who are we protecting?
      </h2>
      <p className="text-[15px] text-muted leading-relaxed mb-8">
        Sankofa ties your protection to your carrier identity — no account
        password, no app to install.
      </p>

      <div className="space-y-4">
        <Field label="Full name" htmlFor="name">
          <input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Kemi Adeyemi"
            value={form.name}
            onChange={set("name")}
            className={inputCls}
          />
        </Field>

        <Field
          label="Email address"
          htmlFor="email"
          hint="Alerts and your emergency undo link arrive here."
        >
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="kemi@example.com"
            value={form.email}
            onChange={set("email")}
            className={inputCls}
          />
        </Field>

        <Field
          label="Phone number"
          htmlFor="phone"
          hint="The number registered on your SIM. Include country code."
        >
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+234 801 234 5678"
            value={form.phone}
            onChange={set("phone")}
            className={inputCls}
          />
        </Field>
      </div>
    </div>
  );
}

// ─── Step 2: Device ──────────────────────────────────────────────────────────

function StepDevice({
  form,
  set,
}: {
  form: FormState;
  set: (f: keyof Omit<FormState, "pin" | "pinConfirm">) => (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const raw = form.imei.replace(/\s/g, "");
  const valid = raw.length === 15;

  return (
    <div>
      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-soft mb-3">
        Step 2 — Your device
      </p>
      <h2 className="text-3xl font-medium tracking-tight text-ink mb-2">
        Register your IMEI.
      </h2>
      <p className="text-[15px] text-muted leading-relaxed mb-8">
        Your IMEI is your phone&apos;s permanent carrier-level identity. It stays
        the same after a SIM change or factory reset — which is exactly how
        Sankofa keeps tracking the device, not the SIM.
      </p>

      <Field
        label="IMEI number"
        htmlFor="imei"
        hint={
          <>
            Dial{" "}
            <code className="font-mono text-xs bg-card border border-hairline rounded px-1">
              *#06#
            </code>{" "}
            or go to Settings → About → IMEI.
          </>
        }
      >
        <input
          id="imei"
          type="text"
          inputMode="numeric"
          placeholder="35 789123 456789 0"
          maxLength={17}
          value={form.imei}
          onChange={set("imei")}
          className={[
            inputCls,
            valid ? "border-safe-ink ring-1 ring-safe-ink" : "",
          ].join(" ")}
        />
      </Field>

      {valid && (
        <div className="mt-3 flex items-center gap-2 text-[13px] text-safe-ink">
          <span className="h-1.5 w-1.5 rounded-full bg-safe-ink" />
          IMEI looks correct
        </div>
      )}

      <div className="mt-8 rounded-xl border border-hairline bg-card px-5 py-4 text-[13px] text-muted leading-relaxed">
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-soft mb-2">
          Why we need this
        </p>
        Sankofa is not an app on your phone. It lives at the carrier network
        layer. Your IMEI lets us watch for SIM swaps, track the device even
        after a reset, and flag it on every carrier in the region — without
        needing anything installed on the phone.
      </div>
    </div>
  );
}

// ─── Step 3: Home area ───────────────────────────────────────────────────────

function StepHomeArea({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detect = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser.");
      return;
    }
    setDetecting(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        let label = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { "Accept-Language": "en" } },
          );
          const data = await res.json();
          const a = data.address ?? {};
          const parts = [
            a.suburb ?? a.quarter ?? a.neighbourhood ?? a.village ?? a.road,
            a.city ?? a.town ?? a.municipality ?? a.county,
          ].filter(Boolean) as string[];
          if (parts.length) label = parts.join(", ");
        } catch { /* keep coordinate label */ }
        setForm(prev => ({ ...prev, homeLocation: { lat, lng, label } }));
        setDetecting(false);
      },
      (err) => {
        setDetecting(false);
        setError(
          err.code === 1
            ? "Location access denied. Please allow location or enter manually."
            : "Could not detect location. Try again.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div>
      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-soft mb-3">
        Step 3 — Home area
      </p>
      <h2 className="text-3xl font-medium tracking-tight text-ink mb-2">
        Where is home?
      </h2>
      <p className="text-[15px] text-muted leading-relaxed mb-8">
        Sankofa scores every theft signal against your home area. A SIM swap
        two streets away is very different from one across the city at midnight.
        The further and later, the higher the alert.
      </p>

      {form.homeLocation ? (
        <div className="rounded-xl border border-safe-ink bg-safe-bg px-5 py-4 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-safe-ink mb-1">
                Home zone set
              </p>
              <p className="text-sm font-medium text-ink">{form.homeLocation.label}</p>
              <p className="font-mono text-[11px] text-soft mt-1">
                {form.homeLocation.lat.toFixed(5)}, {form.homeLocation.lng.toFixed(5)}
              </p>
            </div>
            <button
              onClick={() => setForm(prev => ({ ...prev, homeLocation: null }))}
              className="text-[12px] text-soft hover:text-ink transition-colors shrink-0 mt-0.5"
            >
              Change
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={detect}
          disabled={detecting}
          className="h-12 w-full rounded-xl border border-hairline bg-card text-sm text-ink hover:bg-paper transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mb-4"
        >
          {detecting ? (
            <>
              <span className="sankofa-dot inline-block h-1.5 w-1.5 rounded-full bg-ink" style={{ animationDelay: "0s" }} />
              <span className="sankofa-dot inline-block h-1.5 w-1.5 rounded-full bg-ink" style={{ animationDelay: "0.2s" }} />
              <span className="sankofa-dot inline-block h-1.5 w-1.5 rounded-full bg-ink" style={{ animationDelay: "0.4s" }} />
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="10" r="3" />
                <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 13 8 13s8-7.75 8-13a8 8 0 0 0-8-8z" />
              </svg>
              Use my current location
            </>
          )}
        </button>
      )}

      {error && (
        <p className="text-sm text-red-600 mb-4">{error}</p>
      )}

      <div className="rounded-xl border border-hairline bg-card px-5 py-4 text-[13px] text-muted leading-relaxed">
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-soft mb-2">
          Production path
        </p>
        In a full MNO integration, Sankofa derives your home zone directly from
        the carrier — the network knows your home tower from historical usage,
        the same way it calculates roaming charges. No user input needed. The
        CAMARA Roaming API tells us when your device is on its home network;
        your location at that moment becomes your home zone.
      </div>
    </div>
  );
}

// ─── Step 4: Trusted contact ─────────────────────────────────────────────────

function StepTrusted({
  form,
  set,
}: {
  form: FormState;
  set: (f: keyof Omit<FormState, "pin" | "pinConfirm">) => (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-soft mb-3">
        Step 3 — Safety net
      </p>
      <h2 className="text-3xl font-medium tracking-tight text-ink mb-2">
        Who do you trust most?
      </h2>
      <p className="text-[15px] text-muted leading-relaxed mb-8">
        If your phone is stolen, you won&apos;t have it. This person is your backup —
        they&apos;ll be alerted the moment we detect a theft. Pick someone who always
        picks up.
      </p>

      <div className="space-y-4">
        <Field label="Their name" htmlFor="trustedName">
          <input
            id="trustedName"
            type="text"
            placeholder="Tunde Adeyemi"
            value={form.trustedName}
            onChange={set("trustedName")}
            className={inputCls}
          />
        </Field>

        <Field
          label="Their email"
          htmlFor="trustedEmail"
          hint="Their alert and confirm link go here."
        >
          <input
            id="trustedEmail"
            type="email"
            placeholder="tunde@example.com"
            value={form.trustedEmail}
            onChange={set("trustedEmail")}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="mt-8 rounded-xl border border-hairline bg-card px-5 py-4 text-[13px] text-muted leading-relaxed">
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-soft mb-2">
          Their role in your protection
        </p>
        For HIGH-confidence theft alerts, your trusted contact is the only person
        who can confirm a false alarm — even if the thief has your unlocked phone
        and your email open.
      </div>
    </div>
  );
}

// ─── Step 4: Resolve PIN ─────────────────────────────────────────────────────

function StepPin({
  form,
  setForm,
  pinError,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  pinError: string | null;
}) {
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmRefs = useRef<(HTMLInputElement | null)[]>([]);

  type PinRefs = { current: (HTMLInputElement | null)[] };

  const handleDigit = (
    which: "pin" | "pinConfirm",
    refs: PinRefs,
    index: number,
    value: string,
  ) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    setForm(prev => {
      const next = [...prev[which]];
      next[index] = digit;
      return { ...prev, [which]: next };
    });
    if (digit && index < 5) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (
    which: "pin" | "pinConfirm",
    refs: PinRefs,
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !form[which][index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  return (
    <div>
      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-soft mb-3">
        Step 4 — Resolve PIN
      </p>
      <h2 className="text-3xl font-medium tracking-tight text-ink mb-2">
        Set your emergency PIN.
      </h2>
      <p className="text-[15px] text-muted leading-relaxed mb-8">
        If Sankofa fires on a false alarm, you&apos;ll enter this PIN to undo
        the freeze. It lives only in your head — not your phone, not your notes app.
      </p>

      <div className="space-y-6">
        <div>
          <p className="text-sm text-soft mb-3">Choose a 6-digit PIN</p>
          <div className="flex gap-2">
            {form.pin.map((digit, i) => (
              <input
                key={i}
                ref={el => { pinRefs.current[i] = el; }}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleDigit("pin", pinRefs, i, e.target.value)}
                onKeyDown={e => handleKeyDown("pin", pinRefs, i, e)}
                className="h-14 w-10 rounded-xl border border-hairline bg-card text-center text-xl text-ink focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent transition-all"
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm text-soft mb-3">Confirm your PIN</p>
          <div className="flex gap-2">
            {form.pinConfirm.map((digit, i) => (
              <input
                key={i}
                ref={el => { confirmRefs.current[i] = el; }}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleDigit("pinConfirm", confirmRefs, i, e.target.value)}
                onKeyDown={e => handleKeyDown("pinConfirm", confirmRefs, i, e)}
                className={[
                  "h-14 w-10 rounded-xl border bg-card text-center text-xl text-ink focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent transition-all",
                  pinError ? "border-red-300" : "border-hairline",
                ].join(" ")}
              />
            ))}
          </div>
          {pinError && (
            <p className="mt-2 text-sm text-red-600">{pinError}</p>
          )}
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-warn-bg bg-warn-bg px-5 py-4 text-[13px] text-warn-ink leading-relaxed">
        <p className="font-medium mb-1">Do not store this PIN on your phone.</p>
        If a thief has your unlocked phone, they could find it. This PIN only
        works if it lives in your memory, not your notes.
      </div>
    </div>
  );
}

// ─── Phone preview ───────────────────────────────────────────────────────────

function OnboardPhonePreview({ step, form }: { step: Step; form: FormState }) {
  const time = new Date().toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
  const first = form.name.split(" ")[0] || null;

  return (
    <div className="relative mx-auto w-full max-w-[320px] select-none">
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

          <div className="flex flex-col items-center px-6 pb-10 pt-4 min-h-[480px] justify-center">
            {step === 1 && <PhoneStep1 />}
            {step === 2 && <PhoneStep2 imei={form.imei} />}
            {step === 3 && <PhoneStep3Home location={form.homeLocation} />}
            {step === 4 && <PhoneStep4Trusted trusted={form.trustedName} />}
            {step === 5 && <PhoneStep5Pin />}
          </div>
        </div>
      </div>
      <div className="mt-4 text-center font-mono text-[10px] tracking-[0.2em] uppercase text-soft">
        {first ? `${first}'s phone` : "Your phone"}
      </div>
    </div>
  );
}

function PhoneStep1() {
  return (
    <div className="text-center space-y-4 w-full">
      <div className="inline-flex items-center gap-1.5 rounded-full bg-card border border-hairline px-3 py-1 mb-2">
        <span className="h-1.5 w-1.5 rounded-full bg-hairline" />
        <span className="text-[11px] text-soft">Not yet protected</span>
      </div>
      <p className="text-2xl font-light text-ink">Your phone</p>
      <p className="text-xs text-soft leading-relaxed max-w-[200px] mx-auto">
        Sankofa will watch this device at the carrier layer once you complete
        registration.
      </p>
    </div>
  );
}

function PhoneStep2({ imei }: { imei: string }) {
  const raw = imei.replace(/\s/g, "");
  const filled = raw.padEnd(15, "·");
  const display = [
    filled.slice(0, 2),
    filled.slice(2, 8),
    filled.slice(8, 14),
    filled.slice(14),
  ].join(" ");

  return (
    <div className="text-center space-y-4 w-full">
      <div className="inline-flex items-center gap-1.5 rounded-full bg-warn-bg px-3 py-1 mb-2">
        <span className="h-1.5 w-1.5 rounded-full bg-warn-ink" />
        <span className="font-mono text-[10px] tracking-widest uppercase text-warn-ink">
          Registering
        </span>
      </div>
      <p className="text-xs text-soft mb-1">Device IMEI</p>
      <p className="font-mono text-[13px] text-ink tracking-widest leading-relaxed">
        {display}
      </p>
      <p className="text-xs text-soft leading-relaxed">
        This stays on file at the carrier — it survives any SIM change or reset.
      </p>
    </div>
  );
}

function PhoneStep3Home({ location }: { location: HomeLocation | null }) {
  return (
    <div className="text-center space-y-4 w-full">
      <div className="inline-flex items-center gap-1.5 rounded-full bg-warn-bg px-3 py-1 mb-2">
        <span className="h-1.5 w-1.5 rounded-full bg-warn-ink" />
        <span className="font-mono text-[10px] tracking-widest uppercase text-warn-ink">
          Home area
        </span>
      </div>
      {location ? (
        <>
          <div className="rounded-xl border border-safe-ink bg-safe-bg px-4 py-3 text-left">
            <p className="text-[10px] font-mono uppercase tracking-widest text-safe-ink mb-1">
              Home zone confirmed
            </p>
            <p className="text-sm font-medium text-ink leading-snug">{location.label}</p>
            <p className="font-mono text-[11px] text-soft mt-1">
              {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </p>
          </div>
          <p className="text-xs text-soft leading-relaxed">
            Theft events outside this area score higher — the further away, the more suspicious.
          </p>
        </>
      ) : (
        <>
          <div className="h-12 w-12 rounded-full bg-card border border-hairline flex items-center justify-center mx-auto">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-soft" aria-hidden="true">
              <circle cx="12" cy="10" r="3" />
              <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 13 8 13s8-7.75 8-13a8 8 0 0 0-8-8z" />
            </svg>
          </div>
          <p className="text-xs text-soft leading-relaxed max-w-48">
            Share your location to set your home area. We use this to score how far away a theft event is.
          </p>
        </>
      )}
    </div>
  );
}

function PhoneStep4Trusted({ trusted }: { trusted: string }) {
  return (
    <div className="text-center space-y-4 w-full">
      <div className="inline-flex items-center gap-1.5 rounded-full bg-warn-bg px-3 py-1 mb-2">
        <span className="h-1.5 w-1.5 rounded-full bg-warn-ink" />
        <span className="font-mono text-[10px] tracking-widest uppercase text-warn-ink">
          Almost there
        </span>
      </div>
      <div className="rounded-xl border border-hairline bg-card px-4 py-3 text-left">
        <p className="text-[10px] font-mono uppercase tracking-widest text-soft mb-2">
          Trusted contact
        </p>
        <p className="text-sm font-medium text-ink">{trusted || "—"}</p>
        <p className="text-xs text-muted mt-1">
          Alerted within seconds of any theft event.
        </p>
      </div>
      <p className="text-xs text-soft leading-relaxed">
        For HIGH-tier alerts, they&apos;re the only one who can confirm a false alarm.
      </p>
    </div>
  );
}

function PhoneStep5Pin() {
  return (
    <div className="text-center space-y-4 w-full">
      <div className="inline-flex items-center gap-1.5 rounded-full bg-warn-bg px-3 py-1 mb-2">
        <span className="h-1.5 w-1.5 rounded-full bg-warn-ink" />
        <span className="font-mono text-[10px] tracking-widest uppercase text-warn-ink">
          Setting PIN
        </span>
      </div>
      <div className="flex justify-center gap-2 py-2">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-3 w-3 rounded-full bg-ink" />
        ))}
      </div>
      <p className="text-xs text-soft leading-relaxed max-w-50 mx-auto">
        Stored encrypted. Never appears on your phone or in your inbox.
      </p>
    </div>
  );
}

// ─── Shared primitives ───────────────────────────────────────────────────────

const inputCls =
  "h-12 w-full rounded-xl border border-hairline bg-card px-4 text-sm text-ink placeholder:text-soft focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent transition-all";

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink mb-2">
        {label}
      </label>
      {children}
      {hint && (
        <p className="mt-1.5 text-[12px] text-soft leading-snug">{hint}</p>
      )}
    </div>
  );
}
