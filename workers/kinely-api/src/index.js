const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FIREBASE_CERTS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const FIRESTORE_SCOPE = "https://www.googleapis.com/auth/datastore";

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

function toFirestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === "string") return { stringValue: value };
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

async function firestoreCommit(env, writes = []) {
  const projectId = cleanText(env.FIREBASE_PROJECT_ID);
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`;
  const { response, body } = await firestoreRequest(env, url, {
    method: "POST",
    body: JSON.stringify({ writes }),
  });

  if (!response.ok) {
    throw new Error(`Firestore commit failed (${response.status}): ${JSON.stringify(body).slice(0, 800)}`);
  }

  return body;
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
    throw new Error(`Resend delivery failed (${response.status}): ${JSON.stringify(body).slice(0, 800)}`);
  }

  return body;
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
    providerMessageId: providerResult?.id || "",
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
    providerMessageId: providerResult?.id || "",
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

  const updates = sanitizeFamilyUpdates(payload.updates || payload.data || {}, token);
  await firestoreCommit(env, [
    firestoreMergeWrite(env, "families", familyId, updates),
  ]);

  return json({
    ok: true,
    familyId,
    updatedFieldCount: Object.keys(updates).length,
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
  const recipients = scope.recipients.filter((recipient) => !actorMatchesRecipient(activity, recipient));
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
      emailDeliveries.push(sendWithResend(env, activityEmail(env, notification)));
    }
  }

  if (notificationWrites.length) {
    await firestoreCommit(env, notificationWrites);
  }

  const emailResults = await Promise.allSettled(emailDeliveries);

  return json({
    ok: true,
    preferenceKey,
    inAppCount: notificationWrites.length,
    emailCount: emailResults.filter((result) => result.status === "fulfilled").length,
    emailFailedCount: emailResults.filter((result) => result.status === "rejected").length,
    skippedCount: skipped.length,
  }, { status: 200 }, origin);
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

      if (request.method === "POST" && url.pathname === "/invitations/family/send") {
        return handleFamilyInvitationSend(request, env, origin);
      }

      if (request.method === "POST" && url.pathname === "/invitations/custody/send") {
        return handleCustodyInvitationSend(request, env, origin);
      }

      if (request.method === "POST" && url.pathname === "/invitations/family/respond") {
        return handleFamilyInvitationRespond(request, env, origin);
      }

      if (request.method === "POST" && url.pathname === "/invitations/custody/respond") {
        return handleCustodyInvitationRespond(request, env, origin);
      }

      if (request.method === "POST" && url.pathname === "/custody-groups/save") {
        return handleCustodyGroupSave(request, env, origin);
      }

      if (request.method === "POST" && url.pathname === "/families/update") {
        return handleFamilyUpdate(request, env, origin);
      }

      if (request.method === "POST" && url.pathname === "/notifications/activity/send") {
        return handleActivityNotificationSend(request, env, origin);
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
