# Product brief: Search Relevance Lab

## Problem

Relevance debates tend to run on anecdotes. Someone types a query, dislikes the third result and the team spends a sprint on it. Without labels and a shared metric, nobody can say whether a change made search better overall or only fixed the one query in the meeting.

## Users

- **Search product managers** who need to explain to stakeholders what a ranking change is worth.
- **Hiring managers and interviewers** who want to see how I reason about search quality.
- **Engineers new to search** who want to see BM25, embeddings and a blended ranker on real data.

## Goals for v0.1.0

1. Show three ranking methods on the same query at the same time.
2. Score each method against human labels with one standard metric.
3. Make every number reproducible from the repo.
4. State the limits of the scoring where the reader sees the scores.

## Scope

- One public catalog of 42,994 products with 480 labelled queries.
- Keyword search (BM25), semantic search (sentence embeddings) and a blend with four tuned weights.
- nDCG@10, a count of queries with no results and the share of results that have a label.

## Not in scope

- Uploading your own catalog or labels.
- Click data, personalisation or business rules such as stock and margin.
- Query understanding steps such as spelling correction or synonym lists.
- Any data from my employer.

## How I will know it works

- A reader can open a query where a method fails and see why within a minute.
- The scorecard numbers match the output of `npm run evaluate`.
- The page is usable on a phone.

## Open questions

- Would a larger pool of labels change the ranking of the methods? Semantic search is the one most likely to move.
- How would a real Learning to Rank model compare with four hand-picked features?
