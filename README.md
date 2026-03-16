# EvenMarket

Real-time market watchlist, interactive candlestick charts, and candle-by-candle navigation for **Even Realities G2** smart glasses — powered by Yahoo Finance.

![EvenMarket](media/hero.png)

**[Live Demo →](https://even-market.vercel.app)**

---

## Features

- **Multi-asset watchlist** — Stocks, Forex, Commodities, Crypto, ETFs all in one list
- **Graphics model** — Each entry is a *graphic*: symbol + timeframe pair. Track AAPL on Daily and 1-min simultaneously
- **3-column glasses layout** — Pixel-aligned Symbol | Price | Change columns using `@jappyjan/even-better-sdk`
- **Interactive candle navigation** — Scroll candle-by-candle with OHLCV table below the chart
- **Per-graphic timeframe cycling** — Tap [TF] to cycle M1 / M5 / M15 / H1 / D / W / Mo
- **Dual rendering** — Glasses display (tiled images + text containers) and web dashboard (React 19 + Tailwind v4)
- **Chart zoom/pan** — Mouse wheel zoom, click-drag pan, pinch-to-zoom on mobile, infinite scroll for historical data
- **Home screen** — Splash chart image + Watchlist/Settings menu on glasses
- **Professional web UI** — Amber/gold dark theme, mobile card stack, segmented controls
- **No API key required** — Yahoo Finance with serverless proxy on Vercel
- **Auto-refresh** — Configurable polling interval (5s–60s)

---

## Screenshots

| Watchlist (Web + Glasses) | Chart Detail (Web + Glasses) |
|---------------------------|------------------------------|
| ![Watchlist](media/watchlist.png) | ![Detail](media/detail.png) |

| Candle Navigation | Settings |
|-------------------|----------|
| ![Candle Nav](media/nav.png) | ![Settings](media/settings.png) |

### Demo

https://github.com/fabioglimb/even-market/raw/main/media/demo.mp4

---

## Glasses Navigation

```
HOME
  Scroll up/down    Toggle between Watchlist and Settings
  Tap               Enter selected screen
  Double-tap        (no action)

WATCHLIST
  Scroll up/down    Navigate between graphics (sliding window)
  Tap               Open selected graphic detail
  Double-tap        Back to home

STOCK DETAIL
  Scroll up/down    Move between [TF] and [NAV] action buttons
  Tap [TF]          Enter timeframe navigation mode
  Tap [NAV]         Enter candle navigation mode
  Double-tap        Back to watchlist

TIMEFRAME NAVIGATION
  The [TF] button blinks to show the mode is active.
  Scroll up/down    Cycle through M1 / M5 / M15 / H1 / D / W / Mo
  Tap               Confirm selection and exit TF nav

CANDLE NAVIGATION
  Scroll up/down    Move through candles (inverted: down=newer, up=older)
  Selected candle highlighted with ── divider lines
  OHLCV table shows multiple candles at once
  Tap               Exit candle nav

SETTINGS
  Scroll up/down    Move between Refresh Interval and Chart Type
  Tap               Enter edit mode, scroll to change value
  Double-tap        Back to home
```

---

## Supported Assets

| Type | Examples | Yahoo Format (auto-mapped) |
|------|----------|---------------------------|
| Stocks | AAPL, TSLA, MSFT, NVDA | Direct ticker |
| Forex | EURUSD, GBPUSD, USDJPY | Appends `=X` |
| Gold | XAUUSD | Maps to `GC=F` |
| Silver | XAGUSD | Maps to `SI=F` |
| Oil | OIL, WTIUSD | Maps to `CL=F` |
| Brent | BRENT | Maps to `BZ=F` |
| Natural Gas | NATGAS | Maps to `NG=F` |
| Crypto | BTC-USD, ETH-USD | Direct ticker |
| ETFs | SPY, QQQ, IWM | Direct ticker |

Just type the symbol naturally — the app handles Yahoo Finance ticker conversion automatically.

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Development

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. The web dashboard is fully functional without glasses connected.

### Keyboard Shortcuts (Web Testing)

| Key | Action |
|-----|--------|
| `Arrow Up / Down` | Navigate / scroll |
| `Enter` | Select / confirm |
| `Escape / Backspace` | Go back |
| `c` | Toggle candle navigation |
| `r` | Cycle timeframe resolution |

### Build & Deploy

```bash
npm run build          # TypeScript check + Vite production build
npm run pack           # Build + package as .ehpk for Even Hub
```

### Deploy to Vercel

The app is configured for Vercel with a serverless Yahoo Finance proxy:

```bash
git push origin main   # Auto-deploys to Vercel
```

Or deploy manually: connect the GitHub repo at [vercel.com](https://vercel.com) — it auto-detects the config.

### Deploy to Glasses

```bash
npm run qr             # Generate QR code for local sideloading
```

Or share the Vercel URL — scan the QR code or open the link in the Even Realities companion app:

<p align="center">
  <img src="media/qrcode.png" alt="QR Code" width="200" />
</p>

---

## Architecture

```
src/
  state/
    types.ts          Screen, AppState, Settings, GraphicEntry
    actions.ts        Action union type
    reducer.ts        Pure state transitions, home/watchlist/detail/settings
    selectors.ts      Display data formatting for glasses
    store.ts          Minimal Redux-like store with subscriptions
  data/
    yahoo-finance.ts  Quote + candle fetching, period-based history loading
    poller.ts         Periodic quote refresh, candle caching, older candle fetch
  glass/
    bootstrap.ts      Orchestrator: store, poller, SDK bridge, side effects
    canvas-renderer.ts  Chart rendering (candles, sparkline, splash image)
    bridge.ts         Even Better SDK + raw bridge hybrid for glasses display
    layout.ts         Display dimensions, tile slots, container positions
    png-utils.ts      4-bit greyscale PNG encoding via upng-js
  web/
    App.tsx           React router with NavBar
    screens/          Watchlist, Chart, Settings, HowItWorks
    components/
      ui/             Card, Badge, Button, SegmentedControl, Table, Icons
      shared/         NavBar, QuoteCard, QuoteRow, CandlestickChart, ChartInfo
    contexts/         StoreProvider, PollerProvider
    hooks/            useSelector, useDispatch, useQuotes, useGraphics
    styles/app.css    Amber/gold dark theme tokens
  input/
    keyboard.ts       Keyboard bindings for web testing
    action-map.ts     Even Hub gesture to action mapping
    gestures.ts       Tap/scroll debouncing with text-update suppression
  utils/
    format.ts         Price, percent, volume, candle time formatting
    keep-alive.ts     Background persistence (audio + web locks)
  main.ts             Entry point: boots glasses + web + keyboard
api/
  yf.mjs              Vercel serverless Yahoo Finance proxy
```

---

## G2 Hardware Constraints

- **Max 4 containers per page** — every layout decision is constrained by this
- **Image tiles**: 200x100 max, 3 tiles = 576x100 chart area
- **Text containers**: proportional font, no text-align control
- **Column alignment**: achieved via separate text containers at pixel positions (`@jappyjan/even-better-sdk`)
- **Scroll bounce**: eliminated on Home/Watchlist/Settings via empty event-capture overlay pattern. Chart detail still bounces (4-container limit, no room for overlay).
- **BLE throughput**: image updates throttled with hash-based diffing to skip unchanged tiles

---

## License

MIT
