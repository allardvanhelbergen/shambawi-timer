import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "_site");

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

await Promise.all([
  cp(join(root, "index.html"), join(output, "index.html")),
  cp(join(root, "src"), join(output, "src"), { recursive: true }),
  cp(join(root, "assets"), join(output, "assets"), { recursive: true }),
]);

console.log(`GitHub Pages artifact created at ${output}`);
