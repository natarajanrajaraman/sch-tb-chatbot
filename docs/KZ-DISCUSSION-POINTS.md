# Discussion points to raise with KZ

Live list — capture each point with enough context that we can walk
through it at the next ETCxSCH weekly catch-up without re-deriving
the rationale. When KZ's reply lands, **move the item to the
"Resolved" section at the bottom** with a one-line decision summary
(so we keep the institutional memory).

---

## Open

### 1. Pediatric pass — built, needs SCH sign-off

**Status as of v0.7.0**: The prototype now mirrors the old SCH FB
self-check bot's age-bucket structure exactly —

- **Under 5** → bot exits, advises consult HCP directly.
- **5–14 (pediatric)** → same 8 symptom questions as adults, but
  the classification rule is **2+ Yes → Presumptive TB**, mirroring
  the old SCH bot's threshold. The risk-factor pass is **skipped**
  for pediatric users (the 10 RF in Q6 are adult-framed; no
  pediatric RF set has been agreed yet).
- **15+ (adult)** → unchanged from v0.6: 8 symptoms + 10 risk
  factors, 3-bucket classification.

The prototype now uses **button-selected age groups** instead of
free-text age, matching the old bot's interaction model.

**Why we built it before consulting KZ**: the gap was flagged in
`docs/FB-BOT-COMPARISON.md` as a silent omission vs. SCH's existing
bot. Closing the gap behind a sign-off is lower-risk than waiting.

**Asks of KZ**:
1. Confirm the **2+ Yes threshold for pediatric** is still the
   SCH-approved decision rule (vs. 1+ Yes for adults).
2. Confirm there is **no pediatric-specific risk-factor list**
   that should sit alongside the 10 adult RF. If there is one,
   we'll add a pediatric RF pass.
3. Confirm the **under-5 exclusion message** is appropriately
   framed (refers to "consult a doctor or health worker
   directly"); should it instead route into the SCH Tele-Health
   path?

### 2. Follow-up surface — phone-only, or also a chat inbox?

**Status as of v0.7.0**: at every completion endpoint, the bot now
shows a placeholder block:

> 📨 For more questions, you may contact the SCH Tele-Health team —
> Phone: 09-XXXXXXX
> Viber: 09-XXXXXXX
> Telegram: @SCH-TB-XXXX
> Facebook: m.me/sch-tb-XXXX

This mirrors the old SCH FB bot's "for more questions, message Thuta
on Facebook Messenger at m.me/thukhathuta2022" pattern, but offers
multiple channels.

**The context this question came from**: the old bot offered users
**a text-chat inbox** (Facebook Messenger) for follow-up questions
— async, written, low-friction for stigma-conscious users, supports
photo sharing (e.g. CXR result). Our v0.6 only had a phone number,
which is synchronous, voice-only, and harder for users uncomfortable
with calls.

**Asks of KZ**:
1. Which of the four channels (Phone / Viber / Telegram / Facebook)
   does SCH actually want to staff for follow-up questions?
2. If chat-channel(s) are wanted: which SCH staff role owns
   monitoring them, and what response-time SLA?
3. Should the Phone number in the placeholder use SCH's existing
   Tele-Health line, a dedicated chatbot-follow-up line, or both?
4. The Phone XXX / Viber XXX / Telegram XXX / Facebook XXX
   placeholders need real values before SCH-facing testing —
   please provide whichever ones SCH has decided to staff.

### 3. SCH Tele-Health response-time SLA for P3 escalations

**Status as of v0.9.0**: The P3 chatbot now generates `careReferralId`
+ logs to the Care Referral Log on every `immediate` or `telehealth`
escalation. The bot tells the user to "contact SCH Tele-Health" but
gives no commitment about how fast that contact will happen.

**Why this matters**: Both the Medibot WHO pilot and the SCH MH
post-launch review independently flagged **escalation latency as
the trust-killer** — wrong-but-fast answers are forgivable, slow
escalation responses are not.

**Asks of KZ**:

1. What **response-time SLA** does SCH Tele-Health commit to for
   `immediate` referrals (target: minutes)? For `telehealth`
   referrals (target: hours)?
2. What **hours of cover**? If a patient escalates at 11pm,
   what's the expected response?
3. **Who staffs each follow-up channel** (Phone / Viber / Telegram /
   Facebook) — and do all four have the same SLA?
4. **Out-of-hours protocol**: should the bot tell users explicitly
   "Tele-Health responds 9-5 SGT; for life-threatening symptoms call
   ambulance / nearest hospital NOW"?

### 4. Bilingual KB content review capacity (Phase B precondition)

**Status as of v0.9.0**: System prompt is a v1 draft authored by Raj
+ Claude. Drafted in English with light Burmese phrases. **Not
SCH-clinician reviewed.** Will be replaced with retrieval over WHO
Module 4 / Myanmar NTP / CDC during Phase B (next major push).

**Asks of KZ**:

1. **Which SCH clinician** owns the bilingual review for both the
   system prompt AND the Phase B RAG corpus? (Wa Thone covers the
   Burmese translation; the clinical-correctness check needs an
   SCH-side clinician.)
2. **What's the review SLA?** A 50-document corpus reviewed at 2
   docs/week is a 6-month project. We need to size this realistically
   before kicking off Phase B.
3. **Sign-off bar before live patient exposure**: at what threshold
   of review coverage does SCH consider the bot ready for
   patient-facing use (vs the current internal review only)?

### 5. Q31/Q33 divergence — careReferralId logging

**Status as of v0.9.0**: Raj overrode KZ's "no log" stance from
Q31/Q33 after confirming we collect NO patient PII at session
start. A careReferralId + Care Referral Log row is generated on
every `immediate`/`telehealth` escalation. No clientName / age /
gender / phone is captured. Patient TB Case ID is captured ONLY at
the escalation prompt and ONLY with explicit Skip option.

**Asks of KZ**:

1. Is SCH OK with **anonymous escalation audit logs** that carry no
   identifiable patient info beyond the optional TB Case ID?
2. **Who has access** to the Care Referral Log? Per the v0.8 role
   matrix: SCH Telehealth View (read+edit BOTH logs), TB Care
   Provider View (read+edit Care log only), SCH Admin View (all). Is
   this the right access control for production?
3. **Retention policy**: how long should these audit rows persist?
   Per the SCH MH lit review, default = 24 months post-treatment-
   completion or shorter per WHO guidance.

### 6. (Add new items here as they come up)

---

## Resolved

(none yet — move items here with a one-line decision once KZ
responds.)
