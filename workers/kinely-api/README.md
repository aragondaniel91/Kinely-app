# Kinely API - Cloudflare Worker

## What It Does

- Sends invitation emails via Resend.
- Processes family and custody invitation responses.
- Saves/deletes custody groups.
- Updates and deletes family spaces.
- Sends in-app activity notifications.

Custody day calendar writes are handled directly by the frontend through Firestore unless `VITE_USE_CUSTODY_DAY_WORKER=true` is enabled for the frontend.

## Required Secrets

Set these in the Cloudflare Dashboard or with Wrangler:

```powershell
npx wrangler secret put GOOGLE_PRIVATE_KEY
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put WEBHOOK_SECRET
```

## Deploy

From the repository root:

```powershell
npm run cloudflare:worker:deploy
```

Or from this Worker directory:

```powershell
npx wrangler deploy
```

## Email Diagnostic

After deploying, send a protected test email through the Worker:

```powershell
curl.exe -X POST "https://kinely-api.your-account.workers.dev/diagnostics/email-test" `
  -H "content-type: application/json" `
  -H "x-kinely-webhook-secret: YOUR_WEBHOOK_SECRET" `
  -d "{\"to\":\"you@example.com\"}"
```

If the response is not `{"ok":true,...}`, the returned error is the Resend or Worker configuration issue to fix.

## Local Development

```powershell
npx wrangler dev
```

## Non-Secret Variables

Configured in `wrangler.jsonc`:

- `APP_PUBLIC_URL`: Production URL of the Kinely frontend.
- `FIREBASE_PROJECT_ID`: Firebase project ID used by Firestore REST.
- `GOOGLE_CLIENT_EMAIL`: Service account client email used for Firestore REST.
- `MAIL_FROM`: Sender identity verified in Resend.
- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins.
