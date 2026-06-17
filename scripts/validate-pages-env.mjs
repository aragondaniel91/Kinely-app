import fs from "node:fs";
import path from "node:path";

const required = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_KINELY_API_URL",
];

const args = new Set(process.argv.slice(2));
const validateOnlyOnCloudflare = args.has("--cloudflare-only");
const isCloudflarePagesBuild =
  process.env.CF_PAGES === "1" || process.env.CF_PAGES === "true";

if (validateOnlyOnCloudflare && !isCloudflarePagesBuild) {
  console.log("Skipping Kinely Pages environment check outside Cloudflare Pages.");
  process.exit(0);
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .reduce((values, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return values;

      const separator = trimmed.indexOf("=");
      if (separator === -1) return values;

      const key = trimmed.slice(0, separator).trim();
      const rawValue = trimmed.slice(separator + 1).trim();
      values[key] = rawValue.replace(/^["']|["']$/g, "");
      return values;
    }, {});
}

const cwd = process.cwd();
const envFiles = [
  ".env",
  ".env.local",
  ".env.production",
  ".env.production.local",
].map((fileName) => path.join(cwd, fileName));

const fileEnv = Object.assign({}, ...envFiles.map(parseEnvFile));
const available = { ...fileEnv, ...process.env };
const missing = required.filter((key) => !String(available[key] || "").trim());

if (missing.length) {
  console.error("Cannot deploy Kinely Pages because Firebase build variables are missing.");
  console.error("");
  console.error("Missing:");
  missing.forEach((key) => console.error(`- ${key}`));
  console.error("");
  console.error("For local `wrangler pages deploy`, create `.env.production` with the Firebase web app config.");
  console.error("For Cloudflare Git builds, set these variables in Pages > Settings > Variables and Secrets, then retry the deployment in Cloudflare.");
  process.exit(1);
}

console.log("Kinely Pages environment check passed.");
