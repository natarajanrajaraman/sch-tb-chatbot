# Comparison: SCH FB Self-Check Bot (June 2022) vs This Prototype

Source documents read for this comparison (via Google Drive, GTrans
Burmese→English machine translations):

- `TB Self Check Bot Flow_old for sample.pdf` — flow diagram of the
  live Facebook Messenger bot (`m.me/thukhathuta2022`).
- `Work Flow of TB Self Check Chatbot_June2022 (Draft).pdf` —
  workflow + data-fields + Chatbot Focal SOP, 8 pages.

Both live in SCH's Reference folder; IDs and locations are in the
project brain (`sch-fc-sds-tb.md`, key documents table).

This file is a **decision-support artefact**: it lists what's the
same, what's different, and where we should consider folding old-bot
behaviour back into this prototype (or deliberately keep our
departure).

---

## TL;DR

The old bot is a **8-Yes/No screening → phone-number capture → SCH
Chatbot Focal manual follow-up** loop. It is much narrower than what
we are building. Our prototype is broader in scope (P3, risk
factors, neg-high-risk class) and richer in UX (back, exit, location
cascade, self-referral, screening ID), but **the old bot has one
piece we do not yet replicate well: the pediatric / under-15
pathway**, and one thing we should probably borrow: **the explicit
"Reached / Lost / Referred" outcome ladder for follow-up tracking**.

## Same shape

- **Both** screen for the **same core TB symptom set**: cough ≥2
  weeks; cough w/ blood or phlegm; evening rise in temperature
  (= our "fever with night sweats"); loss of appetite;
  unexplained weight loss; back/chest pain; cervical lymph node
  (= our "fatigue or neck lump"); close TB contact.
- **Both** use a Yes/No interaction model with no free-text body
  for the screening pass.
- **Both** ask for **gender and age**, and capture **phone number
  + township + state/region** before referral.
- **Both** route presumptive cases through a **Chatbot Focal /
  Tele-Health team** who phones the user and refers them to a Sun
  GP TB S3 provider.
- **Both** end with the user being **thanked** and **pointed to a
  human follow-up surface** (their FB Messenger `m.me/thukhathuta2022`
  / our Sun Tele-Health team phone number).

## Where the old bot differs from us

| Topic | Old SCH FB bot (Jun 2022) | This prototype (v0.6) |
|-------|---------------------------|------------------------|
| **Age input** | **Age groups**: <5, 5–14, ≥15. | Free-text integer age, only ≥15 is screened, <15 exits with a referral notice. |
| **Pediatric screening** | **Screens 5–14 year-olds** — different presumptive threshold (2+ Yes vs the adult 1+ Yes). | **Excludes <15 entirely** — bot tells the user to consult an HCP. |
| **Symptom count** | **8 Yes/No items**, including "close TB contact" as the 8th. | 8 symptoms + a separate 10-item risk-factor pass. "TB contact" is RF #1, not a symptom. |
| **Classification thresholds** | ≥15: any 1 symptom Yes → presumptive. 5–14: any 2 symptoms Yes → presumptive. <5: not screened — referral to HCP. | Any of 8 symptoms Yes → Presumptive TB. All No but any of 10 risk factors Yes → **Negative (High Risk)** — also referred. All No → Not presumptive. |
| **Risk factors** | **None** — only "close TB contact" is captured, alongside the symptoms. | Distinct **10-item RF pass** (Q6): TB contact, immunocompromised, diabetes, malnutrition, alcohol, smoking, age 60+, prior TB, chronic lung, crowded living. |
| **Branching landing** | None — bot is single-purpose screening. | Landing offers (1) self-check or (2) patient/caregiver info (P3 stub). |
| **Referral paths** | **Assisted only**. Chatbot Focal phones the user and books the referral. | **Assisted** AND **Self** referral. Self path generates an e-referral slip the user can show at any health centre. |
| **Self-referral letter** | None. | Templated bilingual e-slip with all 18 Q's, classification, Screening ID, SCH disclaimer footer. |
| **State / District / Township** | Captured by Chatbot Focal during the phone call, not in-bot. | In-bot cascading menu — State/Region → District → Township → "Type it in" fallback. |
| **Identifier** | FB user name + serial number, no patient ID. | Per-screen **Screening ID** (`SCR-YYMMDD-XXXX`) attached to every record, shown on the in-chat referral, included in the e-slip. |
| **Outcome ladder** | Explicit: **Reached / Lost / Referred / TB / Non-TB**, plus contact attempt counter and 2-week last-follow-up window. | Implicit — `status: in_progress / completed / abandoned`. Follow-up tracking columns (CXR, GeneXpert, arrived-at-centre) exist on the Screening Referral Log but the **referral-outcome enum (Reached/Lost/Referred)** is not modelled. |
| **Phone-contact consent** | Yes — explicit consent Y/N before phone number capture. | Yes — same explicit consent step. |
| **What does this mean / Go back / Exit** | None. | Universal across every mid-flow state. |
| **Multi-platform skin** | FB Messenger only. | Viber default + Messenger + Telegram skins (visual only; production rebuild on the real platform APIs). |
| **Languages** | Burmese with FB Messenger UI. | Burmese primary + English translation panel (for SCH and ETC reviewers). |
| **Data fields captured** | 32 fields including: TB Registration ID, final Dx (TB / Non-TB), 1st / last follow-up dates, contact-attempt counter, Reached site (Sun GP TB S3 / Other facility), Reached date. | Sessions sheet captures screening + referral routing + consent + landing choice + classification + screening ID. **Final diagnosis / TB Registration ID are not captured.** Follow-up CXR/GeneXpert exists on the Referral Log. |
| **Knowledge base** | None (no Q&A). | None on P1 yet. P3 (stubbed) is intended to be RAG over WHO Module 4 + Myanmar NTP + CDC Q&A. |

## Status: implemented in v0.7.0

The first three recommendations below were merged into the prototype in
v0.7.0. The fourth and fifth remain open. The "items to keep our breadth"
list and the symptom-phrasing alignment are unchanged.

- ✅ **Pediatric pathway (5–14)** — same 8 questions, 2+ Yes threshold,
  no RF pass. Under 5 exits with a "consult HCP" notice. See
  `docs/KZ-DISCUSSION-POINTS.md` §1 for the SCH sign-off ask.
- ✅ **Age-bucket selector** — replaces free-text age with 3 buttons
  (Under 5 / 5–14 / 15+), matching the old bot.
- ✅ **Outcome enum + final-diagnosis fields** on the Screening Referral
  Log: `outcome` (Pending / Referred / Reached / Lost), `patientDx`
  (TB / Non-TB), `tbRegistrationId`, `tbRegistrationDate`,
  `firstContactDate`, `firstFollowupDate`, `lastFollowupDate`,
  `remarks` — all editable in the SCH Telehealth dashboard.
- ✅ **2-week / 2-attempt follow-up SLA** is now visualised in the SCH
  Telehealth dashboard: rows are colour-coded by days-since-first-
  contact (within window → 1st FU due at 2d → last FU due at 12d →
  past 2-week SLA at 14d → resolved / lost). Summary counts shown at
  the top of the table.
- ✅ **Multi-channel follow-up surface** — at every completion endpoint
  the bot now shows a "for more questions, contact SCH Tele-Health"
  block with Phone / Viber / Telegram / Facebook placeholders, mirroring
  the old bot's m.me/thukhathuta2022 pattern.

## Recommendations — items worth pulling INTO our prototype

These are the gaps where the old bot has something we don't, and where
folding it in would make the prototype closer to what SCH already
runs in production.

1. **Pediatric pathway (5–14 years).** SCH already screens 5–14 with
   a 2+ Yes threshold. We exclude under-15. Either (a) build a
   parallel pediatric pass to match SCH's existing flow, or (b) keep
   our exclusion but **agree with KZ** that we are intentionally
   narrower than the old bot. Don't leave this as a silent gap.
2. **Outcome enum on Screening Referral Log** (Reached / Lost /
   Referred / TB / Non-TB) + **final-diagnosis fields** (Patient Dx,
   TB Registration ID, TB Registration Date). SCH already uses these.
   The data structure should match so the Tele-Health team's existing
   workflow translates directly.
3. **Last-follow-up date + contact-attempt counter** semantics. The
   old bot's two-week-after-first-contact follow-up rule + "Lost
   after 2nd attempt" rule is a clear SLA. We have free-form
   `contactAttempts` but the **2-week / 2-attempt rule** is not
   encoded — it's a useful production constraint to surface in
   PRODUCTION-HANDOFF for the engineering build.
4. **Reached site = Sun GP TB S3 clinic / Other facility** —
   distinguish in our data model. Currently we only capture the
   facility name(s) shown; we don't capture which one the patient
   actually reached.
5. **Symptom phrasing alignment.** Our "fever with night sweats"
   = their "evening rise in temperature" (same clinical concept).
   Our "fatigue or neck lump" = their "cervical lymph node" (the
   neck-lump component). Consider noting equivalence in the Language
   Map so cross-bot analytics is easier.

## Recommendations — items where the old bot is narrower and we should KEEP our breadth

1. **Risk factors as a second pass.** Q6 from SCH's 2026-06-23 NoMs
   explicitly requires this; the old bot does not. Keep.
2. **"Negative (High Risk)" classification bucket.** Q6 requires it.
   Keep.
3. **Self-referral path with e-slip + Screening ID.** No equivalent
   in the old bot. Q17 (this NoMs) defines the slip schema. Keep.
4. **Universal What/Back/Exit.** SCH's 2026-06-23 Q5 explicitly
   requires this. Keep — and it goes beyond what the old bot does.
5. **Landing branching for the P3 patient/caregiver path.** No
   equivalent in the old bot. Q3 and Q4 of the NoMs require it. Keep.
6. **Multi-platform skins.** Old bot is FB-only. Production goes to
   Viber first (better Myanmar penetration without a VPN), so a
   prototype that lets us preview the Viber render is the right call
   even if it's just a skin.

## Where Raj's intuition was right

> "Their previous bot uses age groups and does not ask for free-text age."

Confirmed. Old bot has three age groups: <5, 5–14, ≥15. Ours asks
free-text and excludes anyone <15. This is the single most
visible "shape" difference between the two flows.

## Open questions for SCH

Tracked in `docs/KZ-DISCUSSION-POINTS.md` — single live list. As of
v0.7.0, two items there:

1. Pediatric pass — sign off on the 2+ Yes threshold and confirm
   there's no separate pediatric RF set.
2. Follow-up surface — confirm which of Phone / Viber / Telegram /
   Facebook SCH wants to staff for chatbot follow-up questions, and
   provide the real values to drop into the placeholder block.
