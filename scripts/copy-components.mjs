import { cp, mkdir, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

const compSrc = join(root, "src", "components");
const compDst = join(root, "components");
await mkdir(compDst, { recursive: true });
for (const entry of await readdir(compSrc, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith(".svelte")) {
    await cp(join(compSrc, entry.name), join(compDst, entry.name));
    console.log(`copied ${entry.name}`);
  }
}
