# Email delivery

The web app does not send email directly from the browser. That would expose private Resend or Google service-account credentials to every user.

Kinely uses the Cloudflare Worker in `workers/kinely-api` as the trusted backend for invitations, diagnostics, and activity notification emails. The Worker verifies the Firebase ID token, checks family/custody access, writes the in-app notification documents, and sends email through Resend when the recipient preferences allow email.

## Current implementation

The active email path is:

```txt
React app
  -> Cloudflare Worker
  -> Firestore REST API
  -> Resend
```

Important Worker endpoints:

```txt
/invitations/family/send
/invitations/family/respond
/invitations/custody/respond
/notifications/activity/send
/diagnostics/email-test-auth
/diagnostics/email-test
```

Important collections:

```txt
familyInvitations/{id}
custodyInvitations/{id}
notifications/{id}
emailDeliveries/{id}
familyActivity/{id}
```

`emailDeliveries` stores provider status and Resend IDs for troubleshooting. It replaces the old queued `mail` sender flow.

## Required Worker secrets

Set these in Cloudflare Dashboard or with Wrangler:

```bash
npx wrangler secret put GOOGLE_PRIVATE_KEY --config workers/kinely-api/wrangler.jsonc
npx wrangler secret put RESEND_API_KEY --config workers/kinely-api/wrangler.jsonc
npx wrangler secret put WEBHOOK_SECRET --config workers/kinely-api/wrangler.jsonc
```

The Worker also expects these non-secret variables in `workers/kinely-api/wrangler.jsonc` or Cloudflare Dashboard:

```txt
APP_PUBLIC_URL
FIREBASE_PROJECT_ID
GOOGLE_CLIENT_EMAIL
MAIL_FROM
ALLOWED_ORIGINS
```

Example `MAIL_FROM` value:

```txt
Kinely <no-reply@kinely.net>
```

Deploy the Worker:

```bash
npm run cloudflare:worker:deploy
```

## Diagnostics

Authenticated browser test:

```txt
Profile > Notifications > Send test email
```

Protected webhook test:

```bash
curl.exe -X POST "https://kinely-api.your-account.workers.dev/diagnostics/email-test" \
  -H "content-type: application/json" \
  -H "x-kinely-webhook-secret: YOUR_WEBHOOK_SECRET" \
  -d "{\"to\":\"you@example.com\"}"
```

If Resend accepts the email, the response should include a provider ID and `emailDeliveries/{id}` should be written.

## Public app URL

Set these values so email links point to production:

```txt
VITE_APP_PUBLIC_URL=https://kinely.net
APP_PUBLIC_URL=https://kinely.net
```

Local development can use `http://localhost:5173`.

## Notes

The old Firebase Functions `mail` queue was removed from the active repo. Keep email delivery in the Worker unless there is a deliberate migration plan to another trusted backend.
