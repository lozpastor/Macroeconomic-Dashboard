import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const out = resolve(root, "apps/web/out");

async function copyFile(from, to) {
  await mkdir(dirname(to), { recursive: true });
  await cp(from, to, { force: true });
}

async function copyDir(from, to) {
  await rm(to, { recursive: true, force: true });
  await cp(from, to, { recursive: true, force: true });
}

await copyFile(resolve(out, "index.html"), resolve(root, "index.html"));
await copyFile(resolve(out, "index.txt"), resolve(root, "index.txt"));
await copyFile(resolve(out, "404.html"), resolve(root, "404.html"));
await copyDir(resolve(out, "404"), resolve(root, "404"));
await copyDir(resolve(out, "_next"), resolve(root, "_next"));
await copyDir(resolve(out, "maps"), resolve(root, "maps"));
await copyFile(resolve(out, "data/gdp-dataset.json"), resolve(root, "data/gdp-dataset.json"));

console.log("Synced static GitHub Pages export to repository root.");
