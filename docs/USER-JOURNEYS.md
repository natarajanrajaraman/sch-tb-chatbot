# SCH TB Chatbot — User Journeys for Testing

> A set of end-to-end scenarios for testing the prototype from the
> point of view of each role. Each journey threads a **single
> patient** through the system and shows what each role sees + does.

Each journey is structured as:

- **Scenario** — one-line setup
- **Patient role** — what the patient does in the chatbot
- **Telehealth role** — what SCH Tele-Health sees + does
- **Screening Provider role** — what they see + do
- **Care Provider role** — what they see + do
- **Admin role** — full-data view, what to check

You can run journeys sequentially in one browser session — each
ends in a stable state ready for the next.

---

## Journey A — Adult positive self-check → Assisted screening referral → Reached

### Scenario
Adult woman, suspected TB based on cough + weight loss, picks Assisted referral via P1.

### Patient (P1)
1. Open https://sch-tb-chatbot.vercel.app/.
2. Tap **(1) Self-check**.
3. Pick **15 years or above**.
4. Symptoms:
   - Cough > 2 weeks: **Yes**
   - Cough w/ blood/phlegm: **No**
   - Loss of appetite: **Yes**
   - Gradual weight loss: **Yes**
   - Fever + night sweats: **No**
   - Chest/back pain: **No**
   - Fever > 2 weeks: **No**
   - Other (fatigue / neck lump): **No**
5. Risk factors: tap **No** on all 10.
6. Name: `Daw Aye Aye` · Gender: **Female**.
7. Result: should classify as **Presumptive TB** → bot shows Q8 message + Assisted/Self choice.
8. Tap **Assisted Referral** → tap **Yes, I consent**.
9. Enter phone: `09-987654321`.
10. Bot shows confirmation + screeningId (`SCR-…`) + Tele-Health channels.

### SCH Telehealth role
1. Open https://sch-tb-chatbot.vercel.app/telehealth (login `123` / `abc`).
2. **Dashboard tab**: should see counts increment under "Awaiting 1st contact" (Screening +1).
3. The "Awaiting first contact" list should include `Daw Aye Aye` as a Screening row.
4. Click the row → jumps to **Screening Referral Log** tab, that row auto-expanded.
5. Fill in:
   - First contact date: today
   - Contact attempts: `1`
   - Client contacted: `Yes`
   - Referral given by Telehealth: `Yes`
6. Save to Database.
7. Go back to Dashboard. The row should now show in "Follow-ups due" (1st FU due bucket — within 11 days). SLA badge should NOT still say "No 1st contact yet".
8. Open the row again. Update:
   - Arrived at Centre: `Yes`
   - CXR Completed: `Yes`
   - CXR Result: `+ve`
   - Xpert MTB/RIF Completed: `Yes`
   - Xpert MTB/RIF Result: `T`
   - Outcome: `Reached`
   - Patient Dx: `TB`
9. Save. The row should now be **Resolved (TB)** on the Dashboard.

### Screening Provider role
1. Open `/screening-provider` (same login `123` / `abc`).
2. The same row should appear with the latest follow-up + CXR + Xpert fields visible (no separate dashboard — just the table).

### Admin role
1. Open `/admin`.
2. Verify the `Daw Aye Aye` Sessions row carries the Screening ID + the screening referral row is linked.
3. Click 📄 Transcript → opens the Drive Markdown for this conversation.
4. Open the spreadsheet via the header link → check the Sessions, Screening Referral Log tabs.

---

## Journey B — Pediatric self-check → Negative (High Risk) → Self referral

### Scenario
Mother bringing 8-year-old child with persistent cough.

### Patient (P1)
1. Restart conversation if needed.
2. Tap **(1) Self-check**.
3. Pick **5 to 14 years**.
4. Symptoms (pediatric pass uses 2+ Yes threshold):
   - Cough > 2 weeks: **Yes**
   - Cough w/ blood/phlegm: **No**
   - Loss of appetite: **No**
   - Weight loss: **No**
   - Fever + night sweats: **Yes**
   - All others: **No**
5. Workflow flowchart should show "Pediatric pass (5-14, 2+ Yes)" and skip Risk Factors.
6. Name: `Child Min Khant` · Gender: **Male**.
7. Result: **Presumptive TB** (2 symptoms Yes meets threshold).
8. Tap **Self-Referral**.
9. State: **Yangon Region** · District: **Yangon East District** · Township: **Bahan**.
10. Skip contact info.
11. Bot returns a clinic list + bilingual referral letter with the screening ID.

### Telehealth role
1. Dashboard: a new row should appear under "Awaiting first contact" for the pediatric self-referral.
2. SLA bucket should still say "No 1st contact yet" because Self-Referral doesn't capture contact info (this is expected per Raj's exception).
3. Open the row, type-in any contact info if known, save. SLA should move.

### Admin
1. Verify Sessions row has `ageGroup=pediatric`, `classification=Presumptive TB`, `referralType=Self`.

---

## Journey C — P3 LLM patient counselling → no escalation → resolved

### Scenario
TB patient on treatment asks "Can I take my medicine with food?"

### Patient (P3)
1. Restart conversation.
2. Tap **(2) TB patient info**.
3. Type: `Can I take my TB medicine with food?`
4. Bot replies in Burmese with educational info, no escalation (`level: none` or `nonurgent`).
5. Verify cost meter in Dev panel increments.

### Telehealth role
1. Dashboard: no new SLA-bucket rows (informational chat).
2. Alerts Log tab: no new entries (no red flag).

### Admin
1. AI Conversations tab on the spreadsheet has a new row with token totals + escalations=0.
2. 📄 Transcript opens the Markdown — last section is an **AI-generated summary** (max 50 words).

---

## Journey D — P3 LLM → red-flag escalation → Assisted care referral

### Scenario
TB patient says "I'm coughing up blood".

### Patient (P3)
1. Restart.
2. Tap **(2)** → wait for greeting.
3. Type: `I'm coughing up blood`.
4. Bot replies with **immediate escalation** message (red left border).
5. A `careReferralId = CR-…` line appears.
6. The bot presents the **Assisted vs Self** choice. Tap **Assisted Referral**.
7. Fill in:
   - TB Case ID: `TB-2026-DEMO`
   - Phone: `09-123456789`
8. Tap **Submit**.
9. Bot confirms: "your TB Case ID and contact details have been shared".

### Telehealth role
1. Dashboard: **Open red-flag alerts** count should be 1.
2. Top list: a new row for this alert with level=`immediate`, trigger reason=`rule: immediate: haemoptysis | llm: immediate | level: immediate`.
3. Click the row → jumps to **Alerts Log** tab, row auto-expanded.
4. Fill reviewer name + notes ("Reviewed; legitimate immediate escalation; patient given Tele-Health contact"). Status → `Reviewed`. Save.
5. Dashboard: open alerts count drops to 0.
6. Now the **Care Referral Log** tab should also have a new row with `careProviderName=SCH Tele-Health` + `patientTbCaseId=TB-2026-DEMO` + `patientContact=09-123456789`.
7. Open that row, update status to `Contacted` after you've made the (mock) call. Then `In Care`.

### Care Provider role
1. Open `/care-provider`.
2. The new care referral should be visible. Update `careProviderTownship` once you've routed to a clinic.

### Admin
1. AI Conversations row carries the `careReferralIds` column populated with the new CR ID.
2. Alerts Log row is in `Reviewed` state.
3. Transcript Markdown ends with an AI-generated summary noting the escalation.

---

## Journey E — P3 → red-flag → Self referral with find-new-provider cascade

### Scenario
TB patient says "I've missed several doses" and doesn't know where to go.

### Patient (P3)
1. Restart, tap **(2)**.
2. Type: `I've missed several doses of my TB medicine`.
3. Bot should classify as **telehealth** escalation (yellow left border).
4. careReferralId appears. Choose **Self Referral**.
5. Optionally fill TB Case ID (or skip). Skip contact + provider ID.
6. Tap **📍 Find a new TB care provider near me**.
7. Pick **Yangon Region → Yangon East District → Bahan**.
8. Bot returns the clinic list with addresses + phones in Burmese + English.

### Telehealth
1. Dashboard: open red-flag count = 1. Click → reviews and marks as `Dismissed` if the user appears to be on track to self-route.
2. Care Referral Log: row has `careProviderTownship=Yangon Region › Yangon East District › Bahan` + notes contain `referralMode: self · find-new-provider: ...`.

---

## Journey F — P3 → user abandons mid-flow

### Scenario
Patient triggers a red flag, but closes the browser before submitting any contact info.

### Patient (P3)
1. Restart, tap **(2)**.
2. Type: `I have severe chest pain`.
3. Bot escalates immediate. careReferralId minted.
4. **Close the browser tab.** No contact info given, no Assisted/Self picked.

### Telehealth
1. Dashboard: open red-flag count should still be 1 (the alert was logged at moment of detection, regardless of completion).
2. Open the alert → mark as `Reviewed` with notes "Patient abandoned — outreach not possible without contact info". Status → `Dismissed`.
3. The Care Referral Log row also exists, with empty patientContact + patientTbCaseId. Telehealth team would normally close this row with status=`Lost`.

### Admin
1. AI Conversations row shows the abandoned conversation with `escalationsCount=1` + `careReferralIds=CR-...`.
2. Alerts Log row exists even though no follow-up was possible.

---

## How to make a clean reset

To start over with a fresh sheet:

1. Manually delete test rows you've added (or use the spreadsheet's filter).
2. On the chatbot, click **↻ Restart Conversation** between journeys so the conversation ID rotates.
3. Sign out of dashboard views via the Sign-out chip in the top right.

---

## Walkthrough — testing Journey A on the Telehealth Dashboard

Here's the step-by-step walk-through Raj asked for (Journey A is the most representative end-to-end scenario):

### Setup (browser 1 — patient role)

1. Open https://sch-tb-chatbot.vercel.app/ in an incognito window.
2. Run through Journey A patient steps 1–10 above.
3. Note the screeningId from the in-chat referral letter (e.g. `SCR-260626-AB12`).

### Switch to Telehealth role (browser 2 or new incognito tab)

4. Open https://sch-tb-chatbot.vercel.app/telehealth.
5. Sign in: username `123`, password `abc`.
6. You land on the **Dashboard** tab.
7. Click 🔄 **Refresh** in the top right to pull fresh data.

### Verify the dashboard reflects the new referral

8. The "Awaiting 1st contact" KPI card should show **+1 vs before** (Screening side).
9. Scroll down to the **"📋 Awaiting first contact"** queue. Daw Aye Aye should be at or near the top (oldest first if you have other test data, or alone if the sheet is fresh).
10. Sort dropdown should also work — pick "Oldest first" → confirm rows reorder.

### Drill into the record

11. Click the row.
12. You should land on the **Screening Referral Log** tab AND the matching row should auto-expand into the edit panel. Scroll position should center on it.
13. The form shows all 16 follow-up fields. Fill in:
    - Contact Attempts: `1`
    - Client Contacted: `Yes`
    - First Contact Date: today
14. Click **Save to Database**.

### Verify the SLA badge changes

15. Click the **Dashboard** tab.
16. The "Awaiting 1st contact" count should be **−1**.
17. The same patient should now appear in "📞 Follow-ups due" with a `0d — within window` or `1d — within window` badge.
18. After 2+ days, it would move to "1st FU due" automatically.

### Resolve the case

19. Click the row again (re-opens the edit panel).
20. Set Outcome = `Reached`, Patient Dx = `TB`. Save.
21. Dashboard: the row should now show in **"Resolved this week"** card. Action queues drop it.

### Confirm the transcript

22. On the Screening Referral Log row, click 📄 **Transcript**.
23. Drive should open the Markdown file with the full conversation + the AI-generated summary at the bottom.

### Optional — test the search

24. In the Screening Referral Log, type `Daw` in the search bar → confirms substring match works on client name (v0.9.0+).

---

## Coverage matrix

| Journey | Tests | Role coverage | Estimated time |
|---|---|---|---|
| A | Adult Presumptive · Assisted screening · Reached | Patient → Telehealth → Screening Provider → Admin | 8 min |
| B | Pediatric · Self-referral · cascading location | Patient → Telehealth → Admin | 5 min |
| C | P3 educational chat · no escalation | Patient → Admin | 3 min |
| D | P3 immediate red flag · Assisted care referral | Patient → Telehealth → Care Provider → Admin | 7 min |
| E | P3 telehealth red flag · Self care referral with find-new-provider | Patient → Telehealth → Care Provider | 6 min |
| F | P3 red flag + abandoned conversation | Patient → Telehealth → Admin | 4 min |

**Full coverage: ~35 minutes** for all six journeys.

If SCH wants a structured demo, run **A + D + F in that order** — covers the three biggest pieces (screening flow, care flow with PII collection, and abandonment audit) in ~20 minutes.
