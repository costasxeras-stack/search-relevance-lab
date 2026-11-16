// Builds the data files in /data from the WANDS dataset (github.com/wayfair/WANDS, MIT licence).
// Usage: node scripts/build-data.mjs /path/to/WANDS/dataset
import fs from "node:fs";
import path from "node:path";
import { initModel } from "@energetic-ai/embeddings";
import { modelSource } from "@energetic-ai/model-embeddings-en";

const src = process.argv[2];
if (!src) { console.error("Pass the path to the WANDS dataset folder."); process.exit(1); }
const out = path.resolve("data");
const tsv = (f) => {
  const lines = fs.readFileSync(path.join(src, f), "utf8").split("\n").filter(Boolean);
  const head = lines.shift().split("\t");
  return lines.map((l) => Object.fromEntries(l.split("\t").map((v, i) => [head[i], v])));
};
const clean = (s) => (s || "").replace(/\s+([.,;:!?’'])/g, "$1").replace(/\s+/g, " ").trim();
const snippet = (s, n) => { s = clean(s); return s.length <= n ? s : s.slice(0, s.lastIndexOf(" ", n)) + "…"; };

// Products: [name, class, category, description snippet, average rating, review count]
const rows = tsv("product.csv");
const products = rows.map((r) => [
  clean(r.product_name), clean(r.product_class), clean(r["category hierarchy"]),
  snippet(r.product_description, 400), Number(r.average_rating) || 0, Number(r.review_count) || 0,
]);
fs.writeFileSync(path.join(out, "products.json"), JSON.stringify(products));

// Queries. Split is fixed: query_id % 5 < 3 is train, the rest is test.
const queries = tsv("query.csv").map((r) => ({
  id: Number(r.query_id), q: clean(r.query), cls: clean(r.query_class),
  split: Number(r.query_id) % 5 < 3 ? "train" : "test",
}));
fs.writeFileSync(path.join(out, "queries.json"), JSON.stringify(queries));

// Labels. Exact = 2, Partial = 1, Irrelevant = 0.
// Duplicate rows with the same label are collapsed. Pairs with conflicting labels are dropped and counted.
const grade = { Exact: 2, Partial: 1, Irrelevant: 0 };
const seen = new Map();
let labelRows = 0;
for (const r of tsv("label.csv")) {
  labelRows++;
  const k = r.query_id + ":" + r.product_id;
  if (!seen.has(k)) seen.set(k, new Set());
  seen.get(k).add(grade[r.label]);
}
const labels = {};
let conflicts = 0, kept = 0;
for (const [k, set] of seen) {
  if (set.size > 1) { conflicts++; continue; }
  const [q, p] = k.split(":");
  (labels[q] ||= {})[p] = [...set][0];
  kept++;
}
fs.writeFileSync(path.join(out, "labels.json"), JSON.stringify(labels));

// Embeddings: product name + class, L2-normalised, stored as int8.
const model = await initModel(modelSource);
const dim = 512, B = 64;
const emb = new Int8Array(products.length * dim);
const quant = (vecs, target, offset) => vecs.forEach((v, i) => {
  let n = 0; for (const x of v) n += x * x; n = Math.sqrt(n) || 1;
  for (let j = 0; j < dim; j++) target[(offset + i) * dim + j] = Math.max(-127, Math.min(127, Math.round((v[j] / n) * 127)));
});
// Work is saved in chunks under data/.emb so an interrupted run can resume.
// Optional args 3 and 4 (worker index, worker count) let two processes share the work.
const CH = 3200, tmp = path.join(out, ".emb");
fs.mkdirSync(tmp, { recursive: true });
const worker = Number(process.argv[3] || 0), workers = Number(process.argv[4] || 1);
for (let c = 0; c * CH < products.length; c++) {
  const f = path.join(tmp, c + ".bin");
  if (c % workers !== worker || fs.existsSync(f)) continue;
  const part = products.slice(c * CH, (c + 1) * CH);
  const chunk = new Int8Array(part.length * dim);
  for (let i = 0; i < part.length; i += B) {
    const batch = part.slice(i, i + B).map((p) => (p[1] ? p[0] + ", " + p[1] : p[0]));
    quant(await model.embed(batch), chunk, i);
  }
  fs.writeFileSync(f + ".tmp", Buffer.from(chunk.buffer));
  fs.renameSync(f + ".tmp", f);
  console.log("chunk", c, new Date().toISOString().slice(11, 19));
}
for (let c = 0; c * CH < products.length; c++) {
  const f = path.join(tmp, c + ".bin");
  if (!fs.existsSync(f)) { console.log("Chunks missing; run again to finish."); process.exit(0); }
  const b = fs.readFileSync(f);
  emb.set(new Int8Array(b.buffer, b.byteOffset, b.length), c * CH * dim);
}
fs.writeFileSync(path.join(out, "embeddings.bin"), Buffer.from(emb.buffer));
const qemb = new Int8Array(queries.length * dim);
quant(await model.embed(queries.map((q) => q.q)), qemb, 0);
fs.writeFileSync(path.join(out, "query-embeddings.bin"), Buffer.from(qemb.buffer));

const meta = {
  source: "WANDS (Wayfair ANnotation Dataset), github.com/wayfair/WANDS, MIT licence",
  builtOn: new Date().toISOString().slice(0, 10),
  products: products.length, queries: queries.length,
  labelRows, uniquePairs: seen.size, duplicateRows: labelRows - seen.size,
  conflictingPairsDropped: conflicts, labelsKept: kept,
  trainQueries: queries.filter((q) => q.split === "train").length,
  testQueries: queries.filter((q) => q.split === "test").length,
  embeddingModel: "Universal Sentence Encoder (EnergeticAI English embeddings), 512 dimensions",
};
fs.writeFileSync(path.join(out, "meta.json"), JSON.stringify(meta, null, 2));
console.log(meta);
