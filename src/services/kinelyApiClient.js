import { auth } from "@/lib/firebase";

const WORKER_REQUEST_TIMEOUT_MS = 20000;

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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WORKER_REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${workerBaseUrl}${pathname}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Kinely API request timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result?.ok === false) {
    throw new Error(result?.error || `Kinely API request failed with ${response.status}.`);
  }

  return result;
}
