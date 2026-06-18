import fs from "node:fs";
import path from "node:path";

function getArg(name) {
  const prefix = `${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = process.argv.indexOf(name);
  if (index >= 0) return process.argv[index + 1] || "";

  return "";
}

function hasArg(name) {
  return process.argv.includes(name);
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
      const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
      values[key] = value;
      return values;
    }, {});
}

function parseJsoncFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  try {
    const content = fs
      .readFileSync(filePath, "utf8")
      .replace(/^\s*\/\/.*$/gm, "")
      .replace(/,\s*([}\]])/g, "$1");
    return JSON.parse(content);
  } catch {
    return {};
  }
}

const cwd = process.cwd();
const fileEnv = Object.assign(
  {},
  ...[".env", ".env.local", ".env.production", ".env.production.local"].map((fileName) =>
    parseEnvFile(path.join(cwd, fileName))
  )
);
const pagesWranglerConfig = parseJsoncFile(path.join(cwd, "wrangler.jsonc"));
const env = { ...pagesWranglerConfig.vars, ...fileEnv, ...process.env };
const apiUrl = (getArg("--api") || env.VITE_KINELY_API_URL || env.KINELY_API_URL || "").replace(/\/+$/, "");
const secret = getArg("--secret") || env.KINELY_WEBHOOK_SECRET || env.WEBHOOK_SECRET || "";
const write = hasArg("--write");
const familyId = getArg("--family-id") || getArg("--familyId");
const limit = Number(getArg("--limit") || 200);

if (!apiUrl) {
  console.error("Missing API URL. Set VITE_KINELY_API_URL or pass --api https://your-worker.workers.dev");
  process.exit(1);
}

if (!secret) {
  console.error("Missing webhook secret. Set KINELY_WEBHOOK_SECRET/WEBHOOK_SECRET or pass --secret.");
  process.exit(1);
}

const payload = {
  write,
  limit: Number.isFinite(limit) ? limit : 200,
  ...(familyId ? { familyId } : {}),
};

console.log(`${write ? "Writing" : "Dry-running"} familyMembers backfill via ${apiUrl}`);
if (familyId) console.log(`Family: ${familyId}`);

const response = await fetch(`${apiUrl}/maintenance/family-members/backfill`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-kinely-webhook-secret": secret,
  },
  body: JSON.stringify(payload),
});

const data = await response.json().catch(() => ({}));
if (!response.ok || data.ok === false) {
  console.error(`Backfill request failed (${response.status}): ${JSON.stringify(data, null, 2)}`);
  process.exit(1);
}

console.log(JSON.stringify(data, null, 2));
if (!write) {
  console.log("\nDry run complete. Re-run with --write to apply these changes.");
}
