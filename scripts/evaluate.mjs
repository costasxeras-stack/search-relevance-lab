// Scores all three methods on every labelled query and writes data/eval.json.
// The scorecard page reads this file. Re-run after any change to lib/search.js or the weights.
import fs from "node:fs";
import { load } from "../lib/search.js";

const S = load();
const K = 10;
const METHODS = ["keyword", "keywordAny", "semantic", "reranked"];
const perQuery = S.queries.map((q, i) => {
  const r = S.compare(q.q, S.storedQueryVector(i), K);
  const row = { id: q.id, q: q.q, split: q.split, keywordMatches: r.keyword.total };
  for (const m of METHODS) {
    const ids = r[m].results.map((x) => x[0]);
    const v = S.ndcg(ids, q.id, K);
    row[m] = { ndcg: v === null ? null : Number(v.toFixed(4)), judged: S.judged(ids, q.id, K), returned: ids.length };
  }
  return row;
});
const summarise = (rows) => {
  const out = { queries: rows.length };
  for (const m of METHODS) {
    const scored = rows.filter((r) => r[m].ndcg !== null);
    const slots = rows.reduce((s, r) => s + r[m].returned, 0);
    out[m] = {
      ndcgAt10: Number((scored.reduce((s, r) => s + r[m].ndcg, 0) / scored.length).toFixed(4)),
      scoredQueries: scored.length,
      zeroResultQueries: rows.filter((r) => r[m].returned === 0).length,
      judgedShareOfTop10: slots ? Number((rows.reduce((s, r) => s + r[m].judged, 0) / slots).toFixed(4)) : null,
    };
  }
  return out;
};
const out = {
  evaluatedOn: new Date().toISOString().slice(0, 10),
  k: K,
  weights: S.weights,
  test: summarise(perQuery.filter((r) => r.split === "test")),
  train: summarise(perQuery.filter((r) => r.split === "train")),
  perQuery,
};
fs.writeFileSync(new URL("../data/eval.json", import.meta.url), JSON.stringify(out));
console.log(JSON.stringify({ test: out.test, train: out.train }, null, 2));
