# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (Vite HMR)
npm run build      # TypeScript check + Vite production build (tsc -b && vite build)
npm run preview    # Preview production build locally
npm run lint       # ESLint
```

## Architecture

**基金分析助手 (Fund Analysis Assistant)** — React 19 SPA for screening, ranking, comparing Chinese mutual funds, with AI-assisted analysis.

### Data Flow (unidirectional)

```
DataSource → FundDataService.executePipeline() → Context (useReducer) → UI Components

  [EastMoney / Alipay / Mock]          fetch→filter→rank          AppContext        React tree
```

1. **Data sources** (`src/services/IDataSource.ts`) implement a common interface. Three implementations: `EastMoneyDataSource` (real public APIs), `AlipayDataSource` (prepped for mini-program JSAPI), `MockDataSource` (offline fallback).
2. **`FundDataService`** is the singleton orchestrator. `executePipeline(conditions, weights, mode)` runs fetch → local filter → local rank and returns timing stats. Also manages source switching and connection state.
3. **`AppContext`** (`src/context/AppContext.tsx`) holds all state via `useReducer`. Components dispatch actions; the reducer is the single source of truth.
4. **Filter engine** (`src/data/filterEngine.ts`): Conditions support AND/OR grouping (grouped conditions are OR'd within a group, groups are AND'd together). Ranking uses percentile scoring with configurable per-dimension weights and directions (`asc`/`desc`/`optimal`).

### Key Design Decisions

- **Two-phase filtering**: The data source does coarse filtering (type, risk level) server-side; the filter engine does fine-grained filtering client-side. This is because external APIs have limited query capabilities.
- **Deterministic simulation**: Mock data and trend charts use a seeded PRNG based on `hashCode(fundCode)` so the same fund always produces the same simulated values across renders.
- **API proxy**: Anthropic API calls go through Vite dev proxy (`/api/anthropic` → `https://api.anthropic.com`) to avoid CORS. The API key is stored in `localStorage` by the user.
- **`verbatimModuleSyntax` is enabled** in tsconfig — type-only imports MUST use `import type { X }` syntax.

### State shape (`AppState`)

| Field | Purpose |
|-------|---------|
| `allFunds` | Full fund list from active data source |
| `filterConditions` | User-defined filter conditions (presets + custom) |
| `filterResults` / `rankedResults` | Outputs of the filter→rank pipeline |
| `rankingWeights` / `rankingMode` | Multi-dimension weighted ranking config |
| `compareFundIds` | Funds selected for side-by-side comparison (max 5) |
| `dataSourceType` | Active source: `'alipay'` / `'eastmoney'` / `'mock'` |
| `questionnaire` / `riskPreference` / `investmentAdvice` | Risk assessment + recommendations |

### Page Views

The app uses local state (`currentView`) for navigation, not React Router. Views: `main` (filter + results), `detail` (single fund), `compare`, `advice`, `user`. Fund detail page includes TrendChart (1M/1Y/3Y NAV line charts) and AIChatPanel (Claude-powered fund Q&A with streaming responses).

### External APIs (EastMoney)

- Fund list: `fund.eastmoney.com/js/fundcode_search.js` — returns `var r = [[code, pinyin, name, type, ...], ...]`
- Realtime NAV: `fundgz.1234567.com.cn/js/{code}.js` — returns `jsonpgz({dwjz, gsz, gszzl, ...})`
- Fund detail: `fund.eastmoney.com/pingzhongdata/{code}.js` — returns multiple JS variables (`Data_netWorthTrend`, `Data_rateInSimilarPersent`, etc.)

Fetch is capped at 200 funds in batches of 10 concurrent requests, with a 5-minute in-memory cache.
