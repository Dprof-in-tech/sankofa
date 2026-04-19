# Sankofa

> *"Go back and retrieve what was taken"* — Akan proverb

**Network-level phone theft & fraud shield for Sub-Saharan Africa.**
Detects theft the instant it happens, freezes the mobile-money wallet,
tracks the phone after the thief swaps the SIM, and renders the device
commercially worthless across every participating carrier.

Built for the **Africa Ignite Hackathon** — Team *Kemi's Protectors*.

---

## Why this exists

Find My iPhone and Google Find My Device both assume the thief doesn't know
about the factory-reset button. Every thief does. Sankofa works at the
**telecom network layer** — the one layer a thief cannot bypass with a
button — so the phone stays tied to its owner's identity across every SIM,
every reset, every resale attempt.

Kill the resale market, and you kill the motivation to steal.

---

## The Kemi scenario

7pm on Third Mainland Bridge, Lagos. A boy on a bike snatches Kemi's phone.
Within 60 seconds Sankofa:

1. **Detects** the theft signal — the carrier logs a SIM swap and Sankofa
   is listening at the network layer.
2. **Verifies** via CAMARA that the swap is real (SIM Swap + Device Swap).
3. **Follows the phone, not the SIM** — the IMEI is the permanent hardware ID;
   it keeps ratting the thief out across every SIM change.
4. **Scores** the event with Claude Sonnet 4.6 — explainable confidence score,
   not a blind rule.
5. **Freezes** Kemi's Opay wallet via a partner webhook.
6. **Emails** Kemi (and her trusted contact) from any borrowed device with a
   one-click *"This was me — undo"* button.
7. **Tracks** live location until she resolves the event.
8. **Blacklists** the IMEI across carriers — the device is a brick.

Every part of the pipeline is visible on the admin console in real time.

---

## Architecture

```
sankofa/
├── frontend/        Next.js 16.2.4 + React 19 + Tailwind v4
│                    Two views from one codebase:
│                      · phone-styled user UI (victim's POV)
│                      · live admin dashboard (judges' POV)
│                      · /how-it-works explainer
├── backend/         Express 5 + Prisma 7 + Postgres (ESM)
│                    src/services/camara.ts           — CAMARA API calls
│                    src/services/ai.ts               — agentic decision engine
│                    src/services/email.ts            — Resend transactional email
│                    src/services/location-tracker.ts — continuous post-theft tracking
│                    src/controllers/                 — theft / webhook / demo
├── vercel.json      experimentalServices: web (/) + api (/api)
└── package.json     concurrently runs both in dev
```

### External dependencies

| Service | Role |
|---|---|
| **Nokia Network-as-Code (CAMARA)** | SIM Swap, Device Swap, Location Retrieval, Device Reachability |
| **Vercel AI Gateway → Claude Sonnet 4.6** | Explainable theft confidence scoring |
| **Resend** | Transactional email (owner + trusted contact) |
| **Postgres** (Neon / Vercel Postgres / local) | Users, devices, events, activity log |

---

## Getting started

### Prerequisites

- Node.js 20+
- A Postgres database URL
- API keys: Nokia Network-as-Code, Vercel AI Gateway, Resend

### Install

```bash
git clone <this-repo>
cd sankofa
npm install
npm install --prefix frontend
npm install --prefix backend
```

### Configure

Copy `.env.example` to `.env` at the repo root and fill in the keys.
`vercel.json` passes the same env vars to both services in production.

```bash
cp .env.example .env
# then edit .env
```

### Push schema + seed

```bash
cd backend
npm run db:push
npm run db:seed   # creates the Kemi demo user + her device
cd ..
```

### Run

```bash
npm run dev
```

Frontend: [http://localhost:3000](http://localhost:3000)
Backend API: [http://localhost:3001](http://localhost:3001) (proxied by the
frontend at `/api/*` — the browser never needs to know the backend URL)

---

## Demo flow

1. Open [http://localhost:3000](http://localhost:3000) — the landing page
   explains the product. `/how-it-works` walks the full 60-second journey.
2. Click **See the demo**. Two panes: Kemi's phone (left) and the
   operator console (right).
3. Hit **Simulate theft** to fire a SIM-swap trigger (or **Report stolen**
   for the passive-theft case where the thief never swaps the SIM).
4. Watch the console: CAMARA swap verdicts → AI score → wallet freeze →
   IMEI blacklist → email sent.
5. Check the seeded email inboxes — owner + trusted contact each get an
   alert with a **"This was me — undo"** button. Clicking it flips the
   event to resolved, unfreezes the wallet, un-blacklists the IMEI, and
   stops location tracking.
6. While the event is open, the location tracker polls CAMARA every 30s.
   Movement of ≥500m triggers a follow-up email.

Reset any time via the **Reset demo** button.

---

## How it stays network-native after a SIM swap

A SIM is just a subscriber card — pop it out and it's inert. The phone
itself has a permanent hardware ID, the IMEI, that it broadcasts to every
cell tower it attaches to, regardless of which SIM is inside.

When the thief drops their own SIM into Kemi's phone, the carrier's
register sees Kemi's IMEI paired with a brand-new number. Sankofa's
timeline surfaces this pivot (`IMEI_BOUND_MSISDN` activity) and keeps
tracking on the new line.

CAMARA doesn't standardise an IMEI→MSISDN lookup yet — it's an MNO-internal
capability today. That's honestly why Sankofa belongs **inside carriers**,
not on top of them. The business model (§ below) reflects that.

---

## Business model

- **B2C freemium** — basic protection free; premium tier for family plans
  and device insurance.
- **B2B licensing** — banks and mobile-money operators pay for real-time
  theft signals. They save more in fraud than we charge.
- **MNO revenue share** — stolen-device registry licensed to telcos.

---

## Hackathon context

- Primary theme: **Financial Inclusion, Secure Payments & Anti-Fraud**
- Secondary theme: **Health Access, Emergency Response & Community Safety**
- Also: **Open Innovation**

Phase timeline:

| Window | Focus |
|---|---|
| Apr 24 – Apr 30, 2026 | CAMARA sandbox wired · SIM/Device swap end-to-end |
| May 1 – May 7, 2026  | Agentic AI engine · location pipeline · IMEI blacklist · mock bank webhook |
| May 8 – May 10, 2026 | Polish · 3-min demo video · repo cleanup |

---

## License

MIT — see [LICENSE](./LICENSE).
