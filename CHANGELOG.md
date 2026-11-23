# Changelog

All notable changes to Search Relevance Lab. Versions follow [docs/versioning.md](docs/versioning.md).

## [0.2.0] - 2026-11-23

### Changed
- New design: a large search box in the middle of the page, and a relevance strip for labelled queries that shows the label of each of the top 10 results for all three methods, with nDCG@10 next to each row.
- Each result shows its label as a coloured bar and a word.
- Own look: cool white, Instrument Sans, walnut search button. The scorecard page shares the new header, type and colours.
- New screenshots.

### Added
- Decision record 0004: search box and relevance strip.

Search, scores and data are unchanged.

## [0.1.0] - 2026-11-16

### Added
- Compare page: one query runs through keyword, semantic and re-ranked search, so you can see the three top-10 lists next to each other.
- Human labels on every result (Exact, Partial, Irrelevant or Not labelled) and nDCG@10 per method for the 480 labelled queries, so a ranking can be judged with a number and not by eye.
- Scorecard page: totals on 192 held-out test queries, plus a sortable and filterable table of every labelled query that links back to the compare page.
- A fourth baseline on the scorecard, keyword search where any word may match. Without it the re-ranked blend looked far better than it is.
- Scripts to rebuild the data, tune the blend weights and re-score, so every number on the site can be reproduced.
- Product brief, case study and three decision records.
