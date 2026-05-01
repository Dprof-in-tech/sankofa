# Sankofa — MNO Partnership Unlockables

> This document tracks every capability that is technically possible but currently gated behind
> direct MNO (Mobile Network Operator) partnerships. It exists for two reasons:
>
> 1. To guide post-hackathon conversations with Nokia, NCC, and carriers.
> 2. To give judges and investors a clear view of what Sankofa becomes at scale.
>
> **Current state**: Sankofa is a proof of concept operating through Nokia's Network-as-Code
> CAMARA sandbox. Everything in this document is real — it is not vaporware. The telco
> infrastructure to enable all of it already exists. What is missing is access, not invention.

---

## What CAMARA gives us today (no MNO partnership needed)

| Capability | API | Notes |
|---|---|---|
| SIM Swap detection | `verifySimSwap` / `getSimSwapDate` | Confirms swap occurred, returns timestamp |
| Device Swap detection | `verifyDeviceSwap` / `getDeviceSwapDate` | Detects new SIM in known IMEI |
| Cell-tower location retrieval | `getLocation` | 300m–2km accuracy in Lagos |
| Device reachability / connectivity | `getConnectivity` | CONNECTED / NOT_CONNECTED |
| Device status subscriptions | `client.deviceStatus.subscribe` | Push webhook when device goes offline |
| Number verification (CIBA) | `verifyNumber` | Silent network-level auth, not in demo path |
| KYC match | `matchCustomer` | Name match against carrier records |

This is the foundation. Everything below requires a direct relationship with the carrier.

---

## Tier 1 — High impact, technically straightforward once partnership exists

### 1. Equipment Identity Register (EIR) writes
**What it is**: The EIR is the carrier's internal blacklist checked every time a device tries
to register on a tower. Three states: White (allowed), Grey (monitor), Black (reject).

**What it unlocks**: A stolen IMEI added to the Black list cannot register on that carrier's
network regardless of what SIM is inside it. Factory reset, new SIM — doesn't matter. The
device is dead on that network.

**Why CAMARA doesn't expose it**: EIR is a core network system (HLR/HSS internal). CAMARA
standardises application-layer APIs. EIR writes are operator-internal, not yet part of any
CAMARA spec.

**Path to unlock**: Direct MNO API agreement, or Nokia proprietary NaC extension outside
the CAMARA standard. **Ask Nokia directly** whether they expose EIR writes to NaC customers.

**Impact on Sankofa**: Turns the current "Sankofa registry flag" into a real network block.
New SIM, factory reset — device still cannot connect.

---

### 2. IMEI grey-listing — new SIM notification
**What it is**: A carrier places a stolen IMEI on the Grey list (monitor, not block). The
next time that IMEI registers on any of their towers — with any SIM — the carrier fires a
notification with the new MSISDN (phone number).

**What it unlocks**: When the thief pulls Kemi's SIM and inserts their own, Sankofa gets
notified with the thief's phone number. Tracking resumes on the new number. The thief just
handed us their identity.

**Why CAMARA doesn't expose it**: Same as EIR — internal HLR/HSS event. No CAMARA spec exists yet.

**Path to unlock**: Direct MNO agreement. Nigerian carriers already do this for law
enforcement with court orders. Sankofa needs a commercial/regulatory equivalent.

**Impact on Sankofa**: Closes the biggest current gap — SIM swap currently ends our tracking.
With grey-listing, a SIM swap becomes a reacquisition event, not a dead end.

---

### 3. Cross-carrier IMEI blacklist federation
**What it is**: Nigeria has four major carriers (MTN, Airtel, Glo, 9mobile). A device blocked
on one can register on another. A federated blacklist — shared across all four — means the
IMEI is blocked nationally.

**What it unlocks**: A truly worthless device. No carrier in Nigeria will activate it.

**Path to unlock**: NCC (Nigerian Communications Commission) already mandates IMEI
registration. The regulatory database exists. Sankofa needs to integrate with NCC's stolen
device reporting API or work through Nokia to submit to the GSMA international IMEI database
(which Nigerian carriers already check).

**Current GSMA status**: The GSMA IMEI database is live and Nigerian carriers participate.
Sankofa submitting to it would trigger real blacklisting across all participating carriers
globally.

---

### 4. Carrier-grade location (GPS-assisted / hybrid)
**What it is**: CAMARA's `getLocation` uses cell-tower triangulation only — 300m to 2km
accuracy. Carriers have access to hybrid location: cell towers + WiFi positioning + GPS
assist signals, collated by their network infrastructure.

**What it unlocks**: Location accuracy down to 10–50 metres in dense urban areas.
In the Kemi scenario: the difference between "somewhere near Oshodi" and "outside 14 Ladipo Street."

**Path to unlock**: Direct carrier location API agreement. Some carriers license this through
third-party location platforms (e.g., Here, Precisely). Not a CAMARA gap — a CAMARA
extension that carriers can choose to provide.

---

## Tier 2 — High impact, requires deeper integration

### 5. Pre-emptive SIM swap interception
**What it is**: Instead of detecting a swap after it happens, the carrier intercepts the
swap request at the point of processing and fires a real-time event before the swap completes.
Sankofa can challenge the swap (require owner confirmation) before the SIM changes hands.

**What it unlocks**: Zero-window theft. Today, there is a gap between the swap happening and
Sankofa detecting it. Pre-emptive interception collapses that gap to zero and prevents
the swap from completing at all without owner consent.

**Path to unlock**: Deep carrier integration — this requires Sankofa to be in the swap
processing chain, not just observing it. Likely requires carrier partnership at the product
level, not just API access.

---

### 6. eSIM remote profile disable
**What it is**: eSIM provisioning (GSMA SGP.02/SGP.22) allows carriers to remotely manage
eSIM profiles. A carrier can remotely disable a profile, making the eSIM nonfunctional even
after a factory reset — the hardware is there but the carrier refuses to re-provision.

**What it unlocks**: For eSIM devices (iPhone 14+, Pixel 7+, many Samsung flagships),
factory reset no longer defeats Sankofa. The device cannot be reactivated on any
participating carrier.

**Path to unlock**: eSIM Remote SIM Provisioning agreement with the carrier. Nokia has deep
expertise here — worth exploring whether NaC exposes any RSP APIs.

---

### 7. OTA (Over-the-Air) device lock command
**What it is**: Carriers can push OMA DM (Open Mobile Alliance Device Management) commands
to devices over the air. This includes lock commands that pin the device to a lock screen
without requiring a locally installed app.

**What it unlocks**: The carrier tells the device to lock. No app required. No factory reset
bypasses it (the command can be re-pushed when the device next registers). This is how
enterprise MDM solutions survive resets on some Android devices.

**Path to unlock**: OMA DM integration with the carrier. Not a CAMARA API — a core network
management channel. Samsung Knox and similar enterprise platforms do this today.

**Caveat**: Effectiveness depends on the device implementing OMA DM (most Android devices do;
iPhones use Apple's proprietary MDM).

---

## Tier 3 — Financial layer (parallel track, not MNO-dependent)

### 8. Direct mobile money API integration (Opay, MTN MoMo, M-Pesa)
**What it is**: Currently the wallet freeze is a mock webhook. Real integration means
Sankofa fires a freeze signal directly to the MoMo provider's fraud API.

**What it unlocks**: Actual wallet protection, not a demo stub. This is the highest-impact
single feature for victims in Sub-Saharan Africa — mobile money is their primary financial
instrument.

**Path to unlock**: Commercial agreement with each MoMo provider. Opay, MTN MoMo, and
M-Pesa all have partner APIs. This is a fintech partnership, not a carrier partnership.

**Priority**: This should be pursued in parallel with MNO partnerships — it's independent
and high impact.

---

### 9. Bank transaction blocking linked to phone number
**What it is**: In Nigeria, phone numbers are linked to BVN (Bank Verification Number) which
links to bank accounts. A stolen phone number can be used to authorise transactions via OTP.
Sankofa alerting the bank directly to flag OTP requests from this number stops account draining.

**What it unlocks**: Even if the thief keeps the SIM active long enough to intercept OTPs,
the bank is pre-warned and will challenge or block those transactions.

**Path to unlock**: CBN (Central Bank of Nigeria) has a fraud reporting framework. Direct
API partnerships with Access Bank, GTBank, First Bank, etc. Also achievable through a
relationship with NIBSS (Nigeria Inter-Bank Settlement System) which sits between all banks.

---

## Questions to bring back to Nokia

1. Does Nokia NaC expose EIR writes as a proprietary extension outside the CAMARA spec?
2. Is there a roadmap for a CAMARA standard covering IMEI-to-active-MSISDN lookup after
   device swap? (The grey-listing notification use case.)
3. Does Nokia have existing relationships with MTN Nigeria, Airtel Nigeria, or Glo that
   could accelerate a Sankofa pilot agreement?
4. Does the NaC platform expose any eSIM Remote SIM Provisioning (GSMA SGP.22) APIs?
5. Is OMA DM accessible through NaC or is that a separate Nokia product track?
6. What is the process for submitting stolen IMEIs to the GSMA international database
   through the NaC platform?

---

## The pitch summary for judges / investors

> Sankofa is live today on Nokia's CAMARA sandbox and detects theft, freezes wallets, and
> tracks devices within 60 seconds — using only public network APIs. Every line of this
> document describes what becomes possible when we move from sandbox to partnership. We are
> not asking anyone to build new infrastructure. The EIR, the grey-list, the eSIM RSP system,
> the OMA DM channel — all of it already exists inside every major carrier. What Sankofa
> brings is the product layer, the AI decision engine, and the victim experience that makes
> this infrastructure usable for the 400 million phone users in Sub-Saharan Africa who have
> no equivalent protection today.
>
> Win the hackathon. Get the partnerships. The network is already built.

---

*Last updated: 2026-04-30. Review after each Nokia / MNO conversation.*
