// Search Relevance Lab server. No API keys: the catalog, labels and embedding model ship with the repo.
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { load, quantize } from "./lib/search.js";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.join(DIR, "package.json"), "utf8"));
const S = load();
const evalData = JSON.parse(fs.readFileSync(path.join(DIR, "data", "eval.json"), "utf8"));
const byText = new Map(S.queries.map((q, i) => [q.q.toLowerCase(), { ...q, i }]));

// The embedding model loads in the background so the server can answer straight away.
let model = null, modelError = null;
(async () => {
  try {
    const { initModel } = await import("@energetic-ai/embeddings");
    const { modelSource } = await import("@energetic-ai/model-embeddings-en");
    model = await initModel(modelSource);
    console.log("Embedding model ready");
  } catch (e) { modelError = e.message; console.error("Embedding model failed to load:", e.message); }
})();

const app = express();
app.disable("x-powered-by");
app.get("/", (req, res) => res.sendFile(path.join(DIR, "index.html")));
app.get(["/scorecard", "/scorecard.html"], (req, res) => res.sendFile(path.join(DIR, "scorecard.html")));

app.get("/api/meta", (req, res) => res.json({ version: pkg.version, ...S.meta, weights: S.weights }));

app.get("/api/queries", (req, res) =>
  res.json(S.queries.map((q) => ({ q: q.q, split: q.split, labels: Object.keys(S.labels[q.id] || {}).length }))));

app.get("/api/eval", (req, res) => res.json(evalData));

app.get("/api/search", async (req, res) => {
  const q = String(req.query.q || "").trim().slice(0, 120);
  if (!q) return res.status(400).json({ error: "Type a search query." });
  const known = byText.get(q.toLowerCase());
  let qv;
  if (known) qv = S.storedQueryVector(known.i);
  else if (model) qv = quantize((await model.embed([q]))[0]);
  else return res.status(503).json({ error: modelError ? "The embedding model could not load, so only labelled queries work right now." : "The embedding model is still loading. Try again in a few seconds." });

  const r = S.compare(q, qv, 10);
  const L = known ? S.labels[known.id] || {} : null;
  const shape = (m) => {
    const ids = r[m].results.map((x) => x[0]);
    return {
      total: r[m].total ?? null,
      ndcg: known ? S.ndcg(ids, known.id, 10) : null,
      results: r[m].results.map(([d, score]) => ({
        id: d, name: S.products[d][0], cls: S.products[d][1], desc: S.products[d][3],
        score: Number(score.toFixed(3)), label: L ? (L[d] ?? null) : undefined,
      })),
    };
  };
  res.json({
    query: q,
    labelled: known ? { split: known.split, labels: Object.keys(L).length } : null,
    keyword: shape("keyword"), semantic: shape("semantic"), reranked: shape("reranked"),
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Search Relevance Lab v${pkg.version} on port ${port}`));
