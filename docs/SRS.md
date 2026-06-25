# SCH TB Chatbot — Software Requirements Specification

**Status:** draft · maintained in lockstep with the prototype.
**Repo:** https://github.com/natarajanrajaraman/sch-tb-chatbot
**Companion docs:** `README.md` (build/run) · `PRODUCTION-HANDOFF.md` (why-it-is-the-way-it-is) · `USER-GUIDE.md` (non-technical operator manual) · `KZ-DISCUSSION-POINTS.md` (open SCH questions) · `FB-BOT-COMPARISON.md` (how it differs from the old SCH FB bot).

> **Maintenance:** any commit that changes behaviour MUST update the affected section here in the same commit. The same rule applies to `PRODUCTION-HANDOFF.md` — that doc is the rebuild brief, this one is the spec. If they ever drift, this is the source of truth.

---

## 1. Product overview

The SCH TB Chatbot is a Burmese-first, web-prototype patient-facing chatbot with a back-end caseload UI for SCH staff. It covers two parallel patient pathways:

1. **TB Self-Check Tool** — fixed-flow, rule-based screening that triages a user to one of three buckets (Presumptive TB / Negative-high-risk / Not-presumptive) and, when appropriate, offers a referral.
2. **TB Patient Support Chatbot** — LLM-backed open conversation answering TB treatment / side-effect / adherence questions, with red-flag escalation to SCH Tele-Health.

The prototype runs on Vercel (Next.js 16, Turbopack, React 19, TypeScript 5, Tailwind 4). The back-end of record is a single Google Sheet with one tab per logical table. The production build will be reimplemented on the Speedback platform per a separate handoff brief.

## 2. Users and audiences

| Role | Surface | Purpose |
|---|---|---|
| Patient / caregiver | `/` (chat) | Use one of the two tools. Anonymous; minimal data collection. |
| SCH Admin | `/admin` | Full dashboard, all sheets, cascade analytics, outcome rollups. |
| SCH Tele-Health | `/telehealth` | Caseload dashboard. Edits Screening + Care Referral Logs. Acts as data steward — back-fills on behalf of Screening / Care Provider when they don't use the digital system. |
| TB Screening Provider | `/screening-provider` | Edits screening tests + result fields. |
| TB Care Provider | `/care-provider` | Two tabs: (a) Screening Referral Log filtered to TB-positive rows for Dx confirmation, (b) Care Referral Log. |

All non-patient surfaces are behind a mock-auth gate (`AuthGate`, username `123` password `abc`); production must replace this with real SCH credentials.

## 3. Architecture

```
┌─────────────────────────┐         ┌────────────────────────────┐
│  Patient browser        │ ◀────▶  │  Next.js App Router        │
│  (Burmese-first chat)   │         │  - Page routes             │
└─────────────────────────┘         │  - /api/*  REST endpoints  │
                                    └─────────────┬──────────────┘
                                                  │
                  ┌───────────────────────────────┼───────────────────────────────┐
                  ▼                               ▼                               ▼
        ┌───────────────────┐         ┌──────────────────────┐         ┌──────────────────────┐
        │  Google Sheets    │         │  Google Drive        │         │  OpenRouter LLM      │
        │  (caseload DB)    │         │  (Markdown trans-    │         │  (P3 chat)           │
        │   - Self-Check Log│         │   cripts; service-   │         │  Models: GPT-5.4,    │
        │   - Screening Ref │         │   account-shared     │         │   Claude-Sonnet-4.6, │
        │     Log           │         │   folder)            │         │   GPT-5.4-mini,      │
        │   - Care Ref Log  │         │                      │         │   Qwen-2.5-32b,      │
        │   - AI Conversa-  │         │                      │         │   DeepSeek-V4-Flash  │
        │     tions         │         │                      │         │                      │
        │   - Alerts Log    │         └──────────────────────┘         └──────────────────────┘
        │   - Feedback      │
        │   - Language Map  │
        │   - Location Hier-│
        │     archy         │
        │   - Referral Dir- │
        │     ectory        │
        └───────────────────┘
```

Service-account auth is shared between Sheets and Drive (`GOOGLE_SERVICE_ACCOUNT_KEY` env var). One spreadsheet ID (`GOOGLE_SHEET_ID`); one Drive folder shared with the service account for transcripts (`GOOGLE_DRIVE_TRANSCRIPT_FOLDER_ID`). LLM access is via a single `OPENROUTER_API_KEY`.

## 4. Functional requirements — patient-facing

### 4.1 Landing

User opens `/`. Sees a welcome message in Burmese with two buttons:
1. **TB Self-Check Tool** — proceed to §4.2
2. **TB Patient Support Chatbot** — proceed to §4.3

Choice is captured as `landingChoice` on the Self-Check Log row.

### 4.2 TB Self-Check Tool flow

Implemented as a deterministic state machine in `src/lib/chatEngine.ts`. States: `LANDING → CONSENT → AGE_BUCKET → (CHILD_EXIT | SYMPTOMS_PASS) → CLASSIFICATION → REFERRAL_CHOICE → REFERRAL_LETTER → DONE`. Per-question Back, Exit, and "What does this mean?" affordances on every screening question.

**Q6 classification rule** (§4.4 of `PRODUCTION-HANDOFF.md`):

- **Presumptive TB** — symptom criteria met (count thresholds vary by age bucket and the SCH FB-bot legacy ruleset).
- **Negative (High Risk)** — symptom criteria not met but at least one risk factor present.
- **Not Presumptive** — neither.

Negative-high-risk is offered a referral (per SCH preference). Not-presumptive exits with an education message.

**Referral flow.** Branches on choice:

- **Assisted Referral** — captures patient phone number + consent; creates a row on the Screening Referral Log with `referralType='Assisted'`. SCH Tele-Health is responsible for following up.
- **Self-Referral** — patient picks State → District → Township (cascading dropdowns sourced from `Location Hierarchy` tab); system lists matching referral sites from the `Referral Directory` tab; a referral letter is rendered with a `screeningReferralId`.

### 4.3 TB Patient Support Chatbot flow

1. Open conversation via `P3ChatPanel`. Persisted to the `AI Conversations` sheet, one row per `p3ConversationId`.
2. Each turn: client posts to `/api/p3/chat`; server calls OpenRouter with system prompt (`docs/p3-system-prompt.md`) + bilingual KB summary + conversation history.
3. Server runs a **rule-based escalation pre-check** (`src/lib/p3/escalation.ts`) on the user's message + parses an LLM-emitted `<escalation level="…"/>` tag. Final level = `max(rule, LLM)`. Levels: `none` / `nonurgent` / `telehealth` / `immediate` (rules in `docs/p3-escalation-rules.md`).
4. On `immediate` or `telehealth`:
   - Bot asks for **TB Case ID** (skippable) AND **contact info** (phone / Viber number / similar; skippable per [[v0.9.3 spec]]).
   - System mints a `careReferralId = CR-{Date.now()}` and writes a row to the Care Referral Log with the escalation reason, captured contact, and `status='Pending'`.
   - In-chat: a bilingual referral block is rendered with the careReferralId and the recommended action.
5. Per-turn telemetry (model, prompt/completion tokens, estimated USD cost, escalation count) is upserted to the AI Conversations row.

### 4.4 Transcripts

Every P1 conversation saves a Markdown transcript to Drive on terminal state. Every P3 conversation saves after every turn (idempotent file by `{conversationId}.md`). Transcript URL is written back to `transcriptUrl` on the Self-Check Log + AI Conversations rows. Tele-Health dashboards render a 📄 Transcript button per row.

## 5. Functional requirements — back-end (operator-facing)

### 5.1 SCH Admin dashboard

- KPI cards per pathway.
- Two cascade visualisations (`CascadeFunnel`):
  - **TB Self-Check cascade** — joins Self-Check Log to Screening Referral Log on `screeningId`. Stages: Total → Presumptive → (Assisted | Self) → Tele-Health contacted (assisted only) → Reached screening provider → Tested → TB-positive.
  - **Patient Support cascade** — joins AI Conversations to Care Referral Log on `careReferralIds`. Stages: Total conversations → Escalation triggered → Care referral logged → Contacted by Tele-Health → Reached care provider.
- Outcome rollup cards + per-stage breakdown table for each pathway (same widgets as the Tele-Health dashboard).

### 5.2 SCH Tele-Health dashboard

- **Self-Check Outcome** and **Patient Support Outcome** — clickable five-bucket KPI cards per pathway. Buckets: Not yet started · In progress · Overdue · Completed · Abandoned.
- **Per-stage breakdown** — sortable table; one row per stage in the pathway; counts of Applicable / Not started / In progress / Overdue / Completed.
- **Overdue queue** — union across both pathways, sorted by days past SLA. Click jumps to the row in the log tab.
- **Red-flag alerts panel** — open `immediate`/`telehealth` escalations from the Alerts Log; click jumps to the alert row.
- Bucket-card click → log tab with `bucketFilter` applied; a chip lets you clear the filter.

### 5.3 Edit-record panel (Screening Referral Log)

Per-role field editability. The panel groups fields into "Tele-Health contact", "TB Screening Provider — visit and tests", "Final diagnosis", "TB Care Provider — follow-up", "Tracking — abandon or snooze", and "Notes". Each role sees their fields highlighted amber; non-editable fields render read-only.

Key behaviours:

- **Numbered state labels** in the Status column (see §6.2).
- **Patient Dx** as a 4-state radio (Confirmed TB +ve / Confirmed TB -ve / Indeterminate / Pending). TB Registration ID + Date gated to `+ve`. "Referral to Care Provider Completed?" gated to `+ve` or `Indeterminate`.
- **Dx-vs-tests guard**: if `cxrResult='+ve'` OR `xpertResult ∈ {T, TT, RR}` but the Dx is set to anything other than `Confirmed TB +ve` (and not still `Pending`), an inline red banner appears above the Final Diagnosis group, AND `window.confirm()` blocks save until the user explicitly OKs.
- **Client-side auto-fills**: `cxrResult` set → `cxrCompleted=Yes`; `xpertResult` set → `xpertCompleted=Yes`; `firstContactScreeningProviderDate` set → `arrivedAtCenter=Yes`. Triggered only when the target field is currently blank.
- **Stamp-today**: every date field has a "stamp today" button for the role that owns it; for Screening Provider / Care Provider dates, the button shows to everyone with edit access (so Tele-Health can back-fill).
- **Unsaved-changes guard**: panel tracks dirty state vs the values at expand-time. Browser `beforeunload`, Cancel button, row collapse, and row-switch all prompt before discarding edits.

### 5.4 Mark Abandoned + Snooze

- Tele-Health and Admin only. **Mark Abandoned** is a 6-reason radio (lost-to-followup, declined-screening, declined-care, moved-away, deceased, other); selecting one auto-stamps `removedAt = today`. Marks the row's bucket to Abandoned on the dashboard.
- **Snooze** is an explicit date field with **+7d** / **+14d** quick buttons and a clear button. While `snoozeUntil` is in the future, the row's "overdue" check is suppressed.
- **Implicit snooze**: every PUT that bumps `contactAttempts` OR flips `clientContacted` to `Yes` (without an explicit `snoozeUntil` in the same PUT) sets `snoozeUntil = today + 7d`. Same activity-detection block on the server-side auto-fills the Tele-Health, Screening Provider, and Care Provider first/last-contact dates.

## 6. Business rules

### 6.1 SLA thresholds (pending SCH confirmation)

7 days per stage; <24 hours for emergency escalations. See `KZ-DISCUSSION-POINTS.md §6` for the proposed defaults and the questions for SCH. Stored as constants in `src/lib/journeyState.ts`; tracking is per-row.

### 6.2 Self-Check pathway state labels

| # | Label | Bucket |
|---|---|---|
| 1a | Self-Check completed, pending Assisted Referral | not-started |
| 1b | Self-Check completed, pending Self-Referral TB Screening | not-started |
| 2 | Assisted Referral completed, pending TB Screening | in-progress |
| 3 | TB Screening Provider Reached | in-progress |
| 4 | Diagnosis NoTB, Exited | completed (terminal) |
| 5 | Diagnosis TB, pending TB Care Provider | in-progress |
| 6 | TB Care Provider Reached | completed |

Overdue stages prefix with `⚠ Overdue (Nd) · …`. Snooze appends `· snoozed to {date}`. Abandonment overrides everything: `Abandoned · {reason}`.

### 6.3 Escalation levels (P3)

| Level | Action |
|---|---|
| `none` | Reply, no logging beyond AI Conversations telemetry. |
| `nonurgent` | Reply + reminder to ask the HCP at the next visit. No Care Referral. |
| `telehealth` | Reply + Care Referral logged + bilingual referral block in chat + ask for contact info. |
| `immediate` | Same as telehealth + the in-chat block is the urgent action message. |

## 7. Data model

Eight sheet tabs. Schemas live in `src/lib/schemas.ts` (pure constants, no Node dependency — safe to import client-side). Read/write code lives in `src/lib/googleSheets.ts`.

Notable:

- **Screening Referral Log** is 34 columns A-AH (v1.7.3). Latest additions include 6 role-stamped contact dates (`firstContact*` / `lastContact*` × Tele-Health / Screening Provider / Care Provider), `removalReason` / `removedAt` / `snoozeUntil`, and `careProviderReferralCompleted`.
- **Care Referral Log** is 18 columns A-R (v1.6).
- Field-by-field semantics: see `PRODUCTION-HANDOFF.md §6` (External integrations — Google Sheet schemas). The two docs intentionally overlap on the data model so engineers reading either one can self-serve.

## 8. Non-functional requirements

- **Performance.** P1 turn round-trip ≤300ms on the Vercel free tier. P3 turn round-trip dominated by the LLM call; target ≤6s p50 with model selection bounded to OpenRouter's published latency.
- **Reliability.** Sheets writes are appended via `values.append`; row updates via `values.update`. There is no transactional guarantee — the prototype tolerates duplicate rows or partial updates as a known limitation. Production must use a real DB.
- **PII handling.** P1 collects patient name only on Assisted Referral consent; P3 collects only `patientTbCaseId` and `patientContact`, both skippable. No cross-session linking. Production decisions on retention + scrubbing are open with SCH.
- **Security.** All admin endpoints are unauthenticated by design in the prototype (the `/admin/*` endpoints are public). Production must gate everything behind real SCH auth. The mock username/password gate on the dashboards is client-side only.
- **Accessibility.** Not yet evaluated; tracked as a TODO for production.

## 9. Out of scope (deferred to production)

- Production-grade auth (Workspace SSO or similar).
- Real database with retention policy + audit log.
- Caregiver mode (spec §2.8 — single endpoint, configurable patient/caregiver target).
- LPK case manager CC for DR-TB escalations.
- Phase-B RAG corpus ingestion for P3 (currently inline summary in the system prompt).
- Pediatric DR-TB content.
- Full WCAG accessibility pass.

## 10. Open questions

Tracked live in `KZ-DISCUSSION-POINTS.md`. Highlights:

- SLA thresholds need SCH confirmation (`§6` of KZ doc).
- Bilingual content review capacity for Phase-B KB ingestion.
- Tele-Health response-time SLA for `immediate` escalations.
- Q31/Q33 divergence on careReferralId logging.

## 11. Open items in code

Code-level TODOs (search for these markers on handoff):

- `src/lib/googleSheets.ts` — `TODO: REPLACE WITH SCH'S AUTHORITATIVE TB SERVICE DIRECTORY` (above `getReferralSites`).
- `src/data/locationSeed.ts` — `TODO: REPLACE WITH SCH'S AUTHORITATIVE DIRECTORY (Q14, Q16)`.
- `09-xxxx` placeholder for Tele-Health phone in `msg.referral_disclaimer`.
- Health-education content is the v0.2 placeholder (`msg.health_education`); pending SCH-approved content per Q3 of the May pre-catch-up batch.

---

## Your notes

> Hand-edited section. The engineering team will not touch anything below this heading when updating the spec.
>
> *(empty — add your notes here)*
