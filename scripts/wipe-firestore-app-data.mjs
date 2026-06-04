import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const CONFIRM_VALUE = "DELETE_APP_DATA";

const APP_COLLECTIONS = [
  "users",
  "families",
  "familyEvents",
  "familyLists",
  "familyListItems",
  "familyPantryItems",
  "meals",
  "mealTemplates",
  "tasks",
  "taskTemplates",
  "rewards",
  "routineRuns",
  "children",
  "familyMembers",
  "familyActivity",
  "familyInvitations",
  "notifications",
  "mail",
  "custodyInvitations",
  "custodyGroups",
  "custodyDays",
  "custodySpecialEvents",
  "custodyTravelPlans",
  "custodyPackingItems",
  "custodyExpenses",
  "custodyExchanges",
  "custodyNotificationPrefs",
  "groceries",
];

function readDefaultProject() {
  const rcPath = resolve(process.cwd(), ".firebaserc");
  if (!existsSync(rcPath)) return "";

  try {
    const rc = JSON.parse(readFileSync(rcPath, "utf8"));
    return rc?.projects?.default || "";
  } catch {
    return "";
  }
}

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

const project = getArg("--project") || readDefaultProject();
const confirm = getArg("--confirm");
const dryRun = hasArg("--dry-run");
const only = getArg("--only");
const collections = only
  ? only.split(",").map((item) => item.trim()).filter(Boolean)
  : APP_COLLECTIONS;
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

if (!project) {
  console.error("Missing Firebase project. Pass --project <project-id> or set .firebaserc.");
  process.exit(1);
}

if (!dryRun && confirm !== CONFIRM_VALUE) {
  console.error(`Refusing to delete Firestore app data. Re-run with --confirm ${CONFIRM_VALUE}.`);
  process.exit(1);
}

console.log(`${dryRun ? "Dry run for" : "Deleting"} Firestore app data in project: ${project}`);
console.log(`Collections: ${collections.join(", ")}`);

for (const collectionName of collections) {
  const args = [
    "firebase-tools",
    "firestore:delete",
    collectionName,
    "--recursive",
    "--force",
    "--project",
    project,
  ];

  console.log(`\n> npx ${args.join(" ")}`);

  if (dryRun) continue;

  const result = spawnSync(npxCommand, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "inherit",
    shell: false,
  });

  if (result.status !== 0) {
    console.error(`Failed while deleting collection: ${collectionName}`);
    process.exit(result.status || 1);
  }
}

console.log(dryRun ? "\nDry run complete. No Firestore data was deleted." : "\nFirestore app data wipe complete.");
