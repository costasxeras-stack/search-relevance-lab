// Learns the blend weights for the re-ranked method on the TRAIN queries only.
// Method: grid search over weights in steps of 0.1 that sum to 1, maximising mean nDCG@10.
import fs from "node:fs";
import { load } from "../lib/search.js";

const S = load();
const train = S.queries.map((q, i) => ({ ...q, i })).filter((q) => q.split === "train");
const cache = train.map((q) => ({ id: q.id, rows: S.features(q.q, S.storedQueryVector(q.i)).rows }));
const score = (w) => {
  let sum = 0, n = 0;
  for (const c of cache) {
    const v = S.ndcg(S.blend(c.rows, w).slice(0, 10).map((x) => x[0]), c.id);
    if (v !== null) { sum += v; n++; }
  }
  return sum / n;
};
let best = null;
for (let a = 0; a <= 10; a++) for (let b = 0; a + b <= 10; b++) for (let c = 0; a + b + c <= 10; c++) {
  const w = { bm25: a / 10, cosine: b / 10, nameCoverage: c / 10, classCoverage: (10 - a - b - c) / 10 };
  const s = score(w);
  if (!best || s > best.s) best = { w, s };
}
const out = {
  weights: best.w,
  trainQueries: cache.length,
  trainNdcgAt10: Number(best.s.toFixed(4)),
  method: "Grid search, step 0.1, weights sum to 1, objective mean nDCG@10 on train queries",
  trainedOn: new Date().toISOString().slice(0, 10),
};
fs.writeFileSync(new URL("../data/weights.json", import.meta.url), JSON.stringify(out, null, 2));
console.log(out);
