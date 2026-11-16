# 0003: Leave out pairs with conflicting labels

**Status:** Accepted · **Date:** 2026-11-16

## Context

The source label file has 233,448 rows. 1,575 of them repeat a query and product pair that already appears. In most cases the repeat carries the same label. In 14 pairs the two rows disagree, for example Exact in one row and Partial in the other.

## Decision

Collapse repeats that agree into one label. Leave the 14 pairs that disagree out of the scoring, and report both counts on the scorecard.

## Consequences

- The scoring never has to guess which of two labels is right.
- Those 14 products count as unlabelled for their query, which follows the rule in decision 0001.
- 14 pairs out of 231,873 is too few to move any total on the scorecard.
- Anyone who prefers another rule, such as taking the lower label, can change one block in `scripts/build-data.mjs` and re-run the scripts.
