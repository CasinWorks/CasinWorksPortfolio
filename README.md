<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# CasinWorksPortfolio

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/5e3482f4-0a2a-420a-922b-056c8676cb03

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local` and fill **server** `FIREBASE_*` keys (no `VITE_` prefix).
3. Run the app:
   `npm run dev`

## Client portal (`/portal`)

Authenticated workspace (Firebase Auth + Firestore + Storage), isolated from the public site:

- `/portal/sign-in` and `/portal/register` — client or subcontractor
- `/portal/dashboard` — project cards (clients + admin)
- `/portal/projects/:id` — golf-course and timeline progress
- `/portal/projects/:id/documents` — PO / invoice / remittance (invoice “Pay” is an external link)
- `/portal/gigs` — subcontractor gig board
- `/portal/admin` — create projects, issue invoices, post gigs, confirm remittances

Firebase web config is served from `/api/firebase-config` using server env vars (`FIREBASE_*` on Vercel). Do not use `VITE_` for those keys. Admin is a Firestore `users/{uid}.role` field — set it in the Console, not in the client.

Deploy `firestore.rules` and `storage.rules` to the CasinWorks Firebase project.

The iOS/Android app lives in `apps/casinworks_portal` (Flutter) and uses the same Firebase project.

The Google AI Studio UI prototype is in `casinworks/` (visual reference only).
