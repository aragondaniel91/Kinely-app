const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FIREBASE_CERTS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

let jwksCache = {
  expiresAt: 0,
  keys: {},
};

function json(data, init = {}, origin = "") {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(origin),
      ...(init.headers || {}),
    },
  });
}

function corsHeaders(origin = "") {
  return {
    "access-control-allow-origin": origin || "https://kinely.net",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "authorization,content-type,x-kinely-webhook-secret",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function allowedOrigin(request, env) {
  const origin = request.headers.get("origin") || "";
  const allowed = String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!origin) return allowed[0] || "https://kinely.net";
  return allowed.includes(origin) ? origin : allowed[0] || "https://kinely.net";
}

function cleanText(value, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

function asEmailList(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => cleanText(item).toLowerCase()).filter(Boolean))];
  }

  const email = cleanText(value).toLowerCase();
  return email ? [email] : [];
}

function base64UrlToBytes(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function decodeJwtPart(value) {
  const text = new TextDecoder().decode(base64UrlToBytes(value));
  return JSON.parse(text);
}

async function loadFirebaseJwks() {
  const now = Date.now();
  if (jwksCache.expiresAt > now && Object.keys(jwksCache.keys).length) {
    return jwksCache.keys;
  }

  const response = await fetch(FIREBASE_CERTS_URL);
  if (!response.ok) {
    throw new Error(`Firebase certs request failed with ${response.status}.`);
  }

  const maxAge = Number((response.headers.get("cache-control") || "").match(/max-age=(\d+)/)?.[1] || 300);
  const keys = await response.json();
  jwksCache = {
    expiresAt: now + maxAge * 1000,
    keys,
  };
  return keys;
}

async function verifyFirebaseToken(request, env) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new Error("Missing bearer token.");

  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid Firebase ID token.");

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJwtPart(encodedHeader);
  const payload = decodeJwtPart(encodedPayload);
  const projectId = cleanText(env.FIREBASE_PROJECT_ID);
  const issuer = `https://securetoken.google.com/${projectId}`;

  if (!projectId) throw new Error("FIREBASE_PROJECT_ID is not configured.");
  if (payload.aud !== projectId) throw new Error("Firebase token has invalid audience.");
  if (payload.iss !== issuer) throw new Error("Firebase token has invalid issuer.");
  if (!payload.sub) throw new Error("Firebase token is missing a subject.");
  if (Number(payload.exp || 0) * 1000 <= Date.now()) throw new Error("Firebase token has expired.");

  const jwks = await loadFirebaseJwks();
  const jwk = jwks[header.kid];
  if (!jwk) throw new Error("Firebase signing key was not found.");

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const signature = base64UrlToBytes(encodedSignature);
  const signedContent = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, signedContent);
  if (!valid) throw new Error("Firebase token signature is invalid.");

  return payload;
}

function parseMailPayload(payload = {}) {
  const message = payload.message && typeof payload.message === "object" ? payload.message : {};
  const to = asEmailList(payload.to || payload.recipientEmail || payload.recipient_email);
  const subject = cleanText(message.subject || payload.subject);
  const text = cleanText(message.text || payload.text);
  const html = cleanText(message.html || payload.html);

  if (!to.length) throw new Error("Email payload requires at least one recipient.");
  if (!subject) throw new Error("Email payload requires a subject.");
  if (!text && !html) throw new Error("Email payload requires text or html.");

  return {
    id: cleanText(payload.id),
    kind: cleanText(payload.kind, "email"),
    to,
    subject,
    text,
    html,
    metadata: payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {},
  };
}

async function sendWithResend(env, mail) {
  const apiKey = cleanText(env.RESEND_API_KEY);
  const from = cleanText(env.MAIL_FROM);
  if (!apiKey) throw new Error("RESEND_API_KEY secret is not configured.");
  if (!from) throw new Error("MAIL_FROM secret is not configured.");

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: mail.to,
      subject: mail.subject,
      text: mail.text || undefined,
      html: mail.html || undefined,
      headers: {
        "X-Kinely-Mail-Id": mail.id || crypto.randomUUID(),
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

async function handleSendEmail(request, env, origin) {
  const token = await verifyFirebaseToken(request, env);
  const payload = await request.json();
  const mail = parseMailPayload(payload);
  const providerResult = await sendWithResend(env, mail);

  return json({
    ok: true,
    id: mail.id || providerResult?.id || "",
    provider: "resend",
    providerMessageId: providerResult?.id || "",
    uid: token.sub,
  }, { status: 200 }, origin);
}

async function handleResendWebhook(request, env, origin) {
  const expectedSecret = cleanText(env.WEBHOOK_SECRET);
  if (expectedSecret) {
    const providedSecret = cleanText(request.headers.get("x-kinely-webhook-secret"));
    if (providedSecret !== expectedSecret) {
      return json({ ok: false, error: "Unauthorized webhook." }, { status: 401 }, origin);
    }
  }

  const payload = await request.json().catch(() => ({}));
  console.log("Resend webhook received", {
    type: payload?.type || payload?.event || "",
    id: payload?.data?.id || payload?.id || "",
  });

  return json({ ok: true }, { status: 200 }, origin);
}

export default {
  async fetch(request, env) {
    const origin = allowedOrigin(request, env);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const url = new URL(request.url);

    try {
      if (request.method === "GET" && url.pathname === "/health") {
        return json({ ok: true, service: "kinely-api" }, { status: 200 }, origin);
      }

      if (request.method === "POST" && url.pathname === "/emails/send") {
        return handleSendEmail(request, env, origin);
      }

      if (request.method === "POST" && url.pathname === "/webhooks/resend") {
        return handleResendWebhook(request, env, origin);
      }

      return json({ ok: false, error: "Not found." }, { status: 404 }, origin);
    } catch (error) {
      console.error("Kinely Worker error", error);
      return json({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown Worker error.",
      }, { status: 400 }, origin);
    }
  },
};
