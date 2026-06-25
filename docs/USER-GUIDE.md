# SCH TB Chatbot Prototype — User Guide

**Prototype version:** v1.4.0
**Last updated:** 2026-06-25

> This guide is auto-managed by the engineering team. Sections between
> **[BEGIN AUTO-MANAGED CONTENT]** and **[END AUTO-MANAGED CONTENT]**
> are rewritten when the software is updated. Please add your own
> notes below the **"Your notes"** heading at the very bottom —
> those are kept across updates.

---

## [BEGIN AUTO-MANAGED CONTENT]

## 1. What is this?

This is a **test version** of an online tool for SCH (Sun Community Health). It helps people in Myanmar:

- Check if they may have TB (Tuberculosis).
- Get clear answers about TB treatment, side effects, and daily care.

It runs in a web browser. You do not need to install anything.

**Test website:** https://tb-screening-chatbot.vercel.app

This is a **prototype**. We use it to test ideas and to show SCH how the real product will work. The real product will be built later on the Speedback platform.

## 2. The two tools

The prototype has two main tools. The user picks one when they open the website.

### TB Self-Check Tool

- **For:** anyone who is worried they may have TB.
- **What it does:** asks a few questions (cough, fever, weight loss, and so on). Decides if the person may have TB. If yes, helps the person book a screening.
- **Language:** Burmese.
- **Time:** about 5 minutes.

### TB Patient Support Chatbot

- **For:** people who already have TB. Also for the family members helping them.
- **What it does:** an open conversation. The person can ask any question about TB treatment, medicines, side effects, food, or daily care. The chatbot answers in Burmese.
- **Language:** Burmese.
- **Time:** as long as the person wants.
- **Safety:** if the person says something that sounds urgent (for example, "I am coughing blood"), the chatbot tells them what to do and connects them to SCH Tele-Health.

## 3. Quick start by role

### Quick start for SCH Admin

1. Open https://tb-screening-chatbot.vercel.app
2. Click **Staff Login** (top right).
3. Type username `123` and password `abc`. Pick **SCH Admin** role.
4. You see the **Dashboard** with all the numbers, the cascade charts, and the lists of every screening, referral, and conversation.

### Quick start for SCH Tele-Health

1. Open the same website. Log in. Pick **SCH Telehealth** role.
2. You see two lists:
   - **Screening Referrals** — people who used the TB Self-Check Tool and may have TB.
   - **Care Referrals** — people who used the TB Patient Support Chatbot and need help.
3. Click any row to see the full record. Update the status when you finish your work.

### Quick start for TB Screening Provider

1. Open the same website. Log in. Pick **TB Screening Provider** role.
2. You see a list of people sent to your clinic for TB screening.
3. After the person comes in, update the status (booked → seen → tested → result).

### Quick start for TB Care Provider

1. Open the same website. Log in. Pick **TB Care Provider** role.
2. You see a list of TB patients who need follow-up from your clinic.
3. After you meet the patient, update the status and notes.

## 4. Detailed guide

### 4.1 The TB Self-Check Tool, step by step

What the user sees:

1. Opens the website. Sees a welcome message in Burmese. Picks **"I want to check if I have TB"**.
2. Reads a short consent message. Agrees to continue.
3. Answers questions:
   - Do you have a cough?
   - For how many weeks?
   - Do you have fever?
   - Are you losing weight?
   - Do you have night sweats?
   - And a few more.
4. The tool decides:
   - **No TB symptoms** → "Thank you. You do not need a TB screening today. Please come back if symptoms start."
   - **Possible TB symptoms** → "Please go for a TB screening. Here is a referral."
5. If a referral is made:
   - The tool gives a **screening referral ID** (for example, `SR-1719300000000`).
   - It asks the person to share the ID with the screening clinic.
   - It saves the case in the **Screening Referral Log**.

### 4.2 The TB Patient Support Chatbot, step by step

What the user sees:

1. Opens the website. Picks **"I am a TB patient (or helping one)"**.
2. Types a question in Burmese or English. Example: "Why am I feeling tired after taking my TB medicines?"
3. The chatbot replies in Burmese. It explains the answer in simple words.
4. The person can keep asking questions. The chatbot remembers the conversation.

**What the chatbot will NOT do:**

- Tell the patient to change the dose.
- Tell the patient to stop the medicine.
- Diagnose any new condition.
- Answer questions that are not about TB.

**Safety check.** Every reply is checked for danger signs. We call this an **escalation**.

| Level | What it means | What the chatbot does |
|---|---|---|
| **none** | Just a normal question. | Answers the question. |
| **nonurgent** | General question about daily care. | Answers and reminds the person to ask their doctor at the next visit. |
| **telehealth** | Worrying sign, but not an emergency. Example: a hearing change. | Tells the person to contact SCH Tele-Health. Saves a **Care Referral**. |
| **immediate** | Urgent danger. Example: coughing blood. | Tells the person to go to the nearest clinic or hospital NOW. Saves a **Care Referral** with level "immediate". |

### 4.3 The four roles — what each one sees

| Role | What you see |
|---|---|
| **SCH Admin** | The full dashboard. All screenings, all referrals, all conversations. The cascade charts. |
| **SCH Tele-Health** | Two referral lists with details. Can update the status of every referral. |
| **TB Screening Provider** | Only the screening referrals for screening clinics. |
| **TB Care Provider** | Only the care referrals for treatment clinics. |

### 4.4 The five spreadsheet tabs

Behind the scenes, the prototype saves data to a Google Sheet with five tabs:

| Tab | What it stores |
|---|---|
| **Sessions** | Every time a person opens the website. |
| **Screening Referral Log** | Every TB Self-Check Tool case that became a referral. |
| **Care Referral Log** | Every escalation from the TB Patient Support Chatbot. |
| **AI Conversations** | A summary row for each TB Patient Support Chatbot conversation. Includes the AI model used and the cost. |
| **Alerts Log** | Internal warnings (for example, when the AI was slow). |

You do not need to open the sheet. The Admin dashboard shows the same information in an easier way.

### 4.5 How to read the cascade chart

The cascade chart shows how many people go through each step of the journey. It helps SCH see where people drop out.

**TB Self-Check Tool cascade:**

1. Total self-checks
2. → Presumptive TB (the tool thinks the person may have TB)
3. → Referral made (Assisted or Self)
4. → Contacted by Tele-Health
5. → Reached a screening clinic
6. → Tested (CXR or GeneXpert)
7. → TB diagnosed

**TB Patient Support Chatbot cascade:**

1. Total conversations
2. → Escalation found
3. → Care Referral made
4. → Contacted by Tele-Health
5. → Reached a care clinic

The bars show the count. The percent shows how many continued from the step before.

### 4.6 Test login

For all roles, the test username is `123` and the password is `abc`. This is only for the prototype. The real product will have proper logins.

### 4.7 Known limits

- This is a **test version**. Do not use it for real patient care.
- The chatbot is **not** a doctor. It can answer general questions but it can be wrong.
- The list of TB facts the chatbot knows is **short**. It will be improved.
- The phone number to contact SCH Tele-Health is not yet inside the chatbot.
- There are no real patient records yet. All the data in the prototype is for testing.

## 5. FAQ

**Q: Can I share the test website link with someone?**

A: Yes. The link is open for testing. But please do not share it with real patients.

**Q: What is "escalation"?**

A: It means the chatbot found a sign that the person needs faster help. See section 4.2.

**Q: The dashboard is empty. Why?**

A: Either no one has used the prototype yet, or the data sheet is not connected. Ask the engineer.

**Q: I see a column called `careReferralId`. What is it?**

A: A unique number for each care referral. It is used to track each case across the system.

**Q: Can I change the questions in the TB Self-Check Tool?**

A: Not directly. The engineer can change them in the code. Tell the engineer what to change.

## 6. Where to ask questions

- For questions about the prototype, contact Raj.
- For questions about the SCH side (people, process, clinics), contact Phone Pyae Sone and Moh Moh Lwin.
- For technical questions or bug reports, share the website link with the engineer.

## 7. Version history

| Version | Date | Main changes |
|---|---|---|
| v1.4.0 | 2026-06-25 | This user guide added. Link to the guide put into the developer panel. |
| v1.3.0 | 2026-06-24 | SCH Admin dashboard split into two sections: TB Self-Check Tool and TB Patient Support Chatbot. Cascade charts added. "Total Screenings" renamed to "Total Self-Checks". User Journeys document link added to the developer panel. |
| v1.2.x | 2026-06 | Referral logs and SLA tracking improved. Markdown transcript export to Google Drive added. Several smaller fixes. |
| v1.1.x | 2026-06 | TB Patient Support Chatbot went live with the multi-model picker and the cost meter in the developer panel. Burmese-first replies, escalation tags, and care referral letters added. |
| v1.0.x | 2026-06 | First release of the TB Self-Check Tool with the screening referral log and the four-role view. |

## [END AUTO-MANAGED CONTENT]

---

## Your notes

> Please add your own notes, observations, or questions below.
> The engineering team will not touch this section when updating the guide.

_(empty — add your notes here)_
