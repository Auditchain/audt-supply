// Computes the supply numbers locally (same code the endpoint runs) and optionally writes static files for the GitHub Pages variant.
// Usage: node build/supply-api/local-run.mjs            -> prints the JSON
//        node build/supply-api/local-run.mjs --out docs  -> also writes docs/total.json, docs/circulating.json, docs/supply.json
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { computeSupply, toPublicJson } from "./supply-lib.mjs";
const here = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(here, "config.json"), "utf8"));
const sup = await computeSupply(config);
const pub = toPublicJson(sup);
console.log(JSON.stringify(pub, null, 2));
const i = process.argv.indexOf("--out");
if (i > 0) {
  const out = process.argv[i + 1]; mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "total.json"), JSON.stringify({ result: pub.total_supply }));
  writeFileSync(join(out, "circulating.json"), JSON.stringify({ result: pub.circulating_supply }));
  writeFileSync(join(out, "supply.json"), JSON.stringify(pub, null, 2));
  console.log("written to", out);
}
