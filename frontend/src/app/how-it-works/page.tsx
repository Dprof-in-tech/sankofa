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
    body: "Kemi is crossing Third Mainland Bridge in Lagos. A boy on a bike grabs her phone and disappears into traffic. She has no phone to call anyone with. But the real danger isn't the lost hardware — it's what the thief can do with it in the next five minutes. Her Opay wallet. Her bank OTPs. Her MTN MoMo. Every account she's ever logged into on that device is now one unlock away from being drained. This is the attack that existing tools don't address.",
  },
  {
    n: "02",
    title: "The network notices before Kemi does",
    body: "Within seconds of the thief popping out Kemi's SIM, her carrier logs a SIM-swap event. Sankofa is listening at the network layer via Nokia's CAMARA APIs, so the signal reaches us before the phone even leaves the bridge. No app needs to be open. Nothing needs Wi-Fi. The carrier itself is our sensor.",
    tag: "CAMARA · SIM Swap detection",
  },
  {
    n: "03",
    title: "We verify the signal is real — false alarms destroy trust",
    body: "A SIM swap alone isn't proof of theft. Kemi could be at a carrier store buying a new phone right now. Sankofa asks the network two independent questions: did the SIM change, and did the physical device change? If a partner retailer already told us a sale was in progress, the score drops immediately. If both signals say yes and no sale was registered, we know this is real.",
    tag: "CAMARA · SIM Swap + Device Swap · Sale-initiated webhook",
  },
  {
    n: "04",
    title: "Track the phone while it's still on the network",
    body: "While the device is still connected — original SIM or not — Sankofa pulls live location from the carrier via CAMARA Location Retrieval and confirms the device is reachable. Cell-tower triangulation puts us within 300 metres in dense Lagos. This window is short: the moment the thief removes the SIM or resets the phone, the network loses the device. Sankofa uses every second of it. When the phone goes dark, we shift entirely to financial containment — which is where the real damage was always going to happen anyway.",
    tag: "CAMARA · Location Retrieval + Device Reachability",
  },
  {
    n: "05",
    title: "The AI decides — and explains itself",
    body: "Every signal feeds into Sankofa's Claude-powered scoring engine: distance from Kemi's home, time of day, swap verification results, reachability status, hours since last activity, and whether the area has an active theft cluster. It returns a confidence score from 0 to 1 and a plain-English explanation that shows on the operator dashboard. Judges, investigators, and Kemi herself can see exactly why the system decided what it decided. There is no black box.",
    tag: "Claude Sonnet 4.6 · Explainable theft scoring",
  },
  {
    n: "06",
    title: "Freeze the money before the thief moves it",
    body: "This is the protection that matters most. The thief has the hardware — that's already lost. But Kemi's Opay wallet, her MoMo balance, her bank accounts linked to OTPs arriving on that number: those can still be saved. At HIGH confidence, Sankofa fires a freeze signal directly to her mobile money provider. The thief can hold the phone all night. They cannot move a single naira. In Sub-Saharan Africa, where mobile money is the primary financial instrument for hundreds of millions of people, this is the line between an inconvenience and a catastrophe.",
    tag: "Mobile money freeze · Financial fraud prevention",
  },
  {
    n: "07",
    title: "Alert Kemi and the one person who can help her",
    body: "Kemi doesn't have her phone — so Sankofa emails her. From any borrowed device, internet cafe, or family member's laptop, she sees what happened, where the phone last was, and what's been locked. Her trusted contact gets a separate alert and can physically help or coordinate. For HIGH-tier alerts, the trusted contact is also the only one who can confirm a false alarm — even if the thief has Kemi's unlocked phone and her email open. The thief cannot reach the trusted contact's inbox.",
    tag: "Resend · Owner + trusted contact alerts",
  },
  {
    n: "08",
    title: "Register the IMEI as stolen — kill the resale market",
    body: "A phone that can't be resold isn't worth stealing. Sankofa registers Kemi's IMEI in its stolen device registry. Partner vendors, second-hand dealers, and carrier agents who check before activating a handset will see it flagged. This is live today. Full network-level blocking — where the carrier's own infrastructure refuses to register the IMEI with any SIM — requires direct MNO partnerships. That is Sankofa's next phase. The registry kills the resale market now. The network block makes it permanent.",
    tag: "Sankofa device registry · Kills resale value",
  },
];

const happyPath: Step = {
  n: "✓",
  title: "Or: it wasn't theft at all",
  body: "Sankofa sends every alert with a clear path back. For medium-confidence events, Kemi enters her resolve PIN from any browser and the freeze lifts immediately. For high-confidence events — where the stakes are highest — her trusted contact receives a separate confirmation request. Only when they confirm does everything unfreeze: wallet, registry flag, tracking. This two-step structure means even a thief who has Kemi's phone and her email open cannot undo the protection, because they cannot reach her trusted contact's inbox.",
  tag: "Resolve PIN · Trusted contact confirmation",
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
          The phone is the least valuable thing in your pocket. The dangerous
          part is what a thief can do with it: drain your mobile money, intercept
          your bank OTPs, and empty every account you&apos;ve ever logged into on
          that device. Sankofa lives inside the carrier network — not on your phone
          — so it acts before the thief does. Here is the exact sequence,
          end to end.
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
          The hardware is already gone. The money doesn&apos;t have to be.
        </h2>
        <p className="mt-6 text-[15px] sm:text-base leading-relaxed text-muted">
          Find My iPhone and Google Find My Device protect the device. Sankofa
          protects your financial identity. Those are different problems. A thief
          who factory-resets a phone in 90 seconds has defeated every app-based
          solution — but they haven&apos;t defeated the carrier network, and
          that&apos;s where Sankofa lives.
        </p>
        <p className="mt-4 text-[15px] sm:text-base leading-relaxed text-muted">
          In Sub-Saharan Africa, mobile money isn&apos;t a convenience — it&apos;s
          infrastructure. MTN MoMo, Opay, M-Pesa, and Airtel Money are how
          hundreds of millions of people pay rent, buy food, and send money home.
          A stolen phone is a stolen wallet. Sankofa closes that window before
          the thief can open it.
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
