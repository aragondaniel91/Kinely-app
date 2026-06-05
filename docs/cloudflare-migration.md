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

In non-interactive shells, Wrangler needs a Cloudflare API token:

```powershell
$env:CLOUDFLARE_API_TOKEN="paste_cloudflare_token_here"
npm run cloudflare:worker:deploy
```

Create the token in Cloudflare Dashboard > My Profile > API Tokens. Use the built-in `Edit Cloudflare Workers` template and restrict it to the account that owns Kinely.

Configure Worker secrets:

```powershell
npx wrangler secret put RESEND_API_KEY --config workers/kinely-api/wrangler.jsonc
npx wrangler secret put MAIL_FROM --config workers/kinely-api/wrangler.jsonc
npx wrangler secret put WEBHOOK_SECRET --config workers/kinely-api/wrangler.jsonc
npx wrangler secret put GOOGLE_CLIENT_EMAIL --config workers/kinely-api/wrangler.jsonc
npx wrangler secret put GOOGLE_PRIVATE_KEY --config workers/kinely-api/wrangler.jsonc
```

Required Worker variables are defined in `workers/kinely-api/wrangler.jsonc`:

- `APP_PUBLIC_URL`
- `FIREBASE_PROJECT_ID`
- `ALLOWED_ORIGINS`

## Current migration behavior

Invitation email sending is Worker-first when `VITE_KINELY_API_URL` is set. If that variable is missing, the app keeps using the existing Firestore `mail` queue and Firebase Function email sender.

The Worker also includes `POST /invitations/family/send`, which verifies the Firebase ID token, checks that the caller is a family owner/admin, writes the pending invitation to Firestore with a service account, updates the family pending invite fields, and sends the invitation email through Resend.

Custody invitations can use `POST /invitations/custody/send`, which verifies the Firebase ID token, checks that the caller is a custody group owner/admin, writes the pending custody invitation to Firestore with a service account, updates the custody group pending invite fields, and sends the invitation email through Resend.

Family profile updates are Worker-first through `POST /families/update` when `VITE_KINELY_API_URL` is configured. This covers family settings, members, children, permissions, and home visibility updates from the profile area. The Worker verifies the Firebase ID token, checks owner/admin access against the current Firestore family document, strips immutable owner/created fields from the request, and writes the update with backend timestamps.

Custody group saves are Worker-first through `POST /custody-groups/save`. On create, the Worker requires the caller to be a family owner/admin. On edit, it requires the caller to be a custody group owner/admin. The Worker writes the custody group, pending custody invitations, family `custodyGroupIds`, and child `custodyGroupIds` with backend timestamps. This prevents caregivers/viewers from creating or changing co-parenting access inside a household space unless they are explicitly admins.

Family and custody deletes are Worker-first through `POST /families/delete` and `POST /custody-groups/delete`. Family delete is owner-only and cascades household documents plus linked custody groups. Custody group delete requires group owner/admin access, removes related custody documents, and clears group references from linked family/child records. The old frontend cascade remains only as a local fallback when `VITE_KINELY_API_URL` is not configured.

Custody calendar day writes are Worker-first through `POST /custody-days/save` and `POST /custody-days/delete`. The Worker accepts single-day and bulk schedule saves, verifies custody write access against the custody group or family module permissions, normalizes legacy/camel/snake fields, and writes backend timestamps. View-only custody members can still read from Firestore but cannot mutate custody days through the API.

Invitation responses are Worker-first through `POST /invitations/family/respond` and `POST /invitations/custody/respond`. The Worker verifies the Firebase ID token, ensures the signed-in user's email matches the invitation recipient, marks the invitation accepted/declined, removes pending invite state, and grants family/custody permissions only for accepted invitations.

Activity notifications are Worker-first through `POST /notifications/activity/send`. The app calls this endpoint after writing `familyActivity`. The Worker verifies the Firebase ID token, validates access to the family or custody group, derives recipients from the Firestore family/group document, reads each user's notification preferences, writes in-app notification documents, and sends email through Resend only when the user has email notifications enabled.

Firestore document triggers for calendar/task/custody changes still run in Firebase Functions as a temporary fallback. Cloudflare Workers do not listen to Firestore document changes natively, so new production flows should prefer explicit app calls to the Worker or a separate Google-to-Worker webhook bridge.

For the Google service account, start with the smallest practical IAM role for the migration. The Worker currently needs Firestore document read/write access for invitation and notification flows.
