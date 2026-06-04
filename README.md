# Kinly / Family Wall Organizer

Kinly is a family organization app for shared homes and co-parenting. The current MVP focuses on a custody-aware dashboard with calendar, exchange planning, packing readiness, shared expenses, groceries, meals, tasks, and smart reminders.

## Tech stack

- React + Vite
- Tailwind CSS
- Firebase Auth
- Firestore
- Vercel deployment
- Firebase CLI for Firestore rules/indexes

## Local setup

Install dependencies:

```bash
npm install
```

Create a local env file from the example:

```bash
cp .env.example .env.local
```

Fill in the Firebase values:

```bash
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_APP_PUBLIC_URL=https://your-production-domain.com
```

Run locally:

```bash
npm run dev
```

Build locally:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Vercel environment variables

Add these variables in Vercel:

```bash
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_APP_PUBLIC_URL
```

The Firebase client config is loaded from `import.meta.env` in:

```txt
src/lib/firebase.js
```

If any required variable is missing, the app intentionally throws an error so broken deployments are easier to catch.

`VITE_APP_PUBLIC_URL` is optional for local builds, but should be set in production so invitation emails open the correct domain.

## Email delivery

Invitation emails are queued in Firestore under the `mail` collection. Configure a trusted sender, such as the Firebase Trigger Email extension or a backend worker, to watch `mail` and deliver queued messages.

Details:

```txt
docs/email-delivery.md
```

## Firebase project

The repo is linked to this Firebase project alias:

```txt
family-wall-b5f1d
```

Configured in:

```txt
.firebaserc
```

## Firestore rules and indexes

Rules file:

```txt
firestore.rules
```

Indexes file:

```txt
firestore.indexes.json
```

Firebase config:

```txt
firebase.json
```

Deploy only rules:

```bash
npm run firebase:deploy:rules
```

Deploy only indexes:

```bash
npm run firebase:deploy:indexes
```

Deploy both Firestore rules and indexes:

```bash
npm run firebase:deploy:firestore
```

## Main scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run lint:fix
npm run typecheck
npm run firebase:deploy:rules
npm run firebase:deploy:indexes
npm run firebase:deploy:firestore
```

## Custody data model notes

Custody-specific data is scoped by `familyId`. In custody modules, `familyId` may represent the selected custody group ID so custody data stays isolated from the general household profile.

Important collections:

```txt
custodyGroups
custodyDays
custodyExchanges
custodyPackingItems
custodyExpenses
custodyNotificationPrefs
```

Core rule:

```txt
Family/custody members can read/write.
Viewers can read only.
Outside users cannot access scoped data.
```

## Current custody flow

The custody dashboard and exchange hub understand split days:

```txt
Full day = all day owner
Split day = AM owner + PM owner
```

Example:

```txt
Sunday: Dad
Monday: AM Dad / PM Mom
```

Expected next exchange:

```txt
Monday PM · Dad → Mom
```

## Deployment checklist

Before deploying:

1. Confirm Vercel env vars are configured.
2. Run `npm run build` locally or check the Vercel build.
3. Confirm the email sender is configured if invitations should send real emails.
4. Deploy Firestore rules when ready with `npm run firebase:deploy:rules`.
5. Test these app areas after deploy:
   - Login/Register
   - Home dashboard
   - Custody dashboard
   - Schedule calendar
   - Exchange hub
   - Packing list
   - Budget
   - Smart notifications

## Important security note

Never commit real `.env` files. The repo ignores:

```txt
.env
.env.*
```

but keeps:

```txt
.env.example
```
