# Kinely API - Cloudflare Worker

## What It Does

- Sends invitation emails via Resend.
- Processes family and custody invitation responses.
- Saves/deletes custody groups.
- Updates and deletes family spaces.
- Sends in-app activity notifications.
- Runs daily custody reminder checks for exchanges, packing, and shared budget signals.

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

## Maintenance: familyMembers Backfill

Run a dry-run first from the repository root:

```powershell
$env:KINELY_WEBHOOK_SECRET="your_webhook_secret"
npm run cloudflare:backfill:family-members
```

Apply the backfill only after the dry-run looks right:

```powershell
npm run cloudflare:backfill:family-members -- --write
```

Optional flags:

```powershell
npm run cloudflare:backfill:family-members -- --family-id family_123
npm run cloudflare:backfill:family-members -- --limit 500
```

## Maintenance: scheduled custody reminders

The Worker has a cron trigger that runs daily at `14:00 UTC` and sends one reminder per custody group, rule, recipient, and day. It respects the user's Kinely notification preferences and uses deterministic delivery markers to avoid duplicate email/in-app reminders.

Dry-run the reminder engine first:

```powershell
curl.exe -X POST "https://kinely-api.your-account.workers.dev/maintenance/reminders/run" `
  -H "content-type: application/json" `
  -H "x-kinely-webhook-secret: YOUR_WEBHOOK_SECRET" `
  -d "{\"force\":true}"
```

Send real reminders manually:

```powershell
curl.exe -X POST "https://kinely-api.your-account.workers.dev/maintenance/reminders/run" `
  -H "content-type: application/json" `
  -H "x-kinely-webhook-secret: YOUR_WEBHOOK_SECRET" `
  -d "{\"write\":true,\"force\":true}"
```

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
