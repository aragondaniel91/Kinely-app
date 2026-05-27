import fs from "fs";
import path from "path";

const ROOT = "src";
const files = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;

  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      walk(full);
    } else if (/\.(js|jsx|ts|tsx)$/.test(full)) {
      files.push(full);
    }
  }
}

function getLineNumber(text, index) {
  return text.slice(0, index).split("\n").length;
}


function shouldSkipFile(checkName, file) {
  const normalized = file.replace(/\\/g, "/");

  if (normalized.includes("/components/ui/")) return true;

  if (checkName === "Hardcoded color classes") {
    return [
      "src/lib/appColorUtils.js",
      "src/lib/personColorUtils.js",
      "src/components/app/AppDialog.jsx",
    ].includes(normalized);
  }

  if (checkName === "Hardcoded person/parent color risks") {
    return [
      "src/lib/appColorUtils.js",
      "src/lib/personColorUtils.js",
      "src/components/profile/ParentColorPicker.jsx",
    ].includes(normalized);
  }

  if (checkName === "Raw modal/dialog overlays") {
    return [
      "src/App.jsx",
      "src/components/ProtectedRoute.jsx",
      "src/components/app/AppDialog.jsx",
      "src/features/custody/components/budget/BudgetAppDialog.jsx",
      "src/features/tasks/components/RewardCelebrationOverlay.jsx",

      // Intentional complex modal/popover overlays, not simple alert/confirm dialogs.
      "src/features/custody/ExchangeHub.jsx",
      "src/features/custody/PackingHub.jsx",
      "src/features/custody/components/budget/BudgetExpenseDetail.jsx",
      "src/features/custody/components/budget/BudgetExpenseWizard.jsx",
      "src/features/family-calendar/components/FamilyEventOverflowPopover.jsx",

      // Intentional complex profile/event overlays.
      "src/components/profile/ProfileMemberEditorDialog.jsx",
      "src/features/family-calendar/components/FamilyEventDetailsPopover.jsx",

      // Large page-level overlays intentionally deferred for a focused UX refactor.
      "src/pages/Groceries.jsx",
      "src/pages/Meals.jsx",
    ].includes(normalized);
  }

  if (checkName === "Raw inputs/selects/textareas") {
    return normalized === "src/components/ui/input.jsx" || normalized === "src/components/ui/textarea.jsx";
  }

  return false;
}

const checks = [
  {
    name: "Browser dialogs still in use",
    regex: /\b(window\.)?(alert|confirm|prompt)\s*\(/g,
    severity: "P1",
    reason: "Breaks app visual DNA. Should use app dialog.",
  },
  {
    name: "Raw modal/dialog overlays",
    // Only flag truly custom overlays. shadcn DialogContent / AlertDialogContent is allowed.
    regex: /fixed\s+inset-0/g,
    severity: "P1",
    reason: "Likely custom overlay outside the app dialog system.",
  },
  {
    name: "Raw inputs/selects/textareas",
    regex: /<input\b|<select\b|<textarea\b/g,
    severity: "P2",
    reason: "Likely inconsistent form fields.",
  },
  {
    name: "Hardcoded person/parent color risks",
    regex: /mom.*orange|parent.*orange|coparent.*orange|custody.*orange|dad.*bg-blue|mom.*bg-amber|dad.*text-blue|mom.*text-amber|dad.*border-blue|mom.*border-amber|COLOR_MAP/g,
    severity: "P1",
    reason: "Could bypass parent/person color system.",
  },
  {
    name: "Hardcoded color classes",
    regex: /bg-(blue|amber|yellow|rose|emerald|green|violet|purple|orange|teal|indigo|sky)-|text-(blue|amber|yellow|rose|emerald|green|violet|purple|orange|teal|indigo|sky)-|border-(blue|amber|yellow|rose|emerald|green|violet|purple|orange|teal|indigo|sky)-/g,
    severity: "P2",
    reason: "Mostly visual/status colors; review only when tied to people, parents, or children.",
  },
  {
    name: "Old COLOR_MAP or ParentColorPicker dependency",
    regex: /COLOR_MAP|ParentColorPicker/g,
    severity: "P0",
    reason: "May bypass appColorUtils normalization.",
  },
  {
    name: "Custody legacy/scope fields",
    regex: /family_id|with_whom|withWhom|is_split|isSplit|custodyColor|custody_color|colorId|color_id|custodyGroupId|selectedCustodyGroup/g,
    severity: "P0",
    reason: "Important for multi-child/multi-family custody scope.",
  },
  {
    name: "Heavy visual effects",
    regex: /shadow-\[|blur-|backdrop-blur|hover:-translate|active:scale/g,
    severity: "P2",
    reason: "Can make tablet/kiosk feel heavy.",
  },
  {
    name: "Direct Firestore queries in UI components",
    regex: /getDocs\(|setDoc\(|addDoc\(|updateDoc\(|deleteDoc\(/g,
    severity: "P2",
    reason: "Data logic may be mixed with UI rendering.",
  },
];

walk(ROOT);

const report = [];

report.push("# Family Wall Audit Report");
report.push("");
report.push(`Scanned files: ${files.length}`);
report.push(`Generated: ${new Date().toISOString()}`);
report.push("");

for (const check of checks) {
  report.push(`## ${check.name}`);
  report.push("");
  report.push(`Severity: ${check.severity}`);
  report.push(`Reason: ${check.reason}`);
  report.push("");

  const hits = [];

  for (const file of files) {
    if (shouldSkipFile(check.name, file)) continue;

    const text = fs.readFileSync(file, "utf8");
    const matches = [...text.matchAll(check.regex)];

    if (matches.length) {
      hits.push({
        file,
        count: matches.length,
        lines: matches.slice(0, 12).map((match) => getLineNumber(text, match.index)),
      });
    }
  }

  if (!hits.length) {
    report.push("No matches found.");
    report.push("");
    continue;
  }

  hits
    .sort((a, b) => b.count - a.count)
    .forEach(({ file, count, lines }) => {
      report.push(`- ${file}: ${count} match(es), sample lines: ${lines.join(", ")}`);
    });

  report.push("");
}

fs.writeFileSync("family-wall-audit-report.md", report.join("\n"));
console.log("Audit complete: family-wall-audit-report.md");
