import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseEnv = {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
};

const missingFirebaseVars = Object.entries(firebaseEnv)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingFirebaseVars.length) {
  const message = `Missing Firebase environment variables: ${missingFirebaseVars.join(", ")}`;

  if (typeof document !== "undefined") {
    const root = document.getElementById("root") || document.body;
    root.innerHTML = `
      <main style="min-height:100vh;display:grid;place-items:center;background:#fff7ed;padding:24px;font-family:Inter,system-ui,sans-serif;color:#172033;">
        <section style="max-width:640px;border:1px solid #fed7aa;background:#fff;border-radius:24px;padding:28px;box-shadow:0 24px 80px rgba(15,23,42,0.12);">
          <p style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#ea580c;">Kinely setup needed</p>
          <h1 style="margin:0 0 12px;font-size:28px;line-height:1.1;color:#111827;">Firebase environment variables are missing</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#475569;">Add these variables in your Cloudflare Pages project settings, then redeploy the site.</p>
          <pre style="white-space:pre-wrap;border-radius:16px;background:#111827;color:#f8fafc;padding:16px;font-size:13px;line-height:1.5;">${message}</pre>
        </section>
      </main>
    `;
  }

  throw new Error(message);
}

const firebaseConfig = {
  apiKey: firebaseEnv.VITE_FIREBASE_API_KEY,
  authDomain: firebaseEnv.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: firebaseEnv.VITE_FIREBASE_PROJECT_ID,
  storageBucket: firebaseEnv.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: firebaseEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: firebaseEnv.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
