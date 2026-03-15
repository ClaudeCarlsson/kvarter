# Kvarter — Swedish Housing Intelligence Platform

A data-dense housing search, analysis, and comparison platform for the Swedish real estate market. Dark Palantir-inspired interface that surfaces analytical insights on every listing.

## What It Does

**Search** — Find properties across Stockholm, Gothenburg, Malmö, Uppsala. Filter by price, rooms, area, property type, monthly fee. Stats bar shows count, median price, avg kr/m².

**Analyze** — Every property gets a hedonic price decomposition: how much is location vs. features vs. residual. Confidence badge shows if priced above/at/below model estimate.

**Compare** — Side-by-side comparison of properties with score charts across value, size, rooms, fee, and newness dimensions.

**Sold Data** — Historical sales with model predictions vs. actual outcomes. Model accuracy dashboard: MAE%, R², accuracy bands, bid premium analysis.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Next.js 16 (Bun) — App Router, React 19, RSC      │
│  Tailwind CSS 4 — Dark theme, data-dense UI         │
├──────────────┬──────────────┬───────────────────────┤
│ DataSource   │ Cache Layer  │ Analytics Engine       │
│ Interface    │ Redis + SWR  │ Hedonic Price Model    │
├──────────────┤              ├───────────────────────┤
│ • Playwright │              │ • Price decomposition  │
│ • Booli GQL  │              │ • Model accuracy       │
│ • Hemnet     │              │ • Sold data analysis   │
│              │              │ • Confidence scoring   │
└──────┬───────┴──────────────┴───────────────────────┘
       │
┌──────┴───────┐  ┌──────────────────┐  ┌─────────────┐
│ Scraper      │  │ Python Analytics │  │ Redis       │
│ (Docker +    │  │ (uv + sklearn)   │  │ (Docker)    │
│  Playwright) │  │ SCB, Lantmäteriet│  │             │
└──────────────┘  └──────────────────┘  └─────────────┘
```

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Bun 1.3+ |
| Framework | Next.js 16, React 19, TypeScript (strict) |
| Styling | Tailwind CSS 4 (Oxide, CSS custom properties) |
| UI | Radix UI, MapLibre GL, dark theme |
| Cache | Redis via ioredis (Docker) |
| Analytics (TS) | Hedonic decomposition, model accuracy tracking |
| Analytics (Python) | scikit-learn, pandas, httpx (managed by uv) |
| Scraping | Playwright + headless Chromium (Docker sidecar) |
| Testing | bun test (TS), pytest (Python) |

## Quick Start

```bash
# Prerequisites: Bun, Docker
git clone https://github.com/ClaudeCarlsson/kvarter.git
cd kvarter
bun install

# Start Redis
docker compose up redis -d

# Configure
cp .env.example .env.local
# Set DATA_SOURCE=playwright in .env.local for development

# Run
bun run dev
# Open http://localhost:3000
```

## Data Sources

Set `DATA_SOURCE` in `.env.local`:

| Value | Source | Requires |
|-------|--------|----------|
| `playwright` | Live Booli.se scraping via Chromium | `docker compose up scraper` |
| `booli-graphql` | Booli GraphQL API | API endpoint |
| `hemnet` | Hemnet.se scraping | Docker scraper |

For live data:
```bash
docker compose up scraper -d
# Set DATA_SOURCE=playwright in .env.local
```

## Routes

| Route | Description |
|-------|-------------|
| `/` | Property search with filters, stats, list/map view |
| `/property/[id]` | Detail page with hedonic price decomposition |
| `/compare?ids=1,2,3` | Side-by-side property comparison |
| `/sold` | Sold properties + model accuracy dashboard |

## Analytics

### Hedonic Price Model

Log-linear model decomposing prices into components:

```
ln(price) = intercept + Σ(coefficient × feature)
```

**Features**: sqm, rooms, floor, log(construction_age), monthly_fee, lat, lng, property_type

**Output per property**:
- Location value (geography contribution)
- Feature value (physical attributes contribution)
- Residual (over/underpriced signal)
- Confidence: below / at / above model estimate

### Model Accuracy (Sold Data)

Evaluated against historical sales:
- **MAE%** — Mean Absolute Error
- **R²** — Coefficient of determination
- **Accuracy bands** — % within 5%, 10%, 15%
- **Bid premium** — how much above/below asking

### Python Training Pipeline

```bash
cd analytics
uv sync
uv run pytest --cov       # 44 tests, 100% coverage
uv run python -m analytics.pipeline.runner
```

Outputs `data/coefficients.json` for the TypeScript frontend.

## Testing

```bash
bun run test              # 414+ TS tests, 100% line coverage
bun run test:analytics    # 44 Python tests, 100% coverage
bun run test:all          # Both
```

## Project Structure

```
├── src/
│   ├── app/                    # Pages: search, property, compare, sold
│   ├── components/             # UI: analytics, compare, search, layout, map
│   ├── lib/
│   │   ├── analytics/          # Decomposition, coefficients, model accuracy
│   │   ├── cache/              # Redis with stale-while-revalidate
│   │   ├── data-source/        # DataSource interface + implementations
│   │   └── scraper/            # Playwright, HTTP, Hemnet scrapers
│   └── types/                  # Property, SoldProperty, SearchFilters
├── analytics/                  # Python: sklearn model, SCB client, pipeline
├── scraper/                    # Playwright Docker sidecar
├── data/                       # Model coefficients JSON
└── docker-compose.yml          # Redis + scraper + analytics
```

## Docker

```bash
docker compose up redis -d          # Dev: Redis only
docker compose up -d                # Full: Redis + scraper + analytics
docker build -t kvarter .           # Production image
```
