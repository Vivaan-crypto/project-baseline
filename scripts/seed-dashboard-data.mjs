// The dashboard statically imports app/_data/dashboard.json, but that file is
// gitignored because a real export contains personal activity data. A fresh
// clone therefore has no such file and the build would fail on a missing
// import. Copy the tracked synthetic sample into place when it's absent.
//
// Never overwrites an existing file, so a real export survives npm run dev.
import { copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(root, "app", "_data", "dashboard.json");
const sample = join(root, "app", "_data", "dashboard.sample.json");

if (existsSync(target)) {
  process.exit(0);
}
copyFileSync(sample, target);
console.log("seeded app/_data/dashboard.json from the synthetic sample");
