import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const hashes = new Set();
const styles = new Set();
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await scan(path);
    else if (entry.name.endsWith(".html")) {
      const html = await readFile(path, "utf8");
      for (const match of html.matchAll(
        /<script\b([^>]*)>([\s\S]*?)<\/script>/g,
      )) {
        if (
          /\bsrc=|type="application\/json"/.test(match[1]) ||
          !match[2].trim()
        )
          continue;
        hashes.add(
          `'sha256-${createHash("sha256").update(match[2]).digest("base64")}'`,
        );
      }
      for (const match of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)) {
        styles.add(
          `'sha256-${createHash("sha256").update(match[1]).digest("base64")}'`,
        );
      }
    }
  }
}
await scan(fileURLToPath(new URL("../dist", import.meta.url)));
const directory = new URL("../.generated/", import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(
  new URL("csp.json", directory),
  JSON.stringify({ scripts: [...hashes].sort(), styles: [...styles].sort() }),
);
console.log(
  `CSP allows ${hashes.size} exact hydration scripts and ${styles.size} exact styles; no unsafe-inline or unsafe-eval.`,
);
