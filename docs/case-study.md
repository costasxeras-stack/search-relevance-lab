# Case study: how much does each step up in search buy?

## The question

A common roadmap for product search goes from keyword matching to semantic search to a learned ranker. Each step costs more to build and run. I wanted to measure what each step is worth on one catalog, with labels made by people.

## Approach

- **Data:** WANDS, an open dataset of 42,994 furniture and home products, 480 search queries and 233,448 relevance labels (Exact, Partial or Irrelevant).
- **Methods:** strict keyword search (BM25, every word must match), relaxed keyword search (any word may match), semantic search with sentence embeddings, and a blend of four signals with weights tuned by grid search.
- **Split:** 288 queries to tune the blend and 192 held out for the test. The split is a fixed rule on the query ID.
- **Metric:** nDCG@10 with gains of 2 for Exact, 1 for Partial and 0 for Irrelevant. Unlabelled results count as 0.

## Headline numbers

Source: WANDS dataset, scored on 2026-11-16 by `scripts/evaluate.mjs`, 192 test queries.

| Method | nDCG@10 | Queries with no results | Top-10 results with a label |
|---|---|---|---|
| Keyword, every word must match | 0.406 | 60 of 192 | 86% |
| Keyword, any word may match | 0.704 | 1 of 192 | 87% |
| Semantic | 0.497 | 0 of 192 | 65% |
| Re-ranked blend | 0.738 | 0 of 192 | 91% |

## Findings

### 1. Strict matching was the largest single problem

- **What:** strict keyword search returned nothing for 60 of 192 test queries (31%).
- **Evidence:** the scorecard filter "Keyword returns nothing" lists them. Many contain a brand or collection name that is not in the catalog text, such as a maker's name followed by a product type.
- **Why it matters:** an empty results page is the worst outcome for a shopper, and it was fixed by a match rule, with no model involved.
- **Status:** confirmed.

### 2. Relaxing the match rule beat strict search even when strict search had results

- **What:** on the 132 test queries where strict search returned something, it scored 0.590. Any-word search scored 0.749 on the same queries.
- **Evidence:** computed from the per-query rows in `data/eval.json`.
- **Why it matters:** the gain is larger than the empty pages alone explain. My reading is that strict search often returns fewer than ten products, so good partial matches never get a chance to appear.
- **Status:** the numbers are confirmed. The reason is a hypothesis.

### 3. The learned blend added a small step

- **What:** the blend scored 0.738 against 0.704 for any-word keyword search. It won on 80 test queries, lost on 40 and tied on 72.
- **Evidence:** scorecard, test set.
- **Why it matters:** it is a real gain but about a tenth the size of the gain from finding 1. If I had compared the blend only with strict keyword search, I would have credited the blend with a gain that belongs to the match rule.
- **Status:** confirmed for this dataset and these four features.

### 4. The blend learned to trust words over meaning

- **What:** the tuned weights are 0.4 for the keyword score, 0.3 for query words in the product name, 0.2 for query words in the product class and 0.1 for embedding similarity.
- **Evidence:** `data/weights.json`.
- **Why it matters:** it suggests that for short, noun-heavy product queries, exact words carry most of the signal. It may also reflect how the labels were collected, which is the next finding.
- **Status:** the weights are confirmed. The explanation is a hypothesis.

### 5. Semantic search was scored unfairly, and I can't yet say by how much

- **What:** semantic search scored 0.497, but only 65% of its top-10 results had a label.
- **Evidence:** the "Labelled in top 10" column on the scorecard.
- **Why it matters:** unlabelled results count as zero. Semantic search finds products with different wording, and those are the products least likely to have been labelled. Its real quality is somewhere above 0.497.
- **Status:** the coverage gap is confirmed. The size of the effect is unknown.

## What my own approach got wrong

My first scorecard had three rows: strict keyword, semantic and the blend. It showed the blend at 0.738 against 0.406, which looked like a large win for re-ranking. The blend draws its candidates from any-word search, so the comparison mixed two changes. Adding the any-word baseline moved most of the gain to the simpler change.

I also built the first index in a way that used about 340 MB before the model loaded, which would not have fit on the free hosting plan. Storing the index in typed arrays fixed it.

## What I would do next

1. Add a metric that skips unlabelled results, to put a number on finding 5.
2. Label a sample of the unlabelled semantic results by hand and re-score.
3. Try a current embedding model and see whether the blend's weight on meaning goes up.
4. Replace the four-weight blend with a small gradient-boosted ranker and more features.
5. Add spelling correction and measure it on the 60 empty-result queries.

## What I learned as a PM

- Pick the baseline before you look at the result. The comparison you choose decides the size of the win you report.
- A coverage number belongs next to every offline score. A score with low label coverage tells you about the labels as much as the method.
- The cheap fix deserves a test before the expensive one is funded.

## Limits

- One dataset, one product domain, queries in English.
- The embedding model is several years old.
- The blend was tuned on 288 queries with four features. It stands in for Learning to Rank but is far smaller than a production ranker.
- 14 pairs with conflicting labels were left out. See [decision 0003](decisions/0003-leave-out-pairs-with-conflicting-labels.md).
- No click or sales data, so nothing here says what shoppers would buy.
