# TB Self-Check Chatbot — prototype

This Next.js app is the **behaviour-validation prototype** for SCH's
TB Self-Check chatbot. It exists to lock the conversation flow,
Burmese wording, and SCH's business rules (Q6 classification, Q17
referral letter, Q9 phone-contact consent, Q16 cascade) before
engineering rebuilds the same flows on Viber Bot API / FB Messenger /
Telegram.

**Engineering handoff doc:** [`docs/PRODUCTION-HANDOFF.md`](docs/PRODUCTION-HANDOFF.md)
— state machine, Sheet schemas, admin endpoints, open Qs for SCH, and
the rebuild contract. **Keep it updated in the same commit as any
behaviour change.**

Bump `BOT_VERSION` in `src/lib/chatEngine.ts` on every behaviour
change — the value renders on the in-app prototype banner so SCH
reviewers can cite which version their feedback applies to.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
