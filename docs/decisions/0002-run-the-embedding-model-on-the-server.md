# 0002: Run the embedding model on the server

**Status:** Accepted · **Date:** 2026-11-16

## Context

Semantic search needs an embedding for every product and for every query a visitor types. A hosted embedding API gives better vectors but needs a key, costs money per request and adds a dependency that can break a demo. The app runs on Render's free plan with 512 MB of memory.

## Decision

Use the Universal Sentence Encoder packaged for Node (EnergeticAI), which ships its weights inside an npm package. Product vectors are computed once and stored in the repo as 8-bit integers.

## Consequences

- No API key, no cost per query and nothing to configure on Render.
- The server measured about 320 MB of memory locally with the model loaded, which fits the free plan with some room.
- The model was first published in 2018. A current embedding model would likely score higher, so the semantic numbers here should not be read as the best semantic search can do.
- The repo carries about 42 MB of data files.
