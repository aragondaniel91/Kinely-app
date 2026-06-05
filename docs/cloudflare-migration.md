# Kinely Cloudflare Migration

Kinely can run the React/Vite frontend on Cloudflare Pages while keeping Firebase Auth and Firestore as the data layer.

## Frontend: Cloudflare Pages

Create a Pages project from the GitHub repository.

- Framework preset: `Vite`
- Build command: `npm ci && npm run build`
- Output directory: `dist`
- Production branch: `main`

Set these Pages environment variables:

```text
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=family-wall-b5f1d
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_APP_PUBLIC_URL=https://kinely.net
VITE_KINELY_API_URL=https://kinely-api.<your-account>.workers.dev
```

The file `public/_redirects` is included so Cloudflare Pages serves the SPA for routes like `/calendar`, `/tasks`, `/custody`, and `/profile`.

## Backend edge API: Cloudflare Worker

The Worker lives in `workers/kinely-api`.

Local dev:

```powershell
npm run cloudflare:worker:dev
```

Deploy:

```powershell
npm run cloudflare:worker:deploy
```

Configure Worker secrets:

```powershell
npx wrangler secret put RESEND_API_KEY --config workers/kinely-api/wrangler.jsonc
npx wrangler secret put MAIL_FROM --config workers/kinely-api/wrangler.jsonc
npx wrangler secret put WEBHOOK_SECRET --config workers/kinely-api/wrangler.jsonc
```

Required Worker variables are defined in `workers/kinely-api/wrangler.jsonc`:

- `APP_PUBLIC_URL`
- `FIREBASE_PROJECT_ID`
- `ALLOWED_ORIGINS`

## Current migration behavior

Invitation email sending is Worker-first when `VITE_KINELY_API_URL` is set. If that variable is missing, the app keeps using the existing Firestore `mail` queue and Firebase Function email sender.

Firestore document triggers for calendar/task/custody changes still run in Firebase Functions for now. Cloudflare Workers do not listen to Firestore document changes natively, so those event-driven flows need either explicit app calls to the Worker or a separate Google-to-Worker webhook bridge.
