# 0004: Lead with a search box and a relevance strip

**Status:** Accepted · 23 November 2026

## Context

Version 0.1.0 used the same visual template as the other portfolio apps, and a visitor had to read three lists of ten product names to see which method ranked better.

## Decision

Make the page look like a search engine: a large search box in the middle, the labelled queries as a second way in. For a labelled query, show a relevance strip above the lists: one row of 10 squares per method, coloured by the human label of each result (exact, partial, irrelevant, not labelled), with nDCG@10 next to each row. Each result in the lists keeps a thin bar in the same colour.

The app gets its own look: cool white, Instrument Sans, walnut for the search button (the catalog is furniture), and the four label colours as the only other colours. The scorecard page uses the same header, type and colours.

## Consequences

- The difference between methods is visible in one glance before any product name is read.
- Typed queries have no labels, so they show no strip. The status line says why.
- Labels are shown by colour and by word, so the page does not rely on colour alone.
