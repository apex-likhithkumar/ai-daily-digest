# AI Daily Digest — Design Spec

Date: 2026-11-09
Status: Draft for review

## 1. Goal

A personal, shareable web dashboard that shows AI news from around the world,
filtered to what matters to the owner, with **Breaking / Today / Important**
filters and a one-line "why you need to know this" on every item.

Hard constraint: **everything must be free** (hosting, scheduling, LLM, data sources).

## 2. Decisions (from brainstorming)

| Topic | Decision |
|---|---|
| Delivery | Web dashboard (React), shareable by link |
| Interests | A backend/AI engineering, B model releases & benchmarks, E AI jobs/career, F tools & products |
| Volume | Default view = top 15–20 items; "All" tab holds everything collected |
| Freshness | Pipeline runs every 2–3 hours |
| Architecture | Serverless: scheduled GitHub Actions job -> JSON -> static React site |
| Repo | Public (unlimited free Actions minutes + free Pages) |
| Sharing | **Shared feed**: same items and same one-liners for every viewer; per-viewer filtering happens in the browser |
| Language | TypeScript for pipeline and frontend |

## 3. Non-goals

- No accounts, no login, no per-user server-side personalisation.
- No backend server or database.
- No mobile app. Push alerts (Telegram) are a possible later add-on, not in v1.
- No full-article scraping or republishing. We store title, link, source, short
  metadata and our own one-liner only.

## 4. Architecture

```
GitHub Actions cron (every ~3h)
  1. collect    sources.yml -> raw items (RSS, HN API, Reddit RSS, GitHub trending, job feeds)
  2. normalise  canonical URL, id = hash(canonical URL)
  3. dedupe     drop ids already in seen.json; cluster near-duplicate stories
  4. score      LLM (batched) -> importance, relevance, topic, whyItMatters
  5. label      rule-based: breaking / today / important
  6. publish    write feed.json + archive, build React site, deploy to GitHub Pages
```

Units and their boundaries (each testable alone):

| Unit | Does | Depends on |
|---|---|---|
| `collectors/*` | One module per source type; returns `RawItem[]` | network only |
| `normalise` | URL canonicalisation, id hashing | none |
| `cluster` | Merges near-duplicate stories into one item with `sources[]` | none (no LLM) |
| `scorer` | Sends batches to an `LlmClient`, validates JSON, applies fallback | `LlmClient` interface |
| `labeler` | Pure function: item + now + config -> labels | none |
| `store` | Reads/writes `seen.json`, `feed.json`, archive | filesystem |
| `web/` | React app; reads `feed.json`; all filtering client-side | static files |

State (`seen.json`, `archive/*.json`, `feed.json`) lives on a separate **`data`
branch** so `main` history stays clean. The deploy step builds the site from
`main` plus the latest `feed.json`.

## 5. Config files

`profile.yml` — the owner's interests:
- four topics (A/B/E/F), each with keywords (e.g. NestJS, RAG, agents, Claude, GPT, Gemini)
- boost rules (extra weight for stack matches and new model releases)
- mute list (e.g. crypto-AI hype)

`sources.yml` — feed list with a `tier` per source (tier 1 = primary labs/official
blogs). Adding a source is one entry, no code change.

`rules.yml` — thresholds for labels and ranking (defaults below), so tuning
needs no code change.

## 6. Data model

One item in `feed.json`:

```
id, title, url, sources[], publishedAt, firstSeenAt,
topic (A|B|E|F), importance (0-10), relevance (0-10),
whyItMatters (one line, <= ~140 chars),
labels: ("breaking" | "today" | "important")[],
scoredBy: "llm" | "fallback"
```

Items older than ~30 days move to archive files so the page stays fast.

## 7. Scoring and labels

**Default rank** (for the top-15–20 view): `0.6*importance + 0.4*relevance`, with
a recency decay so stale items sink.

**Labels (defaults, in `rules.yml`):**
- `breaking` = importance >= 8 AND (>= 3 distinct sources OR a tier-1 source) AND age <= 6h
- `today` = publishedAt within the last 24h
- `important` = importance >= 7, any age within the retention window

**LLM scoring:**
- Only items not in `seen.json` are sent.
- Batches of ~10 items per call; output is strict JSON validated against a schema.
- Invalid output: retry once, then fall back for that batch.
- Provider: Gemini free tier primary, Groq free tier as secondary. Current free
  limits are verified when the implementation plan is written, not assumed.

**Fallback scoring (no LLM / quota exhausted):** rule-based score from source
tier, number of sources, and profile keyword matches. Items are tagged
`scoredBy: "fallback"` and show without a one-liner. The page never goes blank
because of a quota failure.

## 8. Dashboard (React + Vite + TypeScript)

- Static site, no backend. Fetches `feed.json` (and archive on demand).
- Filter chips: **Breaking · Today · Important · All**; topic chips: **A · B · E · F**.
- Card: title, source count, relative time, the one-liner in emphasis, link out,
  topic badge.
- Per-viewer state in `localStorage`: selected topics, muted keywords, read/unread, theme.
  All access wrapped in try/catch; the page works with storage unavailable.
- "Last updated" stamp; a visible notice when data is stale (> 6h old).
- Dark and light mode, mobile-first layout, polished visual design (the
  `frontend-design` skill is used at implementation time).
- Hosted free on GitHub Pages; shareable by URL. Cloudflare Pages is the drop-in
  alternative if the repo ever becomes private.

## 9. Error handling and risks

| Risk | Handling |
|---|---|
| One source fails or times out | Log and skip it; other sources still publish |
| LLM quota exhausted / bad JSON | Fallback scoring (section 7) |
| GitHub cron is best-effort and can be delayed | Show "last updated"; stale notice in UI |
| Scheduled workflows in public repos can be auto-disabled after ~60 days without repo activity | Keep-alive step on the `data` branch; documented manual re-enable |
| Same story reported by many outlets | `cluster` merges them; source count feeds the breaking rule |
| Secrets | LLM keys only in GitHub Actions Secrets; never in the repo or `feed.json` |
| Copyright | Store only title, link, source, our one-liner; no article bodies |

## 10. Testing (test-first, Vitest)

- Unit tests: URL normalisation, dedupe/clustering, label rules (boundary cases
  for breaking), score JSON parsing and validation, fallback path.
- `LlmClient` is an interface; tests use a fake. Real quota is never spent in tests.
- Collector tests use saved sample payloads, not live network.
- Frontend: component tests for filters and card rendering; localStorage-unavailable case.
- One manual end-to-end run of the live Action before calling v1 done.

## 11. Build order

1. Project scaffold, config loading (`profile.yml`, `sources.yml`, `rules.yml`)
2. Normalise + dedupe + cluster (with tests)
3. Collectors (RSS first, then HN, Reddit, GitHub trending, jobs)
4. Scorer with `LlmClient` + fallback (with tests)
5. Labeler (with tests)
6. `store` + `feed.json` publishing on the `data` branch
7. React dashboard
8. GitHub Actions workflow (cron, build, deploy to Pages)
9. Manual end-to-end verification
