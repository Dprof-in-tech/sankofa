import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col">
      <header className="px-8 sm:px-12 pt-10 flex items-center justify-between">
        <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-soft">
          Sankofa
        </span>
        <span className="hidden sm:inline font-mono text-[11px] tracking-[0.2em] uppercase text-soft">
          Africa Ignite · Team Kemi&apos;s Protectors
        </span>
      </header>

      <section className="flex-1 flex items-center">
        <div className="mx-auto w-full max-w-3xl px-8 sm:px-12 py-24">
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-soft mb-8">
            A phone theft shield
          </p>
          <h1 className="text-[40px] sm:text-[56px] leading-[1.05] tracking-tight font-medium text-ink">
            When your phone is stolen,
            <br />
            <span className="text-soft">the network already knows.</span>
          </h1>
          <p className="mt-8 text-lg sm:text-xl leading-relaxed text-muted max-w-2xl">
            Sankofa watches your phone at the carrier level. The moment someone
            swaps the SIM or switches the device, we freeze your money, track
            the new SIM, and make the phone unusable on every network in the
            region.
          </p>
          <p className="mt-4 text-lg sm:text-xl leading-relaxed text-muted max-w-2xl">
            A stolen phone no one can sell isn&apos;t worth stealing.
          </p>

          <div className="mt-12 flex flex-col sm:flex-row gap-3">
            <Link
              href="/onboard"
              className="inline-flex h-14 items-center justify-center rounded-full bg-ink px-8 text-paper text-base font-medium tracking-tight hover:opacity-85 transition-opacity"
            >
              Get protected →
            </Link>
            <Link
              href="/demo"
              className="inline-flex h-14 items-center justify-center rounded-full border border-hairline bg-card px-8 text-ink text-base font-medium tracking-tight hover:bg-paper transition-colors"
            >
              See it happen
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex h-14 items-center justify-center rounded-full border border-hairline bg-card px-8 text-ink text-base font-medium tracking-tight hover:bg-paper transition-colors"
            >
              How it works
            </Link>
          </div>

        </div>
      </section>

      <footer className="px-8 sm:px-12 pb-10 flex items-center justify-between border-t border-hairline pt-6">
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

