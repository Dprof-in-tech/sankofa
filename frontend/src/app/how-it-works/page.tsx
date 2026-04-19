import Link from "next/link";

interface Step {
  n: string;
  title: string;
  body: string;
  tag?: string;
}

const theftJourney: Step[] = [
  {
    n: "01",
    title: "7:00 PM — the snatch",
    body: "Kemi is crossing Third Mainland Bridge in Lagos. A boy on a bike grabs her phone and disappears into traffic. She has no phone to call anyone with, no way to open her banking app, no way to track the device. This is the moment every existing tool stops working.",
  },
  {
    n: "02",
    title: "The network notices before Kemi does",
    body: "Within seconds of the thief popping out Kemi's SIM, her carrier logs a SIM-swap event. Sankofa is listening at the network layer, so the signal reaches us before the phone even leaves the bridge. No app needs to be open. Nothing needs to have Wi-Fi.",
    tag: "CAMARA · SIM Swap",
  },
  {
    n: "03",
    title: "We verify the signal is real",
    body: "False alarms kill trust. Sankofa immediately asks the network to independently confirm the swap, and checks whether the physical device was also swapped. If either returns false, the score is gentler. If both say yes, we know the trigger is genuine.",
    tag: "CAMARA · SIM Swap + Device Swap",
  },
  {
    n: "04",
    title: "We follow the phone, not the SIM",
    body: "A SIM is just a subscriber card — pop it out and it's inert. The phone itself has a permanent hardware ID, the IMEI, that it broadcasts to every cell tower it attaches to, regardless of which SIM is inside. The moment the thief drops their own SIM into Kemi's phone, the carrier's register sees Kemi's IMEI paired with a brand-new number. Sankofa asks the network which line is currently bound to that IMEI, and pivots tracking onto it. The thief can swap SIMs a hundred times — the IMEI keeps ratting them out. This is the layer Find My iPhone can't reach.",
    tag: "IMEI binding · survives every SIM change",
  },
  {
    n: "05",
    title: "Where is the phone right now?",
    body: "We pull live location directly from the cell network — no GPS, no device cooperation needed — and check whether the old device is still reachable. A phone that's gone completely dark seconds after a swap is behaving exactly like a stolen phone.",
    tag: "CAMARA · Location Retrieval + Reachability",
  },
  {
    n: "06",
    title: "Is this actually theft, or is Kemi upgrading?",
    body: "A naive rule engine would freeze every SIM swap. Sankofa's AI agent weighs distance from home, time of day, reachability, swap verification, recent activity, and whether a partner retailer pinged a sale-initiated webhook. It returns an explainable confidence score — the reason, in plain English, shows on the dashboard.",
    tag: "Claude Sonnet 4.6 · Explainable scoring",
  },
  {
    n: "07",
    title: "Freeze the money before the thief moves it",
    body: "If the score crosses into HIGH, Sankofa calls the mobile-money provider directly — Opay, M-Pesa, MTN MoMo — and freezes Kemi's wallet. The thief can hold the phone, but they can't spend a naira. This happens in under a second, faster than a human could ever react.",
    tag: "Partner webhook · Mobile money freeze",
  },
  {
    n: "08",
    title: "Tell Kemi and the people who can help her",
    body: "Kemi doesn't have her phone — so we email her. From any borrowed device, an internet cafe, a family member's laptop, she can open the email and see exactly what happened, where her phone was last, and confirm it was her if it wasn't theft. Her trusted contact gets a separate email in case she needs to call from an unknown number.",
    tag: "Resend · Owner + trusted contact",
  },
  {
    n: "09",
    title: "Turn the phone into a brick",
    body: "The IMEI is blacklisted across every participating carrier in the region. The thief can swap SIMs a hundred times — no network will let the device on. When a phone can't connect to anyone, it can't be resold, which is the whole reason it was stolen. Kill the resale market and you kill the motive.",
    tag: "IMEI registry · Cross-carrier blacklist",
  },
];

const happyPath: Step = {
  n: "✓",
  title: "Or: it wasn't theft at all",
  body: "Every alert Sankofa sends ends with a one-click \"This was me — undo\" button. If Kemi just got a new SIM, bought a new phone, or traveled overseas, she opens the email from any device — her laptop, her sister's phone, a cafe computer — and taps undo. The wallet unfreezes, the event resolves, the IMEI comes off the blacklist. The whole loop stays under her control, without anyone at her carrier or bank needing to be awake.",
  tag: "One-click undo in the email",
};

export default function HowItWorksPage() {
  return (
    <main className="flex-1 flex flex-col">
      <nav className="px-8 sm:px-12 pt-10 flex items-center justify-between">
        <Link
          href="/"
          className="font-mono text-[11px] tracking-[0.2em] uppercase text-soft hover:text-ink transition-colors"
        >
          ← Sankofa
        </Link>
        <span className="hidden sm:inline font-mono text-[11px] tracking-[0.2em] uppercase text-soft">
          How it works
        </span>
      </nav>

      <section className="mx-auto w-full max-w-3xl px-8 sm:px-12 pt-20 pb-12">
        <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-soft mb-8">
          The 60-second journey
        </p>
        <h1 className="text-[40px] sm:text-[56px] leading-[1.05] tracking-tight font-medium text-ink">
          What actually happens
          <br />
          <span className="text-soft">the moment your phone is stolen.</span>
        </h1>
        <p className="mt-8 text-lg sm:text-xl leading-relaxed text-muted">
          Sankofa doesn&apos;t live on your phone. It lives inside the carrier
          network — which is why it still works after a thief yanks the SIM,
          factory resets the device, or tosses it into airplane mode. Here is
          the exact sequence, end to end.
        </p>
      </section>

      <section className="mx-auto w-full max-w-3xl px-8 sm:px-12 pb-24">
        <ol className="relative">
          {theftJourney.map((step, i) => (
            <li key={step.n} className="relative pl-16 sm:pl-20 pb-14 last:pb-0">
              {i < theftJourney.length - 1 && (
                <span
                  aria-hidden
                  className="absolute left-[18px] sm:left-[22px] top-12 bottom-0 w-px bg-hairline"
                />
              )}
              <span className="absolute left-0 top-0 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-card border border-hairline font-mono text-[11px] tracking-[0.12em] text-soft">
                {step.n}
              </span>
              <h2 className="text-xl sm:text-2xl leading-tight tracking-tight text-ink font-medium">
                {step.title}
              </h2>
              {step.tag && (
                <p className="mt-2 font-mono text-[10px] tracking-[0.2em] uppercase text-soft">
                  {step.tag}
                </p>
              )}
              <p className="mt-3 text-[15px] sm:text-base leading-relaxed text-muted">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto w-full max-w-3xl px-8 sm:px-12 pb-24">
        <div className="rounded-2xl border border-hairline bg-card p-8 sm:p-10">
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-soft mb-3">
            The happy path
          </p>
          <h2 className="text-xl sm:text-2xl leading-tight tracking-tight text-ink font-medium">
            {happyPath.title}
          </h2>
          {happyPath.tag && (
            <p className="mt-2 font-mono text-[10px] tracking-[0.2em] uppercase text-soft">
              {happyPath.tag}
            </p>
          )}
          <p className="mt-3 text-[15px] sm:text-base leading-relaxed text-muted">
            {happyPath.body}
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-8 sm:px-12 pb-24">
        <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-soft mb-6">
          Why this works
        </p>
        <h2 className="text-2xl sm:text-3xl leading-tight tracking-tight text-ink font-medium">
          A phone the network has disowned is worth nothing to anyone.
        </h2>
        <p className="mt-6 text-[15px] sm:text-base leading-relaxed text-muted">
          Find My iPhone and Google Find My Device both assume the thief
          doesn&apos;t know about the factory-reset button. Every thief does.
          Sankofa works at the telecom layer — the one layer a thief cannot
          bypass with a button — so the phone stays tied to Kemi&apos;s identity
          across every SIM, every reset, every owner.
        </p>
        <p className="mt-4 text-[15px] sm:text-base leading-relaxed text-muted">
          Kill the resale market, and you kill the motivation to steal.
        </p>
      </section>

      <section className="mx-auto w-full max-w-3xl px-8 sm:px-12 pb-24">
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/demo"
            className="inline-flex h-14 items-center justify-center rounded-full bg-ink px-8 text-paper text-base font-medium tracking-tight hover:opacity-85 transition-opacity"
          >
            See it happen →
          </Link>
          <Link
            href="/"
            className="inline-flex h-14 items-center justify-center rounded-full border border-hairline bg-card px-8 text-ink text-base font-medium tracking-tight hover:bg-paper transition-colors"
          >
            Back to home
          </Link>
        </div>
      </section>

      <footer className="px-8 sm:px-12 pb-10 pt-6 border-t border-hairline flex items-center justify-between">
        <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-soft">
          Lagos · Accra · Nairobi · Kigali
        </span>
        <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-soft">
          Built on CAMARA
        </span>
      </footer>
    </main>
  );
}
