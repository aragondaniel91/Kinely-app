import { spawn, spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";
const command = isWindows ? "npx.cmd" : "npx";
const javaCheck = spawnSync("java", ["-version"], { stdio: "ignore" });

if (javaCheck.error || javaCheck.status !== 0) {
  console.error(
    "Firestore rules tests need Java because the Firebase Firestore Emulator runs on Java. Install Java and make sure `java -version` works, then run `npm run test:rules` again."
  );
  process.exit(1);
}

const args = [
  "firebase-tools",
  "emulators:exec",
  "--only",
  "firestore",
  "--project",
  "demo-kinely",
  "node scripts/firestore-rules-smoke-test.mjs",
];

const child = isWindows
  ? spawn(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", command, ...args], {
      stdio: "inherit",
    })
  : spawn(command, args, {
      stdio: "inherit",
    });

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`Firestore rules smoke test stopped by ${signal}.`);
    process.exit(1);
  }

  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
