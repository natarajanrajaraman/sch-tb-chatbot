# SCH TB Chatbot — Production Handoff Notes

> **This document is the bridge from prototype to production.**
>
> The Vercel prototype at https://tb-screening-chatbot.vercel.app/ exists
> to **validate the intended product behaviour with SCH and SCH's users**.
> Once that behaviour is locked, an engineering team will rebuild the
> same flows on the agreed production stack (Viber Bot API, FB Messenger,
> Telegram). This document captures everything that team needs to know
> that they can't read off the source code alone — the **why** behind the
> shape of the flows, the contracts the prototype implements, and the
> open questions still to resolve with SCH.
>
> Keep this file updated **in the same commit** as any behaviour change,
> so the "definitive build" team always inherits a current spec.

## 0. Current status — 2026-07-10 (post-KZ weekly)

**Phase.** SCH pilot testing phase greenlit at the ETCxSCH weekly on
2026-07-10. Seven SCH tester groups (QI, Training, Tele-Health,
Program Mx, Operations) are now exercising Self-Check + Chatbot +
Back-end. ETC-side rollout team looping in: **Yvonne Lim** (Product
Ops, learning project), **Kodi Khau** (Product Ops & Partnership
Support), **Chaitanya "Chai" Baranwal** (Eng Tech Lead).

**Prototype migration path — locked.**

- **Back-end views** — porting onto the **Speedback platform**
  (`sandbox.speedback.com`). Demo target: next 1-2 ETCxSCH weekly
  catch-ups. Only **SCH Admin** + **SCH Tele-Health** views survive
  to the port; **Screening Provider** + **Care Provider** views
  (already hidden in v1.8.1 — see the `DISABLED 2026-07-01` tags in
  `SpeedbackShell.tsx` and `app/page.tsx`) stay hidden and are **not**
  being ported.
- **Client-facing front-end** — porting from the web-prototype device
  skin to the **Viber Bot API**. Demo target: next 1-2 weeks.
- **This Vercel prototype's role** — remains the SCH-facing
  validation surface until the Speedback + Viber ports catch up.
  The device-skin toggle, the mock-auth back-end pages, and the
  React admin dashboards will retire as their production
  equivalents come online.

**Engineering roadmap posture.**

- **Phase B (RAG ingestion) — SHIPPED v1.9.0 on 2026-07-10**, the
  same day as this handoff §0 was drafted. Raj called the pull-
  forward after confirming (a) inline-context prompt drift under
  pilot testing was already a friction source and (b) the KZ-
  supplied 6-PDF corpus was fully known and small enough to ingest
  without SCH bilingual review as a gate (English-source PDFs;
  Burmese-clinician review still gated on §4). Retrieval is now
  live against 1,447 chunks in Supabase pgvector on Raj's personal
  account. Cost of full corpus embed: ~$0.024. See §9a in the SRS
  and the v1.9.0/v1.9.1 rows in [§1](#1-versions-and-changelog).
  KZ-DISCUSSION-POINTS §4 (bilingual clinician review) is still a
  gate before **live patient exposure** but not before internal
  SCH tester exposure.
- **Speedback back-end port** + **Viber front-end port** are the
  near-term engineering lines. Both are being scoped by Chai + the
  Speedback team; not tracked in this repo's changelog because they
  land in different repositories.
- **Feedback aggregation** across the four channels (in-prototype
  Feedback panel + SCH NoMs + email + Slack) is an open ops
  question — see the P2 GTask `ETC - SCH FC-SDS (TB Project)` NAs
  for the current placeholder.

**Micro Assessment Form status.** SCH DD compliance form was sent
back to KZ on 3 Jul with NAs on non-applicable sections; KZ did not
raise it at the 10 Jul catch-up. Default posture: closed unless SCH's
contracting team surfaces concerns by 17 Jul.

**What the definitive-build team should read first** if joining now:

1. This §0 (state).
2. [§1](#1-versions-and-changelog) (changelog) for the delta since v0.9.
3. [`KZ-DISCUSSION-POINTS.md`](./KZ-DISCUSSION-POINTS.md) —
   read the top status note, then the items still binding on
   production behaviour (§3 SLA, §4 bilingual review, §7 Tele-Health
   contact placeholders).

---

## 1. Versions and changelog

| Version | Date       | Highlights                                                                                                                |
|---------|------------|---------------------------------------------------------------------------------------------------------------------------|
| 1.9.2   | 2026-07-14 | **Fix: tester feedback (and every other sheet-log write) could silently overwrite the previous row.** `appendToSheet` in `src/lib/googleSheets.ts` called `values.append` with the API-default `insertDataOption: OVERWRITE`. Under that mode the API picks the destination row by detecting the table's last row and writing to `last+1`; two writes that race (a tester submitting feedback twice in quick succession, or overlapping in-flight requests) both resolve to the same index and the second clobbers the first, losing a row. Changed to `INSERT_ROWS`, which physically inserts a fresh row per write so concurrent appends can never collide. Fix is in the shared helper, so it also protects the Self-Check Log, Screening/Care Referral Logs, Alerts Log, AI Conversations append path, and the seed loaders — all append-only tabs with no data below the table for the insert to disturb. Side effect: because API appends now register as `INSERT_ROW` changes (previously `OTHER`), Raj's bound formatting `onChange` trigger will fire on new rows; the server-side row-2 format copy (v1.7.5) is kept as a belt-and-braces fallback. |
| 1.9.1   | 2026-07-10 | **Dev-panel RAG retrieval widget** (`P3RetrievedChunks.tsx`) — renders the last-turn `retrieved` field per turn: `[Sn]` tag, source title, cosine similarity bar + %, expandable 220-char preview, link to source. Shown as a collapsible section in the dev panel between the cost meter and the system-prompt editor (P3 mode only, expanded by default). Clears on chat restart. **System prompt pruned** — the ~75-line inline "Curated context — TB basics" block in `docs/p3-system-prompt.md` is replaced with a compact "Grounding — retrieved KB chunks" section that instructs the model on citation format (`[S1]`, `[S2]`, …, no invented tags, cite in Burmese half only, no citations in `===EN===` block), fallback behaviour when retrieval returns empty, and semantic-not-perfect handling of off-topic top chunks. Behavioural sections (You are / Scope / Language / Tone / Guardrails / Reply format / Uncertainty) preserved. |
| 1.9.0   | 2026-07-10 | **Phase B — RAG over KZ's 6-PDF corpus.** Every P3 turn embeds `userMessage + last 2 user turns` with OpenAI `text-embedding-3-small` (1536 dims) and cosine-searches Supabase pgvector for top-6 chunks above the 0.35 similarity threshold. The formatted chunk block is appended to the system prompt with `[S1]`–`[S6]` citation tags. Retrieval is best-effort — any failure (missing env vars, empty table, Supabase timeout, OpenAI hiccup) returns empty chunks and the chat falls back to the system-prompt fundamentals. `/api/p3/chat` response includes a `retrieved` field surfaced to the dev-panel widget. **Corpus:** 1,447 chunks across the six PDFs KZ signed off on 2026-05-27 (WHO Op Handbook M4 + Consolidated M4 + Myanmar NTP DR-TB v5.2.3 + CDC Q&A + WHO M2 Screening + WHO Consolidated M1 Prevention/TPT). **Stack:** Supabase pgvector on Raj's personal account (matches personal Vercel + GitHub), HNSW cosine index, RLS enabled (service-role key bypasses server-side, anon key locked out), `match_kb_chunks` RPC. Ingestion is `scripts/ingest-kb.js` — one-shot local runner: downloads PDFs via `gog drive download` (raj@equity.tech OAuth), extracts text with `pdf-parse`, chunks with paragraph/sentence-aware boundaries (~1000 tokens size, ~200 tokens overlap), embeds in batches of 20, deletes prior rows for the same `source_id` and inserts fresh (idempotent). Full corpus ingest ~1.5 min, ~$0.024 in OpenAI cost. See SRS §9a for the full design + follow-up backlog. |
| 1.8.1   | 2026-07-01 | **Provider views hidden from the interface** (per Raj). The **TB Screening Provider** (🩻) and **TB Care Provider** (🩺) role views are removed from the navigation — both the main-page "Roles" strip (`app/page.tsx`) and the shared back-end sidebar (`SpeedbackShell.tsx` `NAV_ITEMS`). This is a UI-only hide: the routes (`/screening-provider`, `/care-provider`), the `activeView` type union, the per-role editability logic in `ScreeningReferralLogTable`, `AuthGate`, and all schemas are left intact, so the pages still render if the URL is hit directly. Re-enable by uncommenting the two links in `app/page.tsx` and the two `NAV_ITEMS` entries in `SpeedbackShell.tsx` (both tagged `DISABLED 2026-07-01`). _Note: changelog rows for 1.7.0–1.8.0 were never backfilled into this table — see git history for those._ |
| 1.6.0   | 2026-06-25 | **Journey-state computation** in `src/lib/journeyState.ts` — pure functions `computeSelfCheckJourney` and `computePatientSupportJourney` derive per-stage `StageStatus` (not-applicable / not-started / in-progress / overdue / completed) and overall `OverallBucket` (not-started / in-progress / overdue / completed / abandoned) from a row. 7-day SLA per stage. `snoozeUntil` in the future suppresses overdue. `removalReason` set → bucket = abandoned. **Care Referral Log schema** extends to 18 cols A-R — adds `removalReason` / `removedAt` / `snoozeUntil` so the same vocabulary applies on both pathways. Header constants split into `src/lib/schemas.ts` (no `googleapis` import) so client components can use them. **New components:** `OutcomeCards` (five clickable bucket KPI cards per pathway) and `StageBreakdownTable` (per-stage row counts: Applicable / Not started / In progress / Overdue / Completed). Wired into TelehealthDashboard (replaces v0.7 SLA buckets) and the Admin DashboardView (alongside the cascades). **Mark Abandoned** action in the Screening Referral Log expand panel — 6-reason radio (lost-to-followup / declined-screening / declined-care / moved-away / deceased / other), Admin + Tele-Health only; UI auto-stamps `removedAt` when reason is set. **Snooze** action — date field with `+7d` / `+14d` quick buttons. **Implicit snooze** in `/api/referral-log` PUT: when `contactAttempts` is incremented without an explicit `snoozeUntil`, set `snoozeUntil = today + 7d`. The TelehealthDashboard's old `awaiting_first` / `first_fu_due` / `last_fu_due` / `past_sla` action queues are collapsed into a single **Overdue queue** sorted by days past SLA. |
| 1.5.0   | 2026-06-25 | **Screening Referral Log schema refactor.** Retired `outcome` (single enum) + `firstContactDate` / `firstFollowupDate` / `lastFollowupDate`. Added six role-stamped date columns: `firstContactTelehealthDate`, `lastContactTelehealthDate`, `firstContactScreeningProviderDate`, `lastContactScreeningProviderDate`, `firstContactCareProviderDate`, `lastContactCareProviderDate`. Added `removalReason` / `removedAt` / `snoozeUntil` (written in v1.5, consumed by v1.6 journey-state). New shape: 33 cols A-AG. **Patient Dx** changed to 3-state radio: `Confirmed TB +ve` / `Confirmed TB -ve` / `Pending`; **TB Registration ID / Date** are now gated UI-side on `patientDx === 'Confirmed TB +ve'`. **Yes/No and result fields converted to radio buttons** (clientContacted, referralGivenByTelehealth, arrivedAtCenter, cxrCompleted, cxrResult, xpertCompleted, xpertResult). **Per-role field editability** in `ScreeningReferralLogTable` — fields are highlighted as "your team's responsibility" or rendered read-only depending on the signed-in role (admin / telehealth / screening-provider / care-provider). Tele-Health acts as data steward and can back-fill on behalf of teams not using the digital system. Each role gets a "stamp today" button next to their own date fields. The admin page's inline `ReferralLogTable` was removed and replaced by the shared `ScreeningReferralLogTable` (`userRole="admin"`). v0.7 SLA banner replaced by a v1.5 status badge with a 7-day-per-stage threshold (see KZ-DISCUSSION-POINTS §6). The full per-stage **Self-Check Outcome** / **Patient Support Outcome** dashboard rollup card ships in v1.6 along with the snooze + "mark Abandoned" flows. **New endpoint:** `/api/admin/migrate-screening-log` hard-wipes data rows and re-seeds the new header row (prototype-only — wipes existing test data). |
| 1.4.0   | 2026-06-25 | **SCH-facing User Guide gdoc** authored on the work shared drive (`I:\Shared drives\Equitech Collective\PROJECTS\SCH - TB Project (FC-SDS Mm)\03_Discovery\SCH TB Chatbot [PROTOTYPE]\User Guide`, doc id `1VpZFdgYkqeL7VbHCcNt2P44xog-gAVkMJ3iy8FJKaRw`). Simple-English, role-based quickstarts for SCH Admin / SCH Telehealth / TB Screening Provider / TB Care Provider. Doc structure has a bounded **[BEGIN AUTO-MANAGED CONTENT] / [END AUTO-MANAGED CONTENT]** block so engineers can regenerate the auto block on every version bump while Raj's hand-edits in the "Your notes" section below the END marker survive. Source-of-truth lives at `docs/USER-GUIDE.md` in this repo. Link added to the developer panel under a new `GDOC` tag. Maintenance procedure documented in §14 below. Terminology pinned to **"TB Self-Check Tool"** (P1) and **"TB Patient Support Chatbot"** (P3) — the "Product 1 / Product 3" wording is internal-only and must not appear in user-facing strings. |
| 1.3.0   | 2026-06-24 | **SCH Admin dashboard split** into two sections — `TB Self-Check` and `TB Patient Support` — each with a recursive `CascadeFunnel` visualisation. Self-check cascade: Total → Presumptive → (Assisted \| Self) → Telehealth contact → Screening provider → Tests resulted → TB-positive. Patient-support cascade: Total P3 → Escalated → Care referrals → Telehealth → Care provider. Cross-sheet joins on `screeningReferralId` (self-check) and `careReferralId` (patient support). "Total Screenings" KPI card renamed to "Total Self-Checks". `GET /api/p3/conversation` added so the admin page can read the AI Conversations tab. `USER-JOURNEYS.md` link added to the developer panel. |
| 1.0.0   | 2026-06-25 | **Transcripts to Drive**: every P1 + P3 conversation is now saved as a Markdown file (`{conversationId}.md`) into a Drive folder shared with the service account. Path: env var `GOOGLE_DRIVE_TRANSCRIPT_FOLDER_ID`. P1 saves once on terminal state; P3 saves after every turn (idempotent — create or update the same file). `transcriptUrl` columns added to Sessions + P3 Conversations. Both Telehealth log dashboards (Screening + Care) now show a **📄 Transcript** button per row that opens the Markdown file in a new tab (lookup-on-click via `/api/transcript/lookup` so the dashboard's initial render is unchanged). **Find-new-provider cascade** wired into the P3 Self care-referral flow: 3-step State→District→Township picker → `/api/referral-sites` lookup → rendered as a clinic list with addresses + phones. Replaces v0.9.4's Tele-Health-fallback placeholder. **New scope on the Google service account**: `https://www.googleapis.com/auth/drive` added alongside the existing Sheets scope. Bot version 1.0.0. |
| 0.9.0   | 2026-06-25 | **P3 Phase A + D**: LLM-powered TB-patient-info chatbot wired up. LANDING choice 2 now hands off to a new `P3ChatPanel` instead of the v0.6 stub. **OpenRouter** as the LLM gateway (single key, 5 models in the v0.9 switcher across Frontier / Efficient / Ultra-cheap bands: gpt-5.4, claude-sonnet-4-6, gpt-5.4-mini, qwen-2.5-32b, deepseek-v4-flash). **System prompt** in `docs/p3-system-prompt.md` (Markdown, web-viewable, loaded server-side, hot-swappable per deploy). **Escalation rules** in `docs/p3-escalation-rules.md` — rule-based pre-check on the user's message + LLM-emitted `<escalation level="..."/>` tag, final = max(rule, LLM). On `immediate` or `telehealth`: bot asks for **TB Case ID** (skippable), generates `careReferralId` = `CR-...`, logs to Care Referral Log with no PII beyond the optional TB Case ID + adds to telemetry. **Debug panel**: P3 cost meter (model picker + token totals + estimated $ + escalation summary), Workflow flowchart adapts to P3 mode, and a new **GitHub docs-links block** (README, system prompt, escalation rules, handoff, FB comparison, KZ discussion points). New sheet tab `P3 Conversations` for telemetry. **Care Referral Log** extends to 14 cols with `patientTbCaseId`. **Search-by-name** on both log tables. **Env var required on Vercel**: `OPENROUTER_API_KEY`. |
| 0.8.0   | 2026-06-25 | **Rename**: Referral Log column A `referralId` → `screeningReferralId` (disambiguates from `careReferralId` on the Care Referral Log). New rows minted with `SR-` prefix (legacy `REF-` rows still work — lookups are exact-string). **Role-view reshape**: SCH Telehealth View is now tabbed (Screening Referral Log + Care Referral Log, both editable). TB Screening Provider View now shows the editable Screening Referral Log (was read-only Care). TB Care Provider View unchanged. **Search by ID** on both log tables — substring match against column A. |
| 0.7.0   | 2026-06-25 | **Pediatric pass**: age-bucket selector (Under 5 / 5–14 / 15+) replaces free-text age; 5–14 runs the 8-symptom pass with 2+ Yes threshold; under-5 exits. **Outcome enum on Screening Referral Log**: Pending / Referred / Reached / Lost, plus patientDx, tbRegistrationId, tbRegistrationDate, firstContactDate, firstFollowupDate, lastFollowupDate, remarks. **SLA row colouring** on SCH Telehealth dashboard (12-day / 14-day buckets). **Fix**: silent save-failure for self-referral + exit paths (now uses a centralised useEffect, surfaces errors inline). **Fix**: dashboard mixed-schema counting (legacy v0.2/v0.3 row positions detected by row length). **Fix**: `updateReferralLogFollowUp` column-shift bug that was overwriting `screeningId`. **Sticky-header scroll** on all admin tables. **Follow-up channels placeholder** appended to every completion turn (Phone / Viber / Telegram / Facebook). New `docs/KZ-DISCUSSION-POINTS.md`. |
| 0.6.0   | 2026-06-25 | Chat header rebrand to "SCH TB Chatbot". Universal mock auth gate (username `123` / password `abc`) on every dashboard. 4 role-based dashboard routes: SCH Admin / SCH Telehealth / TB Screening Provider / TB Care Provider. New `Care Referral Log` sheet tab + API. "Screening Referral Log" label (tab name kept as `Referral Log` underneath). Workflow flowchart in debug panel showing current conversation position. Debug panel layout reshuffle. Translation panel scroll fix. By-destination referral summary on SCH Admin dashboard. Comparison vs old SCH FB bot in `docs/FB-BOT-COMPARISON.md`. |
| 0.5.0   | 2026-06-25 | Universal Back / Exit / "What does this mean?" buttons across all mid-flow states. Version shown on the prototype banner. |
| 0.4.0   | 2026-06-25 | 8 symptoms + 10 risk factors (Q6). 3-bucket result. Phone-contact consent. Cascading State/District/Township. Q17 referral letter with screening ID. |
| 0.3.0   | 2026-06-24 | Landing branching (P1 self-check vs P3 patient info stub). Per-question What/Back/Exit on screening Qs. Language Map sheet + client loader. Default skin = Viber. |
| 0.2.0   | (pre-handoff) | Original MVP: rule-based screening, platform skin toggle, translation panel, referral log, feedback capture, screening ID. |

`BOT_VERSION` is the single source of truth in `src/lib/chatEngine.ts`.
The prototype banner reads it and renders `PROTOTYPE v<X.Y.Z>`. **Bump
this constant on every behaviour change.**

## 2. What this prototype is for — and what it is not

**Validate**:

- Conversational flow shape — order of questions, branching, fallbacks,
  back-navigation, exit.
- Burmese wording for every user-facing string.
- The 3-bucket classification rule (Q6) on real-feeling sessions.
- The referral letter format (Q17).
- The cascade approach for State / Region → District → Township.

**Not a stand-in for production**:

- This is a **web prototype** rendering inside a "device skin". The
  real product will run inside Viber Bot API (priority 1), then FB
  Messenger and Telegram. The protocol/widget set on those platforms
  is narrower — for example, Viber's keyboards have a hard limit on
  rows, so very long township lists will need pagination there even if
  they render fine here.
- All session data lives in a Google Sheet (`Sessions`, `Referral Log`,
  `Feedback`). Production will need a real database with proper PII
  handling, retention policy, and SCH Tele-Health access controls per
  Q19–Q21.
- There is no auth model on this prototype — the `/admin` page is
  public. Production must gate it behind SCH Tele-Health credentials.
- The TB patient/caregiver branch (P3, "TB info") is a **stub message
  only**. The LLM-driven RAG chatbot is a separate build; see §10.

## 3. State machine

```
                         ┌────────────────────────────┐
                         │           LANDING          │
                         │ "(1) Self-check  (2) Info" │
                         └───────────┬────────────────┘
                                     │
                ┌────────────────────┴───────────────────────┐
                ▼ choice 1                                   ▼ choice 2
        ┌───────────────┐                              ┌─────────────┐
        │   ASK_AGE     │                              │   P3_STUB   │ (end)
        └───────┬───────┘
                │  age >= 15 (under-15 → AGE_UNDER_15, end)
                ▼
        ┌───────────────┐
        │ SYMPTOM_INTRO │
        └───────┬───────┘
                ▼
        ┌───────────────┐
        │ SYMPTOM_1..8  │ ── yes/no recorded
        └───────┬───────┘
                ▼
        ┌──────────────────┐
        │RISK_FACTOR_INTRO │
        └────────┬─────────┘
                 ▼
        ┌──────────────────┐
        │ RISK_FACTOR_1..10│ ── yes/no recorded
        └────────┬─────────┘
                 ▼
        ┌───────────────┐
        │   ASK_NAME    │ ── text or skip
        └───────┬───────┘
                ▼
        ┌───────────────┐
        │   ASK_GENDER  │ ── M / F / skip
        └───────┬───────┘
                ▼
              CLASSIFY (Q6, 3 buckets)
                 │
   ┌─────────────┼────────────────────┐
   ▼ any S=Yes   ▼ all S=No, any RF=Y ▼ all No
 Presumptive    Negative-High-Risk  Not Presumptive
       │              │                     │
       └──────────────┤                     ▼
                      ▼               ┌──────────────────┐
              ┌─────────────────┐     │ HEALTH_EDUCATION │ (end)
              │ REFERRAL_CHOICE │     └──────────────────┘
              └─┬─────────────┬─┘
                │             │
            assisted        self
                │             │
                ▼             ▼
        ┌──────────────┐  ┌───────────────────┐
        │ASSISTED_CON- │  │  SELF_ASK_STATE   │
        │  SENT (Y/N)  │  └─────────┬─────────┘
        └─┬────────┬───┘            ▼
          │        │N            SELF_ASK_DISTRICT
          ▼        ▼                ▼
   ASSISTED_     ASSISTED_       SELF_ASK_TOWNSHIP
   ASK_PHONE    NO_CONSENT          │ button   │ "Type it in"
        │       (end)               ▼          ▼
        ▼                    (township set)  SELF_ASK_TOWNSHIP_FREEFORM
   ASSISTED_RESULT (end)             │          │
                                     └──┬───────┘
                                        ▼
                                  SELF_ASK_CONTACT (text or skip)
                                        ▼
                                  SELF_RESULT (end)
```

At every mid-flow state, three universal actions are wired:

- **"What does this mean?"** — shown where the question's intent isn't
  self-evident. On a symptom/RF question, it shows a per-question
  explanation. On `REFERRAL_CHOICE`, it explains Assisted vs Self
  referral. On `ASSISTED_CONSENT`, it explains what Tele-Health will do.
- **"Go back"** — clears the answer just recorded and re-asks the
  previous question. Cross-section moves are handled (e.g. RF1 back
  rewinds to S8; ASK_NAME back rewinds to RF10). On the very first
  question (S1) it shows a "this is the first question" notice.
- **"Exit screening"** — sets the session status to `abandoned` and ends
  the flow. End-options (`New Screening`, `Other Questions`, `End
  Conversation`) are offered.

Action-button availability is centralised in `ACTION_CONFIGS` (in
`chatEngine.ts`). Production engineering should keep this table as a
canonical reference for the platform-native rebuild.

## 4. Business rules — Q6 classification

Per SCH's 2026-06-23 NoMs:

```
hasAnySymptom = any of the 8 symptom questions = Yes
hasAnyRiskFactor = any of the 10 risk factor questions = Yes

if hasAnySymptom:                      classification = "Presumptive TB"
elif hasAnyRiskFactor:                 classification = "Negative (High Risk)"
else:                                  classification = "Not Presumptive TB"
```

Both **Presumptive TB** and **Negative (High Risk)** route to the same
downstream — the Q8 message + a referral choice. **Not Presumptive TB**
ends with a health-education message and no referral.

The 8 symptoms and 10 risk factors are defined in `src/data/questions.ts`
with SCH-verbatim Burmese phrasings and English translations. **The
production build MUST use the same question IDs (`sym_*`, `rf_*`)** so
the captured sessions remain comparable.

## 5. Open questions for SCH (still in the spec)

| ID | What                                              | Where it surfaces                                                    | Why it matters                                                            |
|----|---------------------------------------------------|----------------------------------------------------------------------|---------------------------------------------------------------------------|
| Q1 | CXR/GeneXpert data schema for the referral model  | Out-of-scope right now — the referral letter doesn't capture results | When SCH closes the loop on completion, we'll need to record CXR/Xpert results against the screening ID. |
| Q14/Q16 | Authoritative TB service directory          | `Referral Directory` + `Location Hierarchy` Sheet tabs               | Current values are placeholders; real production data must come from SCH/NTP. |
| Q9 | Tele-Health phone number (the `09-xxxx` placeholder) | `msg.referral_disclaimer` in the Language Map                     | Hardcoded today; SCH to confirm the real number.                          |
| —  | Burmese phrasings of the 10 risk factors          | `question.rf_*.text` rows in the Language Map                        | The 8 symptoms are SCH-verbatim (Q6); the 10 RF translations are my drafts pending Wa Thone review. |
| —  | Branching question phrasing                       | `msg.landing_branching` in the Language Map                          | Raj's phrasing; verify with KZ that the 1/2 split converts equivalently. |

## 6. External integrations — Google Sheet schemas

All seven tabs on the same spreadsheet (env var `GOOGLE_SHEET_ID`):

### `Sessions` (one row per completed/abandoned conversation)

`conversationId · startedAt · completedAt · platformView · landingChoice ·
clientName · clientAge · clientGender ·
sym_cough_2wks · sym_cough_blood_phlegm · sym_appetite_loss ·
sym_weight_loss_gradual · sym_fever_night_sweats · sym_chest_back_pain ·
sym_fever_2wks · sym_other_fatigue_neck_lump ·
rf_tb_contact · rf_immunocompromised · rf_diabetes · rf_malnutrition ·
rf_alcohol_heavy · rf_smoking · rf_age_60_plus · rf_prior_tb ·
rf_chronic_lung · rf_crowded_living ·
classification · referralType · consentToPhoneContact ·
referralStateRegion · referralDistrict · referralTownship ·
clientPhone · referralSitesShown ·
status · under15Excluded · screeningId · botVersion`

Yes/No cells use literal `Yes`/`No` strings (empty if the question was
never reached). `botVersion` lets analytics distinguish rows captured
under different schema generations.

### `Language Map`

`key · english · burmese · notes`

Key naming convention:
- `msg.<id>` for bot messages
- `opt.<group>.<id>` for option-button labels
- `question.<questionId>.text` and `question.<questionId>.explanation`

Loaded once per session start via `/api/language-map`. If the load fails
or the key is missing, fallback strings from `src/data/messages.ts` and
`src/data/questions.ts` are used. Hot-reload on the next session start.

### `Location Hierarchy`

`state_region_en · state_region_mm · district_en · district_mm ·
township_en · township_mm`

Drives the cascading State → District → Township menu. **TODO**:
realign this schema (and add a service-availability flag) once SCH
provides the official NTP/Sun GP directory per Q14.

### `Referral Directory`

`site_id · facility_name · facility_name_mm · township · township_mm ·
address · phone · services · operating_hours · type · notes`

Read by `/api/referral-sites?township=...`. Placeholder schema —
realign per Q14/Q15 once the authoritative directory lands.

### `Referral Log` (UI label: "Screening Referral Log")

Operational tab from v0.2. Schema lives in `seed-headers/route.ts`.
Holds: client info + referral type + screening ID + follow-up
tracking (contact attempts, client contacted, referral given by
Telehealth, arrived at centre, CXR completed/result, Xpert
completed/result). Edited via the **SCH Telehealth View**
dashboard.

> **TODO**: align with the old SCH FB-bot **outcome enum** (Reached /
> Lost / Referred / TB / Non-TB) plus Final Diagnosis + TB
> Registration ID + TB Registration Date columns. See
> `docs/FB-BOT-COMPARISON.md` §"Recommendations" for the rationale.

### `Care Referral Log`

New tab introduced in v0.6 for care-provider referrals (the
downstream of a P3 patient/caregiver conversation, when built). Read
by **TB Screening Provider View** (read-only); read+edit by **TB Care
Provider View** and the **SCH Admin View**.

Schema: `careReferralId · conversationId · timestamp · clientName ·
clientAge · clientGender · careProviderName ·
careProviderTownship · careProviderContact · reasonForReferral ·
status (Pending / Contacted / In Care / Closed / Lost) ·
followUpDate · notes`

> **TODO**: realign with the SCH care-provider directory when SCH
> provides one (similar to the Q14 dependency on the screening-side
> directory).

### `Feedback`

Existing operational tab from v0.2.

### Admin endpoints (idempotent — safe to re-run)

| Endpoint                                | Action                                                    |
|-----------------------------------------|-----------------------------------------------------------|
| `GET /api/admin/seed-headers`           | Refresh row 1 of every tab to the latest schema. **In v0.6 this also creates the `Care Referral Log` tab if missing.** |
| `GET /api/admin/seed-language-map`      | Append rows for any new keys in `BOT_MESSAGES` / `RESPONSE_OPTIONS` / question text+explanation. Never overwrites edits. |
| `GET /api/admin/seed-locations`         | Append rows for any new placeholder locations.            |

### Role-based dashboards + mock auth

Every dashboard is gated by a **client-side `AuthGate`** component
(`src/components/AuthGate.tsx`). It accepts username `123` and password
`abc` only; the auth state is held in `sessionStorage` per role. This
is **prototype-only** — production must replace `AuthGate` with the
SCH-approved auth flow (SSO / OIDC against SCH's identity provider).

| Route | View name | Data | Permissions |
|-------|-----------|------|-------------|
| `/admin`               | SCH Admin View              | All sheets + link to the Google Sheet itself + by-destination referral summary | Full read+edit |
| `/telehealth`          | SCH Telehealth View         | **Screening Referral Log + Care Referral Log** (tabbed) | Read + edit BOTH logs (v0.8) |
| `/screening-provider`  | TB Screening Provider View  | Screening Referral Log only          | Read + edit (v0.8 — was read-only Care) |
| `/care-provider`       | TB Care Provider View       | Care Referral Log only               | Read + edit care-provider + status + follow-up + notes |

Both log tables have a **search-by-ID input** at the top — substring
match against column A (`screeningReferralId` / `careReferralId`).

## 7. Referral letter — Q17 contract

The referral letter is built by `generateReferralLetter()` in
`src/lib/chatEngine.ts` and rendered as plain text in the final
SELF_RESULT message. It includes:

1. **Header** — date, Screening ID, "Referral Provider: TB Self-Check
   Chatbot", State / Region (if set), District (if set), Township.
2. **Client information** — name (or "not provided"), age, sex, phone.
3. **Signs / Symptoms** — every one of the 8 symptoms with `[Present]`
   or `[Absent]`.
4. **Risk factors** — every one of the 10 risk factors with `[Present]`
   or `[Absent]`.
5. **Reason for referral** — derived from the classification bucket.
6. **Classification** — `Presumptive TB` / `Negative (High Risk)` /
   `Not Presumptive TB`.
7. **Instructions** — the SCH service-availability disclaimer
   (`msg.referral_disclaimer` — contains the Tele-Health phone number).
8. **Referring agent line** — "TB Self-Check Chatbot".

Burmese and English versions are produced in parallel.

For production: the letter should also be deliverable as a structured
JSON payload to whatever downstream system SCH chooses (Q21 says SCH
Tele-Health team has sole write-access to the referral register). The
plain-text rendering here is intentional — it is what the user sees in
the chat window and what they can screenshot per Q17's "show this
e-slip or screen shot to health centers" instruction.

## 8. Language and locale notes

- **Primary language is Burmese.** All bot messages render Burmese in
  the chat window. English is shown only in the optional debug-panel
  "English Translation" view.
- **Fonts**: Burmese rendering on the production platforms depends on
  the chat client (Viber, FB Messenger, Telegram). They generally
  ship Burmese support, but text wrapping with mixed Latin + Burmese
  glyphs has edge cases. **The prototype side-steps this — production
  build should explicit-test wrapping behaviour on each platform.**
- **Burmese-digit literals** — the landing buttons use the Burmese
  digits `၁` and `၂` so users can match the question's numbered list.
  Some Viber keyboard renderers may strip non-ASCII from button
  labels; double-check on-device before locking the design.

## 9. Suggested edits to the prototype → validation → build process

These aren't behaviour changes — they're process hygiene that pays off
when the engineering team picks this up.

1. **Lock the spec at the language-map level, not the code level.**
   When you and SCH agree on a string, edit the Google Sheet, not the
   code. The Sheet is read at every session start and overrides
   defaults. This means SCH can keep tweaking through validation
   without a code push.
2. **Export the language map for translation review.** When ready for
   Wa Thone's pass, snapshot the `Language Map` tab as CSV and share
   with him. Re-import the edited CSV.
3. **Tag each prototype version that hits a validation session.** Run
   a session in front of an SCH user → note the `botVersion` value
   shown on the banner → note any feedback against that version in the
   `Feedback` tab. Lets you reconstruct which feedback applies to
   which behaviour later.
4. **Capture validation test scripts in `docs/test-scripts/`** before
   they're run. One file per scenario (e.g. "high-risk DM patient",
   "no-symptoms healthy contact", "exit mid-screening"). Engineering
   inherits these as the acceptance criteria for the production build.
5. **Wire the `botVersion` value into the `/admin` page header** —
   makes it obvious when you're looking at data from an older schema.
6. **Production data model first, then production UI.** When
   engineering picks this up, the first artefact should be the
   production DB schema for `Sessions` and `Referral Log` —
   one column per current Sheet column, with proper types + PK on
   `screeningId`. Don't carry forward the Sheet-as-storage pattern.
7. **Tele-Health access control**. Q19–Q21 says only SCH Tele-Health
   reads + writes the referral register. The prototype's `/admin`
   page is the placeholder for this — bake it into the production
   build behind real auth.
8. **Don't pad the chatbot's responses with the language-map keys.**
   Production should resolve language-map keys server-side and emit
   only the resolved text to the chat platform. The prototype does
   client-side resolution because the React layer needs to react to
   live edits during a single session.

## 10. P3 — TB patient/caregiver info chatbot

Currently a stub. When you ask me to build it, expect:

- A separate state graph triggered by landing choice 2.
- LLM-driven RAG over the SCH-shared knowledge base (WHO Module 4
  treatment & care, Myanmar NTP DR-TB guidelines, CDC TB Q&A) per
  Q23–Q26.
- Red-flag triggers (Q27): severe breathing difficulty, haemoptysis,
  chest pain, severe weakness, altered consciousness, severe drug
  side effects, pregnancy + TB symptoms, symptomatic child contact,
  DR-TB concern, treatment interruption, self-harm / abuse — each
  escalates to "contact Sun Tele-Health team immediately" with the
  Q9 phone number.
- **No patient DB linkage and no PII** per the 4 Jun KZ steer — the
  P3 chatbot answers educational questions only, refers patients to
  their treating clinician for anything personal.

When P3 lands, this doc gains a §11 covering its state graph + RAG
pipeline + escalation rules + KB source map. Production build should
treat P3 as a separate microservice — different scale, different
guardrails, different infrastructure cost profile.

## 10b. P3 — bilingual LLM output (development mode only)

**Status as of v0.9.1**: P3's system prompt instructs the LLM to emit
its reply in **both Burmese and English**, separated by `===EN===`,
so the debug-panel "English Translation" view stays useful during
development and reviewer testing. The server splits the reply on the
separator and returns `replyMm` + `replyEn`; the chat surface shows
the Burmese half and the translation panel shows the English half.

> **Cost note for production:** the dual-output prompt **roughly
> doubles** the per-turn completion tokens compared to Burmese-only
> output. That's an acceptable tradeoff during prototype validation
> (lets reviewers and SCH clinicians audit what the bot is actually
> saying), but it should be **switched off in production** to halve
> the per-conversation token cost.
>
> **How to turn it off for production:**
> 1. In `docs/p3-system-prompt.md`, remove the entire "Reply format —
>    STRICT" block (the section that mandates the `===EN===`
>    separator + English block).
> 2. Leave the `<escalation level="..."/>` tag requirement in place —
>    that's still load-bearing for routing.
> 3. The server (`/api/p3/chat`) already falls back gracefully: if
>    the LLM doesn't emit a `===EN===` separator, `parseEscalationTag`
>    returns the full reply as `replyMm` and leaves `replyEn` empty,
>    and the chat surface uses `replyMm` for everything.
> 4. Consider hiding the English Translation toggle from the
>    production debug panel (or just disabling it for the
>    LANDING-choice-2 / P3 path).

The dev/prod toggle is in the Markdown content, not in code, so SCH
or ETC can decide per-deployment without a rebuild — just edit
`docs/p3-system-prompt.md` and redeploy.

## 11. Comparison with the old SCH FB self-check bot (Jun 2022)

See **`docs/FB-BOT-COMPARISON.md`** for the full diff. Key takeaways
the engineering team should keep in mind:

- **Pediatric pathway (5–14)** — the old bot screens 5–14-year-olds
  with a 2+ Yes threshold. We currently exclude under-15. Either
  build a parallel pediatric pass or get SCH's explicit sign-off
  that we are intentionally narrower than the existing bot.
- **Outcome enum** — the old bot uses `Reached / Lost / Referred`
  + final-diagnosis (TB / Non-TB) + TB Registration ID. We have
  `status: in_progress / completed / abandoned`. The production
  schema should adopt the old-bot enum so Tele-Health's existing
  workflow translates directly.
- **2-week / 2-attempt follow-up SLA** — the old bot encodes this
  rule (first follow-up at 2–3 days, last at 2 weeks, "Lost" after
  the second failed contact). Worth surfacing in the production
  service contract for the Tele-Health team.
- **Symptom-phrasing equivalence** — old bot's "evening rise in
  temperature" ≈ our "fever with night sweats"; old bot's "cervical
  lymph node" ≈ our "fatigue or neck lump". Useful for cross-bot
  analytics.

## 12. Surface rename audit — "TB Self-Screening Bot" → "SCH TB Chatbot"

Done in code (this iteration, v0.6.0):

- Chat window header
- README title + handoff doc title
- Admin / Telehealth / Screening Provider / Care Provider page
  titles + `<h1>`s
- `package.json` name → `sch-tb-chatbot`

**Items Raj needs to change manually** (not safe to do from inside
the prototype without his sign-off):

| Surface | Current | Suggested new | Notes |
|---------|---------|---------------|-------|
| GitHub repo name | `natarajanrajaraman/tb-screening-chatbot` | `natarajanrajaraman/sch-tb-chatbot` | GitHub auto-redirects from the old URL for ~1 year, so existing clones keep working. Webhooks etc. should be re-checked. |
| Vercel project name | `tb-screening-chatbot` | `sch-tb-chatbot` | In Vercel project Settings → General. |
| Vercel default URL | `tb-screening-chatbot.vercel.app` | `sch-tb-chatbot.vercel.app` | Vercel mints a new default URL when the project is renamed; the old URL stops working unless you add an alias for it. Decide whether to keep the old URL alive as an alias for any existing screenshots / shared links. |
| Google Sheet title | "TB Self-Screening Chatbot — Database [PROTOTYPE]" | "SCH TB Chatbot — Database [PROTOTYPE]" | Manual rename in Drive (right-click the file). Sheet IDs are unchanged so the prototype keeps reading/writing it. |

**Not changeable**:

- Old Vercel preview deployment URLs (one per push) — they bake
  the project name in at creation time and don't update
  retroactively. Will continue to work; will continue to show the
  old name in the URL.
- Bookmarks, slides, screenshots that already reference the old
  name — those are out of our reach.

## 13. Open items / TODOs in code

These markers exist in the source — search for them on handoff:

- `src/lib/googleSheets.ts` — `TODO: REPLACE WITH SCH'S AUTHORITATIVE
  TB SERVICE DIRECTORY` (above `getReferralSites`).
- `src/data/locationSeed.ts` — `TODO: REPLACE WITH SCH'S AUTHORITATIVE
  DIRECTORY (Q14, Q16)`.
- Tele-Health phone number `09-xxxx` placeholder in
  `msg.referral_disclaimer`.
- Health-education content is still the v0.2 placeholder
  (`msg.health_education`). SCH-approved content per Q3 of the May
  pre-catch-up batch (WHO Module 4 §"Tuberculosis care and support")
  should replace it.

## 14. User guide maintenance

The SCH-facing user guide is **a markdown file in this repo** (v1.7.4 — migrated from .gdoc per Raj's directive: the gdoc-sync flow had ongoing clobber/sync friction with no offsetting benefit for an audience that can read on GitHub).

- **Source of truth:** `docs/USER-GUIDE.md`
- **Reader URL** (linked from the dev panel and shared with SCH): https://github.com/natarajanrajaraman/sch-tb-chatbot/blob/master/docs/USER-GUIDE.md — GitHub renders the markdown nicely.
- **Old gdoc id** `14YYjIlCwWrvQc9hlwoqCTwqWQHMtgvH0r24MISSdrvA` is now orphaned and may be trashed.
- **Audience:** SCH Admin, SCH Tele-Health, TB Screening Provider, TB Care Provider — many are non-native English speakers; keep wording short and direct.

### Terminology — must stay consistent

Use only the user-facing names below. Do **not** use the internal "Product 1 / P1 / Product 3 / P3" wording anywhere in the guide or in user-facing UI strings.

| User-facing name | Internal name | Surface |
|---|---|---|
| TB Self-Check Tool | P1 | Landing choice 1 — fixed-flow screening |
| TB Patient Support Chatbot | P3 | Landing choice 2 — LLM open conversation |

### Update procedure on every version bump

When you bump `BOT_VERSION` for a release that affects anything a user could notice (new role view, new dashboard, terminology change, behaviour change, surface rename, etc.):

1. **Edit `docs/USER-GUIDE.md`** in this repo — update the version line at the top, add a row to the "Version history" table, and revise any section whose content changed.
2. **Don't touch anything below the `## Your notes` heading.** That section is Raj's hand-edited area and must survive every update.
3. **Commit + push** as part of the same change — git is the sync mechanism. Conflicts surface as merge conflicts (which is the right tool for "two people edited the same prose").

### What goes in the auto-managed section vs the notes section

The auto-managed sections describe how the prototype **currently** behaves — quickstarts, role views, sheet tabs, escalation table, cascade chart shape, known limits, version history. Raj's "Your notes" section is for observations, SCH-side context, open questions, and anything else that should stick around regardless of what the engineering team ships next.

If any factual change in the auto-managed section would invalidate something in Raj's notes (e.g. you remove a role), flag it in the commit message — do **not** silently edit the notes.
