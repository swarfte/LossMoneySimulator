# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server on http://localhost:3000
- `npm run build` - Build production bundle
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Architecture Overview

This is a blind stock trading simulation game built with Next.js 16 (App Router) that fetches real market data from Yahoo Finance. Users trade an "anonymous" stock where only the industry is visible, with the actual symbol revealed only at game end.

### Tech Stack
- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling
- **Chart.js + react-chartjs-2** - Stock price visualization
- **yahoo-finance2** - Real-time stock data fetching

### Project Structure

```
app/
├── action.ts              # Server actions (stock data fetching)
├── api/new-game/route.ts  # API endpoint for new game data
├── GameClient.tsx         # Main client-side game component
├── page.tsx               # Homepage (SSR with initial data)
├── layout.tsx             # Root layout with fonts
└── globals.css            # Global styles
```

### Core Game Flow

1. **Setup Phase** (`gameState === "setup"`)
   - User sees welcome screen with game rules
   - Initial capital: $20,000
   - Random stock is pre-fetched but hidden

2. **Playing Phase** (`gameState === "playing"`)
   - User sees 90 days of historical price data (progressive disclosure)
   - Can open long (buy) or short positions
   - Trades executed at full position size based on available cash
   - Each click advances to next trading day
   - Portfolio value tracked in real-time

3. **End Phase** (`gameState === "ended"`)
   - Stock symbol revealed
   - Final profit/loss calculated
   - Option to start new game with different stock

### Data Flow

**Initial Load:**
1. `page.tsx` (SSR) → `getRandomStockData()` → fetches stock from Yahoo Finance
2. Data passed to `GameClient` as `initialData` prop

**New Game:**
1. Client calls `/api/new-game` GET endpoint
2. API route calls `getRandomStockData()`
3. Returns new stock data to client

### Key Components

**app/action.ts (Server Actions)**
- `getRandomStockData()` - Main data fetching function
  - Randomly selects from `ANONYMOUS_POOL` (12 stocks/indices/crypto)
  - Fetches 1 year of daily OHLC data from Yahoo Finance
  - Returns `{ symbol, industry, prices: [{date, price}] }`
  - Has fallback to simulated data if API fails
- Exported types: `GameData`

**app/GameClient.tsx (Client Component)**
- Manages all game state: `gameState`, `stockData`, `currentDayIndex`, `cash`, `position`, `portfolioValue`
- `visibleData` computed prop limits chart to days seen so far
- `handleAction()` handles buy/sell/short/cover trades
- `nextDay()` advances simulation
- Uses Chart.js for price line chart with gradient fill
- All UI is in Chinese (game title, buttons, labels)

### Trading Logic

**Long Position:**
- Buy: `cash -= shares * price`, `position = { type: "long", shares, entryPrice }`
- Sell: `cash += shares * currentPrice`, `position = null`

**Short Position:**
- Short: `cash += shares * price`, `position = { type: "short", shares, entryPrice }`
- Cover: `cash -= shares * currentPrice`, `position = null`

**Net Asset Value:**
- Long: `cash + shares * currentPrice`
- Short: `cash - shares * currentPrice`

### Configuration Notes

- **Path alias:** `@/*` maps to project root (tsconfig.json)
- **Tailwind v4:** Uses new v4 PostCSS plugin
- **Next.js 16:** Uses new App Router architecture (breaking changes from older versions)
