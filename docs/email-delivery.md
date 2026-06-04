# Email delivery

The web app does not send email directly from the browser. That would expose private SMTP, Resend, SendGrid, or other provider keys to every user.

Instead, the app writes email jobs to the Firestore `mail` collection. A trusted backend sender must watch that collection and deliver the email.

## Current implementation

When an admin creates an invitation, the app now writes:

```txt
familyInvitations/{id}
custodyInvitations/{id}
mail/{id}
```

The `mail` document follows the common Firebase Trigger Email pattern:

```js
{
  to: ["person@example.com"],
  recipientEmail: "person@example.com",
  status: "queued",
  kind: "family_invitation",
  message: {
    subject: "You're invited to join Daniel Family",
    text: "...",
    html: "..."
  },
  familyId: "family_...",
  custodyGroupId: "",
  invitationId: "family_...",
  invitationCollection: "familyInvitations",
  createdBy: "firebase-auth-uid",
  createdAt: serverTimestamp()
}
```

Supported `kind` values in rules:

```txt
family_invitation
custody_invitation
notification
```

The frontend currently queues invitation emails. The generic notification email helper is ready for future backend-triggered reminders and digests.

## Required production sender

The repo includes a Firebase Cloud Function sender in:

```txt
functions/index.js
```

It listens to `mail/{mailId}`, sends through Resend, and then updates the `mail` document to `sent` or `error`.

## Required production secrets

Set these Firebase Functions secrets:

```bash
npx firebase-tools functions:secrets:set RESEND_API_KEY
npx firebase-tools functions:secrets:set MAIL_FROM
```

Example `MAIL_FROM` value:

```txt
Kinly <no-reply@your-domain.com>
```

Then deploy functions:

```bash
npm run firebase:deploy:functions
```

You can still replace this later with another trusted sender:

1. Firebase Trigger Email extension watching `mail`.
2. A different Firebase Cloud Function provider.
3. A Vercel/Node worker that uses Firebase Admin SDK and your email provider.

Any sender should:

1. Read only documents where `status` is `queued`.
2. Send `message.subject`, `message.text`, and `message.html` to `to`.
3. Update the document with `status: "sent"` or `status: "error"`.
4. Store provider metadata such as `sentAt`, `error`, or `providerMessageId`.

Firestore rules deny client updates to `mail`; backend/admin code bypasses rules with trusted credentials.

## Public app URL

Set this env var in Vercel so email links point to production:

```bash
VITE_APP_PUBLIC_URL=https://your-production-domain.com
```

Local development falls back to `window.location.origin`, for example `http://127.0.0.1:5173`.

## Next notification step

For real scheduled notifications, add a backend worker that reads notification preferences from `users/{uid}` and app data from the relevant family or custody group. The worker should create `mail` jobs only for recipients who have email enabled and permission to see the underlying item.
