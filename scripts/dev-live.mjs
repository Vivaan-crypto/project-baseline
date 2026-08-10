// Runs the dev server and the export watcher together, so the dashboard
// refreshes itself while the collector is capturing.
//
// Deliberately does NOT start the collector. Beginning to record someone's
// keystrokes should be an explicit act they typed on purpose, not a side
// effect of starting a dev server. Run `npm run collect` separately.
//
// Spawns directly rather than pulling in a runner like concurrently, to keep
// the dependency list short.
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const python = process.env.PYTHON ?? "python";
const interval = process.env.EXPORT_INTERVAL ?? "120";
const db = process.env.BASELINE_DB;

const children = [];
let shuttingDown = false;

function start(name, command, args) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  });

  const tag = (stream, prefix) => {
    stream.setEncoding("utf8");
    let buffer = "";
    stream.on("data", (chunk) => {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.trim()) console.log(`${prefix} ${line}`);
      }
    });
  };
  tag(child.stdout, `[${name}]`);
  tag(child.stderr, `[${name}]`);

  child.on("exit", (code) => {
    if (shuttingDown) return;
    console.log(`[${name}] exited with code ${code}`);
    // One dying without the other leaves a half-working setup that looks
    // fine but silently stops updating, so take both down.
    shutdown(code ?? 1);
  });

  children.push(child);
  return child;
}

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

const watchArgs = ["-m", "engine.watch", "--interval", interval, "--source", "real"];
if (db) watchArgs.push("--db", db);

start("next", "npx", ["next", "dev"]);
start("export", python, watchArgs);

console.log(
  "\nDashboard will refresh on its own every " +
    interval +
    "s. Run `npm run collect` in another terminal to capture.\n",
);
