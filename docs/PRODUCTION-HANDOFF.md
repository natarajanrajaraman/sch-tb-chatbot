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

## 1. Versions and changelog

| Version | Date       | Highlights                                                                                                                |
|---------|------------|---------------------------------------------------------------------------------------------------------------------------|
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
