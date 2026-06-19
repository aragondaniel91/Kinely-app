const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FIREBASE_CERTS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const FIRESTORE_SCOPE = "https://www.googleapis.com/auth/datastore";
const FIRESTORE_BATCH_SIZE = 400;
const FIRESTORE_COMMIT_MAX_ATTEMPTS = 5;
const EMAIL_DELIVERIES_COLLECTION = "emailDeliveries";
const WORKER_VERSION = "custody-budget-2026-06-19-01";

const HOUSEHOLD_COLLECTIONS = [
  "familyEvents",
  "tasks",
  "taskTemplates",
  "routineRuns",
  "rewards",
  "meals",
  "mealTemplates",
  "familyLists",
  "familyListItems",
  "familyPantryItems",
  "children",
  "familyMembers",
  "familyActivity",
  "familyInvitations",
  "notifications",
  "groceries",
];

const CUSTODY_COLLECTIONS = [
  "custodyDays",
  "custodySpecialEvents",
  "custodyTravelPlans",
  "custodyPackingItems",
  "custodyPackingTemplates",
  "custodyExpenses",
  "custodyExchanges",
  "custodyInvitations",
  "scheduledReminderDeliveries",
  "familyActivity",
  "notifications",
];

const CUSTODY_SCOPED_RECORD_COLLECTIONS = new Set([
  "custodyExchanges",
  "custodyExpenses",
  "custodyPackingItems",
  "custodyPackingTemplates",
  "custodySpecialEvents",
  "custodyTravelPlans",
]);

const CUSTODY_GROUP_LOOKUP_FIELDS = [
  "familyId",
  "family_id",
  "householdFamilyId",
  "household_family_id",
  "actualFamilyId",
  "actual_family_id",
];

const CUSTODY_SCOPE_LOOKUP_FIELDS = [
  "custodyGroupId",
  "custody_group_id",
  "groupId",
  "group_id",
  "familyId",
  "family_id",
];

const PRIMARY_CUSTODY_SCOPE_LOOKUP_FIELDS = [
  "custodyGroupId",
  "custody_group_id",
];

const PRIMARY_CUSTODY_GROUP_LOOKUP_FIELDS = [
  "familyId",
  "family_id",
  "householdFamilyId",
  "household_family_id",
];

const DEFAULT_NOTIFICATION_PREFERENCES = {
  channels: {
    inApp: true,
    email: true,
    push: false,
    sms: false,
  },
  notifyOn: {
    custodyCreated: true,
    custodyEdited: true,
    custodyDeleted: true,
    budgetExpenseCreated: true,
    budgetExpenseEdited: true,
    budgetExpenseDeleted: true,
    familyEventCreated: true,
    familyEventEdited: true,
    taskAssigned: true,
    taskCompleted: false,
    childCareUpdated: true,
    medicationOrAllergyUpdated: true,
    mealPlanUpdated: false,
    groceryItemAdded: false,
    invitationReceived: true,
    messageReceived: true,
  },
  quietHours: {
    enabled: false,
    start: "22:00",
    end: "07:00",
  },
};

let jwksCache = {
  expiresAt: 0,
  keys: {},
};

let googleAccessTokenCache = {
  expiresAt: 0,
  token: "",
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
  const headers = {
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "authorization,content-type,x-kinely-webhook-secret",
    "access-control-max-age": "86400",
    vary: "Origin",
  };

  if (origin) {
    headers["access-control-allow-origin"] = origin;
  }

  return headers;
}

function allowedOrigin(request, env) {
  const origin = request.headers.get("origin") || "";
  const allowed = String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!origin) return allowed[0] || "https://kinely.net";
  if (allowed.includes(origin)) return origin;

  // Allow any Cloudflare Pages preview deployment subdomain, e.g.
  // https://16165fa9.kinely-app.pages.dev
  if (/^https:\/\/[a-z0-9-]+\.kinely-app\.pages\.dev$/i.test(origin)) {
    return origin;
  }

  return "";
}

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

function listOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

function mapOrEmpty(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function booleanValue(value, fallback = false) {
  if (typeof value === "boolean") return value;
  const normalized = cleanText(value).toLowerCase();
  if (["true", "yes", "1", "important", "required"].includes(normalized)) return true;
  if (["false", "no", "0"].includes(normalized)) return false;
  return fallback;
}

function moneyValue(value, fallback = 0) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.round(number * 100) / 100;
}

function uniqueStrings(values = []) {
  return [...new Set(listOrEmpty(values).map(cleanText).filter(Boolean))];
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

function bytesToBase64Url(bytes) {
  let binary = "";
  const source = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  source.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function textToBase64Url(value) {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function decodeJwtPart(value) {
  const text = new TextDecoder().decode(base64UrlToBytes(value));
  return JSON.parse(text);
}

function pemToArrayBuffer(pem) {
  const base64 = cleanText(pem)
    .replace(/\\n/g, "\n")
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  return base64UrlToBytes(base64.replace(/\+/g, "-").replace(/\//g, "_"));
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
  const body = await response.json();
  const keys = normalizeJwks(body);
  if (!Object.keys(keys).length) {
    throw new Error("Firebase signing keys response was empty.");
  }
  jwksCache = {
    expiresAt: now + maxAge * 1000,
    keys,
  };
  return keys;
}

function normalizeJwks(body = {}) {
  if (Array.isArray(body.keys)) {
    return body.keys.reduce((acc, key) => {
      if (key?.kid) {
        acc[key.kid] = key;
      }
      return acc;
    }, {});
  }

  return Object.entries(body).reduce((acc, [kid, key]) => {
    if (key && typeof key === "object") {
      const normalizedKid = key.kid || kid;
      acc[normalizedKid] = {
        kid: normalizedKid,
        ...key,
      };
    }
    return acc;
  }, {});
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

async function googleAccessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  if (googleAccessTokenCache.token && googleAccessTokenCache.expiresAt > now + 60) {
    return googleAccessTokenCache.token;
  }

  const clientEmail = normalizeEmail(env.GOOGLE_CLIENT_EMAIL);
  const privateKey = cleanText(env.GOOGLE_PRIVATE_KEY);
  if (!clientEmail || !privateKey) {
    throw new Error("GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY secrets are required for Firestore admin writes.");
  }

  const header = textToBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = textToBase64Url(JSON.stringify({
    iss: clientEmail,
    scope: FIRESTORE_SCOPE,
    aud: GOOGLE_TOKEN_ENDPOINT,
    iat: now,
    exp: now + 3300,
  }));
  const unsignedJwt = `${header}.${payload}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedJwt)
  );
  const assertion = `${unsignedJwt}.${bytesToBase64Url(signature)}`;

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Google access token request failed (${response.status}): ${JSON.stringify(body).slice(0, 800)}`);
  }

  googleAccessTokenCache = {
    token: body.access_token,
    expiresAt: now + Number(body.expires_in || 3300),
  };
  return googleAccessTokenCache.token;
}

function firestoreDocumentName(env, collectionName, docId) {
  const projectId = cleanText(env.FIREBASE_PROJECT_ID);
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID is not configured.");
  return `projects/${projectId}/databases/(default)/documents/${collectionName}/${docId}`;
}

function firestoreDocumentUrl(env, collectionName, docId) {
  const projectId = cleanText(env.FIREBASE_PROJECT_ID);
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID is not configured.");
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}/${encodeURIComponent(docId)}`;
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function looksLikeIsoTimestamp(value) {
  return typeof value === "string" && ISO_DATE_REGEX.test(value);
}

function toFirestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === "string") {
    if (looksLikeIsoTimestamp(value)) {
      return { timestampValue: value };
    }
    return { stringValue: value };
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map(toFirestoreValue).filter(Boolean),
      },
    };
  }
  if (typeof value === "object") {
    return {
      mapValue: {
        fields: toFirestoreFields(value),
      },
    };
  }
  return { stringValue: String(value) };
}

function toFirestoreFields(data = {}) {
  return Object.entries(mapOrEmpty(data)).reduce((fields, [key, value]) => {
    const firestoreValue = toFirestoreValue(value);
    if (firestoreValue !== undefined) fields[key] = firestoreValue;
    return fields;
  }, {});
}

function fromFirestoreValue(value = {}) {
  if ("nullValue" in value) return null;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("stringValue" in value) return value.stringValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return listOrEmpty(value.arrayValue?.values).map(fromFirestoreValue);
  if ("mapValue" in value) return fromFirestoreFields(value.mapValue?.fields || {});
  return undefined;
}

function fromFirestoreFields(fields = {}) {
  return Object.entries(fields).reduce((data, [key, value]) => {
    data[key] = fromFirestoreValue(value);
    return data;
  }, {});
}

async function firestoreRequest(env, url, init = {}) {
  const token = await googleAccessToken(env);
  const response = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryAfterMs(value = "") {
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(seconds * 1000, 4_000);
  }

  const dateMs = Date.parse(value);
  if (Number.isFinite(dateMs)) {
    return Math.min(Math.max(dateMs - Date.now(), 0), 4_000);
  }

  return 0;
}

function isRetryableFirestoreWrite(response, body = {}) {
  const status = response?.status;
  const code = cleanText(body?.error?.status);
  return (
    [429, 500, 502, 503, 504].includes(status) ||
    ["ABORTED", "DEADLINE_EXCEEDED", "RESOURCE_EXHAUSTED", "UNAVAILABLE"].includes(code)
  );
}

function firestoreBackoffDelay(response, attempt) {
  const retryAfter = retryAfterMs(response?.headers?.get("retry-after") || "");
  if (retryAfter) return retryAfter;

  const base = Math.min(250 * (2 ** attempt), 4_000);
  const jitter = Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] % 250);
  return base + jitter;
}

async function firestoreGetDoc(env, collectionName, docId) {
  const { response, body } = await firestoreRequest(env, firestoreDocumentUrl(env, collectionName, docId));
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Firestore read failed (${response.status}): ${JSON.stringify(body).slice(0, 800)}`);
  }
  return {
    id: cleanText(body.name).split("/").pop(),
    ...fromFirestoreFields(body.fields || {}),
  };
}

async function firestoreRunQuery(env, structuredQuery = {}) {
  const projectId = cleanText(env.FIREBASE_PROJECT_ID);
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  const { response, body } = await firestoreRequest(env, url, {
    method: "POST",
    body: JSON.stringify({ structuredQuery }),
  });

  if (!response.ok) {
    throw new Error(`Firestore query failed (${response.status}): ${JSON.stringify(body).slice(0, 800)}`);
  }

  return Array.isArray(body)
    ? body
        .map((item) => item.document)
        .filter(Boolean)
        .map((document) => ({
          id: cleanText(document.name).split("/").pop(),
          ...fromFirestoreFields(document.fields || {}),
        }))
    : [];
}

async function firestoreQueryField(env, collectionName, { field, op = "EQUAL", value }) {
  if (!collectionName || !field || value === undefined || value === null || value === "") return [];

  return firestoreRunQuery(env, {
    from: [{ collectionId: collectionName }],
    where: {
      fieldFilter: {
        field: { fieldPath: field },
        op,
        value: { stringValue: String(value) },
      },
    },
  });
}

async function firestoreCommit(env, writes = []) {
  if (!writes.length) return { writeResults: [] };

  const projectId = cleanText(env.FIREBASE_PROJECT_ID);
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`;
  const requestBody = JSON.stringify({ writes });
  let lastStatus = 0;
  let lastBody = {};

  for (let attempt = 0; attempt < FIRESTORE_COMMIT_MAX_ATTEMPTS; attempt += 1) {
    const { response, body } = await firestoreRequest(env, url, {
      method: "POST",
      body: requestBody,
    });

    if (response.ok) return body;

    lastStatus = response.status;
    lastBody = body;

    if (!isRetryableFirestoreWrite(response, body) || attempt === FIRESTORE_COMMIT_MAX_ATTEMPTS - 1) {
      break;
    }

    await sleep(firestoreBackoffDelay(response, attempt));
  }

  throw new Error(
    `Firestore commit failed (${lastStatus}) after ${FIRESTORE_COMMIT_MAX_ATTEMPTS} attempt(s): ${JSON.stringify(lastBody).slice(0, 800)}`
  );
}

async function firestoreCommitInChunks(env, writes = []) {
  let committed = 0;

  for (let index = 0; index < writes.length; index += FIRESTORE_BATCH_SIZE) {
    const chunk = writes.slice(index, index + FIRESTORE_BATCH_SIZE);
    if (!chunk.length) continue;
    await firestoreCommit(env, chunk);
    committed += chunk.length;
  }

  return committed;
}

function firestoreMergeWrite(env, collectionName, docId, data = {}) {
  const fieldPaths = Object.keys(mapOrEmpty(data));
  return {
    update: {
      name: firestoreDocumentName(env, collectionName, docId),
      fields: toFirestoreFields(data),
    },
    updateMask: {
      fieldPaths,
    },
  };
}

function firestoreDeleteNameWrite(documentName) {
  return { delete: documentName };
}

function safeDocumentId(value, fallback = "") {
  const cleanValue = cleanText(value, fallback || crypto.randomUUID());
  return cleanValue.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 180);
}

function emailDeliveryDocId(providerMessageId = "", mailId = "") {
  return safeDocumentId(providerMessageId || mailId, `email_${Date.now()}`);
}

function extractProviderMessageId(providerResult = {}) {
  return cleanText(
    providerResult?.providerMessageId ||
    providerResult?.provider_message_id ||
    providerResult?.id ||
    providerResult?.data?.id ||
    providerResult?.email?.id ||
    providerResult?.matchedEmail?.id ||
    providerResult?.matched_email?.id ||
    providerResult?.fallbackEmail?.id ||
    providerResult?.fallback_email?.id ||
    providerResult?.email_id ||
    providerResult?.emailId ||
    providerResult?.messageId ||
    providerResult?.message_id ||
    providerResult?.data?.email_id ||
    providerResult?.data?.emailId ||
    providerResult?.data?.message_id ||
    providerResult?.data?.messageId
  );
}

function providerResponseShape(providerResult = {}) {
  if (!providerResult || typeof providerResult !== "object") return {};
  const shape = {
    keys: Object.keys(providerResult).slice(0, 20),
  };

  if (providerResult.data && typeof providerResult.data === "object") {
    shape.dataKeys = Object.keys(providerResult.data).slice(0, 20);
  }

  if (providerResult.email && typeof providerResult.email === "object") {
    shape.emailKeys = Object.keys(providerResult.email).slice(0, 20);
  }

  return shape;
}

function resendEmailMatchesMail(emailRecord = {}, mail = {}) {
  const recordRecipients = asEmailList(emailRecord?.to);
  const requestedRecipients = asEmailList(mail.to);
  const recordSubject = cleanText(emailRecord?.subject);
  const requestedSubject = cleanText(mail.subject);

  return (
    recordSubject === requestedSubject &&
    requestedRecipients.length > 0 &&
    requestedRecipients.some((email) => recordRecipients.includes(email))
  );
}

async function findRecentResendEmail(env, mail = {}) {
  const apiKey = cleanText(env.RESEND_API_KEY);
  if (!apiKey) return null;

  const response = await fetch(RESEND_ENDPOINT, {
    method: "GET",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
  });

  const bodyText = await response.text();
  let body = {};
  try {
    body = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    body = { raw: bodyText };
  }

  if (!response.ok) {
    console.warn("Resend sent-email lookup failed.", response.status, body);
    return null;
  }

  const emails = Array.isArray(body?.data) ? body.data : [];
  return emails.find((emailRecord) => resendEmailMatchesMail(emailRecord, mail)) || null;
}

async function recordEmailDelivery(env, mail = {}, providerResult = {}, status = "accepted", error = "") {
  const now = new Date().toISOString();
  const providerMessageId = extractProviderMessageId(providerResult);
  const docId = emailDeliveryDocId(providerMessageId, mail.id);

  await firestoreCommit(env, [
    firestoreMergeWrite(env, EMAIL_DELIVERIES_COLLECTION, docId, {
      id: docId,
      provider: "resend",
      providerMessageId,
      provider_message_id: providerMessageId,
      mailId: cleanText(mail.id),
      mail_id: cleanText(mail.id),
      kind: cleanText(mail.kind, "email"),
      status,
      lastEvent: status,
      last_event: status,
      from: cleanText(env.MAIL_FROM),
      to: asEmailList(mail.to),
      subject: cleanText(mail.subject),
      error: cleanText(error),
      providerResponse: providerResult && typeof providerResult === "object" ? providerResult : {},
      provider_response: providerResult && typeof providerResult === "object" ? providerResult : {},
      providerResponseShape: providerResponseShape(providerResult),
      provider_response_shape: providerResponseShape(providerResult),
      createdAt: now,
      created_at: now,
      updatedAt: now,
      updated_at: now,
    }),
  ]).catch((recordError) => {
    console.warn("Could not record email delivery status.", recordError);
  });

  return {
    deliveryId: docId,
    providerMessageId,
  };
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

function familyInvitationId(familyId, email) {
  return `family_${familyId}_${normalizeEmail(email)}`;
}

function custodyInvitationId(groupId, email) {
  return `custody_${groupId}_${normalizeEmail(email)}`;
}

function escapeHtml(value) {
  return cleanText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function invitationRegisterUrl(env, { email, invitationId, type }) {
  const base = cleanText(env.APP_PUBLIC_URL, "https://kinely.net").replace(/\/+$/g, "");
  const url = new URL("/register", base);
  url.searchParams.set("mode", "join");
  url.searchParams.set("email", normalizeEmail(email));
  url.searchParams.set("invite", invitationId);
  url.searchParams.set("type", type || "family_invitation");
  return url.toString();
}

function invitationHtml({ heading, intro, actionUrl }) {
  return `
    <div style="font-family: Inter, Arial, sans-serif; color: #0f172a; line-height: 1.6; max-width: 620px;">
      <p style="font-size: 12px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #4f46e5; margin: 0 0 8px;">Kinely</p>
      <h1 style="font-size: 24px; margin: 0 0 12px;">${escapeHtml(heading)}</h1>
      <p style="font-size: 15px; margin: 0 0 18px;">${escapeHtml(intro)}</p>
      <p style="margin: 0 0 22px;">
        <a href="${escapeHtml(actionUrl)}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 14px; padding: 12px 18px; font-weight: 700;">
          Open invitation
        </a>
      </p>
      <p style="font-size: 13px; color: #475569; margin: 0 0 10px;">If the button does not work, copy and paste this link into your browser.</p>
      <p style="font-size: 12px; color: #64748b; word-break: break-all; margin: 0;">${escapeHtml(actionUrl)}</p>
    </div>
  `.trim();
}

function buildFamilyInvitationEmail(env, { invitation, family, inviterName = "Family admin" }) {
  const recipientEmail = normalizeEmail(invitation.recipientEmail || invitation.recipient_email);
  const safeFamilyName = cleanText(family.familyName || family.family_name || invitation.familyName || invitation.family_name, "your family space");
  const safeInviterName = cleanText(inviterName, "Family admin");
  const actionUrl = invitationRegisterUrl(env, {
    email: recipientEmail,
    invitationId: invitation.id,
    type: "family_invitation",
  });
  const subject = `You're invited to join ${safeFamilyName}`;
  const text = [
    `${safeInviterName} invited you to join ${safeFamilyName} on Kinely.`,
    "Create or sign in with this same email address so the app can match your invitation.",
    `Open the invitation: ${actionUrl}`,
  ].join("\n\n");

  return {
    id: invitation.id,
    kind: "family_invitation",
    to: [recipientEmail],
    subject,
    text,
    html: invitationHtml({
      heading: subject,
      intro: `${safeInviterName} invited you to join ${safeFamilyName} on Kinely. Use this same email address when creating or signing in to your account.`,
      actionUrl,
    }),
  };
}

function buildCustodyInvitationEmail(env, { invitation, group, inviterName = "Custody admin" }) {
  const recipientEmail = normalizeEmail(invitation.recipientEmail || invitation.recipient_email);
  const safeGroupName = cleanText(group.name || group.groupName || group.group_name || invitation.groupName || invitation.group_name, "your custody space");
  const safeInviterName = cleanText(inviterName, "Custody admin");
  const actionUrl = invitationRegisterUrl(env, {
    email: recipientEmail,
    invitationId: invitation.id,
    type: "custody_invitation",
  });
  const subject = `You're invited to ${safeGroupName}`;
  const text = [
    `${safeInviterName} invited you to join ${safeGroupName} on Kinely.`,
    "Create or sign in with this same email address so the app can match your custody invitation.",
    `Open the invitation: ${actionUrl}`,
  ].join("\n\n");

  return {
    id: invitation.id,
    kind: "custody_invitation",
    to: [recipientEmail],
    subject,
    text,
    html: invitationHtml({
      heading: subject,
      intro: `${safeInviterName} invited you to join ${safeGroupName} on Kinely. Use this same email address when creating or signing in to your account.`,
      actionUrl,
    }),
  };
}

function memberEmail(member = {}) {
  return normalizeEmail(member.email || member.ownerEmail || member.owner_email || member.recipientEmail || member.recipient_email);
}

function isFamilyOwner(family = {}, token = {}) {
  const uid = cleanText(token.sub);
  const email = normalizeEmail(token.email);
  if (!uid && !email) return false;

  const ownerIds = uniqueStrings([
    family.ownerId,
    family.owner_id,
    family.ownerUid,
    family.owner_uid,
    family.createdBy,
    family.created_by,
  ]);
  const ownerEmails = uniqueStrings([
    family.ownerEmail,
    family.owner_email,
    family.createdByEmail,
    family.created_by_email,
  ]).map(normalizeEmail);

  return ownerIds.includes(uid) || ownerEmails.includes(email);
}

function canManageFamily(family = {}, token = {}) {
  const uid = cleanText(token.sub);
  const email = normalizeEmail(token.email);
  if (!uid && !email) return false;

  const ownerIds = uniqueStrings([family.ownerId, family.owner_id, family.ownerUid, family.owner_uid, family.createdBy, family.created_by]);
  const ownerEmails = uniqueStrings([family.ownerEmail, family.owner_email, family.createdByEmail, family.created_by_email]).map(normalizeEmail);
  const adminIds = uniqueStrings([family.adminIds, family.admin_ids].flat());
  const adminEmails = uniqueStrings([family.adminEmails, family.admin_emails].flat()).map(normalizeEmail);
  const adminMembers = listOrEmpty(family.members).filter((member) => (
    member?.isAdmin === true ||
    member?.is_admin === true ||
    member?.admin === true ||
    member?.appRole === "owner" ||
    member?.appRole === "admin" ||
    member?.app_role === "owner" ||
    member?.app_role === "admin"
  ));

  return (
    ownerIds.includes(uid) ||
    ownerEmails.includes(email) ||
    adminIds.includes(uid) ||
    adminEmails.includes(email) ||
    adminMembers.some((member) => cleanText(member.uid || member.userId || member.user_id) === uid || memberEmail(member) === email)
  );
}

function normalizedComparableList(...values) {
  return uniqueStrings(values.flat())
    .map((value) => cleanText(value).toLowerCase())
    .filter(Boolean)
    .sort();
}

function comparableListsEqual(a = [], b = []) {
  if (a.length !== b.length) return false;
  return a.every((item, index) => item === b[index]);
}

function updateChangesListField(updates = {}, family = {}, camelKey = "", snakeKey = "") {
  const hasNext = Object.prototype.hasOwnProperty.call(updates, camelKey) || Object.prototype.hasOwnProperty.call(updates, snakeKey);
  if (!hasNext) return false;

  const next = normalizedComparableList(updates[camelKey], updates[snakeKey]);
  const current = normalizedComparableList(family[camelKey], family[snakeKey]);
  return !comparableListsEqual(next, current);
}

function familyMemberAccessKey(member = {}) {
  return cleanText(
    member.uid ||
    member.userId ||
    member.user_id ||
    member.personId ||
    member.person_id ||
    member.id ||
    member.email ||
    member.name ||
    member.displayName
  ).toLowerCase();
}

function familyMemberPrivilegeState(member = {}) {
  const appRole = cleanText(member.appRole || member.app_role).toLowerCase();
  const admin = (
    member.admin === true ||
    member.isAdmin === true ||
    member.is_admin === true ||
    appRole === "owner" ||
    appRole === "admin"
  );

  return {
    admin,
    appRole,
    privileged: admin || appRole === "owner" || appRole === "admin",
  };
}

function nonOwnerChangesFamilyAdminState(family = {}, updates = {}) {
  if (
    updateChangesListField(updates, family, "adminIds", "admin_ids") ||
    updateChangesListField(updates, family, "adminEmails", "admin_emails")
  ) {
    return true;
  }

  if (!Array.isArray(updates.members)) return false;

  const currentByKey = new Map();
  listOrEmpty(family.members).forEach((member) => {
    const key = familyMemberAccessKey(member);
    if (key) currentByKey.set(key, member);
  });

  const nextByKey = new Map();
  listOrEmpty(updates.members).forEach((member) => {
    const key = familyMemberAccessKey(member);
    if (key) nextByKey.set(key, member);
  });

  for (const [key, nextMember] of nextByKey.entries()) {
    const currentMember = currentByKey.get(key);
    const nextPrivilege = familyMemberPrivilegeState(nextMember);
    const currentPrivilege = familyMemberPrivilegeState(currentMember || {});

    if (!currentMember && nextPrivilege.privileged) return true;
    if (currentMember && (
      nextPrivilege.admin !== currentPrivilege.admin ||
      nextPrivilege.appRole !== currentPrivilege.appRole
    )) {
      return true;
    }
  }

  for (const [key, currentMember] of currentByKey.entries()) {
    const currentPrivilege = familyMemberPrivilegeState(currentMember);
    if (currentPrivilege.privileged && !nextByKey.has(key)) return true;
  }

  return false;
}

function canDeleteFamily(family = {}, token = {}) {
  const uid = cleanText(token.sub);
  const email = normalizeEmail(token.email);
  if (!uid && !email) return false;

  const ownerIds = uniqueStrings([
    family.ownerId,
    family.owner_id,
    family.ownerUid,
    family.owner_uid,
    family.createdBy,
    family.created_by,
  ]);
  const ownerEmails = uniqueStrings([
    family.ownerEmail,
    family.owner_email,
    family.createdByEmail,
    family.created_by_email,
  ]).map(normalizeEmail);

  return ownerIds.includes(uid) || ownerEmails.includes(email);
}

function canManageCustodyGroup(group = {}, token = {}) {
  const uid = cleanText(token.sub);
  const email = normalizeEmail(token.email);
  if (!uid && !email) return false;

  const ownerIds = uniqueStrings([
    group.ownerId,
    group.owner_id,
    group.createdBy,
    group.created_by,
    group.createdByUid,
    group.created_by_uid,
  ]);
  const ownerEmails = uniqueStrings([
    group.ownerEmail,
    group.owner_email,
    group.createdByEmail,
    group.created_by_email,
  ]).map(normalizeEmail);
  const adminIds = uniqueStrings([group.adminIds, group.admin_ids].flat());
  const adminEmails = uniqueStrings([group.adminEmails, group.admin_emails].flat()).map(normalizeEmail);
  const managerMembers = [
    ...listOrEmpty(group.parents),
    ...listOrEmpty(group.coParents),
    ...listOrEmpty(group.members),
  ].filter((member) => (
    member?.isAdmin === true ||
    member?.is_admin === true ||
    member?.admin === true ||
    member?.owner === true ||
    member?.appRole === "owner" ||
    member?.appRole === "admin" ||
    member?.app_role === "owner" ||
    member?.app_role === "admin"
  ));

  return (
    ownerIds.includes(uid) ||
    ownerEmails.includes(email) ||
    adminIds.includes(uid) ||
    adminEmails.includes(email) ||
    managerMembers.some((member) => cleanText(member.uid || member.userId || member.user_id) === uid || memberEmail(member) === email)
  );
}

function findPrincipalMember(container = {}, token = {}) {
  const uid = cleanText(token.sub);
  const email = normalizeEmail(token.email);
  const candidates = [
    ...listOrEmpty(container.members),
    ...listOrEmpty(container.parents),
    ...listOrEmpty(container.coParents),
    ...listOrEmpty(container.viewers),
  ];

  return candidates.find((member) => (
    (uid && cleanText(member?.uid || member?.userId || member?.user_id || member?.id) === uid) ||
    (email && memberEmail(member) === email)
  ));
}

function emailListHasPrincipal(values = [], token = {}) {
  const email = normalizeEmail(token.email);
  return Boolean(email && listOrEmpty(values).map(normalizeEmail).includes(email));
}

function canAccessFamily(family = {}, token = {}) {
  if (canManageFamily(family, token)) return true;
  const uid = cleanText(token.sub);
  const email = normalizeEmail(token.email);

  return Boolean(
    findPrincipalMember(family, token) ||
    (uid && uniqueStrings([family.memberIds, family.member_ids].flat()).includes(uid)) ||
    emailListHasPrincipal(family.memberEmails, token) ||
    emailListHasPrincipal(family.member_emails, token)
  );
}

function canAccessCustodyGroup(group = {}, token = {}) {
  if (canManageCustodyGroup(group, token)) return true;
  const uid = cleanText(token.sub);
  const email = normalizeEmail(token.email);
  const idFields = [
    group.memberIds,
    group.member_ids,
    group.viewerIds,
    group.viewer_ids,
    group.custodyReaderIds,
    group.custody_reader_ids,
    group.custodyWriterIds,
    group.custody_writer_ids,
  ].flat();
  const emailFields = [
    group.memberEmails,
    group.member_emails,
    group.viewerEmails,
    group.viewer_emails,
    group.custodyReaderEmails,
    group.custody_reader_emails,
    group.custodyWriterEmails,
    group.custody_writer_emails,
  ];

  return Boolean(
    findPrincipalMember(group, token) ||
    (uid && uniqueStrings(idFields).includes(uid)) ||
    (email && emailFields.some((values) => listOrEmpty(values).map(normalizeEmail).includes(email)))
  );
}

function addDeleteWrite(writesByName, env, collectionName, docId) {
  if (!docId) return;
  const name = firestoreDocumentName(env, collectionName, docId);
  writesByName.set(name, firestoreDeleteNameWrite(name));
}

async function collectWhereDeletes(env, writesByName, collectionName, filters = []) {
  const activeFilters = filters.filter((filter) => (
    filter?.field &&
    filter?.value !== undefined &&
    filter?.value !== null &&
    filter?.value !== ""
  ));

  const results = await Promise.allSettled(
    activeFilters.map((filter) => firestoreQueryField(env, collectionName, {
      field: filter.field,
      op: filter.op || "EQUAL",
      value: filter.value,
    }))
  );

  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length === results.length && results.length > 0) {
    throw failures[0].reason;
  }

  results.forEach((result) => {
    if (result.status !== "fulfilled") return;
    result.value.forEach((doc) => addDeleteWrite(writesByName, env, collectionName, doc.id));
  });
}

async function collectCustodyGroupDocsForFamily(env, familyId) {
  const docsById = new Map();
  const filters = [
    ...CUSTODY_GROUP_LOOKUP_FIELDS.map((field) => ({ field, value: familyId })),
    { field: "linkedFamilyIds", op: "ARRAY_CONTAINS", value: familyId },
    { field: "linked_family_ids", op: "ARRAY_CONTAINS", value: familyId },
  ];

  const results = await Promise.allSettled(
    filters.map((filter) => firestoreQueryField(env, "custodyGroups", filter))
  );

  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length === results.length && results.length > 0) {
    throw failures[0].reason;
  }

  results.forEach((result) => {
    if (result.status !== "fulfilled") return;
    result.value.forEach((doc) => docsById.set(doc.id, doc));
  });

  return [...docsById.values()];
}

async function collectCustodyCascadeDeletes(env, groupId, writesByName) {
  for (const collectionName of CUSTODY_COLLECTIONS) {
    await collectWhereDeletes(env, writesByName, collectionName, (
      CUSTODY_SCOPE_LOOKUP_FIELDS.map((field) => ({ field, value: groupId }))
    ));
  }

  addDeleteWrite(writesByName, env, "custodyNotificationPrefs", groupId);
}

async function custodyGroupReferenceUpdateWrites(env, groupId, group = {}) {
  const now = new Date().toISOString();
  const writesByName = new Map();
  const familyDocs = new Map();
  const childDocs = new Map();

  const familyIds = uniqueStrings([
    group.familyId,
    group.family_id,
    group.householdFamilyId,
    group.household_family_id,
    group.actualFamilyId,
    group.actual_family_id,
  ]);

  for (const familyId of familyIds) {
    const family = await firestoreGetDoc(env, "families", familyId);
    if (family) familyDocs.set(familyId, { ...family, id: familyId });
  }

  const familyResults = await Promise.allSettled([
    firestoreQueryField(env, "families", { field: "custodyGroupIds", op: "ARRAY_CONTAINS", value: groupId }),
    firestoreQueryField(env, "families", { field: "custody_group_ids", op: "ARRAY_CONTAINS", value: groupId }),
  ]);
  familyResults.forEach((result) => {
    if (result.status === "fulfilled") {
      result.value.forEach((doc) => familyDocs.set(doc.id, doc));
    }
  });

  const childResults = await Promise.allSettled([
    firestoreQueryField(env, "children", { field: "custodyGroupIds", op: "ARRAY_CONTAINS", value: groupId }),
    firestoreQueryField(env, "children", { field: "custody_group_ids", op: "ARRAY_CONTAINS", value: groupId }),
  ]);
  childResults.forEach((result) => {
    if (result.status === "fulfilled") {
      result.value.forEach((doc) => childDocs.set(doc.id, doc));
    }
  });

  familyDocs.forEach((family, familyId) => {
    const custodyGroupIds = mergeIdList(family.custodyGroupIds, family.custody_group_ids)
      .filter((id) => id !== groupId);
    writesByName.set(`families/${familyId}`, firestoreMergeWrite(env, "families", familyId, {
      custodyGroupIds,
      custody_group_ids: custodyGroupIds,
      updatedAt: now,
      updated_at: now,
    }));
  });

  childDocs.forEach((child, childId) => {
    const custodyGroupIds = mergeIdList(child.custodyGroupIds, child.custody_group_ids)
      .filter((id) => id !== groupId);
    writesByName.set(`children/${childId}`, firestoreMergeWrite(env, "children", childId, {
      custodyGroupIds,
      custody_group_ids: custodyGroupIds,
      updatedAt: now,
      updated_at: now,
    }));
  });

  return [...writesByName.values()];
}

async function collectFamilyCascadeDeletes(env, familyId, writesByName) {
  const custodyGroups = await collectCustodyGroupDocsForFamily(env, familyId);

  for (const group of custodyGroups) {
    await collectCustodyCascadeDeletes(env, group.id, writesByName);
    addDeleteWrite(writesByName, env, "custodyGroups", group.id);
  }

  for (const collectionName of HOUSEHOLD_COLLECTIONS) {
    await collectWhereDeletes(env, writesByName, collectionName, [
      { field: "familyId", value: familyId },
      { field: "family_id", value: familyId },
    ]);
  }

  addDeleteWrite(writesByName, env, "families", familyId);

  return {
    deletedCustodyGroups: custodyGroups.length,
  };
}

function permissionAllowsRead(permission) {
  if (permission === true) return true;
  if (typeof permission === "string") return ["read", "write", "admin", "owner"].includes(permission);
  if (!permission || typeof permission !== "object") return false;
  return permission.read === true || permission.write === true || permission.visible === true || permission.assignable === true;
}

function memberCanReadModule(member = {}, moduleName = "") {
  if (!moduleName || member.admin === true || member.isAdmin === true || member.is_admin === true) return true;
  if (["owner", "admin"].includes(cleanText(member.appRole || member.app_role))) return true;

  const normalizedModule = moduleName === "groceries" ? "lists" : moduleName;
  const permissions = mapOrEmpty(member.permissions);
  const modules = mapOrEmpty(member.modules);

  if (Object.prototype.hasOwnProperty.call(permissions, normalizedModule)) {
    return permissionAllowsRead(permissions[normalizedModule]);
  }

  if (Object.prototype.hasOwnProperty.call(modules, normalizedModule)) {
    return permissionAllowsRead(modules[normalizedModule]);
  }

  return true;
}

function permissionAllowsWrite(permission) {
  if (permission === true) return true;
  if (typeof permission === "string") return ["write", "admin", "owner"].includes(permission);
  if (!permission || typeof permission !== "object") return false;
  return permission.write === true;
}

function memberCanWriteModule(member = {}, moduleName = "") {
  if (!moduleName || member.admin === true || member.isAdmin === true || member.is_admin === true) return true;
  if (["owner", "admin"].includes(cleanText(member.appRole || member.app_role))) return true;

  const normalizedModule = moduleName === "groceries" ? "lists" : moduleName;
  const permissions = mapOrEmpty(member.permissions);
  const modules = mapOrEmpty(member.modules);

  if (Object.prototype.hasOwnProperty.call(permissions, normalizedModule)) {
    return permissionAllowsWrite(permissions[normalizedModule]);
  }

  if (Object.prototype.hasOwnProperty.call(modules, normalizedModule)) {
    return permissionAllowsWrite(modules[normalizedModule]);
  }

  return cleanText(member.access || member.accessLevel || member.access_level) === "member";
}

function canWriteFamilyModule(family = {}, token = {}, moduleName = "") {
  if (canManageFamily(family, token)) return true;

  const uid = cleanText(token.sub);
  const email = normalizeEmail(token.email);
  const normalizedModule = moduleName === "groceries" ? "lists" : moduleName;
  const writerIds = uniqueStrings([
    family[`${normalizedModule}WriterIds`],
    family[`${normalizedModule}_writer_ids`],
  ].flat());
  const writerEmails = uniqueStrings([
    family[`${normalizedModule}WriterEmails`],
    family[`${normalizedModule}_writer_emails`],
  ].flat()).map(normalizeEmail);

  return Boolean(
    (uid && writerIds.includes(uid)) ||
    (email && writerEmails.includes(email)) ||
    memberCanWriteModule(findPrincipalMember(family, token), normalizedModule)
  );
}

function canWriteCustodyGroup(group = {}, token = {}) {
  if (canManageCustodyGroup(group, token)) return true;

  const uid = cleanText(token.sub);
  const email = normalizeEmail(token.email);
  const writerIds = uniqueStrings([
    group.custodyWriterIds,
    group.custody_writer_ids,
    group.memberIds,
    group.member_ids,
  ].flat());
  const writerEmails = uniqueStrings([
    group.custodyWriterEmails,
    group.custody_writer_emails,
    group.memberEmails,
    group.member_emails,
  ].flat()).map(normalizeEmail);

  return Boolean(
    (uid && writerIds.includes(uid)) ||
    (email && writerEmails.includes(email)) ||
    memberCanWriteModule(findPrincipalMember(group, token), "custody")
  );
}

function canWriteCustodyBudgetGroup(group = {}, token = {}) {
  if (canManageCustodyGroup(group, token)) return true;

  const uid = cleanText(token.sub);
  const email = normalizeEmail(token.email);
  const writerIds = uniqueStrings([
    group.budgetWriterIds,
    group.budget_writer_ids,
  ].flat());
  const writerEmails = uniqueStrings([
    group.budgetWriterEmails,
    group.budget_writer_emails,
  ].flat()).map(normalizeEmail);

  return Boolean(
    (uid && writerIds.includes(uid)) ||
    (email && writerEmails.includes(email)) ||
    memberCanWriteModule(findPrincipalMember(group, token), "budget")
  );
}

function upsertRecipient(recipients, candidate = {}, moduleName = "") {
  const email = normalizeEmail(candidate.email || candidate.emailAddress || candidate.memberEmail || candidate.recipientEmail);
  const uid = cleanText(candidate.uid || candidate.userId || candidate.user_id || candidate.id);
  if (!email || !memberCanReadModule(candidate, moduleName)) return;

  const key = email || uid;
  if (!recipients.has(key)) {
    recipients.set(key, {
      email,
      uid,
      name: cleanText(candidate.name || candidate.displayName || candidate.fullName || candidate.label || email),
      moduleName,
    });
  } else if (uid && !recipients.get(key).uid) {
    recipients.get(key).uid = uid;
  }
}

function familyNotificationRecipients(family = {}, moduleName = "") {
  const recipients = new Map();
  upsertRecipient(recipients, {
    uid: family.ownerId || family.owner_id || family.createdBy || family.created_by,
    email: family.ownerEmail || family.owner_email || family.createdByEmail || family.created_by_email,
    name: family.parent1Name || family.parent1_name || family.ownerName || family.owner_name || "Family owner",
    admin: true,
  }, moduleName);
  upsertRecipient(recipients, {
    uid: family.parent1Uid || family.parent1_uid,
    email: family.parent1Email || family.parent1_email || family.ownerEmail || family.owner_email,
    name: family.parent1Name || family.parent1_name,
    admin: true,
  }, moduleName);
  upsertRecipient(recipients, {
    uid: family.parent2Uid || family.parent2_uid,
    email: family.parent2Email || family.parent2_email,
    name: family.parent2Name || family.parent2_name,
    permissions: family.parent2Permissions || family.parent2_permissions,
    modules: family.parent2Modules || family.parent2_modules,
  }, moduleName);

  listOrEmpty(family.members).forEach((member) => upsertRecipient(recipients, member, moduleName));

  if (recipients.size <= 1) {
    uniqueStrings([family.memberEmails, family.member_emails, family.adminEmails, family.admin_emails].flat())
      .map(normalizeEmail)
      .forEach((email) => upsertRecipient(recipients, { email }, moduleName));
  }

  return [...recipients.values()];
}

function custodyNotificationRecipients(group = {}, moduleName = "custody") {
  const recipients = new Map();
  upsertRecipient(recipients, {
    uid: group.ownerId || group.owner_id || group.createdBy || group.created_by || group.createdByUid || group.created_by_uid,
    email: group.ownerEmail || group.owner_email || group.createdByEmail || group.created_by_email,
    name: "Custody owner",
    admin: true,
  }, moduleName);

  [
    ...listOrEmpty(group.parents),
    ...listOrEmpty(group.coParents),
    ...listOrEmpty(group.members),
    ...listOrEmpty(group.viewers),
  ].forEach((member) => upsertRecipient(recipients, member, moduleName));

  uniqueStrings([
    group.memberEmails,
    group.member_emails,
    group.viewerEmails,
    group.viewer_emails,
    group.adminEmails,
    group.admin_emails,
    group.custodyReaderEmails,
    group.custody_reader_emails,
    group.custodyWriterEmails,
    group.custody_writer_emails,
  ].flat())
    .map(normalizeEmail)
    .forEach((email) => upsertRecipient(recipients, { email, modules: { custody: { read: true } } }, moduleName));

  return [...recipients.values()];
}

function mergeInvites(existing = [], invite) {
  const map = new Map();
  listOrEmpty(existing).forEach((item) => {
    const email = normalizeEmail(item?.recipientEmail || item?.recipient_email);
    if (email) map.set(email, item);
  });
  map.set(normalizeEmail(invite.recipientEmail || invite.recipient_email), invite);
  return [...map.values()];
}

function invitationsMatch(left = {}, right = {}) {
  const leftId = cleanText(left.id);
  const rightId = cleanText(right.id);
  const leftEmail = normalizeEmail(left.recipientEmail || left.recipient_email);
  const rightEmail = normalizeEmail(right.recipientEmail || right.recipient_email);
  const leftFamilyId = cleanText(left.familyId || left.family_id);
  const rightFamilyId = cleanText(right.familyId || right.family_id);
  const leftGroupId = cleanText(left.groupId || left.group_id || left.custodyGroupId || left.custody_group_id || leftFamilyId);
  const rightGroupId = cleanText(right.groupId || right.group_id || right.custodyGroupId || right.custody_group_id || rightFamilyId);

  return Boolean(
    (leftId && rightId && leftId === rightId) ||
    (leftEmail && rightEmail && leftEmail === rightEmail && (
      (leftFamilyId && rightFamilyId && leftFamilyId === rightFamilyId) ||
      (leftGroupId && rightGroupId && leftGroupId === rightGroupId)
    ))
  );
}

function removeEmbeddedInvitation(list = [], invitation = {}) {
  return listOrEmpty(list).filter((item) => !invitationsMatch(item, invitation));
}

function removeEmail(list = [], email = "") {
  const cleanEmail = normalizeEmail(email);
  return listOrEmpty(list).map(normalizeEmail).filter((item) => item && item !== cleanEmail);
}

function mergeEmailList(...groups) {
  return [...new Set(groups.flat().map(normalizeEmail).filter(Boolean))];
}

function invitationAccess(invitation = {}) {
  const access = cleanText(invitation.access || invitation.accessLevel || invitation.access_level);
  const type = cleanText(invitation.type || invitation.inviteType || invitation.invite_type);
  const role = cleanText(invitation.role);
  return access === "viewer" || type.includes("viewer") || role === "viewer" ? "viewer" : "member";
}

function modulePermission(permission = {}) {
  return {
    read: permission?.read === true || permission?.write === true || permission?.visible === true || permission?.assignable === true,
    write: permission?.write === true,
  };
}

function addAccessArrays(update = {}, { uid = "", email = "", moduleName = "", permission = {} } = {}) {
  const access = modulePermission(permission);
  const readerIdsKey = `${moduleName}ReaderIds`;
  const readerEmailsKey = `${moduleName}ReaderEmails`;
  const writerIdsKey = `${moduleName}WriterIds`;
  const writerEmailsKey = `${moduleName}WriterEmails`;

  if (access.read) {
    update[readerIdsKey] = mergeIdList(update[readerIdsKey], uid);
    update[readerEmailsKey] = mergeEmailList(update[readerEmailsKey], email);
  }
  if (access.write) {
    update[writerIdsKey] = mergeIdList(update[writerIdsKey], uid);
    update[writerEmailsKey] = mergeEmailList(update[writerEmailsKey], email);
  }
}

function pendingFamilyUpdate(family = {}, invitation = {}, now = new Date().toISOString()) {
  const email = normalizeEmail(invitation.recipientEmail || invitation.recipient_email);
  const pendingMemberEmails = uniqueStrings([
    ...listOrEmpty(family.pendingMemberEmails),
    ...listOrEmpty(family.pending_member_emails),
    email,
  ]).map(normalizeEmail);
  const pendingInvites = mergeInvites(family.pendingInvites || family.pending_invites || [], invitation);

  return {
    pendingMemberEmails,
    pending_member_emails: pendingMemberEmails,
    pendingInvites,
    pending_invites: pendingInvites,
    updatedAt: now,
    updated_at: now,
  };
}

function pendingCustodyUpdate(group = {}, invitation = {}, now = new Date().toISOString()) {
  const email = normalizeEmail(invitation.recipientEmail || invitation.recipient_email);
  const isViewer = invitation.access === "viewer" || invitation.accessLevel === "viewer" || invitation.access_level === "viewer";
  const pendingInvites = mergeInvites(group.pendingInvites || group.pending_invites || [], invitation);

  if (isViewer) {
    const pendingViewerEmails = uniqueStrings([
      ...listOrEmpty(group.pendingViewerEmails),
      ...listOrEmpty(group.pending_viewer_emails),
      email,
    ]).map(normalizeEmail);

    return {
      pendingViewerEmails,
      pending_viewer_emails: pendingViewerEmails,
      pendingInvites,
      pending_invites: pendingInvites,
      updatedAt: now,
      updated_at: now,
    };
  }

  const pendingMemberEmails = uniqueStrings([
    ...listOrEmpty(group.pendingMemberEmails),
    ...listOrEmpty(group.pending_member_emails),
    email,
  ]).map(normalizeEmail);

  return {
    pendingMemberEmails,
    pending_member_emails: pendingMemberEmails,
    pendingInvites,
    pending_invites: pendingInvites,
    updatedAt: now,
    updated_at: now,
  };
}

function mergeIdList(...groups) {
  return [...new Set(groups.flat().map(cleanText).filter(Boolean))];
}

function fallbackMembersFromFamily(family = {}) {
  const members = listOrEmpty(family.members);
  if (members.length) return members;

  const ownerUid = cleanText(family.ownerId || family.owner_id || family.createdBy || family.created_by);
  const ownerEmail = normalizeEmail(family.ownerEmail || family.owner_email || family.createdByEmail || family.created_by_email);
  const ownerName = cleanText(family.parent1Name || family.parent1_name || family.ownerName || family.owner_name || ownerEmail, "Family owner");
  const parent1Role = cleanText(family.parent1Role || family.parent1_role || "parent");
  const parent2Email = normalizeEmail(family.parent2Email || family.parent2_email);
  const parent2Name = cleanText(family.parent2Name || family.parent2_name || parent2Email);
  const parent2Role = cleanText(family.parent2Role || family.parent2_role || "parent");
  const fallback = [];

  if (ownerUid || ownerEmail) {
    fallback.push({
      id: ownerUid ? `user_${ownerUid}` : `email_${ownerEmail}`,
      personId: ownerUid ? `user_${ownerUid}` : `email_${ownerEmail}`,
      person_id: ownerUid ? `user_${ownerUid}` : `email_${ownerEmail}`,
      uid: ownerUid,
      email: ownerEmail,
      name: ownerName,
      displayName: ownerName,
      display_name: ownerName,
      role: parent1Role,
      type: cleanText(family.parent1PersonType || family.parent1_person_type || parent1Role, "parent"),
      relationship: cleanText(family.parent1Relationship || family.parent1_relationship || parent1Role),
      appRole: "owner",
      app_role: "owner",
      livesHere: family.parent1LivesHere === true || family.parent1_lives_here === true,
      lives_here: family.parent1LivesHere === true || family.parent1_lives_here === true,
      showOnHomeDashboard: family.parent1ShowOnHomeDashboard !== false && family.parent1_show_on_home_dashboard !== false,
      show_on_home_dashboard: family.parent1ShowOnHomeDashboard !== false && family.parent1_show_on_home_dashboard !== false,
      color: cleanText(family.parent1Color || family.parent1_color || "blue"),
      isAdmin: true,
      is_admin: true,
    });
  }

  if (parent2Email || parent2Name) {
    fallback.push({
      id: cleanText(family.parent2PersonId || family.parent2_person_id || (parent2Email ? `email_${parent2Email}` : "")),
      personId: cleanText(family.parent2PersonId || family.parent2_person_id || (parent2Email ? `email_${parent2Email}` : "")),
      person_id: cleanText(family.parent2_person_id || family.parent2PersonId || (parent2Email ? `email_${parent2Email}` : "")),
      email: parent2Email,
      name: parent2Name || "Family member",
      displayName: parent2Name || "Family member",
      display_name: parent2Name || "Family member",
      role: parent2Role,
      type: cleanText(family.parent2PersonType || family.parent2_person_type || parent2Role, "parent"),
      relationship: cleanText(family.parent2Relationship || family.parent2_relationship || parent2Role),
      appRole: "viewer",
      app_role: "viewer",
      livesHere: family.parent2LivesHere === true || family.parent2_lives_here === true,
      lives_here: family.parent2LivesHere === true || family.parent2_lives_here === true,
      showOnHomeDashboard: family.parent2ShowOnHomeDashboard === true || family.parent2_show_on_home_dashboard === true,
      show_on_home_dashboard: family.parent2ShowOnHomeDashboard === true || family.parent2_show_on_home_dashboard === true,
      color: cleanText(family.parent2Color || family.parent2_color || "amber"),
    });
  }

  return fallback;
}

function normalizeFamilyInvitation(raw = {}, token = {}) {
  const familyId = cleanText(raw.familyId || raw.family_id);
  const recipientEmail = normalizeEmail(raw.recipientEmail || raw.recipient_email);
  const now = new Date().toISOString();
  if (!familyId || !recipientEmail) {
    throw new Error("Family invitation requires familyId and recipientEmail.");
  }

  const id = cleanText(raw.id, familyInvitationId(familyId, recipientEmail));
  return {
    ...raw,
    id,
    familyId,
    family_id: familyId,
    status: "pending",
    recipientEmail,
    recipient_email: recipientEmail,
    createdBy: cleanText(raw.createdBy || raw.created_by || token.sub),
    created_by: cleanText(raw.createdBy || raw.created_by || token.sub),
    createdByEmail: normalizeEmail(raw.createdByEmail || raw.created_by_email || token.email),
    created_by_email: normalizeEmail(raw.createdByEmail || raw.created_by_email || token.email),
    createdAt: raw.createdAt || raw.created_at || now,
    created_at: raw.created_at || raw.createdAt || now,
    updatedAt: now,
    updated_at: now,
  };
}

function normalizeCustodyInvitation(raw = {}, token = {}) {
  const groupId = cleanText(raw.groupId || raw.group_id || raw.custodyGroupId || raw.custody_group_id || raw.familyId || raw.family_id);
  const recipientEmail = normalizeEmail(raw.recipientEmail || raw.recipient_email);
  const now = new Date().toISOString();
  if (!groupId || !recipientEmail) {
    throw new Error("Custody invitation requires groupId and recipientEmail.");
  }

  const id = cleanText(raw.id, custodyInvitationId(groupId, recipientEmail));
  return {
    ...raw,
    id,
    familyId: groupId,
    family_id: groupId,
    groupId,
    group_id: groupId,
    status: "pending",
    recipientEmail,
    recipient_email: recipientEmail,
    createdBy: cleanText(raw.createdBy || raw.created_by || token.sub),
    created_by: cleanText(raw.createdBy || raw.created_by || token.sub),
    createdByEmail: normalizeEmail(raw.createdByEmail || raw.created_by_email || token.email),
    created_by_email: normalizeEmail(raw.createdByEmail || raw.created_by_email || token.email),
    createdAt: raw.createdAt || raw.created_at || now,
    created_at: raw.created_at || raw.createdAt || now,
    updatedAt: now,
    updated_at: now,
  };
}

function familyInvitationMember(invitation = {}, token = {}) {
  const email = normalizeEmail(invitation.recipientEmail || invitation.recipient_email || token.email);
  const role = cleanText(invitation.role, "family");
  const name = cleanText(
    invitation.recipientName ||
    invitation.recipient_name ||
    token.name ||
    email,
    email
  );
  const admin = (
    invitation.admin === true ||
    invitation.isAdmin === true ||
    invitation.is_admin === true ||
    invitation.appRole === "admin" ||
    invitation.app_role === "admin"
  );
  const livesHere = invitation.livesHere === true || invitation.lives_here === true;
  const showOnHomeDashboard = (
    invitation.showOnHomeDashboard === true ||
    invitation.show_on_home_dashboard === true ||
    invitation.homeDashboard === true ||
    invitation.home_dashboard === true ||
    livesHere
  );

  return {
    id: `user_${token.sub}`,
    personId: `user_${token.sub}`,
    person_id: `user_${token.sub}`,
    uid: token.sub,
    email,
    name,
    displayName: name,
    display_name: name,
    type: cleanText(invitation.personType || invitation.person_type || role, "member"),
    personType: cleanText(invitation.personType || invitation.person_type || role, "member"),
    person_type: cleanText(invitation.person_type || invitation.personType || role, "member"),
    role,
    relationship: cleanText(invitation.relationship || invitation.memberRelationship || invitation.member_relationship || role),
    memberRelationship: cleanText(invitation.relationship || invitation.memberRelationship || invitation.member_relationship || role),
    member_relationship: cleanText(invitation.relationship || invitation.memberRelationship || invitation.member_relationship || role),
    livesHere,
    lives_here: livesHere,
    showOnHomeDashboard,
    show_on_home_dashboard: showOnHomeDashboard,
    homeDashboard: showOnHomeDashboard,
    home_dashboard: showOnHomeDashboard,
    appRole: cleanText(invitation.appRole || invitation.app_role || (admin ? "admin" : "viewer")),
    app_role: cleanText(invitation.app_role || invitation.appRole || (admin ? "admin" : "viewer")),
    color: cleanText(invitation.color || invitation.colorId || invitation.color_id || invitation.familyColor || invitation.family_color),
    colorId: cleanText(invitation.colorId || invitation.color_id || invitation.color || invitation.familyColor || invitation.family_color),
    color_id: cleanText(invitation.color_id || invitation.colorId || invitation.color || invitation.familyColor || invitation.family_color),
    familyColor: cleanText(invitation.familyColor || invitation.family_color || invitation.color || invitation.colorId || invitation.color_id),
    family_color: cleanText(invitation.family_color || invitation.familyColor || invitation.color || invitation.colorId || invitation.color_id),
    admin,
    isAdmin: admin,
    is_admin: admin,
    invitationStatus: "accepted",
    invitation_status: "accepted",
    invitationId: cleanText(invitation.id),
    invitation_id: cleanText(invitation.id),
    modules: mapOrEmpty(invitation.modules),
    permissions: mapOrEmpty(invitation.permissions),
    status: "active",
  };
}

function familyMemberDocumentId(familyId = "", member = {}) {
  const key = cleanText(
    member.uid ||
    member.userId ||
    member.user_id ||
    member.personId ||
    member.person_id ||
    member.id ||
    member.email ||
    member.name ||
    member.displayName
  );
  return safeDocumentId(`${familyId}_${key || crypto.randomUUID()}`);
}

function normalizeFamilyMemberRecord(familyId = "", member = {}, token = {}, now = new Date().toISOString()) {
  const email = normalizeEmail(member.email || member.memberEmail || member.member_email || member.recipientEmail || member.recipient_email);
  const uid = cleanText(member.uid || member.userId || member.user_id);
  const personId = cleanText(member.personId || member.person_id || member.id || (uid ? `user_${uid}` : "") || (email ? `email_${email}` : ""));
  const name = cleanText(
    member.name ||
    member.displayName ||
    member.display_name ||
    member.fullName ||
    member.full_name ||
    email,
    "Family member"
  );
  const appRole = cleanText(member.appRole || member.app_role || member.role || "viewer");
  const admin = (
    member.admin === true ||
    member.isAdmin === true ||
    member.is_admin === true ||
    appRole === "owner" ||
    appRole === "admin"
  );
  const livesHere = member.livesHere === true || member.lives_here === true;
  const showOnHomeDashboard = (
    member.showOnHomeDashboard === true ||
    member.show_on_home_dashboard === true ||
    member.homeDashboard === true ||
    member.home_dashboard === true ||
    livesHere
  );
  const color = cleanText(member.color || member.colorId || member.color_id || member.familyColor || member.family_color);
  const role = cleanText(member.role || member.memberRole || member.member_role || "member");
  const type = cleanText(member.type || member.personType || member.person_type || role, "member");
  const relationship = cleanText(member.relationship || member.memberRelationship || member.member_relationship || role);
  const id = familyMemberDocumentId(familyId, { ...member, personId, uid, email, name });

  return {
    ...member,
    id,
    familyId,
    family_id: familyId,
    personId,
    person_id: personId,
    uid,
    email,
    name,
    displayName: cleanText(member.displayName || member.display_name || name, name),
    display_name: cleanText(member.display_name || member.displayName || name, name),
    type,
    personType: cleanText(member.personType || member.person_type || type, type),
    person_type: cleanText(member.person_type || member.personType || type, type),
    role,
    relationship,
    memberRelationship: relationship,
    member_relationship: relationship,
    appRole,
    app_role: cleanText(member.app_role || member.appRole || appRole, appRole),
    livesHere,
    lives_here: livesHere,
    showOnHomeDashboard,
    show_on_home_dashboard: showOnHomeDashboard,
    homeDashboard: showOnHomeDashboard,
    home_dashboard: showOnHomeDashboard,
    color,
    colorId: cleanText(member.colorId || member.color_id || color, color),
    color_id: cleanText(member.color_id || member.colorId || color, color),
    familyColor: cleanText(member.familyColor || member.family_color || color, color),
    family_color: cleanText(member.family_color || member.familyColor || color, color),
    admin,
    isAdmin: admin,
    is_admin: admin,
    modules: mapOrEmpty(member.modules),
    permissions: mapOrEmpty(member.permissions),
    status: cleanText(member.status || member.invitationStatus || member.invitation_status || "active", "active"),
    invitationStatus: cleanText(member.invitationStatus || member.invitation_status || member.status || "active", "active"),
    invitation_status: cleanText(member.invitation_status || member.invitationStatus || member.status || "active", "active"),
    updatedAt: now,
    updated_at: now,
    updatedBy: cleanText(token.sub),
    updated_by: cleanText(token.sub),
    updatedByEmail: normalizeEmail(token.email),
    updated_by_email: normalizeEmail(token.email),
  };
}

function familyMemberRecords(familyId = "", members = [], token = {}, now = new Date().toISOString()) {
  return listOrEmpty(members)
    .map((member) => normalizeFamilyMemberRecord(familyId, member, token, now))
    .filter((member) => member.familyId && (member.personId || member.uid || member.email));
}

function familyMemberWrites(env, familyId = "", members = [], token = {}, now = new Date().toISOString()) {
  return familyMemberRecords(familyId, members, token, now)
    .map((member) => firestoreMergeWrite(env, "familyMembers", member.id, member));
}

async function familyMemberSyncWrites(env, familyId = "", members = [], token = {}, now = new Date().toISOString()) {
  const nextMembers = familyMemberRecords(familyId, members, token, now);
  const nextIds = new Set(nextMembers.map((member) => member.id));
  const existingResults = await Promise.allSettled([
    firestoreQueryField(env, "familyMembers", { field: "familyId", value: familyId }),
    firestoreQueryField(env, "familyMembers", { field: "family_id", value: familyId }),
  ]);
  const existingMembers = existingResults.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  const seen = new Set();
  const deleteWrites = existingMembers
    .filter((member) => {
      if (!member.id || seen.has(member.id)) return false;
      seen.add(member.id);
      return !nextIds.has(member.id);
    })
    .map((member) => firestoreDeleteNameWrite(firestoreDocumentName(env, "familyMembers", member.id)));

  return [
    ...nextMembers.map((member) => firestoreMergeWrite(env, "familyMembers", member.id, member)),
    ...deleteWrites,
  ];
}

function mergeAcceptedMember(members = [], acceptedMember = {}) {
  const currentMembers = listOrEmpty(members);
  let merged = false;
  const acceptedEmail = normalizeEmail(acceptedMember.email);

  const nextMembers = currentMembers.map((member) => {
    const memberEmail = normalizeEmail(member?.email);
    const sameMember = (
      (acceptedMember.uid && member?.uid === acceptedMember.uid) ||
      (acceptedEmail && memberEmail === acceptedEmail) ||
      (acceptedMember.invitationId && (member?.invitationId === acceptedMember.invitationId || member?.invitation_id === acceptedMember.invitationId))
    );
    if (!sameMember) return member;

    merged = true;
    return {
      ...member,
      ...acceptedMember,
      color: acceptedMember.color || member.color || member.colorId || "teal",
      colorId: acceptedMember.colorId || acceptedMember.color || member.colorId || member.color || "teal",
      color_id: acceptedMember.color_id || acceptedMember.colorId || acceptedMember.color || member.color_id || member.colorId || "teal",
      status: "active",
    };
  });

  if (!merged) nextMembers.push(acceptedMember);
  return nextMembers;
}

function mergeNotificationPreferences(saved = {}) {
  return {
    channels: {
      ...DEFAULT_NOTIFICATION_PREFERENCES.channels,
      ...mapOrEmpty(saved.channels),
    },
    notifyOn: {
      ...DEFAULT_NOTIFICATION_PREFERENCES.notifyOn,
      ...mapOrEmpty(saved.notifyOn || saved.notify_on),
    },
    quietHours: {
      ...DEFAULT_NOTIFICATION_PREFERENCES.quietHours,
      ...mapOrEmpty(saved.quietHours || saved.quiet_hours),
    },
  };
}

function activityPreferenceKey(activity = {}) {
  const type = cleanText(activity.type);
  const moduleName = cleanText(activity.module);

  if (moduleName === "tasks" || type.startsWith("task_")) {
    return type === "task_completed" ? "taskCompleted" : "taskAssigned";
  }

  if (moduleName === "calendar" || type.startsWith("event_")) {
    return type.includes("updated") || type.includes("edited") ? "familyEventEdited" : "familyEventCreated";
  }

  if (moduleName === "budget" || type.includes("custody_budget")) {
    if (type.includes("deleted")) return "budgetExpenseDeleted";
    if (type.includes("updated") || type.includes("edited")) return "budgetExpenseEdited";
    return "budgetExpenseCreated";
  }

  if (
    moduleName === "custody" ||
    type.includes("custody") ||
    type.includes("special_event") ||
    type.includes("travel_plan")
  ) {
    if (type.includes("deleted")) return "custodyDeleted";
    if (type.includes("updated") || type.includes("edited")) return "custodyEdited";
    return "custodyCreated";
  }

  if (moduleName === "meals" || type.includes("meal")) {
    return "mealPlanUpdated";
  }

  if (["lists", "groceries"].includes(moduleName) || type.includes("grocery") || type.includes("list")) {
    return "groceryItemAdded";
  }

  if (type.includes("child") || type.includes("care")) {
    return "childCareUpdated";
  }

  return "";
}

function activityActionUrl(activity = {}) {
  const moduleName = cleanText(activity.module);
  const entityId = cleanText(activity.entityId || activity.entity_id);

  if (moduleName === "tasks") return "/tasks";
  if (moduleName === "meals") return "/meals";
  if (["lists", "groceries"].includes(moduleName)) return "/lists";
  if (moduleName === "custody") return "/custody";
  if (moduleName === "calendar") {
    return entityId ? `/calendar?eventId=${encodeURIComponent(entityId)}` : "/calendar";
  }

  return "/profile?tab=notifications";
}

function actorMatchesRecipient(activity = {}, recipient = {}) {
  const actorIds = uniqueStrings([activity.actorId, activity.actor_id, activity.createdBy, activity.created_by]);
  const actorEmails = uniqueStrings([
    activity.actorEmail,
    activity.actor_email,
    activity.createdByEmail,
    activity.created_by_email,
  ]).map(normalizeEmail);

  return Boolean(
    (recipient.uid && actorIds.includes(recipient.uid)) ||
    (recipient.email && actorEmails.includes(normalizeEmail(recipient.email)))
  );
}

function activityRecipientEmails(activity = {}) {
  const metadata = mapOrEmpty(activity.metadata);
  const notify = mapOrEmpty(activity.notify || metadata.notify);

  return uniqueStrings([
    activity.recipientEmails,
    activity.recipient_emails,
    activity.targetRecipientEmails,
    activity.target_recipient_emails,
    activity.notifyRecipientEmails,
    activity.notify_recipient_emails,
    notify.recipients,
    notify.selectedRecipients,
    notify.selected_recipients,
    metadata.recipientEmails,
    metadata.recipient_emails,
    metadata.targetRecipientEmails,
    metadata.target_recipient_emails,
  ].flat()).map(normalizeEmail).filter(Boolean);
}

function activityRecipientUids(activity = {}) {
  const metadata = mapOrEmpty(activity.metadata);
  const notify = mapOrEmpty(activity.notify || metadata.notify);

  return uniqueStrings([
    activity.recipientUids,
    activity.recipient_uids,
    activity.targetRecipientUids,
    activity.target_recipient_uids,
    activity.notifyRecipientUids,
    activity.notify_recipient_uids,
    notify.recipientUids,
    notify.recipient_uids,
    metadata.recipientUids,
    metadata.recipient_uids,
    metadata.targetRecipientUids,
    metadata.target_recipient_uids,
  ].flat());
}

function applyActivityRecipientSelection(activity = {}, recipients = []) {
  const explicitEmails = activityRecipientEmails(activity);
  const explicitUids = activityRecipientUids(activity);

  if (!explicitEmails.length && !explicitUids.length) return recipients;

  const selected = new Map();
  recipients.forEach((recipient) => {
    const email = normalizeEmail(recipient.email);
    const uid = cleanText(recipient.uid);
    if ((email && explicitEmails.includes(email)) || (uid && explicitUids.includes(uid))) {
      selected.set(email || uid, recipient);
    }
  });

  return [...selected.values()];
}

async function findUserByEmail(env, email) {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) return null;

  for (const fieldPath of ["email", "notificationEmail", "notification_email"]) {
    const docs = await firestoreRunQuery(env, {
      from: [{ collectionId: "users" }],
      where: {
        fieldFilter: {
          field: { fieldPath },
          op: "EQUAL",
          value: { stringValue: cleanEmail },
        },
      },
      limit: 1,
    });
    if (docs[0]) return docs[0];
  }

  return null;
}

async function loadRecipientPreferences(env, recipient = {}) {
  const uid = cleanText(recipient.uid);
  const email = normalizeEmail(recipient.email);
  let userDoc = uid ? await firestoreGetDoc(env, "users", uid) : null;
  if (!userDoc && email) userDoc = await findUserByEmail(env, email);

  return mergeNotificationPreferences(userDoc?.notificationPreferences || userDoc?.notification_preferences || {});
}

function notificationRecord({ activity, recipient, preferenceKey, channels, now }) {
  const title = cleanText(activity.title, "Family update");
  const body = cleanText(activity.description, "Something changed in Kinely.");
  const activityId = cleanText(activity.id || activity.entityId || activity.entity_id || crypto.randomUUID());
  const recipientKey = normalizeEmail(recipient.email).replace(/[^a-z0-9]+/g, "_");
  const id = `activity_${activityId}_${recipientKey}`.slice(0, 140);

  return {
    id,
    kind: preferenceKey,
    title,
    body,
    recipientEmail: normalizeEmail(recipient.email),
    recipient_email: normalizeEmail(recipient.email),
    recipientUid: cleanText(recipient.uid),
    recipient_uid: cleanText(recipient.uid),
    familyId: cleanText(activity.householdFamilyId || activity.household_family_id || activity.familyId || activity.family_id),
    family_id: cleanText(activity.householdFamilyId || activity.household_family_id || activity.familyId || activity.family_id),
    custodyGroupId: cleanText(activity.custodyGroupId || activity.custody_group_id),
    custody_group_id: cleanText(activity.custodyGroupId || activity.custody_group_id),
    scopeType: cleanText(activity.custodyGroupId || activity.custody_group_id) ? "custody" : "family",
    scope_type: cleanText(activity.custodyGroupId || activity.custody_group_id) ? "custody" : "family",
    module: cleanText(activity.module, "notifications"),
    entityType: cleanText(activity.entityType || activity.entity_type),
    entity_type: cleanText(activity.entityType || activity.entity_type),
    entityId: cleanText(activity.entityId || activity.entity_id),
    entity_id: cleanText(activity.entityId || activity.entity_id),
    actionUrl: activityActionUrl(activity),
    action_url: activityActionUrl(activity),
    status: "unread",
    read: false,
    readBy: [],
    read_by: [],
    channels,
    createdBy: cleanText(activity.createdBy || activity.created_by || activity.actorId || activity.actor_id),
    created_by: cleanText(activity.createdBy || activity.created_by || activity.actorId || activity.actor_id),
    createdByEmail: normalizeEmail(activity.createdByEmail || activity.created_by_email || activity.actorEmail || activity.actor_email),
    created_by_email: normalizeEmail(activity.createdByEmail || activity.created_by_email || activity.actorEmail || activity.actor_email),
    metadata: {
      ...mapOrEmpty(activity.metadata),
      activityId,
      preferenceKey,
    },
    createdAt: now,
    created_at: now,
    updatedAt: now,
    updated_at: now,
  };
}

function activityEmail(env, notification = {}) {
  const base = cleanText(env.APP_PUBLIC_URL, "https://kinely.net").replace(/\/+$/g, "");
  const actionUrl = new URL(cleanText(notification.actionUrl || notification.action_url, "/profile?tab=notifications"), base).toString();
  const text = [
    notification.title,
    notification.body,
    `Open in Kinely: ${actionUrl}`,
  ].filter(Boolean).join("\n\n");

  return {
    id: notification.id,
    kind: notification.kind,
    to: [notification.recipientEmail || notification.recipient_email],
    subject: notification.title,
    text,
    html: `
      <div style="font-family: Inter, Arial, sans-serif; color: #0f172a; line-height: 1.6; max-width: 620px;">
        <p style="font-size: 12px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #4f46e5; margin: 0 0 8px;">Kinely</p>
        <h1 style="font-size: 22px; margin: 0 0 12px;">${escapeHtml(notification.title)}</h1>
        <p style="font-size: 15px; margin: 0 0 18px;">${escapeHtml(notification.body)}</p>
        <p style="margin: 0 0 22px;">
          <a href="${escapeHtml(actionUrl)}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 14px; padding: 12px 18px; font-weight: 700;">
            Open Kinely
          </a>
        </p>
        <p style="font-size: 12px; color: #64748b; word-break: break-all; margin: 0;">${escapeHtml(actionUrl)}</p>
      </div>
    `.trim(),
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
    await recordEmailDelivery(env, mail, body, "failed", `Resend delivery failed (${response.status})`);
    throw new Error(`Resend delivery failed (${response.status}): ${JSON.stringify(body).slice(0, 800)}`);
  }

  const matchedEmail = extractProviderMessageId(body) ? null : await findRecentResendEmail(env, mail);
  if (matchedEmail) {
    body.matchedEmail = matchedEmail;
    body.matched_email = matchedEmail;
  }

  const delivery = await recordEmailDelivery(env, mail, body, "accepted");
  return {
    ...body,
    ...delivery,
  };
}

async function retrieveResendEmail(env, providerMessageId = "") {
  const apiKey = cleanText(env.RESEND_API_KEY);
  const emailId = cleanText(providerMessageId);
  if (!apiKey || !emailId) return null;

  const response = await fetch(`${RESEND_ENDPOINT}/${encodeURIComponent(emailId)}`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
  });

  const bodyText = await response.text();
  let body = {};
  try {
    body = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    body = { raw: bodyText };
  }

  if (!response.ok) {
    throw new Error(`Resend status lookup failed (${response.status}): ${JSON.stringify(body).slice(0, 800)}`);
  }

  return body;
}

async function enrichResendDeliveryStatus(env, providerResult = {}) {
  const providerMessageId = extractProviderMessageId(providerResult);
  if (!providerMessageId) {
    return {
      providerMessageId: "",
      lastEvent: "",
      lookupError: "Resend did not return an email id.",
      providerResponseShape: providerResponseShape(providerResult),
    };
  }

  try {
    const status = await retrieveResendEmail(env, providerMessageId);
    const lastEvent = cleanText(status?.last_event || status?.lastEvent || "accepted");
    await firestoreCommit(env, [
      firestoreMergeWrite(env, EMAIL_DELIVERIES_COLLECTION, emailDeliveryDocId(providerMessageId), {
        provider: "resend",
        providerMessageId,
        provider_message_id: providerMessageId,
        status: lastEvent || "accepted",
        lastEvent: lastEvent || "accepted",
        last_event: lastEvent || "accepted",
        providerStatus: status && typeof status === "object" ? status : {},
        provider_status: status && typeof status === "object" ? status : {},
        updatedAt: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    ]).catch((error) => {
      console.warn("Could not record Resend status lookup.", error);
    });

    return {
      providerMessageId,
      lastEvent,
      providerStatus: status,
    };
  } catch (error) {
    return {
      providerMessageId,
      lastEvent: "accepted",
      lookupError: error?.message || "Could not retrieve Resend delivery status.",
    };
  }
}

async function handleCustodyInvitationSend(request, env, origin) {
  const token = await verifyFirebaseToken(request, env);
  const payload = await request.json();
  const invitation = normalizeCustodyInvitation(payload.invitation || payload, token);
  const group = await firestoreGetDoc(env, "custodyGroups", invitation.groupId);
  if (!group) throw new Error("Custody group was not found.");
  if (!canManageCustodyGroup(group, token)) {
    return json({ ok: false, error: "Only a custody group owner or admin can send this invitation." }, { status: 403 }, origin);
  }

  const now = new Date().toISOString();
  const nextGroupUpdate = pendingCustodyUpdate(group, invitation, now);
  await firestoreCommit(env, [
    firestoreMergeWrite(env, "custodyInvitations", invitation.id, invitation),
    firestoreMergeWrite(env, "custodyGroups", invitation.groupId, nextGroupUpdate),
  ]);

  const providerResult = await sendWithResend(env, buildCustodyInvitationEmail(env, {
    invitation,
    group: {
      ...group,
      ...nextGroupUpdate,
    },
    inviterName: payload.inviterName || payload.inviter_name || token.name || token.email || "Custody admin",
  }));

  return json({
    ok: true,
    invitationId: invitation.id,
    provider: "resend",
    providerMessageId: extractProviderMessageId(providerResult),
  }, { status: 200 }, origin);
}

async function handleFamilyInvitationSend(request, env, origin) {
  const token = await verifyFirebaseToken(request, env);
  const payload = await request.json();
  const invitation = normalizeFamilyInvitation(payload.invitation || payload, token);
  const family = await firestoreGetDoc(env, "families", invitation.familyId);
  if (!family) throw new Error("Family space was not found.");
  if (!canManageFamily(family, token)) {
    return json({ ok: false, error: "Only a family owner or admin can send this invitation." }, { status: 403 }, origin);
  }

  const now = new Date().toISOString();
  const nextFamilyUpdate = pendingFamilyUpdate(family, invitation, now);
  await firestoreCommit(env, [
    firestoreMergeWrite(env, "familyInvitations", invitation.id, invitation),
    firestoreMergeWrite(env, "families", invitation.familyId, nextFamilyUpdate),
  ]);

  const providerResult = await sendWithResend(env, buildFamilyInvitationEmail(env, {
    invitation,
    family: {
      ...family,
      ...nextFamilyUpdate,
    },
    inviterName: payload.inviterName || payload.inviter_name || token.name || token.email || "Family admin",
  }));

  return json({
    ok: true,
    invitationId: invitation.id,
    provider: "resend",
    providerMessageId: extractProviderMessageId(providerResult),
  }, { status: 200 }, origin);
}

function sanitizeFamilyUpdates(updates = {}, token = {}) {
  const blockedFields = new Set([
    "id",
    "createdAt",
    "created_at",
    "createdBy",
    "created_by",
    "createdByEmail",
    "created_by_email",
    "ownerId",
    "owner_id",
    "ownerUid",
    "owner_uid",
    "ownerEmail",
    "owner_email",
  ]);
  const sanitized = {};

  Object.entries(mapOrEmpty(updates)).forEach(([key, value]) => {
    if (blockedFields.has(key) || value === undefined) return;
    if (key === "updatedAt" || key === "updated_at") return;
    sanitized[key] = value;
  });

  const now = new Date().toISOString();
  return {
    ...sanitized,
    updatedAt: now,
    updated_at: now,
    updatedBy: cleanText(token.sub),
    updated_by: cleanText(token.sub),
    updatedByEmail: normalizeEmail(token.email),
    updated_by_email: normalizeEmail(token.email),
  };
}

async function handleFamilyUpdate(request, env, origin) {
  const token = await verifyFirebaseToken(request, env);
  const payload = await request.json();
  const familyId = cleanText(payload.familyId || payload.family_id);
  if (!familyId) throw new Error("Family update requires familyId.");

  const family = await firestoreGetDoc(env, "families", familyId);
  if (!family) throw new Error("Family space was not found.");
  if (!canManageFamily(family, token)) {
    return json({ ok: false, error: "Only a family owner or admin can update this family space." }, { status: 403 }, origin);
  }

  const rawUpdates = payload.updates || payload.data || {};
  if (!isFamilyOwner(family, token) && nonOwnerChangesFamilyAdminState(family, rawUpdates)) {
    return json({
      ok: false,
      error: "Only the family owner can grant, remove, or modify admin access.",
    }, { status: 403 }, origin);
  }

  const updates = sanitizeFamilyUpdates(rawUpdates, token);
  const writes = [
    firestoreMergeWrite(env, "families", familyId, updates),
  ];

  if (Array.isArray(updates.members)) {
    writes.push(...await familyMemberSyncWrites(env, familyId, updates.members, token, updates.updatedAt));
  }

  await firestoreCommit(env, writes);

  return json({
    ok: true,
    familyId,
    updatedFieldCount: Object.keys(updates).length,
    materializedMemberCount: Array.isArray(updates.members) ? updates.members.length : 0,
  }, { status: 200 }, origin);
}

async function handleFamilyDelete(request, env, origin) {
  const token = await verifyFirebaseToken(request, env);
  const payload = await request.json();
  const familyId = cleanText(payload.familyId || payload.family_id);
  if (!familyId) throw new Error("Family delete requires familyId.");

  const family = await firestoreGetDoc(env, "families", familyId);
  if (!family) throw new Error("Family space was not found.");
  if (!canDeleteFamily(family, token)) {
    return json({ ok: false, error: "Only the family owner can delete this family space." }, { status: 403 }, origin);
  }

  const writesByName = new Map();
  const cascade = await collectFamilyCascadeDeletes(env, familyId, writesByName);
  const userId = cleanText(token.sub);
  const user = userId ? await firestoreGetDoc(env, "users", userId) : null;
  const userWrites = [];
  const now = new Date().toISOString();

  if (user && userId) {
    const familyIds = mergeIdList(user.familyIds, user.family_ids).filter((id) => id !== familyId);
    const userUpdate = {
      familyIds,
      family_ids: familyIds,
      updatedAt: now,
      updated_at: now,
    };

    if (cleanText(user.familyId || user.family_id) === familyId) {
      const nextFamilyId = familyIds[0] || "";
      userUpdate.familyId = nextFamilyId;
      userUpdate.family_id = nextFamilyId;
    }

    userWrites.push(firestoreMergeWrite(env, "users", userId, userUpdate));
  }

  const deleteWrites = [...writesByName.values()];
  const committed = await firestoreCommitInChunks(env, [...deleteWrites, ...userWrites]);

  return json({
    ok: true,
    familyId,
    deletedRecords: deleteWrites.length,
    deletedCustodyGroups: cascade.deletedCustodyGroups,
    updatedUser: Boolean(userWrites.length),
    committedWrites: committed,
  }, { status: 200 }, origin);
}

function sanitizeCustodyGroupPayload(raw = {}, { existingGroup = null, token = {}, groupId = "", familyId = "", now = "" } = {}) {
  const blockedFields = new Set([
    "id",
    "createdAt",
    "created_at",
    "createdBy",
    "created_by",
    "createdByEmail",
    "created_by_email",
    "ownerId",
    "owner_id",
    "ownerEmail",
    "owner_email",
    "updatedAt",
    "updated_at",
  ]);
  const sanitized = {};

  Object.entries(mapOrEmpty(raw)).forEach(([key, value]) => {
    if (blockedFields.has(key) || value === undefined) return;
    sanitized[key] = value;
  });

  const ownerId = cleanText(existingGroup?.ownerId || existingGroup?.owner_id || token.sub);
  const ownerEmail = normalizeEmail(existingGroup?.ownerEmail || existingGroup?.owner_email || token.email);
  const createdBy = cleanText(existingGroup?.createdBy || existingGroup?.created_by || token.sub);
  const createdByEmail = normalizeEmail(existingGroup?.createdByEmail || existingGroup?.created_by_email || token.email);
  const adminIds = mergeIdList(sanitized.adminIds, sanitized.admin_ids, existingGroup?.adminIds, existingGroup?.admin_ids, ownerId, token.sub);
  const adminEmails = mergeIdList(sanitized.adminEmails, sanitized.admin_emails, existingGroup?.adminEmails, existingGroup?.admin_emails, ownerEmail, token.email)
    .map(normalizeEmail);

  return {
    ...sanitized,
    custodyGroupId: groupId,
    custody_group_id: groupId,
    familyId: cleanText(sanitized.familyId || sanitized.family_id || existingGroup?.familyId || existingGroup?.family_id || familyId),
    family_id: cleanText(sanitized.familyId || sanitized.family_id || existingGroup?.familyId || existingGroup?.family_id || familyId),
    householdFamilyId: cleanText(sanitized.householdFamilyId || sanitized.household_family_id || existingGroup?.householdFamilyId || existingGroup?.household_family_id || familyId),
    household_family_id: cleanText(sanitized.householdFamilyId || sanitized.household_family_id || existingGroup?.householdFamilyId || existingGroup?.household_family_id || familyId),
    ownerId,
    owner_id: ownerId,
    ownerEmail,
    owner_email: ownerEmail,
    adminIds,
    admin_ids: adminIds,
    adminEmails,
    admin_emails: adminEmails,
    createdBy,
    created_by: createdBy,
    createdByEmail,
    created_by_email: createdByEmail,
    createdAt: existingGroup?.createdAt || existingGroup?.created_at || now,
    created_at: existingGroup?.created_at || existingGroup?.createdAt || now,
    updatedAt: now,
    updated_at: now,
    updatedBy: cleanText(token.sub),
    updated_by: cleanText(token.sub),
    updatedByEmail: normalizeEmail(token.email),
    updated_by_email: normalizeEmail(token.email),
  };
}

function normalizeChildLinkIds(payload = {}, childIds = []) {
  return mergeIdList(
    childIds,
    payload.childIds,
    payload.child_ids,
    listOrEmpty(payload.children).map((child) => child?.id || child?.childId || child?.child_id)
  );
}

async function handleCustodyGroupSave(request, env, origin) {
  const token = await verifyFirebaseToken(request, env);
  const payload = await request.json();
  const rawGroup = mapOrEmpty(payload.group || payload.payload || payload.data);
  const requestedGroupId = cleanText(payload.groupId || payload.group_id || rawGroup.custodyGroupId || rawGroup.custody_group_id || rawGroup.id || crypto.randomUUID());
  const familyId = cleanText(payload.familyId || payload.family_id || rawGroup.householdFamilyId || rawGroup.household_family_id || rawGroup.familyId || rawGroup.family_id);
  if (!requestedGroupId) throw new Error("Custody group save requires groupId.");
  if (!familyId) throw new Error("Custody group save requires familyId.");

  const existingGroup = await firestoreGetDoc(env, "custodyGroups", requestedGroupId);
  if (existingGroup) {
    if (!canManageCustodyGroup(existingGroup, token)) {
      return json({ ok: false, error: "Only a custody group owner or admin can update this group." }, { status: 403 }, origin);
    }
  } else {
    const family = await firestoreGetDoc(env, "families", familyId);
    if (!family) throw new Error("Family space was not found.");
    if (!canManageFamily(family, token)) {
      return json({ ok: false, error: "Only a family owner or admin can create a custody group." }, { status: 403 }, origin);
    }
  }

  const now = new Date().toISOString();
  let group = sanitizeCustodyGroupPayload(rawGroup, {
    existingGroup,
    token,
    groupId: requestedGroupId,
    familyId,
    now,
  });
  const invitations = listOrEmpty(payload.invitations)
    .map((invite) => normalizeCustodyInvitation({ ...invite, groupId: requestedGroupId }, token))
    .filter((invite) => invite.recipientEmail);

  invitations.forEach((invite) => {
    group = {
      ...group,
      ...pendingCustodyUpdate(group, invite, now),
    };
  });

  const writes = [
    firestoreMergeWrite(env, "custodyGroups", requestedGroupId, group),
    ...invitations.map((invite) => firestoreMergeWrite(env, "custodyInvitations", invite.id, invite)),
  ];

  const family = await firestoreGetDoc(env, "families", familyId);
  if (family) {
    const custodyGroupIds = mergeIdList(family.custodyGroupIds, family.custody_group_ids, requestedGroupId);
    writes.push(firestoreMergeWrite(env, "families", familyId, {
      custodyGroupIds,
      custody_group_ids: custodyGroupIds,
      updatedAt: now,
      updated_at: now,
    }));
  }

  const childIds = normalizeChildLinkIds(group, payload.childIds || payload.child_ids || []);
  for (const childId of childIds) {
    const child = await firestoreGetDoc(env, "children", childId);
    const custodyGroupIds = mergeIdList(child?.custodyGroupIds, child?.custody_group_ids, requestedGroupId);
    writes.push(firestoreMergeWrite(env, "children", childId, {
      custodyGroupIds,
      custody_group_ids: custodyGroupIds,
      updatedAt: now,
      updated_at: now,
    }));
  }

  await firestoreCommit(env, writes);

  return json({
    ok: true,
    groupId: requestedGroupId,
    invitationIds: invitations.map((invite) => invite.id),
    linkedChildCount: childIds.length,
  }, { status: 200 }, origin);
}

async function handleCustodyGroupDelete(request, env, origin) {
  const token = await verifyFirebaseToken(request, env);
  const payload = await request.json();
  const groupId = cleanText(payload.groupId || payload.group_id || payload.custodyGroupId || payload.custody_group_id);
  if (!groupId) throw new Error("Custody group delete requires groupId.");

  const group = await firestoreGetDoc(env, "custodyGroups", groupId);
  if (!group) throw new Error("Custody group was not found.");
  if (!canManageCustodyGroup(group, token)) {
    return json({ ok: false, error: "Only a custody group owner or admin can delete this group." }, { status: 403 }, origin);
  }

  const writesByName = new Map();
  await collectCustodyCascadeDeletes(env, groupId, writesByName);
  addDeleteWrite(writesByName, env, "custodyGroups", groupId);

  const referenceWrites = await custodyGroupReferenceUpdateWrites(env, groupId, group);
  const deleteWrites = [...writesByName.values()];
  const committed = await firestoreCommitInChunks(env, [...referenceWrites, ...deleteWrites]);

  return json({
    ok: true,
    groupId,
    deletedRecords: deleteWrites.length,
    updatedReferences: referenceWrites.length,
    committedWrites: committed,
  }, { status: 200 }, origin);
}

function normalizeDateKey(value) {
  const text = cleanText(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

async function assertCustodyDayWriteAccess(env, { familyId = "", custodyGroupId = "", moduleName = "custody" } = {}, token = {}) {
  const normalizedModule = cleanText(moduleName, "custody");
  const groupId = cleanText(custodyGroupId);
  const group = groupId ? await firestoreGetDoc(env, "custodyGroups", groupId) : null;

  if (group) {
    const canWrite = normalizedModule === "budget"
      ? canWriteCustodyBudgetGroup(group, token)
      : canWriteCustodyGroup(group, token);

    if (!canWrite) {
      return { forbidden: true, error: `You do not have write access to this custody ${normalizedModule}.` };
    }

    return {
      forbidden: false,
      familyId: cleanText(group.familyId || group.family_id || group.householdFamilyId || group.household_family_id || familyId),
      custodyGroupId: groupId,
      custodyGroupName: cleanText(group.name || group.groupName || group.group_name),
    };
  }

  const householdFamilyId = cleanText(familyId || groupId);
  const family = householdFamilyId ? await firestoreGetDoc(env, "families", householdFamilyId) : null;

  if (!family) {
    return { forbidden: true, error: "Custody scope was not found." };
  }

  if (!canWriteFamilyModule(family, token, normalizedModule)) {
    return { forbidden: true, error: `You do not have permission to edit ${normalizedModule} for this family space.` };
  }

  return {
    forbidden: false,
    familyId: householdFamilyId,
    custodyGroupId: groupId || householdFamilyId,
    custodyGroupName: "",
  };
}

function normalizeCustodyDayForWrite(raw = {}, { familyId = "", custodyGroupId = "", custodyGroupName = "", token = {}, now = "" } = {}) {
  const date = normalizeDateKey(raw.date);
  if (!date) throw new Error("Custody day requires a YYYY-MM-DD date.");

  const scopeId = cleanText(raw.custodyGroupId || raw.custody_group_id || custodyGroupId || familyId);
  if (!scopeId) throw new Error("Custody day requires a custody scope.");

  const isSplit = raw.is_split === true || raw.isSplit === true;
  const withWhom = isSplit ? null : cleanText(raw.with_whom || raw.withWhom) || null;
  const morning = isSplit ? cleanText(raw.morning) || null : null;
  const afternoon = isSplit ? cleanText(raw.afternoon) || null : null;
  const householdFamilyId = cleanText(raw.householdFamilyId || raw.household_family_id || familyId);
  const docId = cleanText(raw.id, `${scopeId}_${date}`);
  const createdAt = typeof raw.createdAt === "string"
    ? raw.createdAt
    : typeof raw.created_at === "string"
      ? raw.created_at
      : now;

  return {
    ...raw,
    id: docId,
    date,
    is_split: isSplit,
    isSplit,
    with_whom: withWhom,
    withWhom,
    morning,
    afternoon,
    notes: cleanText(raw.notes),
    familyId: householdFamilyId || familyId || scopeId,
    family_id: householdFamilyId || familyId || scopeId,
    custodyGroupId: scopeId,
    custody_group_id: scopeId,
    householdFamilyId,
    household_family_id: householdFamilyId,
    custodyGroupName: cleanText(raw.custodyGroupName || raw.custody_group_name || custodyGroupName),
    custody_group_name: cleanText(raw.custodyGroupName || raw.custody_group_name || custodyGroupName),
    module: "custody",
    visibility: "custody",
    userId: cleanText(raw.userId || raw.user_id || token.sub),
    user_id: cleanText(raw.userId || raw.user_id || token.sub),
    createdBy: cleanText(raw.createdBy || raw.created_by || token.sub),
    created_by: cleanText(raw.createdBy || raw.created_by || token.sub),
    createdByEmail: normalizeEmail(raw.createdByEmail || raw.created_by_email || token.email),
    created_by_email: normalizeEmail(raw.createdByEmail || raw.created_by_email || token.email),
    createdAt,
    created_at: createdAt,
    updatedBy: cleanText(token.sub),
    updated_by: cleanText(token.sub),
    updatedByEmail: normalizeEmail(token.email),
    updated_by_email: normalizeEmail(token.email),
    updatedAt: now,
    updated_at: now,
  };
}

async function handleCustodyDaysSave(request, env, origin) {
  const token = await verifyFirebaseToken(request, env);
  const payload = await request.json();
  const rawDays = Array.isArray(payload.days)
    ? payload.days
    : [payload.day || payload.data || payload].filter(Boolean);

  if (!rawDays.length) throw new Error("Custody day save requires at least one day.");

  const firstDay = mapOrEmpty(rawDays[0]);
  const requestedFamilyId = cleanText(payload.familyId || payload.family_id || firstDay.familyId || firstDay.family_id || firstDay.householdFamilyId || firstDay.household_family_id);
  const requestedGroupId = cleanText(payload.custodyGroupId || payload.custody_group_id || firstDay.custodyGroupId || firstDay.custody_group_id || requestedFamilyId);
  const scope = await assertCustodyDayWriteAccess(env, {
    familyId: requestedFamilyId,
    custodyGroupId: requestedGroupId,
  }, token);

  if (scope.forbidden) {
    return json({ ok: false, error: scope.error }, { status: 403 }, origin);
  }

  const now = new Date().toISOString();
  const days = rawDays.map((day) => normalizeCustodyDayForWrite(mapOrEmpty(day), {
    familyId: scope.familyId || requestedFamilyId,
    custodyGroupId: scope.custodyGroupId || requestedGroupId,
    custodyGroupName: scope.custodyGroupName,
    token,
    now,
  }));
  const writes = days.map((day) => firestoreMergeWrite(env, "custodyDays", day.id, day));
  const committed = await firestoreCommitInChunks(env, writes);

  return json({
    ok: true,
    savedCount: days.length,
    committedWrites: committed,
    days,
  }, { status: 200 }, origin);
}

async function handleCustodyDayDelete(request, env, origin) {
  const token = await verifyFirebaseToken(request, env);
  const payload = await request.json();
  const date = normalizeDateKey(payload.date);
  const familyId = cleanText(payload.familyId || payload.family_id || payload.householdFamilyId || payload.household_family_id);
  const custodyGroupId = cleanText(payload.custodyGroupId || payload.custody_group_id || payload.scopeId || payload.scope_id || familyId);

  if (!date) throw new Error("Custody day delete requires a YYYY-MM-DD date.");
  if (!custodyGroupId && !familyId) throw new Error("Custody day delete requires a custody scope.");

  const scope = await assertCustodyDayWriteAccess(env, { familyId, custodyGroupId }, token);
  if (scope.forbidden) {
    return json({ ok: false, error: scope.error }, { status: 403 }, origin);
  }

  const scopeId = cleanText(scope.custodyGroupId || custodyGroupId || familyId);
  const docIds = uniqueStrings([
    payload.docId,
    payload.doc_id,
    `${scopeId}_${date}`,
    `${cleanText(token.sub)}_${date}`,
  ]);
  const writesByName = new Map();
  docIds.forEach((docId) => addDeleteWrite(writesByName, env, "custodyDays", docId));
  const writes = [...writesByName.values()];
  const committed = await firestoreCommitInChunks(env, writes);

  return json({
    ok: true,
    date,
    deletedRecords: writes.length,
    committedWrites: committed,
    deletedDocIds: docIds,
  }, { status: 200 }, origin);
}

function allowedCustodyScopedRecordCollection(collectionName = "") {
  const cleanCollectionName = cleanText(collectionName);
  if (CUSTODY_SCOPED_RECORD_COLLECTIONS.has(cleanCollectionName)) return cleanCollectionName;
  throw new Error("Unsupported custody record collection.");
}

function normalizeCustodyScopedRecordForWrite(collectionName = "", raw = {}, { existingRecord = null, scope = {}, token = {}, now = "" } = {}) {
  const record = mapOrEmpty(raw);
  const scopeId = cleanText(
    record.custodyGroupId ||
    record.custody_group_id ||
    scope.custodyGroupId ||
    record.familyId ||
    record.family_id
  );
  const householdFamilyId = cleanText(
    record.householdFamilyId ||
    record.household_family_id ||
    record.familyId ||
    record.family_id ||
    scope.familyId ||
    scopeId
  );
  const collection = allowedCustodyScopedRecordCollection(collectionName);
  const createdBy = cleanText(existingRecord?.createdBy || existingRecord?.created_by || record.createdBy || record.created_by || token.sub);
  const createdByEmail = normalizeEmail(existingRecord?.createdByEmail || existingRecord?.created_by_email || record.createdByEmail || record.created_by_email || token.email);
  const createdAt = cleanText(existingRecord?.createdAt || existingRecord?.created_at || record.createdAt || record.created_at || now);
  const id = cleanText(record.id || record.recordId || record.record_id || crypto.randomUUID());

  if (!scopeId) throw new Error("Custody record requires a custody scope.");

  const base = {
    ...record,
    id,
    familyId: householdFamilyId,
    family_id: householdFamilyId,
    custodyGroupId: scopeId,
    custody_group_id: scopeId,
    householdFamilyId,
    household_family_id: householdFamilyId,
    custodyGroupName: cleanText(record.custodyGroupName || record.custody_group_name || scope.custodyGroupName),
    custody_group_name: cleanText(record.custodyGroupName || record.custody_group_name || scope.custodyGroupName),
    module: "custody",
    visibility: "custody",
    userId: cleanText(record.userId || record.user_id || token.sub),
    user_id: cleanText(record.userId || record.user_id || token.sub),
    createdBy,
    created_by: createdBy,
    createdByEmail,
    created_by_email: createdByEmail,
    createdAt,
    created_at: createdAt,
    updatedBy: cleanText(token.sub),
    updated_by: cleanText(token.sub),
    updatedByEmail: normalizeEmail(token.email),
    updated_by_email: normalizeEmail(token.email),
    updatedAt: now,
    updated_at: now,
  };

  if (collection === "custodySpecialEvents") {
    const date = normalizeDateKey(record.date);
    if (!date) throw new Error("Custody special event requires a YYYY-MM-DD date.");

    return {
      ...base,
      id,
      date,
      title: cleanText(record.title, "Special event"),
      category: cleanText(record.category, "other"),
      startTime: cleanText(record.startTime || record.start_time),
      start_time: cleanText(record.start_time || record.startTime),
      endTime: cleanText(record.endTime || record.end_time),
      end_time: cleanText(record.end_time || record.endTime),
      location: cleanText(record.location),
      notes: cleanText(record.notes),
    };
  }

  if (collection === "custodyExchanges") {
    const date = normalizeDateKey(record.date);
    if (!date) throw new Error("Custody exchange requires a YYYY-MM-DD date.");

    const fromParent = cleanText(record.fromParent || record.from_parent, "dad");
    const toParent = cleanText(record.toParent || record.to_parent, "mom");
    const pickupBy = cleanText(record.pickupBy || record.pickup_by || toParent, toParent);
    const order = Number.isFinite(Number(record.order)) ? Number(record.order) : 999;

    return {
      ...base,
      id,
      date,
      time: cleanText(record.time, "18:00"),
      location: cleanText(record.location, "Daycare pickup"),
      fromParent,
      from_parent: fromParent,
      toParent,
      to_parent: toParent,
      pickupBy,
      pickup_by: pickupBy,
      notes: cleanText(record.notes),
      status: cleanText(record.status, "pending"),
      source: cleanText(record.source, "manual"),
      order,
    };
  }

  if (collection === "custodyPackingItems") {
    const owner = cleanText(record.owner || record.assignedTo || record.assigned_to, "Shared");
    const order = Number.isFinite(Number(record.order)) ? Number(record.order) : 999;

    return {
      ...base,
      id,
      name: cleanText(record.name, "Packing item"),
      category: cleanText(record.category, "General"),
      owner,
      assignedTo: owner,
      assigned_to: owner,
      status: cleanText(record.status, "review"),
      important: booleanValue(record.important),
      templateId: cleanText(record.templateId || record.template_id),
      template_id: cleanText(record.template_id || record.templateId),
      order,
    };
  }

  if (collection === "custodyPackingTemplates") {
    const items = listOrEmpty(record.items)
      .map((item) => {
        const itemMap = mapOrEmpty(item);
        const name = cleanText(itemMap.name);
        if (!name) return null;

        const owner = cleanText(itemMap.owner || itemMap.assignedTo || itemMap.assigned_to, "Shared");
        return {
          name,
          category: cleanText(itemMap.category, "General"),
          owner,
          assignedTo: owner,
          assigned_to: owner,
          status: cleanText(itemMap.status, "review"),
          important: booleanValue(itemMap.important),
        };
      })
      .filter(Boolean);
    const order = Number.isFinite(Number(record.order)) ? Number(record.order) : 999;

    return {
      ...base,
      id,
      label: cleanText(record.label, "Custom list"),
      description: cleanText(record.description, "Reusable packing list."),
      tone: cleanText(record.tone, "blue"),
      items,
      itemCount: items.length,
      item_count: items.length,
      isCustom: true,
      is_custom: true,
      system: false,
      order,
    };
  }

  if (collection === "custodyExpenses") {
    const amount = moneyValue(record.amount);
    const parent1ShareAmount = moneyValue(record.parent1ShareAmount ?? record.parent1_share_amount);
    const parent2ShareAmount = moneyValue(record.parent2ShareAmount ?? record.parent2_share_amount);
    const parent1PaidAmount = moneyValue(record.parent1PaidAmount ?? record.parent1_paid_amount);
    const parent2PaidAmount = moneyValue(record.parent2PaidAmount ?? record.parent2_paid_amount);
    const splitType = cleanText(record.splitType || record.split_type || record.split, "50/50");
    const reviewFlag = booleanValue(record.reviewFlag ?? record.review_flag);
    const order = Number.isFinite(Number(record.order)) ? Number(record.order) : 999;
    const payments = listOrEmpty(record.payments)
      .map((payment) => {
        const paymentMap = mapOrEmpty(payment);
        const paymentId = cleanText(paymentMap.id || paymentMap.paymentId || paymentMap.payment_id || crypto.randomUUID());
        const paymentCreatedBy = cleanText(paymentMap.createdBy || paymentMap.created_by || token.sub);
        const paymentCreatedByEmail = normalizeEmail(paymentMap.createdByEmail || paymentMap.created_by_email || token.email);
        const paymentCreatedAt = cleanText(paymentMap.createdAt || paymentMap.created_at || now);
        const reversesPaymentId = cleanText(paymentMap.reversesPaymentId || paymentMap.reverses_payment_id);

        return {
          ...paymentMap,
          id: paymentId,
          paymentId,
          payment_id: paymentId,
          type: cleanText(paymentMap.type, "payment"),
          parent: cleanText(paymentMap.parent),
          amount: moneyValue(paymentMap.amount),
          note: cleanText(paymentMap.note),
          reversesPaymentId,
          reverses_payment_id: reversesPaymentId,
          createdBy: paymentCreatedBy,
          created_by: paymentCreatedBy,
          createdByEmail: paymentCreatedByEmail,
          created_by_email: paymentCreatedByEmail,
          createdAt: paymentCreatedAt,
          created_at: paymentCreatedAt,
        };
      });

    return {
      ...base,
      id,
      module: "budget",
      visibility: "custody_budget",
      title: cleanText(record.title, "Expense"),
      category: cleanText(record.category, "General"),
      amount,
      splitType,
      split_type: splitType,
      split: cleanText(record.split || splitType, splitType),
      parent1ShareAmount,
      parent1_share_amount: parent1ShareAmount,
      parent2ShareAmount,
      parent2_share_amount: parent2ShareAmount,
      parent1PaidAmount,
      parent1_paid_amount: parent1PaidAmount,
      parent2PaidAmount,
      parent2_paid_amount: parent2PaidAmount,
      paidBy: cleanText(record.paidBy || record.paid_by, "Shared"),
      paid_by: cleanText(record.paid_by || record.paidBy, "Shared"),
      due: cleanText(record.due),
      dueDate: cleanText(record.dueDate || record.due_date),
      due_date: cleanText(record.due_date || record.dueDate),
      dueDayOfMonth: cleanText(record.dueDayOfMonth || record.due_day_of_month),
      due_day_of_month: cleanText(record.due_day_of_month || record.dueDayOfMonth),
      recurring: booleanValue(record.recurring),
      payments,
      reviewFlag,
      review_flag: reviewFlag,
      reviewNote: cleanText(record.reviewNote || record.review_note),
      review_note: cleanText(record.review_note || record.reviewNote),
      status: cleanText(record.status, reviewFlag ? "review" : "open"),
      order,
    };
  }

  const startDate = normalizeDateKey(record.startDate || record.start_date);
  const endDate = normalizeDateKey(record.endDate || record.end_date || startDate);
  if (!startDate || !endDate) throw new Error("Custody travel plan requires start and end dates.");

  const travelingParent = cleanText(record.travelingParent || record.traveling_parent);
  const travelStatus = cleanText(record.travelStatus || record.travel_status || record.status, "approved");
  const affectsCustody = record.affectsCustody ?? record.affects_custody ?? true;

  return {
    ...base,
    id,
    title: cleanText(record.title, "Travel / vacation"),
    destination: cleanText(record.destination),
    startDate,
    start_date: startDate,
    endDate,
    end_date: endDate,
    travelingParent,
    traveling_parent: travelingParent,
    travelStatus,
    travel_status: travelStatus,
    status: travelStatus,
    affectsCustody: affectsCustody !== false,
    affects_custody: affectsCustody !== false,
    notes: cleanText(record.notes),
  };
}

async function handleCustodyScopedRecordSave(request, env, origin) {
  const token = await verifyFirebaseToken(request, env);
  const payload = await request.json();
  const collectionName = allowedCustodyScopedRecordCollection(payload.collection || payload.collectionName || payload.collection_name);
  const rawRecord = mapOrEmpty(payload.record || payload.data || payload.payload);
  const requestedRecordId = cleanText(payload.recordId || payload.record_id || rawRecord.id);
  const existingRecord = requestedRecordId ? await firestoreGetDoc(env, collectionName, requestedRecordId) : null;
  const requestedFamilyId = cleanText(
    existingRecord?.familyId ||
    existingRecord?.family_id ||
    existingRecord?.householdFamilyId ||
    existingRecord?.household_family_id ||
    payload.familyId ||
    payload.family_id ||
    rawRecord.familyId ||
    rawRecord.family_id ||
    rawRecord.householdFamilyId ||
    rawRecord.household_family_id
  );
  const requestedGroupId = cleanText(
    existingRecord?.custodyGroupId ||
    existingRecord?.custody_group_id ||
    payload.custodyGroupId ||
    payload.custody_group_id ||
    rawRecord.custodyGroupId ||
    rawRecord.custody_group_id ||
    requestedFamilyId
  );
  const moduleName = collectionName === "custodyExpenses" ? "budget" : "custody";

  const scope = await assertCustodyDayWriteAccess(env, {
    familyId: requestedFamilyId,
    custodyGroupId: requestedGroupId,
    moduleName,
  }, token);

  if (scope.forbidden) {
    return json({ ok: false, error: scope.error }, { status: 403 }, origin);
  }

  const now = new Date().toISOString();
  const record = normalizeCustodyScopedRecordForWrite(collectionName, rawRecord, {
    existingRecord,
    scope,
    token,
    now,
  });

  const committed = await firestoreCommitInChunks(env, [
    firestoreMergeWrite(env, collectionName, record.id, record),
  ]);

  return json({
    ok: true,
    collection: collectionName,
    recordId: record.id,
    committedWrites: committed,
    record,
  }, { status: 200 }, origin);
}

async function handleCustodyScopedRecordDelete(request, env, origin) {
  const token = await verifyFirebaseToken(request, env);
  const payload = await request.json();
  const collectionName = allowedCustodyScopedRecordCollection(payload.collection || payload.collectionName || payload.collection_name);
  const recordId = cleanText(payload.recordId || payload.record_id || payload.id);
  if (!recordId) throw new Error("Custody record delete requires recordId.");

  const existingRecord = await firestoreGetDoc(env, collectionName, recordId);
  const requestedFamilyId = cleanText(
    existingRecord?.familyId ||
    existingRecord?.family_id ||
    existingRecord?.householdFamilyId ||
    existingRecord?.household_family_id ||
    payload.familyId ||
    payload.family_id ||
    payload.householdFamilyId ||
    payload.household_family_id
  );
  const requestedGroupId = cleanText(
    existingRecord?.custodyGroupId ||
    existingRecord?.custody_group_id ||
    payload.custodyGroupId ||
    payload.custody_group_id ||
    requestedFamilyId
  );
  const moduleName = collectionName === "custodyExpenses" ? "budget" : "custody";

  const scope = await assertCustodyDayWriteAccess(env, {
    familyId: requestedFamilyId,
    custodyGroupId: requestedGroupId,
    moduleName,
  }, token);

  if (scope.forbidden) {
    return json({ ok: false, error: scope.error }, { status: 403 }, origin);
  }

  const writesByName = new Map();
  addDeleteWrite(writesByName, env, collectionName, recordId);
  const writes = [...writesByName.values()];
  const committed = await firestoreCommitInChunks(env, writes);

  return json({
    ok: true,
    collection: collectionName,
    recordId,
    deletedRecords: writes.length,
    committedWrites: committed,
  }, { status: 200 }, origin);
}

function responseStatus(action = "") {
  const normalized = cleanText(action).toLowerCase();
  if (normalized === "decline" || normalized === "declined") return "declined";
  if (normalized === "accept" || normalized === "accepted") return "accepted";
  throw new Error("Invitation response must be accept or decline.");
}

function assertInviteRecipient(invitation = {}, token = {}) {
  const inviteEmail = normalizeEmail(invitation.recipientEmail || invitation.recipient_email);
  const tokenEmail = normalizeEmail(token.email);
  if (!inviteEmail || !tokenEmail || inviteEmail !== tokenEmail) {
    throw new Error("This invitation belongs to a different email address.");
  }
  return inviteEmail;
}

async function handleFamilyInvitationRespond(request, env, origin) {
  const token = await verifyFirebaseToken(request, env);
  const payload = await request.json();
  const invitationId = cleanText(payload.invitationId || payload.invitation_id || payload.id);
  const status = responseStatus(payload.action || payload.status);
  if (!invitationId) throw new Error("Family invitation response requires invitationId.");

  const invitation = await firestoreGetDoc(env, "familyInvitations", invitationId);
  if (!invitation) throw new Error("Family invitation was not found.");
  const recipientEmail = assertInviteRecipient(invitation, token);
  const familyId = cleanText(invitation.familyId || invitation.family_id);
  const family = await firestoreGetDoc(env, "families", familyId);
  if (!family) throw new Error("Family space was not found.");

  const now = new Date().toISOString();
  const invitationUpdate = {
    status,
    updatedAt: now,
    updated_at: now,
    ...(status === "accepted"
      ? {
          acceptedBy: cleanText(token.sub),
          accepted_by: cleanText(token.sub),
          acceptedAt: now,
          accepted_at: now,
        }
      : {
          declinedBy: cleanText(token.sub),
          declined_by: cleanText(token.sub),
          declinedAt: now,
          declined_at: now,
        }),
  };
  const familyUpdate = {
    pendingMemberEmails: removeEmail(family.pendingMemberEmails, recipientEmail),
    pending_member_emails: removeEmail(family.pending_member_emails, recipientEmail),
    pendingInvites: removeEmbeddedInvitation(family.pendingInvites, invitation),
    pending_invites: removeEmbeddedInvitation(family.pending_invites, invitation),
    updatedAt: now,
    updated_at: now,
  };
  const writes = [
    firestoreMergeWrite(env, "familyInvitations", invitationId, invitationUpdate),
  ];

  if (status === "accepted") {
    const member = familyInvitationMember(invitation, token);
    const memberIds = mergeIdList(family.memberIds, family.member_ids, token.sub);
    const memberEmails = mergeEmailList(family.memberEmails, family.member_emails, recipientEmail);
    Object.assign(familyUpdate, {
      memberIds,
      member_ids: memberIds,
      memberEmails,
      member_emails: memberEmails,
      members: mergeAcceptedMember(family.members, member),
    });

    if (member.isAdmin === true) {
      familyUpdate.adminIds = mergeIdList(family.adminIds, family.admin_ids, token.sub);
      familyUpdate.admin_ids = familyUpdate.adminIds;
      familyUpdate.adminEmails = mergeEmailList(family.adminEmails, family.admin_emails, recipientEmail);
      familyUpdate.admin_emails = familyUpdate.adminEmails;
    } else {
      Object.entries(mapOrEmpty(member.permissions)).forEach(([moduleName, permission]) => {
        addAccessArrays(familyUpdate, {
          uid: token.sub,
          email: recipientEmail,
          moduleName,
          permission,
        });
      });
    }

    const userDoc = await firestoreGetDoc(env, "users", token.sub);
    writes.push(firestoreMergeWrite(env, "users", token.sub, {
      uid: cleanText(token.sub),
      email: recipientEmail,
      familyIds: mergeIdList(userDoc?.familyIds, userDoc?.family_ids, familyId),
      family_ids: mergeIdList(userDoc?.familyIds, userDoc?.family_ids, familyId),
      updatedAt: now,
      updated_at: now,
    }));
    writes.push(...familyMemberWrites(env, familyId, [member], token, now));
  }

  writes.push(firestoreMergeWrite(env, "families", familyId, familyUpdate));
  await firestoreCommit(env, writes);

  return json({
    ok: true,
    status,
    familyId,
    invitationId,
  }, { status: 200 }, origin);
}

async function handleCustodyInvitationRespond(request, env, origin) {
  const token = await verifyFirebaseToken(request, env);
  const payload = await request.json();
  const invitationId = cleanText(payload.invitationId || payload.invitation_id || payload.id);
  const status = responseStatus(payload.action || payload.status);
  if (!invitationId) throw new Error("Custody invitation response requires invitationId.");

  const invitation = await firestoreGetDoc(env, "custodyInvitations", invitationId);
  if (!invitation) throw new Error("Custody invitation was not found.");
  const recipientEmail = assertInviteRecipient(invitation, token);
  const groupId = cleanText(invitation.groupId || invitation.group_id || invitation.custodyGroupId || invitation.custody_group_id || invitation.familyId || invitation.family_id);
  const group = await firestoreGetDoc(env, "custodyGroups", groupId);
  if (!group) throw new Error("Custody group was not found.");

  const now = new Date().toISOString();
  const access = invitationAccess(invitation);
  const invitationUpdate = {
    status,
    updatedAt: now,
    updated_at: now,
    ...(status === "accepted"
      ? {
          acceptedBy: cleanText(token.sub),
          accepted_by: cleanText(token.sub),
          acceptedAt: now,
          accepted_at: now,
        }
      : {
          declinedBy: cleanText(token.sub),
          declined_by: cleanText(token.sub),
          declinedAt: now,
          declined_at: now,
        }),
  };
  const groupUpdate = {
    pendingInvites: removeEmbeddedInvitation(group.pendingInvites, invitation),
    pending_invites: removeEmbeddedInvitation(group.pending_invites, invitation),
    pendingMemberEmails: removeEmail(group.pendingMemberEmails, recipientEmail),
    pending_member_emails: removeEmail(group.pending_member_emails, recipientEmail),
    pendingViewerEmails: removeEmail(group.pendingViewerEmails, recipientEmail),
    pending_viewer_emails: removeEmail(group.pending_viewer_emails, recipientEmail),
    updatedAt: now,
    updated_at: now,
  };

  if (status === "accepted") {
    if (access === "viewer") {
      groupUpdate.viewerIds = mergeIdList(group.viewerIds, group.viewer_ids, token.sub);
      groupUpdate.viewer_ids = groupUpdate.viewerIds;
      groupUpdate.viewerEmails = mergeEmailList(group.viewerEmails, group.viewer_emails, recipientEmail);
      groupUpdate.viewer_emails = groupUpdate.viewerEmails;
    } else {
      groupUpdate.memberIds = mergeIdList(group.memberIds, group.member_ids, token.sub);
      groupUpdate.member_ids = groupUpdate.memberIds;
      groupUpdate.memberEmails = mergeEmailList(group.memberEmails, group.member_emails, recipientEmail);
      groupUpdate.member_emails = groupUpdate.memberEmails;
    }

    Object.entries(mapOrEmpty(invitation.permissions)).forEach(([moduleName, permission]) => {
      addAccessArrays(groupUpdate, {
        uid: token.sub,
        email: recipientEmail,
        moduleName,
        permission,
      });
    });
  }

  await firestoreCommit(env, [
    firestoreMergeWrite(env, "custodyInvitations", invitationId, invitationUpdate),
    firestoreMergeWrite(env, "custodyGroups", groupId, groupUpdate),
  ]);

  return json({
    ok: true,
    status,
    groupId,
    invitationId,
  }, { status: 200 }, origin);
}

function normalizeActivity(raw = {}, token = {}) {
  const custodyGroupId = cleanText(raw.custodyGroupId || raw.custody_group_id);
  const householdFamilyId = cleanText(raw.householdFamilyId || raw.household_family_id);
  const familyId = cleanText(raw.familyId || raw.family_id || householdFamilyId || custodyGroupId);
  const now = new Date().toISOString();

  if (!familyId && !custodyGroupId) {
    throw new Error("Activity notification requires familyId or custodyGroupId.");
  }

  return {
    ...raw,
    id: cleanText(raw.id || raw.activityId || raw.activity_id || crypto.randomUUID()),
    familyId,
    family_id: familyId,
    custodyGroupId,
    custody_group_id: custodyGroupId,
    householdFamilyId,
    household_family_id: householdFamilyId,
    module: cleanText(raw.module || (custodyGroupId ? "custody" : "home")),
    type: cleanText(raw.type),
    title: cleanText(raw.title),
    description: cleanText(raw.description),
    entityType: cleanText(raw.entityType || raw.entity_type),
    entity_type: cleanText(raw.entityType || raw.entity_type),
    entityId: cleanText(raw.entityId || raw.entity_id),
    entity_id: cleanText(raw.entityId || raw.entity_id),
    actorId: cleanText(raw.actorId || raw.actor_id || raw.createdBy || raw.created_by || token.sub),
    actor_id: cleanText(raw.actorId || raw.actor_id || raw.createdBy || raw.created_by || token.sub),
    actorEmail: normalizeEmail(raw.actorEmail || raw.actor_email || raw.createdByEmail || raw.created_by_email || token.email),
    actor_email: normalizeEmail(raw.actorEmail || raw.actor_email || raw.createdByEmail || raw.created_by_email || token.email),
    createdBy: cleanText(raw.createdBy || raw.created_by || token.sub),
    created_by: cleanText(raw.createdBy || raw.created_by || token.sub),
    createdByEmail: normalizeEmail(raw.createdByEmail || raw.created_by_email || token.email),
    created_by_email: normalizeEmail(raw.createdByEmail || raw.created_by_email || token.email),
    createdAt: raw.createdAt || raw.created_at || now,
    created_at: raw.created_at || raw.createdAt || now,
  };
}

async function activityRecipientsForScope(env, activity, token) {
  const moduleName = cleanText(activity.module, activity.custodyGroupId ? "custody" : "home");

  if (activity.custodyGroupId) {
    const group = await firestoreGetDoc(env, "custodyGroups", activity.custodyGroupId);
    if (group) {
      if (!canAccessCustodyGroup(group, token)) {
        return { forbidden: true, recipients: [] };
      }
      return { forbidden: false, recipients: custodyNotificationRecipients(group, moduleName) };
    }
  }

  const familyId = cleanText(activity.householdFamilyId || activity.household_family_id || activity.familyId || activity.family_id);
  const family = familyId ? await firestoreGetDoc(env, "families", familyId) : null;
  if (!family) {
    return { missing: true, recipients: [] };
  }
  if (!canAccessFamily(family, token)) {
    return { forbidden: true, recipients: [] };
  }

  return { forbidden: false, recipients: familyNotificationRecipients(family, moduleName) };
}

function dateKeyFromDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function addDaysToDateKey(dateKey, days) {
  const base = new Date(`${dateKey}T12:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return dateKeyFromDate(base);
}

function daysBetweenDateKeys(fromDateKey, toDateKey) {
  if (!fromDateKey || !toDateKey) return null;
  const from = new Date(`${fromDateKey}T12:00:00.000Z`);
  const to = new Date(`${toDateKey}T12:00:00.000Z`);
  return Math.round((to - from) / 86_400_000);
}

function isActiveCustodyGroup(group = {}) {
  const status = cleanText(group.status || group.state).toLowerCase();
  return !["archived", "deleted", "inactive"].includes(status) && !group.deletedAt && !group.deleted_at;
}

async function firestoreCollectionDocs(env, collectionName, { limit = 500 } = {}) {
  return firestoreRunQuery(env, {
    from: [{ collectionId: collectionName }],
    limit,
  });
}

async function getCustodyScopedDocs(env, collectionName, scopeId, options = {}) {
  const cleanScopeId = cleanText(scopeId);
  if (!collectionName || !cleanScopeId) return [];
  const lookupFields = Array.isArray(options.lookupFields) && options.lookupFields.length
    ? options.lookupFields
    : CUSTODY_SCOPE_LOOKUP_FIELDS;

  const results = await Promise.allSettled(
    lookupFields.map((field) => firestoreQueryField(env, collectionName, {
      field,
      value: cleanScopeId,
    }))
  );

  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length === results.length && results.length > 0) {
    throw failures[0].reason;
  }

  const docsById = new Map();
  results.forEach((result) => {
    if (result.status !== "fulfilled") return;
    result.value.forEach((doc) => docsById.set(doc.id, doc));
  });
  return [...docsById.values()];
}

function normalizeScheduledCustodyDay(day = {}) {
  const isSplit = day.is_split === true || day.isSplit === true;
  return {
    id: cleanText(day.id),
    date: normalizeDateKey(day.date),
    isSplit,
    withWhom: isSplit ? "" : cleanText(day.with_whom || day.withWhom),
    morning: isSplit ? cleanText(day.morning) : "",
    afternoon: isSplit ? cleanText(day.afternoon) : "",
  };
}

function custodyDayOwnerSegments(day = {}) {
  if (!day.date) return [];
  if (day.isSplit) {
    return [
      { date: day.date, owner: day.morning, period: "AM", suggestedTime: "08:00" },
      { date: day.date, owner: day.afternoon, period: "PM", suggestedTime: "12:00" },
    ].filter((segment) => segment.owner && segment.owner !== "none");
  }

  return day.withWhom && day.withWhom !== "none"
    ? [{ date: day.date, owner: day.withWhom, period: "All day", suggestedTime: "18:00" }]
    : [];
}

function custodyEndOfDayOwner(day = {}) {
  return custodyDayOwnerSegments(day).at(-1)?.owner || "none";
}

function findScheduledCurrentOwner(days = [], todayKey = "") {
  let owner = "none";
  days.forEach((day) => {
    if (day.date && day.date <= todayKey) {
      owner = custodyEndOfDayOwner(day) || owner;
    }
  });
  return owner;
}

function findScheduledCalendarExchange(days = [], todayKey = "") {
  let previousOwner = findScheduledCurrentOwner(days, todayKey);
  if (!previousOwner || previousOwner === "none") return null;

  for (const day of days) {
    if (!day.date || day.date <= todayKey) continue;
    const segments = custodyDayOwnerSegments(day);
    for (const segment of segments) {
      if (segment.owner && segment.owner !== previousOwner) {
        return {
          date: segment.date,
          fromParent: previousOwner,
          toParent: segment.owner,
          time: segment.suggestedTime,
          period: segment.period,
          status: "needs_review",
          source: "custody_calendar",
        };
      }
      if (segment.owner) previousOwner = segment.owner;
    }
  }

  return null;
}

function normalizeScheduledExchange(exchange = {}) {
  return {
    id: cleanText(exchange.id),
    date: normalizeDateKey(exchange.date),
    time: cleanText(exchange.time),
    location: cleanText(exchange.location),
    fromParent: cleanText(exchange.fromParent || exchange.from_parent),
    toParent: cleanText(exchange.toParent || exchange.to_parent || exchange.pickupBy || exchange.pickup_by),
    status: cleanText(exchange.status, "pending"),
    notes: cleanText(exchange.notes),
    source: cleanText(exchange.source, "manual"),
  };
}

function nextScheduledExchange(days = [], exchanges = [], todayKey = "") {
  const upcomingManual = exchanges
    .filter((exchange) => (
      exchange.date >= todayKey &&
      !["completed", "cancelled", "canceled"].includes(cleanText(exchange.status).toLowerCase())
    ))
    .sort((a, b) => `${a.date} ${a.time || "99:99"}`.localeCompare(`${b.date} ${b.time || "99:99"}`))[0];

  if (upcomingManual) return upcomingManual;
  return findScheduledCalendarExchange(days, todayKey);
}

function normalizeScheduledPackingItem(item = {}) {
  return {
    id: cleanText(item.id),
    name: cleanText(item.name, "Packing item"),
    status: cleanText(item.status, "review"),
    important: item.important === true,
  };
}

function scheduledPackingSummary(items = []) {
  const total = items.length;
  const packedCount = items.filter((item) => item.status === "packed").length;
  const missingItems = items.filter((item) => item.status === "missing");
  const reviewItems = items.filter((item) => item.status === "review");
  const readiness = total ? Math.round((packedCount / total) * 100) : 100;

  return {
    total,
    packedCount,
    missingCount: missingItems.length,
    reviewCount: reviewItems.length,
    readiness,
    missingItems,
    reviewItems,
  };
}

function scheduledMoney(value) {
  const number = Number(value || 0);
  if (Number.isNaN(number)) return 0;
  return Math.round(number * 100) / 100;
}

function scheduledExpenseLedger(expense = {}) {
  const amount = scheduledMoney(expense.amount);
  const parent1Share = scheduledMoney(expense.parent1ShareAmount);
  const parent2Share = scheduledMoney(expense.parent2ShareAmount);
  const parent1Paid = scheduledMoney(expense.parent1PaidAmount);
  const parent2Paid = scheduledMoney(expense.parent2PaidAmount);
  const explicitLedger = (
    expense.parent1ShareAmount !== undefined ||
    expense.parent2ShareAmount !== undefined ||
    expense.parent1PaidAmount !== undefined ||
    expense.parent2PaidAmount !== undefined
  );

  if (explicitLedger) {
    const remaining = Math.max(parent1Share - parent1Paid, 0) + Math.max(parent2Share - parent2Paid, 0);
    return {
      amount,
      remaining: scheduledMoney(remaining),
      status: expense.reviewFlag ? "review" : remaining <= 0 ? "paid" : parent1Paid + parent2Paid > 0 ? "partial" : "open",
    };
  }

  const status = cleanText(expense.status, "review");
  return {
    amount,
    remaining: ["paid", "settled", "completed"].includes(status) ? 0 : amount,
    status: status === "settled" ? "paid" : status,
  };
}

function scheduledBudgetSummary(expenses = []) {
  const ledgers = expenses.map(scheduledExpenseLedger);
  const pendingLedgers = ledgers.filter((ledger) => !["paid", "settled", "completed"].includes(ledger.status));
  const reviewCount = ledgers.filter((ledger) => ledger.status === "review").length;
  const pending = pendingLedgers.reduce((sum, ledger) => sum + ledger.remaining, 0);

  return {
    pending: scheduledMoney(pending),
    pendingCount: pendingLedgers.length,
    reviewCount,
  };
}

const DEFAULT_SCHEDULED_REMINDER_RULE_SETTINGS = {
  "exchange-review": { enabled: true, leadDays: 1, frequency: "once_per_window" },
  "packing-missing": { enabled: true, leadDays: 1, frequency: "daily" },
  "packing-readiness": { enabled: true, leadDays: 1, frequency: "daily" },
  "budget-pending": { enabled: true, leadDays: 0, frequency: "weekly", weekday: 1, monthDay: 1 },
};

function scheduledReminderRuleConfig(prefs = {}, ruleId = "") {
  const defaults = DEFAULT_SCHEDULED_REMINDER_RULE_SETTINGS[ruleId] || { enabled: true, leadDays: 1, frequency: "daily" };
  const raw = mapOrEmpty(prefs.rules)[ruleId];

  if (typeof raw === "boolean") return { ...defaults, enabled: raw };
  if (!raw || typeof raw !== "object") return defaults;

  const leadDays = Number(raw.leadDays ?? raw.lead_days ?? defaults.leadDays);
  const weekday = Number(raw.weekday ?? raw.week_day ?? defaults.weekday);
  const monthDay = Number(raw.monthDay ?? raw.month_day ?? defaults.monthDay);

  return {
    ...defaults,
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : defaults.enabled,
    leadDays: Number.isFinite(leadDays) ? Math.max(0, Math.floor(leadDays)) : defaults.leadDays,
    frequency: cleanText(raw.frequency, defaults.frequency),
    weekday: Number.isFinite(weekday) ? Math.min(Math.max(Math.floor(weekday), 0), 6) : defaults.weekday,
    monthDay: Number.isFinite(monthDay) ? Math.min(Math.max(Math.floor(monthDay), 1), 28) : defaults.monthDay,
  };
}

function scheduledReminderRuleEnabled(prefs = {}, ruleId = "") {
  return scheduledReminderRuleConfig(prefs, ruleId).enabled !== false;
}

function scheduledTransitionRuleMatches(prefs = {}, ruleId = "", daysUntilExchange = null, force = false) {
  const config = scheduledReminderRuleConfig(prefs, ruleId);
  if (config.enabled === false) return false;
  if (force) return true;
  return daysUntilExchange !== null && daysUntilExchange >= 0 && daysUntilExchange <= config.leadDays;
}

function scheduledBudgetRuleMatches(prefs = {}, ruleId = "", nowDate = new Date(), force = false) {
  const config = scheduledReminderRuleConfig(prefs, ruleId);
  if (config.enabled === false) return false;
  if (force) return true;

  if (config.frequency === "daily") return true;
  if (config.frequency === "monthly") return nowDate.getUTCDate() === (config.monthDay || 1);
  return nowDate.getUTCDay() === (config.weekday ?? 1);
}

function scheduledTransitionScheduleKey(ruleConfig = {}, todayKey = "", nextExchange = null) {
  if (ruleConfig.frequency === "once_per_window") {
    return cleanText(nextExchange?.date, todayKey);
  }
  return todayKey;
}

async function loadCustodyReminderPrefs(env, scopeId) {
  const prefs = await firestoreGetDoc(env, "custodyNotificationPrefs", scopeId).catch(() => null);
  return prefs || {};
}

function custodyBudgetNotificationRecipients(group = {}) {
  const recipients = new Map();
  const budgetIds = uniqueStrings([
    group.budgetReaderIds,
    group.budget_reader_ids,
    group.budgetWriterIds,
    group.budget_writer_ids,
  ].flat());
  const budgetEmails = uniqueStrings([
    group.budgetReaderEmails,
    group.budget_reader_emails,
    group.budgetWriterEmails,
    group.budget_writer_emails,
  ].flat()).map(normalizeEmail);

  const addBudgetRecipient = (candidate = {}) => {
    const email = normalizeEmail(candidate.email || candidate.emailAddress || candidate.memberEmail || candidate.recipientEmail);
    const uid = cleanText(candidate.uid || candidate.userId || candidate.user_id || candidate.id);
    const isAdmin = (
      candidate.admin === true ||
      candidate.isAdmin === true ||
      candidate.is_admin === true ||
      ["owner", "admin"].includes(cleanText(candidate.appRole || candidate.app_role))
    );
    const canReadBudget = (
      isAdmin ||
      (uid && budgetIds.includes(uid)) ||
      (email && budgetEmails.includes(email)) ||
      permissionAllowsRead(mapOrEmpty(candidate.permissions).budget) ||
      permissionAllowsRead(mapOrEmpty(candidate.modules).budget)
    );

    if (!email || !canReadBudget) return;
    const key = email || uid;
    recipients.set(key, {
      email,
      uid,
      name: cleanText(candidate.name || candidate.displayName || candidate.fullName || candidate.label || email),
      moduleName: "budget",
    });
  };

  addBudgetRecipient({
    uid: group.ownerId || group.owner_id || group.createdBy || group.created_by || group.createdByUid || group.created_by_uid,
    email: group.ownerEmail || group.owner_email || group.createdByEmail || group.created_by_email,
    name: "Custody owner",
    admin: true,
  });

  [
    ...listOrEmpty(group.parents),
    ...listOrEmpty(group.coParents),
    ...listOrEmpty(group.members),
  ].forEach(addBudgetRecipient);

  budgetEmails.forEach((email) => addBudgetRecipient({ email, permissions: { budget: "read" } }));
  return [...recipients.values()];
}

function scheduledReminderMarkerId(notificationId = "") {
  return safeDocumentId(notificationId, `scheduled_${Date.now()}`);
}

async function deliverScheduledActivityNotification(env, {
  activity,
  recipients = [],
  now,
  dryRun = false,
  preferenceCache = new Map(),
  skipDuplicateCheck = false,
  skipRecipientPreferenceLookup = false,
} = {}) {
  const preferenceKey = activityPreferenceKey(activity);
  if (!preferenceKey) {
    return { planned: 0, inAppCount: 0, emailCount: 0, skipped: [{ reason: "no_preference_key" }] };
  }

  const uniqueRecipients = new Map();
  recipients.forEach((recipient) => {
    const email = normalizeEmail(recipient.email);
    const uid = cleanText(recipient.uid);
    if (email) uniqueRecipients.set(email || uid, { ...recipient, email, uid });
  });

  const notificationWrites = [];
  const markerWrites = [];
  const emailsToSend = [];
  const skipped = [];
  let planned = 0;

  for (const recipient of uniqueRecipients.values()) {
    const preferenceCacheKey = recipient.uid || recipient.email;
    let preferences = skipRecipientPreferenceLookup ? DEFAULT_NOTIFICATION_PREFERENCES : preferenceCache.get(preferenceCacheKey);
    if (!preferences) {
      preferences = await loadRecipientPreferences(env, recipient);
      preferenceCache.set(preferenceCacheKey, preferences);
    }
    if (preferences.notifyOn?.[preferenceKey] !== true) {
      skipped.push({ email: recipient.email, reason: "preference_disabled" });
      continue;
    }

    const channels = {
      inApp: preferences.channels?.inApp !== false,
      email: preferences.channels?.email === true,
    };

    if (!channels.inApp && !channels.email) {
      skipped.push({ email: recipient.email, reason: "channels_disabled" });
      continue;
    }

    const notification = notificationRecord({
      activity,
      recipient,
      preferenceKey,
      channels,
      now,
    });
    const markerId = scheduledReminderMarkerId(notification.id);
    if (!dryRun && !skipDuplicateCheck) {
      const existingMarker = await firestoreGetDoc(env, "scheduledReminderDeliveries", markerId).catch(() => null);
      if (existingMarker) {
        skipped.push({ email: recipient.email, reason: "already_sent" });
        continue;
      }
    }

    planned += 1;
    if (dryRun) continue;

    markerWrites.push(firestoreMergeWrite(env, "scheduledReminderDeliveries", markerId, {
      id: markerId,
      notificationId: notification.id,
      notification_id: notification.id,
      activityId: activity.id,
      activity_id: activity.id,
      recipientEmail: recipient.email,
      recipient_email: recipient.email,
      recipientUid: recipient.uid,
      recipient_uid: recipient.uid,
      familyId: notification.familyId,
      family_id: notification.family_id,
      custodyGroupId: notification.custodyGroupId,
      custody_group_id: notification.custody_group_id,
      ruleId: cleanText(activity.metadata?.reminderRuleId),
      rule_id: cleanText(activity.metadata?.reminderRuleId),
      status: "planned",
      createdAt: now,
      created_at: now,
      updatedAt: now,
      updated_at: now,
    }));

    if (channels.inApp) {
      notificationWrites.push(firestoreMergeWrite(env, "notifications", notification.id, notification));
    }

    if (channels.email) {
      emailsToSend.push({ markerId, recipient, mail: activityEmail(env, notification) });
    }
  }

  if (!dryRun && (markerWrites.length || notificationWrites.length)) {
    await firestoreCommitInChunks(env, [...markerWrites, ...notificationWrites]);
  }

  let emailCount = 0;
  const emailFailures = [];
  const markerUpdates = [];

  if (!dryRun) {
    for (const delivery of emailsToSend) {
      try {
        const providerResult = await sendWithResend(env, delivery.mail);
        emailCount += 1;
        markerUpdates.push(firestoreMergeWrite(env, "scheduledReminderDeliveries", delivery.markerId, {
          status: "accepted",
          provider: "resend",
          providerMessageId: extractProviderMessageId(providerResult),
          provider_message_id: extractProviderMessageId(providerResult),
          emailDeliveryId: cleanText(providerResult.deliveryId),
          email_delivery_id: cleanText(providerResult.deliveryId),
          updatedAt: now,
          updated_at: now,
        }));
      } catch (error) {
        emailFailures.push({
          email: delivery.recipient.email,
          reason: error instanceof Error ? error.message : cleanText(error),
        });
        markerUpdates.push(firestoreMergeWrite(env, "scheduledReminderDeliveries", delivery.markerId, {
          status: "email_failed",
          error: error instanceof Error ? error.message : cleanText(error),
          updatedAt: now,
          updated_at: now,
        }));
      }
    }
  }

  if (markerUpdates.length) {
    await firestoreCommitInChunks(env, markerUpdates).catch((error) => {
      console.warn("Could not update scheduled reminder delivery markers.", error);
    });
  }

  return {
    planned,
    inAppCount: dryRun ? 0 : notificationWrites.length,
    emailCount,
    skipped,
    emailFailures,
  };
}

function scheduledReminderActivity({ group, ruleId, ruleConfig = {}, type, title, description, now, todayKey, scheduleKey = "", entityType = "custody_reminder" }) {
  const groupId = cleanText(group.id);
  const householdFamilyId = cleanText(group.householdFamilyId || group.household_family_id || group.familyId || group.family_id);
  const reminderScheduleKey = cleanText(scheduleKey, todayKey);
  return {
    id: safeDocumentId(`scheduled_${reminderScheduleKey}_${groupId}_${ruleId}`),
    familyId: householdFamilyId || groupId,
    family_id: householdFamilyId || groupId,
    householdFamilyId,
    household_family_id: householdFamilyId,
    custodyGroupId: groupId,
    custody_group_id: groupId,
    module: type.includes("budget") ? "budget" : "custody",
    type,
    title,
    description,
    entityType,
    entity_type: entityType,
    entityId: groupId,
    entity_id: groupId,
    actorId: "kinely-system",
    actor_id: "kinely-system",
    actorEmail: "",
    actor_email: "",
    createdBy: "kinely-system",
    created_by: "kinely-system",
    createdByEmail: "",
    created_by_email: "",
    metadata: {
      scheduledReminder: true,
      scheduled_reminder: true,
      reminderRuleId: ruleId,
      reminder_rule_id: ruleId,
      reminderLeadDays: ruleConfig.leadDays,
      reminder_lead_days: ruleConfig.leadDays,
      reminderFrequency: cleanText(ruleConfig.frequency),
      reminder_frequency: cleanText(ruleConfig.frequency),
      custodyGroupName: cleanText(group.name || group.groupName || group.group_name),
      scheduledFor: reminderScheduleKey,
      scheduled_for: reminderScheduleKey,
      evaluatedOn: todayKey,
      evaluated_on: todayKey,
    },
    createdAt: now,
    created_at: now,
  };
}

function buildScheduledReminderActivities({ group, prefs, custodyDays, exchanges, packingItems, expenses, nowDate, force = false }) {
  const now = nowDate.toISOString();
  const todayKey = dateKeyFromDate(nowDate);
  const nextExchange = nextScheduledExchange(custodyDays, exchanges, todayKey);
  const daysUntilExchange = nextExchange ? daysBetweenDateKeys(todayKey, nextExchange.date) : null;
  const exchangeRule = scheduledReminderRuleConfig(prefs, "exchange-review");
  const packingMissingRule = scheduledReminderRuleConfig(prefs, "packing-missing");
  const packingReadinessRule = scheduledReminderRuleConfig(prefs, "packing-readiness");
  const budgetRule = scheduledReminderRuleConfig(prefs, "budget-pending");
  const activities = [];

  if (
    nextExchange &&
    scheduledTransitionRuleMatches(prefs, "exchange-review", daysUntilExchange, force)
  ) {
    const missingDetails = !nextExchange.time || !nextExchange.location || ["needs_review", "pending"].includes(cleanText(nextExchange.status).toLowerCase());
    if (force || missingDetails) {
      activities.push({
        ruleId: "exchange-review",
        recipients: custodyNotificationRecipients(group, "custody"),
        activity: scheduledReminderActivity({
          group,
          ruleId: "exchange-review",
          ruleConfig: exchangeRule,
          type: "custody_updated",
          title: missingDetails ? "Exchange details need review" : "Upcoming custody exchange",
          description: `${daysUntilExchange === 0 ? "Today" : "Tomorrow"} exchange${nextExchange.time ? ` at ${nextExchange.time}` : ""}${nextExchange.location ? ` - ${nextExchange.location}` : " needs a confirmed time and location."}`,
          now,
          todayKey,
          scheduleKey: scheduledTransitionScheduleKey(exchangeRule, todayKey, nextExchange),
          entityType: "custody_exchange",
        }),
      });
    }
  }

  const packingSummary = scheduledPackingSummary(packingItems);

  if (
    scheduledTransitionRuleMatches(prefs, "packing-missing", daysUntilExchange, force) &&
    packingSummary.missingCount > 0 &&
    scheduledReminderRuleEnabled(prefs, "packing-missing")
  ) {
    const names = packingSummary.missingItems.slice(0, 3).map((item) => item.name).join(", ");
    activities.push({
      ruleId: "packing-missing",
      recipients: custodyNotificationRecipients(group, "custody"),
      activity: scheduledReminderActivity({
        group,
        ruleId: "packing-missing",
        ruleConfig: packingMissingRule,
        type: "custody_updated",
        title: `${packingSummary.missingCount} packing item${packingSummary.missingCount === 1 ? "" : "s"} missing`,
        description: `${names}${packingSummary.missingCount > 3 ? " and more" : ""} still need attention before the exchange.`,
        now,
        todayKey,
        scheduleKey: scheduledTransitionScheduleKey(packingMissingRule, todayKey, nextExchange),
        entityType: "custody_packing",
      }),
    });
  }

  if (
    scheduledTransitionRuleMatches(prefs, "packing-readiness", daysUntilExchange, force) &&
    packingSummary.total > 0 &&
    packingSummary.readiness < 100 &&
    scheduledReminderRuleEnabled(prefs, "packing-readiness")
  ) {
    activities.push({
      ruleId: "packing-readiness",
      recipients: custodyNotificationRecipients(group, "custody"),
      activity: scheduledReminderActivity({
        group,
        ruleId: "packing-readiness",
        ruleConfig: packingReadinessRule,
        type: "custody_updated",
        title: `Packing is ${packingSummary.readiness}% ready`,
        description: `${packingSummary.packedCount} packed - ${packingSummary.reviewCount} review - ${packingSummary.missingCount} missing before the next transition.`,
        now,
        todayKey,
        scheduleKey: scheduledTransitionScheduleKey(packingReadinessRule, todayKey, nextExchange),
        entityType: "custody_packing",
      }),
    });
  }

  const budgetSummary = scheduledBudgetSummary(expenses);
  if (
    budgetSummary.pending > 0 &&
    scheduledBudgetRuleMatches(prefs, "budget-pending", nowDate, force)
  ) {
    activities.push({
      ruleId: "budget-pending",
      recipients: custodyBudgetNotificationRecipients(group),
      activity: scheduledReminderActivity({
        group,
        ruleId: "budget-pending",
        ruleConfig: budgetRule,
        type: "custody_budget_updated",
        title: "Shared custody expenses need review",
        description: `${budgetSummary.pendingCount} open/review item${budgetSummary.pendingCount === 1 ? "" : "s"} need attention in the custody budget.`,
        now,
        todayKey,
        entityType: "custody_budget",
      }),
    });
  }

  return activities.filter((item) => item.recipients.length > 0);
}

async function runScheduledCustodyReminders(env, {
  dryRun = false,
  force = false,
  trigger = "manual",
  scheduledTime = Date.now(),
  groupsOverride = null,
  maxGroups = 500,
  maxActivitiesPerGroup = 10,
  scopeLookupFields = CUSTODY_SCOPE_LOOKUP_FIELDS,
  skipDuplicateCheck = false,
  skipRecipientPreferenceLookup = false,
} = {}) {
  const nowDate = new Date(scheduledTime || Date.now());
  const allGroups = (Array.isArray(groupsOverride)
    ? groupsOverride
    : await firestoreCollectionDocs(env, "custodyGroups", { limit: 500 }))
    .filter(isActiveCustodyGroup);
  const parsedMaxGroups = Number(maxGroups);
  const groupLimit = Number.isFinite(parsedMaxGroups) && parsedMaxGroups > 0
    ? Math.floor(parsedMaxGroups)
    : allGroups.length;
  const groups = allGroups.slice(0, groupLimit);
  const parsedMaxActivities = Number(maxActivitiesPerGroup);
  const activityLimit = Number.isFinite(parsedMaxActivities) && parsedMaxActivities > 0
    ? Math.floor(parsedMaxActivities)
    : 10;
  const preferenceCache = new Map();
  const summary = {
    ok: true,
    trigger,
    dryRun,
    force,
    workerVersion: WORKER_VERSION,
    checkedAt: nowDate.toISOString(),
    groupCount: groups.length,
    totalGroupCount: allGroups.length,
    truncated: allGroups.length > groups.length,
    activityCount: 0,
    plannedRecipientCount: 0,
    inAppCount: 0,
    emailCount: 0,
    skippedCount: 0,
    emailFailedCount: 0,
    groups: [],
  };

  for (const group of groups) {
    const groupId = cleanText(group.id);
    if (!groupId) continue;

    const [prefs, dayDocs, exchangeDocs, packingDocs, expenseDocs] = await Promise.all([
      loadCustodyReminderPrefs(env, groupId),
      getCustodyScopedDocs(env, "custodyDays", groupId, { lookupFields: scopeLookupFields }),
      getCustodyScopedDocs(env, "custodyExchanges", groupId, { lookupFields: scopeLookupFields }),
      getCustodyScopedDocs(env, "custodyPackingItems", groupId, { lookupFields: scopeLookupFields }),
      getCustodyScopedDocs(env, "custodyExpenses", groupId, { lookupFields: scopeLookupFields }),
    ]);

    const activities = buildScheduledReminderActivities({
      group,
      prefs,
      custodyDays: dayDocs.map(normalizeScheduledCustodyDay).filter((day) => day.date).sort((a, b) => a.date.localeCompare(b.date)),
      exchanges: exchangeDocs.map(normalizeScheduledExchange).filter((exchange) => exchange.date),
      packingItems: packingDocs.map(normalizeScheduledPackingItem),
      expenses: expenseDocs,
      nowDate,
      force,
    }).slice(0, activityLimit);

    const groupSummary = {
      groupId,
      groupName: cleanText(group.name || group.groupName || group.group_name),
      activityCount: activities.length,
      plannedRecipientCount: 0,
      inAppCount: 0,
      emailCount: 0,
      skippedCount: 0,
      emailFailedCount: 0,
      rules: activities.map((item) => item.ruleId),
    };

    for (const item of activities) {
      const result = await deliverScheduledActivityNotification(env, {
        activity: item.activity,
        recipients: item.recipients,
        now: nowDate.toISOString(),
        dryRun,
        preferenceCache,
        skipDuplicateCheck,
        skipRecipientPreferenceLookup,
      });
      groupSummary.plannedRecipientCount += result.planned;
      groupSummary.inAppCount += result.inAppCount;
      groupSummary.emailCount += result.emailCount;
      groupSummary.skippedCount += result.skipped.length;
      groupSummary.emailFailedCount += listOrEmpty(result.emailFailures).length;
    }

    summary.activityCount += groupSummary.activityCount;
    summary.plannedRecipientCount += groupSummary.plannedRecipientCount;
    summary.inAppCount += groupSummary.inAppCount;
    summary.emailCount += groupSummary.emailCount;
    summary.skippedCount += groupSummary.skippedCount;
    summary.emailFailedCount += groupSummary.emailFailedCount;
    if (groupSummary.activityCount || force) summary.groups.push(groupSummary);
  }

  return summary;
}

async function resolveReminderGroupsForFamily(env, familyId, { family = null, maxGroups = 2 } = {}) {
  const familyDoc = family || await firestoreGetDoc(env, "families", familyId);
  if (!familyDoc) return [];

  const groupMap = new Map();
  const directGroupIds = uniqueStrings([
    familyDoc.custodyGroupIds,
    familyDoc.custody_group_ids,
  ].flat()).slice(0, maxGroups);

  const directResults = await Promise.allSettled(
    directGroupIds.map((groupId) => firestoreGetDoc(env, "custodyGroups", groupId))
  );
  directResults.forEach((result) => {
    if (result.status === "fulfilled" && result.value?.id) groupMap.set(result.value.id, result.value);
  });

  if (groupMap.size >= maxGroups) return [...groupMap.values()].slice(0, maxGroups);

  const results = await Promise.allSettled(
    PRIMARY_CUSTODY_GROUP_LOOKUP_FIELDS.map((field) => firestoreQueryField(env, "custodyGroups", {
      field,
      value: familyId,
    }))
  );
  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length === results.length && results.length > 0) {
    throw failures[0].reason;
  }

  results.forEach((result) => {
    if (result.status !== "fulfilled") return;
    result.value.forEach((group) => {
      if (groupMap.size >= maxGroups) return;
      if (group?.id) groupMap.set(group.id, group);
    });
  });

  return [...groupMap.values()].slice(0, maxGroups);
}

async function handleScheduledRemindersRun(request, env, origin) {
  const expectedSecret = cleanText(env.WEBHOOK_SECRET);
  const providedSecret = cleanText(request.headers.get("x-kinely-webhook-secret"));
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return json({ ok: false, error: "Unauthorized reminder maintenance request." }, { status: 401 }, origin);
  }

  const payload = await request.json().catch(() => ({}));
  const result = await runScheduledCustodyReminders(env, {
    dryRun: payload.write !== true,
    force: payload.force === true,
    trigger: "manual",
    scheduledTime: payload.scheduledTime ? Date.parse(payload.scheduledTime) : Date.now(),
  });

  return json(result, { status: 200 }, origin);
}

async function handleAuthenticatedScheduledRemindersRun(request, env, origin) {
  const token = await verifyFirebaseToken(request, env);
  const payload = await request.json().catch(() => ({}));
  const familyId = cleanText(payload.familyId || payload.family_id);
  if (!familyId) {
    return json({ ok: false, error: "Reminder diagnostics require a familyId." }, { status: 400 }, origin);
  }

  const family = await firestoreGetDoc(env, "families", familyId);
  if (!family) {
    return json({ ok: false, error: "Family space was not found." }, { status: 404 }, origin);
  }
  if (!canManageFamily(family, token)) {
    return json({ ok: false, error: "Only a family owner or admin can run reminder diagnostics." }, { status: 403 }, origin);
  }

  const write = payload.write === true;
  const groupLimit = write ? 1 : 2;
  const activityLimit = write ? 2 : 4;
  const groups = await resolveReminderGroupsForFamily(env, familyId, {
    family,
    maxGroups: groupLimit,
  });
  const result = await runScheduledCustodyReminders(env, {
    dryRun: !write,
    force: payload.force === true,
    trigger: "admin_diagnostic",
    scheduledTime: payload.scheduledTime ? Date.parse(payload.scheduledTime) : Date.now(),
    groupsOverride: groups,
    maxGroups: groupLimit,
    maxActivitiesPerGroup: activityLimit,
    scopeLookupFields: PRIMARY_CUSTODY_SCOPE_LOOKUP_FIELDS,
    skipDuplicateCheck: payload.force === true,
    skipRecipientPreferenceLookup: !write,
  });

  return json({
    ...result,
    familyId,
    familyName: cleanText(family.familyName || family.family_name),
  }, { status: 200 }, origin);
}

async function handleActivityNotificationSend(request, env, origin) {
  const token = await verifyFirebaseToken(request, env);
  const payload = await request.json();
  const activity = normalizeActivity(payload.activity || payload, token);
  const preferenceKey = activityPreferenceKey(activity);

  if (!activity.title || !activity.type || !preferenceKey) {
    return json({ ok: true, skipped: true, reason: "No matching notification preference." }, { status: 200 }, origin);
  }

  const scope = await activityRecipientsForScope(env, activity, token);
  if (scope.forbidden) {
    return json({ ok: false, error: "You do not have access to send notifications for this space." }, { status: 403 }, origin);
  }
  if (scope.missing) {
    return json({ ok: true, skipped: true, reason: "Notification scope was not found." }, { status: 200 }, origin);
  }

  const now = new Date().toISOString();
  const scopedRecipients = applyActivityRecipientSelection(activity, scope.recipients);
  const candidateCount = scopedRecipients.length;
  const nonActorRecipients = scopedRecipients.filter((recipient) => !actorMatchesRecipient(activity, recipient));
  const actorRecipients = scopedRecipients.filter((recipient) => actorMatchesRecipient(activity, recipient));
  const selfNotificationFallback = nonActorRecipients.length === 0 && actorRecipients.length > 0;
  const recipients = selfNotificationFallback ? actorRecipients.slice(0, 1) : nonActorRecipients;
  const notificationWrites = [];
  const emailDeliveries = [];
  const skipped = [];

  for (const recipient of recipients) {
    const preferences = await loadRecipientPreferences(env, recipient);
    if (preferences.notifyOn?.[preferenceKey] !== true) {
      skipped.push({ email: recipient.email, reason: "preference_disabled" });
      continue;
    }

    const channels = {
      inApp: preferences.channels?.inApp !== false,
      email: preferences.channels?.email === true,
    };

    if (!channels.inApp && !channels.email) {
      skipped.push({ email: recipient.email, reason: "channels_disabled" });
      continue;
    }

    const notification = notificationRecord({
      activity,
      recipient,
      preferenceKey,
      channels,
      now,
    });

    if (channels.inApp) {
      notificationWrites.push(firestoreMergeWrite(env, "notifications", notification.id, notification));
    }

    if (channels.email) {
      emailDeliveries.push({
        recipient,
        promise: sendWithResend(env, activityEmail(env, notification)),
      });
    }
  }

  if (notificationWrites.length) {
    await firestoreCommit(env, notificationWrites);
  }

  const emailResults = await Promise.allSettled(emailDeliveries.map((delivery) => delivery.promise));
  const emailFailures = emailResults
    .map((result, index) => ({
      result,
      recipient: emailDeliveries[index]?.recipient,
    }))
    .filter((item) => item.result.status === "rejected")
    .map((item) => ({
      email: item.recipient?.email || "",
      reason: item.result.reason instanceof Error ? item.result.reason.message : cleanText(item.result.reason),
    }));
  const emailSuccesses = emailResults
    .map((result, index) => ({
      result,
      recipient: emailDeliveries[index]?.recipient,
    }))
    .filter((item) => item.result.status === "fulfilled")
    .map((item) => ({
      email: item.recipient?.email || "",
      providerMessageId: extractProviderMessageId(item.result.value),
      deliveryId: cleanText(item.result.value?.deliveryId),
    }));

  const deliverySummary = {
    ok: true,
    preferenceKey,
    candidateCount,
    recipientCount: recipients.length,
    selfNotificationFallback,
    inAppCount: notificationWrites.length,
    emailCount: emailResults.filter((result) => result.status === "fulfilled").length,
    emailFailedCount: emailFailures.length,
    skippedCount: skipped.length,
    skipped: skipped.slice(0, 20),
    emailSuccesses: emailSuccesses.slice(0, 20),
    emailFailures: emailFailures.slice(0, 20),
  };

  if (activity.id) {
    await firestoreCommit(env, [
      firestoreMergeWrite(env, "familyActivity", activity.id, {
        notificationStatus: "processed",
        notification_status: "processed",
        notificationResult: deliverySummary,
        notification_result: deliverySummary,
        notifiedAt: now,
        notified_at: now,
      }),
    ]).catch((error) => {
      console.warn("Could not write activity notification result.", error);
    });
  }

  return json(deliverySummary, { status: 200 }, origin);
}

async function handleSendEmail(request, env, origin) {
  const token = await verifyFirebaseToken(request, env);
  const payload = await request.json();
  const mail = parseMailPayload(payload);
  const providerResult = await sendWithResend(env, mail);

  return json({
    ok: true,
    id: mail.id || extractProviderMessageId(providerResult),
    provider: "resend",
    providerMessageId: extractProviderMessageId(providerResult),
    uid: token.sub,
  }, { status: 200 }, origin);
}

async function handleDiagnosticEmailTest(request, env, origin) {
  const expectedSecret = cleanText(env.WEBHOOK_SECRET);
  const providedSecret = cleanText(request.headers.get("x-kinely-webhook-secret"));
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return json({ ok: false, error: "Unauthorized diagnostic request." }, { status: 401 }, origin);
  }

  const payload = await request.json().catch(() => ({}));
  const recipient = normalizeEmail(payload.to || payload.email || payload.recipientEmail);
  if (!recipient) {
    return json({ ok: false, error: "Diagnostic email requires a recipient email." }, { status: 400 }, origin);
  }

  const providerResult = await sendWithResend(env, {
    id: `diagnostic_${Date.now()}`,
    kind: "diagnostic",
    to: [recipient],
    subject: "Kinely email test",
    text: "This is a Kinely diagnostic email. If you received it, Resend delivery is configured correctly.",
    html: `
      <div style="font-family: Inter, Arial, sans-serif; color: #0f172a; line-height: 1.6; max-width: 620px;">
        <p style="font-size: 12px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #4f46e5; margin: 0 0 8px;">Kinely</p>
        <h1 style="font-size: 22px; margin: 0 0 12px;">Email test</h1>
        <p style="font-size: 15px; margin: 0;">This is a Kinely diagnostic email. If you received it, Resend delivery is configured correctly.</p>
      </div>
    `.trim(),
  });

  return json({
    ok: true,
    provider: "resend",
    providerMessageId: extractProviderMessageId(providerResult),
    to: recipient,
  }, { status: 200 }, origin);
}

async function handleAuthenticatedEmailTest(request, env, origin) {
  const token = await verifyFirebaseToken(request, env);
  const payload = await request.json().catch(() => ({}));
  const userDoc = token.sub ? await firestoreGetDoc(env, "users", token.sub).catch(() => null) : null;
  const recipient = normalizeEmail(
    payload.to ||
    payload.email ||
    userDoc?.notificationEmail ||
    userDoc?.notification_email ||
    token.email
  );

  if (!recipient) {
    return json({ ok: false, error: "Your account does not have an email address for this test." }, { status: 400 }, origin);
  }

  const allowedEmails = [
    token.email,
    userDoc?.email,
    userDoc?.notificationEmail,
    userDoc?.notification_email,
  ].map(normalizeEmail).filter(Boolean);

  if (!allowedEmails.includes(recipient)) {
    return json({ ok: false, error: "You can only send a test email to your own account email." }, { status: 403 }, origin);
  }

  const providerResult = await sendWithResend(env, {
    id: `user_diagnostic_${token.sub}_${Date.now()}`,
    kind: "diagnostic",
    to: [recipient],
    subject: "Kinely email test",
    text: "This is a Kinely diagnostic email. If you received it, Resend delivery is configured correctly.",
    html: `
      <div style="font-family: Inter, Arial, sans-serif; color: #0f172a; line-height: 1.6; max-width: 620px;">
        <p style="font-size: 12px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #4f46e5; margin: 0 0 8px;">Kinely</p>
        <h1 style="font-size: 22px; margin: 0 0 12px;">Email test</h1>
        <p style="font-size: 15px; margin: 0;">This is a Kinely diagnostic email. If you received it, Resend delivery is configured correctly.</p>
      </div>
    `.trim(),
  });

  const statusResult = await enrichResendDeliveryStatus(env, providerResult);

  return json({
    ok: true,
    provider: "resend",
    workerVersion: WORKER_VERSION,
    providerMessageId: statusResult.providerMessageId,
    lastEvent: statusResult.lastEvent,
    lookupError: statusResult.lookupError || "",
    providerResponseShape: statusResult.providerResponseShape || providerResponseShape(providerResult),
    to: recipient,
  }, { status: 200 }, origin);
}

function isAuthorizedWebhookRequest(request, env) {
  const expectedSecret = cleanText(env.WEBHOOK_SECRET);
  const providedSecret = cleanText(request.headers.get("x-kinely-webhook-secret"));
  return Boolean(expectedSecret && providedSecret && providedSecret === expectedSecret);
}

async function handleFamilyMembersBackfill(request, env, origin) {
  if (!isAuthorizedWebhookRequest(request, env)) {
    return json({ ok: false, error: "Unauthorized maintenance request." }, { status: 401 }, origin);
  }

  const payload = await request.json().catch(() => ({}));
  const write = payload.write === true;
  const familyId = cleanText(payload.familyId || payload.family_id);
  const limit = Math.min(Math.max(Number(payload.limit || 200), 1), 500);
  const now = new Date().toISOString();
  const families = familyId
    ? [await firestoreGetDoc(env, "families", familyId)].filter(Boolean)
    : (await firestoreRunQuery(env, {
        from: [{ collectionId: "families" }],
        limit,
      }));
  const token = {
    sub: "maintenance_worker",
    email: "worker@kinely.local",
  };
  const writes = [];
  const familiesSummary = [];

  for (const family of families) {
    const members = fallbackMembersFromFamily(family);
    const familyWrites = await familyMemberSyncWrites(env, family.id, members, token, now);
    const upsertCount = familyWrites.filter((writeItem) => writeItem.update).length;
    const deleteCount = familyWrites.filter((writeItem) => writeItem.delete).length;

    writes.push(...familyWrites);
    familiesSummary.push({
      familyId: family.id,
      familyName: cleanText(family.familyName || family.family_name || family.name),
      sourceMemberCount: members.length,
      upsertCount,
      deleteCount,
    });
  }

  let committedWriteCount = 0;
  if (write) {
    committedWriteCount = await firestoreCommitInChunks(env, writes);
  }

  return json({
    ok: true,
    dryRun: !write,
    familyCount: families.length,
    plannedWriteCount: writes.length,
    committedWriteCount,
    families: familiesSummary,
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
  const eventType = cleanText(payload?.type || payload?.event || payload?.data?.event, "resend_event");
  const data = payload?.data && typeof payload.data === "object" ? payload.data : payload;
  const providerMessageId = cleanText(
    data?.email_id ||
    data?.emailId ||
    data?.message_id ||
    data?.messageId ||
    data?.id ||
    payload?.id
  );

  console.log("Resend webhook received", {
    type: eventType,
    id: providerMessageId,
  });

  if (providerMessageId) {
    const now = new Date().toISOString();
    await firestoreCommit(env, [
      firestoreMergeWrite(env, EMAIL_DELIVERIES_COLLECTION, emailDeliveryDocId(providerMessageId), {
        provider: "resend",
        providerMessageId,
        provider_message_id: providerMessageId,
        status: eventType,
        lastEvent: eventType,
        last_event: eventType,
        webhookPayload: payload,
        webhook_payload: payload,
        updatedAt: now,
        updated_at: now,
      }),
    ]).catch((error) => {
      console.warn("Could not record Resend webhook event.", error);
    });
  }

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
        return json({ ok: true, service: "kinely-api", version: WORKER_VERSION }, { status: 200 }, origin);
      }

      if (request.method === "POST" && url.pathname === "/emails/send") {
        return await handleSendEmail(request, env, origin);
      }

      if (request.method === "POST" && url.pathname === "/invitations/family/send") {
        return await handleFamilyInvitationSend(request, env, origin);
      }

      if (request.method === "POST" && url.pathname === "/invitations/custody/send") {
        return await handleCustodyInvitationSend(request, env, origin);
      }

      if (request.method === "POST" && url.pathname === "/invitations/family/respond") {
        return await handleFamilyInvitationRespond(request, env, origin);
      }

      if (request.method === "POST" && url.pathname === "/invitations/custody/respond") {
        return await handleCustodyInvitationRespond(request, env, origin);
      }

      if (request.method === "POST" && url.pathname === "/custody-groups/save") {
        return await handleCustodyGroupSave(request, env, origin);
      }

      if (request.method === "POST" && url.pathname === "/custody-groups/delete") {
        return await handleCustodyGroupDelete(request, env, origin);
      }

      if (request.method === "POST" && url.pathname === "/custody-days/save") {
        return await handleCustodyDaysSave(request, env, origin);
      }

      if (request.method === "POST" && url.pathname === "/custody-days/delete") {
        return await handleCustodyDayDelete(request, env, origin);
      }

      if (request.method === "POST" && url.pathname === "/custody-records/save") {
        return await handleCustodyScopedRecordSave(request, env, origin);
      }

      if (request.method === "POST" && url.pathname === "/custody-records/delete") {
        return await handleCustodyScopedRecordDelete(request, env, origin);
      }

      if (request.method === "POST" && url.pathname === "/families/update") {
        return await handleFamilyUpdate(request, env, origin);
      }

      if (request.method === "POST" && url.pathname === "/families/delete") {
        return await handleFamilyDelete(request, env, origin);
      }

      if (request.method === "POST" && url.pathname === "/notifications/activity/send") {
        return await handleActivityNotificationSend(request, env, origin);
      }

      if (request.method === "POST" && url.pathname === "/diagnostics/email-test") {
        return await handleDiagnosticEmailTest(request, env, origin);
      }

      if (request.method === "POST" && url.pathname === "/diagnostics/email-test-auth") {
        return await handleAuthenticatedEmailTest(request, env, origin);
      }

      if (request.method === "POST" && url.pathname === "/maintenance/family-members/backfill") {
        return await handleFamilyMembersBackfill(request, env, origin);
      }

      if (request.method === "POST" && url.pathname === "/maintenance/reminders/run") {
        return await handleScheduledRemindersRun(request, env, origin);
      }

      if (request.method === "POST" && url.pathname === "/maintenance/reminders/run-auth") {
        return await handleAuthenticatedScheduledRemindersRun(request, env, origin);
      }

      if (request.method === "POST" && url.pathname === "/webhooks/resend") {
        return await handleResendWebhook(request, env, origin);
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
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      runScheduledCustodyReminders(env, {
        trigger: "cron",
        dryRun: false,
        force: false,
        scheduledTime: event.scheduledTime,
      })
        .then((result) => {
          console.log("Scheduled custody reminders processed", result);
        })
        .catch((error) => {
          console.error("Scheduled custody reminders failed", error);
        })
    );
  },
};
