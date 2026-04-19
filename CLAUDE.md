# Sankofa — Network-Level Phone Theft & Fraud Shield

> *"Go back and retrieve what was taken"* — Akan proverb

Sankofa is a network-native security platform for Sub-Saharan Africa that detects phone theft the instant it happens, auto-freezes linked mobile money accounts, tracks the stolen device after the thief swaps the SIM, and renders the device commercially worthless across any participating network. It operates at the **telecom network layer** via Nokia-hosted **CAMARA APIs** — the structural reason it solves what Find My iPhone / Google Find My Device cannot: a thief with a factory-reset button.

Built for the **Africa Ignite Hackathon** — Team *Kemi's Protectors*.

---

## The one-sentence pitch

> A phone the network has disowned is worth nothing to anyone. Kill the resale market, and you kill the motivation to steal.

---

## The Kemi scenario (our demo north star)

7pm on Third Mainland Bridge, Lagos. A boy on a bike snatches Kemi's phone. Within 60 seconds Sankofa:
1. **Detects** the theft signal (sudden SIM/Device swap with no prior sale webhook).
2. **Decides** it is theft (agentic AI scores the event against her patterns).
3. **Freezes** her Opay wallet via a partner webhook.
4. **Tracks** the new SIM's location via CAMARA Location Retrieval.
5. **Blacklists** the IMEI across carriers — the device is now a brick.

Every demo decision gets evaluated against: *does it make the Kemi story land in 3 minutes?*

---

## Architecture at a glance

```
Monorepo root
├── frontend/   Next.js 16.2.4 + React 19 + Tailwind v4
│                Two views from one codebase:
│                  - phone-styled user UI (victim's POV)
│                  - live admin dashboard (judges' POV — split screen demo shot)
├── backend/    Express 5 + Prisma 7 + Postgres, ESM (`"type": "module"`)
│                src/services/camara.ts  — all 7 CAMARA API calls
│                src/services/ai.ts      — agentic decision engine
│                src/controllers/webhook.controller.ts — bank/MMO signals
└── package.json  concurrently runs `npm run dev` for both
```

**Deployment target:** Vercel (frontend) + Railway (backend + Postgres + Redis). Free tier for the demo.

**Prisma quirk to remember:** client is generated to `backend/src/generated/prisma` (non-default `output` path). Import from `./generated/prisma/index.js` with the `.js` extension because backend is ESM.

---

## CAMARA APIs — 7 endpoints, 3 categories

All hit via the **Nokia Network-as-Code sandbox** (carrier-agnostic — same code protects Lagos, Accra, Nairobi, Kigali, Joburg).

| Category | APIs | Role |
|---|---|---|
| **Theft Detection** | SIM Swap, Device Swap, Device Status | Trigger & confirm the event |
| **Location Intelligence** | Location Retrieval, Device Reachability | Track post-theft, even after SIM change |
| **Identity Assurance** | Number Verification, KYC Match | Suppress false positives |

All integrations live in `backend/src/services/camara.ts`. Keep them thin — one function per endpoint, typed inputs/outputs, no business logic inside.

---

## The agentic AI decision layer (the real differentiator)

A naive rule engine says *"SIM changed → freeze everything."* Sankofa reasons.

**Inputs to the agent:**
- Time of day vs. user's normal activity window
- Swap location vs. user's typical neighborhoods
- Recency & type of account activity (did the old device ping a sale-initiation webhook?)
- Verification history
- Cross-user theft clustering (is this bridge trending?)

**Output:** a **theft confidence score** → tiered response:

| Confidence | Response |
|---|---|
| Low | Silent push to primary number |
| Medium | App-level challenge before any MoMo transaction |
| High | Full lockdown + location tracking + emergency contact + police alert |

Lives in `backend/src/services/ai.ts`. Must produce **explainable scores** — the admin dashboard needs to show *why* the agent decided what it did. Judges will ask.

LLM provider: Claude (preferred) or OpenAI — pick one, stay there.

---

## Hackathon timeline (authoritative)

Today: **2026-04-19** — Idea Phase. Prototype phase opens **2026-04-24**.

| Window | Focus |
|---|---|
| Apr 24 – Apr 30 | Scaffolding complete · CAMARA sandbox wired · SIM Swap + Device Swap flows end-to-end |
| May 1 – May 7 | Agentic AI engine · location pipeline · IMEI blacklist · mock bank webhook |
| May 8 – May 10 | Polish · 3-min demo video · README · repo cleanup |

**Final deliverables:**
- Working Next.js app with both views
- Backend integrating ≥5 CAMARA endpoints
- Agentic AI engine with explainable scoring
- Public GitHub repo
- 3-minute demo video walking the Kemi scenario end-to-end

---

## Hackathon themes addressed

- **Theme 1 (primary):** Financial Inclusion, Secure Payments & Anti-Fraud
- **Theme 3 (secondary):** Health Access, Emergency Response & Community Safety
- **Theme 6:** Open Innovation

---

## What *not* to build

This is a hackathon demo, not a production product. Ruthlessly cut:

- Real telco integration — the Nokia sandbox *is* our "production." Do not try to contact real MNOs.
- Real mobile money integration — mock the Opay/M-Pesa webhook. A `POST /webhook/bank/freeze` that logs is enough.
- Auth flows beyond the minimum. One hardcoded demo user (Kemi) is fine.
- Microservices, message queues, k8s, anything that slows demo iteration.
- Native mobile apps. The phone-styled view is a Next.js page in a phone-frame div.
- Tests beyond smoke checks on the CAMARA service functions.
- A landing page, marketing site, or anything not on the Kemi demo path.

**The only thing the judges will see is the 3-minute video and possibly a live dashboard demo. Optimize for that, not for production-readiness.**

---

## Business model (for the pitch, not the code)

- **B2C freemium:** basic protection free; premium tier for family plans + device insurance.
- **B2B licensing:** banks/MMOs pay for real-time theft signals. They save more in fraud than we charge.
- **MNO revenue share:** stolen-device registry licensed to telcos.

---

## Working style notes

- Isaac is the solo builder right now; There is a second team member ( a cybersecurity person), team slot is open.
- We are **in the idea phase until Apr 24**. Until then, prefer architectural clarity over code volume.
- When a decision involves tradeoffs, surface the tradeoff explicitly — don't quietly pick.
- Keep the Kemi demo viable at every commit. Any refactor that breaks the demo flow is backwards.

---

## External references

- **Nokia Network-as-Code CAMARA sandbox** — primary external dependency for every theft detection flow.
- **CAMARA project** (Linux Foundation) — open API spec behind Nokia's implementation.
- **Africa Ignite Hackathon** — submission portal & judging rubric (check before each phase).
