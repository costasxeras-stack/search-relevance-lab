# 0001: Count unlabelled results as zero

**Status:** Accepted · **Date:** 2026-11-16

## Context

The dataset has 231,859 usable labels, but the catalog has 42,994 products and 480 queries. Most query and product pairs were never rated. When a method returns a product nobody rated, the score needs a rule.

Two options were on the table. Count the product as irrelevant, or skip it and score only the labelled results.

## Decision

Count an unlabelled product as zero gain, and show the share of top-10 results that have a label next to every score.

## Consequences

- No method can raise its score by returning products nobody checked.
- Semantic search is treated unfairly. Only 65% of its top-10 results on the test set have a label, against 86% to 91% for the other methods. Its score of 0.497 is a floor.
- The scorecard has to say this in plain words, because the headline number alone would mislead.
- A later version could add a second metric that skips unlabelled results, to show how much of the gap is the labels and how much is the method.
