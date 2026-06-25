# P3 — Escalation Rules (v1)

> **Status:** v1 — used in v0.9.0 prototype.
>
> **Loaded server-side** by the chat endpoint to:
> 1. Drive the rule-based **pre-check** layer (Burmese + English
>    keyword/phrase matching that runs before the LLM call).
> 2. Be embedded into the system prompt so the LLM uses the same
>    taxonomy when it emits `<escalation level="..."/>`.
>
> **Source:** KZ NoMs reply 2026-05-27 (escalation red-flag list) +
> 2026-06-23 Q&A (Q22–Q33) + P3 Spec v1.1 §2.5.
>
> **Web-viewable:**
> https://github.com/natarajanrajaraman/sch-tb-chatbot/blob/master/docs/p3-escalation-rules.md
>
> **TODO v2** — add example trigger phrases in Burmese for each row
> so the rule-based pre-check has meaningful recall. Wa Thone +
> SCH-clinician review required.

## Decision rule (per KZ, Q27)

> "Trigger any red flags or patients say they need medical attention."

## Levels

### `immediate` — go to nearest clinic / hospital NOW

Life-threatening or acutely dangerous symptoms. The bot must render
a Burmese-language urgent message AND the chat surface generates a
`careReferralId` + bilingual referral letter for the SCH Tele-Health
team to follow up.

| Red flag | Example phrasing (en) | Example phrasing (mm — TODO Wa Thone) |
|---|---|---|
| Severe breathing difficulty | "I can't breathe", "really struggling to breathe" | TODO |
| Coughing blood (haemoptysis) | "coughing up blood", "blood in my sputum" | TODO |
| Chest pain | "chest pain", "pain in chest" | TODO |
| Altered consciousness | "confused", "can't think clearly", "fainted" | TODO |
| Severe weakness | "too weak to stand", "can't get out of bed" | TODO |
| Self-harm signals | "want to hurt myself", "don't want to live" | TODO |
| Violence / abuse signals | "someone is hurting me" | TODO |
| Pregnancy + TB symptoms | "I'm pregnant and have TB symptoms" | TODO |
| Symptomatic child contact | "my child has been coughing for weeks" | TODO |
| Severe vomiting | "vomiting everything", "can't keep medicine down" | TODO |
| Yellow skin or eyes | "yellow eyes", "jaundice" | TODO |
| Severe rash with fever or mouth ulcers | "rash all over with fever" | TODO |

### `telehealth` — contact SCH Tele-Health team

Needs a clinician promptly but not an ambulance situation. The bot
renders an empathetic Burmese message advising the user to contact
the SCH Tele-Health team via Phone / Viber / Telegram / Facebook
(channels block). A `careReferralId` + bilingual referral letter is
generated.

| Red flag | Notes |
|---|---|
| Moderate drug side effects | Persistent nausea, mild jaundice symptoms still mild, ongoing itching, mild rash, stomach pain |
| Treatment interruption (≥2 missed doses in 14 days OR ≥4 in 30 days) | Adherence concern requiring clinician advice |
| DR-TB specific symptoms (hearing change, vision change) | Per P3 Spec §2.5 — DR-TB regimens have specific monitoring |
| DR-TB specific (mood change / non-immediate suicidality) | Distinct from immediate self-harm signals; still needs clinical contact |
| DR-TB specific (peripheral neuropathy — numbness, tingling) | May need pyridoxine adjustment |
| DR-TB specific (QT-implicating symptoms — palpitations, syncope) | Per Spec §2.5 — specific to all-oral DR-TB regimens |
| DR-TB specific (joint swelling, thyroid symptoms) | Per Spec §2.5 |
| User explicitly asks for medical attention but not urgent | "I want to talk to a doctor", "can someone help me" |

### `nonurgent` — discuss at next clinic visit

Informational questions, adherence guidance, lifestyle. Bot answers
the question informationally, then suggests the user discuss it with
their treatment-centre HCP at the next visit (or contact them if it's
bothering them). **No `careReferralId`, no referral letter, no log
row.** The follow-up-channels block at the end of every conversation
still gives them access to the SCH Tele-Health team if they want it.

| Trigger | Example |
|---|---|
| Adherence questions | "What happens if I forget a dose?", "Can I take my medicine with food?" |
| Lifestyle | "Can I drink alcohol?", "Can I work out?", "What should I eat?" |
| Contact / household precautions | "Do my family members need to be tested?" |
| General TB education | "How does TB spread?", "Will I be cured?" |
| Uncertainty on bot's part | When the bot says "I don't have reliable information about that" |

### `none` — no escalation

Pure informational reply, no clinical urgency, no action needed.
Typical for casual conversation, clarifying questions, or simple
factual answers that don't touch on the user's personal health
status.

## Rule-based pre-check (v0.9 implementation)

Before calling the LLM, the chat endpoint runs the user's message
through a small set of regex matchers built from the example phrases
above. If a hit is found, the response is forced to the matched
level even if the LLM's tag would have been lower-severity.

This belt-and-braces approach is what Medibot's WHO chapter calls
out as "hallucination guardrails are architecture, not polish" —
we don't rely entirely on the LLM to recognise urgency.

The LLM's emitted `<escalation level="..."/>` tag is the **maximum**
of the rule-based level and the LLM's own assessment. So:
- Rule-based: `immediate`, LLM: `nonurgent` → final = `immediate`.
- Rule-based: `none`, LLM: `telehealth` → final = `telehealth`.

## What the bot does NOT escalate

Per KZ Q31 / Q33:

- General curiosity questions about TB.
- Adherence advice ("what should I eat with my pills").
- Questions about side effects framed in the abstract ("what does
  rifampicin do to urine?") — distinct from a user reporting a
  symptom they themselves are experiencing.

The distinction the bot has to make is "is this a hypothetical /
informational question?" vs. "is the user describing a symptom they
have right now?". The latter is what triggers a level-up.

## Open items to decide with KZ

(Tracked in `docs/KZ-DISCUSSION-POINTS.md`.)

1. **SCH Tele-Health response-time SLA** for `immediate` vs
   `telehealth` levels.
2. **Burmese trigger phrases** — Wa Thone review of the table above
   (TODO column).
3. **Q31 / Q33 logging divergence** — Raj wants careReferralId
   logged on every `immediate` / `telehealth` escalation; KZ said
   don't track in detail. We've sided with Raj (no PII collected,
   only the audit log of "an escalation happened with this
   conversationId at this time at this level").
