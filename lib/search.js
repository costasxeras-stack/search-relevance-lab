// Search library shared by the server and the offline scripts.
// Three methods over the same catalog: keyword (BM25), semantic (embeddings), re-ranked (blend).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DATA = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data");
const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8"));
const DIM = 512;

const STOP = new Set("a an and are as at be by for from in is it of on or that the to with".split(" "));
const stem = (t) => {
  if (t.length > 4 && t.endsWith("ies")) return t.slice(0, -3) + "y";
  if (t.length > 4 && /(ches|shes|sses|xes)$/.test(t)) return t.slice(0, -2);
  if (t.length > 3 && t.endsWith("s") && !/(ss|us|is|as)$/.test(t)) return t.slice(0, -1);
  return t;
};
export const tokenize = (s) =>
  (s || "").toLowerCase().split(/[^a-z0-9]+/).filter((t) => t && !STOP.has(t)).map(stem);

export function load() {
  const products = read("products.json");
  const queries = read("queries.json");
  const labels = read("labels.json");
  const meta = read("meta.json");
  const buf = (f) => { const b = fs.readFileSync(path.join(DATA, f)); return new Int8Array(b.buffer, b.byteOffset, b.length); };
  const emb = buf("embeddings.bin");
  const qemb = buf("query-embeddings.bin");
  let weights = { bm25: 0.5, cosine: 0.5, nameCoverage: 0, classCoverage: 0 };
  try { weights = read("weights.json").weights; } catch { /* not trained yet */ }

  // Inverted index. Name and class terms count three times, description terms once.
  const N = products.length;
  // Postings are stored as typed arrays to keep memory low on a small server.
  const docLen = new Float32Array(N);
  const build = new Map(); // term -> { docs: [], tfs: [] }
  for (let d = 0; d < N; d++) {
    const p = products[d];
    const local = new Map();
    const bump = (t, w) => { local.set(t, (local.get(t) || 0) + w); docLen[d] += w; };
    for (const t of tokenize(p[0])) bump(t, 3);
    for (const t of tokenize(p[1])) bump(t, 3);
    for (const t of tokenize(p[3])) bump(t, 1);
    for (const [t, w] of local) {
      let e = build.get(t);
      if (!e) build.set(t, (e = { docs: [], tfs: [] }));
      e.docs.push(d); e.tfs.push(w);
    }
  }
  const postings = new Map();
  for (const [t, e] of build) postings.set(t, { docs: Int32Array.from(e.docs), tfs: Uint16Array.from(e.tfs) });
  build.clear();
  let avgLen = 0; for (let d = 0; d < N; d++) avgLen += docLen[d]; avgLen /= N;
  const K1 = 1.2, B = 0.75;

  // BM25. mode "all": every query term must appear. mode "any": at least one.
  function bm25(q, mode) {
    const terms = [...new Set(tokenize(q))];
    const scores = new Map(), hits = new Map();
    for (const t of terms) {
      const m = postings.get(t);
      if (!m) continue;
      const n = m.docs.length;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      for (let i = 0; i < n; i++) {
        const d = m.docs[i], tf = m.tfs[i];
        const s = (idf * tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * docLen[d]) / avgLen));
        scores.set(d, (scores.get(d) || 0) + s);
        hits.set(d, (hits.get(d) || 0) + 1);
      }
    }
    const out = [];
    for (const [d, s] of scores) if (mode === "any" || hits.get(d) === terms.length) out.push([d, s]);
    out.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
    return { terms, ranked: out };
  }

  // Cosine similarity of one query vector against every product (vectors are int8, unit length x 127).
  function cosineAll(qv) {
    const sims = new Float32Array(N);
    for (let d = 0, o = 0; d < N; d++, o += DIM) {
      let s = 0;
      for (let j = 0; j < DIM; j++) s += qv[j] * emb[o + j];
      sims[d] = s / (127 * 127);
    }
    return sims;
  }
  const topK = (sims, k) => {
    const idx = Array.from(sims.keys());
    idx.sort((a, b) => sims[b] - sims[a] || a - b);
    return idx.slice(0, k).map((d) => [d, sims[d]]);
  };
  const storedQueryVector = (i) => qemb.subarray(i * DIM, (i + 1) * DIM);

  function features(q, qv, pool = 100) {
    const any = bm25(q, "any");
    const sims = cosineAll(qv);
    const sem = topK(sims, pool);
    const bmTop = any.ranked.slice(0, pool);
    const bmScore = new Map(any.ranked);
    const cand = new Set([...bmTop.map((x) => x[0]), ...sem.map((x) => x[0])]);
    const maxBm = bmTop.length ? bmTop[0][1] : 1;
    const maxCos = sem[0][1], minCos = sem[sem.length - 1][1];
    const rows = [];
    const cov = (text) => {
      if (!any.terms.length) return 0;
      const set = new Set(tokenize(text));
      return any.terms.filter((t) => set.has(t)).length / any.terms.length;
    };
    for (const d of cand) {
      rows.push({
        d,
        bm25: Math.min(1, (bmScore.get(d) || 0) / maxBm),
        cosine: Math.max(0, Math.min(1, (sims[d] - minCos) / (maxCos - minCos || 1))),
        nameCoverage: cov(products[d][0]),
        classCoverage: cov(products[d][1]),
      });
    }
    return { rows, sem, any };
  }
  const blend = (rows, w) =>
    rows
      .map((r) => [r.d, w.bm25 * r.bm25 + w.cosine * r.cosine + w.nameCoverage * r.nameCoverage + w.classCoverage * r.classCoverage, r])
      .sort((a, b) => b[1] - a[1] || a[0] - b[0]);

  // Runs all three methods for one query. qv is the query embedding (int8).
  function compare(q, qv, k = 10, w = weights) {
    const strict = bm25(q, "all");
    const f = features(q, qv);
    return {
      keyword: { total: strict.ranked.length, results: strict.ranked.slice(0, k) },
      keywordAny: { total: f.any.ranked.length, results: f.any.ranked.slice(0, k) },
      semantic: { results: f.sem.slice(0, k) },
      reranked: { results: blend(f.rows, w).slice(0, k) },
    };
  }

  // nDCG@k. Gains: Exact 2, Partial 1, Irrelevant 0. Products nobody labelled count as 0.
  function ndcg(ids, qid, k = 10) {
    const L = labels[qid] || {};
    const dcg = (gs) => gs.reduce((s, g, i) => s + (2 ** g - 1) / Math.log2(i + 2), 0);
    const ideal = dcg(Object.values(L).sort((a, b) => b - a).slice(0, k));
    if (!ideal) return null;
    return dcg(ids.slice(0, k).map((d) => L[d] ?? 0)) / ideal;
  }
  const judged = (ids, qid, k = 10) => {
    const L = labels[qid] || {};
    return ids.slice(0, k).filter((d) => d in L).length;
  };

  return { products, queries, labels, meta, weights, bm25, compare, features, blend, ndcg, judged, storedQueryVector, DIM };
}

// Turns a float embedding into the int8 format used by the index.
export function quantize(v) {
  let n = 0; for (const x of v) n += x * x; n = Math.sqrt(n) || 1;
  const out = new Int8Array(v.length);
  for (let j = 0; j < v.length; j++) out[j] = Math.max(-127, Math.min(127, Math.round((v[j] / n) * 127)));
  return out;
}
