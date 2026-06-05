import { auth } from "@/lib/firebase";

function cleanText(value, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

export function workerApiBaseUrl() {
  const configuredUrl = cleanText(import.meta.env.VITE_KINELY_API_URL).replace(/\/+$/g, "");
  if (!configuredUrl) return "";
  if (/^https?:\/\//i.test(configuredUrl)) return configuredUrl;
  return `https://${configuredUrl}`;
}

export function hasWorkerApiConfigured() {
  return Boolean(workerApiBaseUrl());
}

export async function authorizedWorkerRequest(pathname, payload) {
  const workerBaseUrl = workerApiBaseUrl();
  if (!workerBaseUrl) return null;

  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("A signed-in user is required to call Kinely API.");

  const response = await fetch(`${workerBaseUrl}${pathname}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result?.ok === false) {
    throw new Error(result?.error || `Kinely API request failed with ${response.status}.`);
  }

  return result;
}
