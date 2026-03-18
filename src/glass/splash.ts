import { createSplash, TILE_PRESETS } from 'even-toolkit/splash';

/**
 * Market splash renderer — candlestick chart + "EvenMarket" name.
 * Single tile (200x100), top-center on display.
 * "LOADING..." is shown as text in the menu container below.
 */
function renderMarketSplash(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const s = Math.min(w / 200, h / 200);

  // ── Tile 1: Candlestick chart + name (top 100px) ──

  const candles = [
    { o: 0.92, h: 0.86, l: 0.95, c: 0.87 },
    { o: 0.87, h: 0.70, l: 0.90, c: 0.72 },
    { o: 0.72, h: 0.67, l: 0.78, c: 0.76 },
    { o: 0.76, h: 0.58, l: 0.79, c: 0.60 },
    { o: 0.60, h: 0.55, l: 0.63, c: 0.57 },
    { o: 0.57, h: 0.52, l: 0.66, c: 0.64 },
    { o: 0.64, h: 0.60, l: 0.67, c: 0.62 },
    { o: 0.62, h: 0.42, l: 0.65, c: 0.44 },
    { o: 0.44, h: 0.38, l: 0.52, c: 0.50 },
    { o: 0.50, h: 0.46, l: 0.53, c: 0.48 },
    { o: 0.48, h: 0.30, l: 0.51, c: 0.32 },
    { o: 0.32, h: 0.26, l: 0.38, c: 0.36 },
    { o: 0.36, h: 0.22, l: 0.39, c: 0.24 },
    { o: 0.24, h: 0.08, l: 0.28, c: 0.12 },
  ];

  const chartX = 10 * s, chartTop = 3 * s;
  const chartW = 180 * s, chartH = 55 * s;
  const gap = 2 * s;
  const candleW = Math.floor((chartW - gap * (candles.length - 1)) / candles.length);

  for (let i = 0; i < candles.length; i++) {
    const cd = candles[i]!;
    const x = chartX + i * (candleW + gap);
    const midX = x + candleW / 2;
    const isUp = cd.c <= cd.o;

    const wickTop = chartTop + cd.h * chartH;
    const wickBot = chartTop + cd.l * chartH;
    const bodyTop = chartTop + Math.min(cd.o, cd.c) * chartH;
    const bodyBot = chartTop + Math.max(cd.o, cd.c) * chartH;
    const bodyH = Math.max(2 * s, bodyBot - bodyTop);

    const color = isUp ? '#d0d0d0' : '#505050';

    ctx.strokeStyle = color;
    ctx.lineWidth = 1 * s;
    ctx.beginPath();
    ctx.moveTo(midX, wickTop);
    ctx.lineTo(midX, wickBot);
    ctx.stroke();

    if (isUp) {
      ctx.fillStyle = color;
      ctx.fillRect(x, bodyTop, candleW, bodyH);
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1 * s;
      ctx.strokeRect(x, bodyTop, candleW, bodyH);
    }
  }

  ctx.fillStyle = '#e0e0e0';
  ctx.font = `bold ${16 * s}px "Courier New", monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('EvenMarket', w / 2, 78 * s);

  ctx.textAlign = 'left';
}

/**
 * G2 glasses splash — 1 image tile (chart + name) top-center,
 * "LOADING..." as centered text in the menu container below.
 */
export const marketSplash = createSplash({
  tiles: 1,
  tileLayout: 'vertical',
  tilePositions: TILE_PRESETS.topCenter1,
  canvasSize: { w: 200, h: 200 },
  minTimeMs: 2000,
  maxTimeMs: 5000,
  menuText: '\n\n' + ' '.repeat(48) + 'LOADING...',
  render: renderMarketSplash,
});
