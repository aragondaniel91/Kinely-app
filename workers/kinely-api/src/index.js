const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FIREBASE_CERTS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const FIRESTORE_SCOPE = "https://www.googleapis.com/auth/datastore";

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

function mergeInvites(existing = [], invite) {
  const map = new Map();
  listOrEmpty(existing).forEach((item) => {
    const email = normalizeEmail(item?.recipientEmail || item?.recipient_email);
    if (email) map.set(email, item);
  });
  map.set(normalizeEmail(invite.recipientEmail || invite.recipient_email), invite);
  return [...map.values()];
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
