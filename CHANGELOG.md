# Changelog

All notable changes to Search Relevance Lab. Versions follow [docs/versioning.md](docs/versioning.md).

## [0.1.0] - 2026-11-16

### Added
- Compare page: one query runs through keyword, semantic and re-ranked search, so you can see the three top-10 lists next to each other.
- Human labels on every result (Exact, Partial, Irrelevant or Not labelled) and nDCG@10 per method for the 480 labelled queries, so a ranking can be judged with a number and not by eye.
- Scorecard page: totals on 192 held-out test queries, plus a sortable and filterable table of every labelled query that links back to the compare page.
- A fourth baseline on the scorecard, keyword search where any word may match. Without it the re-ranked blend looked far better than it is.
- Scripts to rebuild the data, tune the blend weights and re-score, so every number on the site can be reproduced.
- Product brief, case study and three decision records.
