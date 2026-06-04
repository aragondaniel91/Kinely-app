import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

initializeApp();

const db = getFirestore();
const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const MAIL_FROM = defineSecret("MAIL_FROM");
const RESEND_ENDPOINT = "https://api.resend.com/emails";

function cleanText(value, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

function normalizeEmail(value) {
  return cleanText(value).toLowerCase();
}

function asEmailList(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map(normalizeEmail).filter(Boolean))];
  }

  const email = normalizeEmail(value);
  return email ? [email] : [];
}

function compactError(value) {
  const text = value instanceof Error ? value.message : cleanText(value, "Unknown email delivery error");
  return text.slice(0, 1200);
}

function parseMessage(data = {}) {
  const message = data.message && typeof data.message === "object" ? data.message : {};
  const to = asEmailList(data.to || data.recipientEmail);
  const subject = cleanText(message.subject);
  const text = cleanText(message.text);
  const html = cleanText(message.html);

  if (!to.length) throw new Error("mail.to must include at least one recipient.");
  if (!subject) throw new Error("mail.message.subject is required.");
  if (!text && !html) throw new Error("mail.message.text or mail.message.html is required.");

  return {
    to,
    subject,
    text,
    html,
  };
}

async function sendWithResend({ from, to, subject, text, html, mailId }) {
  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY.value()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
      html,
      headers: {
        "X-Family-Wall-Mail-Id": mailId,
      },
    }),
  });

  const bodyText = await response.text();
  let body = {};
  try {
    body = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    body = { raw: bodyText };
  }

  if (!response.ok) {
    throw new Error(`Resend delivery failed (${response.status}): ${JSON.stringify(body).slice(0, 800)}`);
  }

  return body;
}

export const deliverQueuedEmail = onDocumentCreated(
  {
    document: "mail/{mailId}",
    region: "us-central1",
    secrets: [RESEND_API_KEY, MAIL_FROM],
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const mailId = event.params.mailId;
    const mailRef = db.collection("mail").doc(mailId);
    const data = snap.data() || {};

    if (data.status && data.status !== "queued") {
      logger.info("Skipping non-queued mail document.", { mailId, status: data.status });
      return;
    }

    try {
      const message = parseMessage(data);
      const from = cleanText(MAIL_FROM.value());
      if (!from) throw new Error("MAIL_FROM secret is required.");
      if (!RESEND_API_KEY.value()) throw new Error("RESEND_API_KEY secret is required.");

      await mailRef.update({
        status: "processing",
        provider: "resend",
        processingAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        deliveryAttempts: FieldValue.increment(1),
      });

      const providerResult = await sendWithResend({
        from,
        ...message,
        mailId,
      });

      await mailRef.update({
        status: "sent",
        provider: "resend",
        providerMessageId: cleanText(providerResult?.id),
        providerResponse: providerResult,
        sentAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastError: FieldValue.delete(),
        erroredAt: FieldValue.delete(),
      });

      logger.info("Queued email sent.", {
        mailId,
        kind: data.kind || "",
        toCount: message.to.length,
      });
    } catch (error) {
      logger.error("Queued email delivery failed.", {
        mailId,
        kind: data.kind || "",
        error: compactError(error),
      });

      await mailRef.update({
        status: "error",
        provider: "resend",
        lastError: compactError(error),
        erroredAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }
);
