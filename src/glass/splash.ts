import { createSplash } from 'even-toolkit/splash';
import { DISPLAY_W, G2_IMAGE_MAX_W } from 'even-toolkit/layout';

// Exact pixel grid extracted from Even Hub icon (23x23)
const MARKET_ICON = [
  '.......................',
  '.......................',
  '.##....................',
  '.##....................',
  '.##..................##',
  '.##..................##',
  '.##................##..',
  '.##................##..',
  '.##......##......##....',
  '.##......##......##....',
  '.##....##..##..##....##',
  '.##....##..##..##....##',
  '.##..##......##......##',
  '.##..##......##......##',
  '.##......##......##..##',
  '.##......##......##..##',
  '.##..##..##..##..##..##',
  '.##..##..##..##..##..##',
  '.##..##..##..##..##..##',
  '.##..##..##..##..##..##',
  '.######################',
  '.######################',
  '.......................',
];

function drawPixelGrid(
  ctx: CanvasRenderingContext2D,
  grid: string[],
  w: number,
  h: number,
  color: string,
) {
  const rows = grid.length;
  const cols = grid[0]!.length;
  const tileH = Math.min(h, w / 2);
  const iconH = tileH;
  const cell = Math.min(w / cols, iconH / rows);
  const ox = (w - cols * cell) / 2;
  const oy = (iconH - rows * cell) / 2;
  ctx.fillStyle = color;
  for (let r = 0; r < rows; r++) {
    const row = grid[r]!;
    for (let c = 0; c < cols; c++) {
      if (row[c] === '#') {
        ctx.fillRect(ox + c * cell, oy + r * cell, cell + 0.5, cell + 0.5);
      }
    }
  }
}

/**
 * Market icon renderer — pixel-art candlestick chart.
 * Exact replica of Even Hub icon.
 */
function renderMarketSplash(ctx: CanvasRenderingContext2D, w: number, h: number) {
  drawPixelGrid(ctx, MARKET_ICON, w, h, '#e0e0e0');

}

/**
 * G2 glasses home tile — candlestick chart icon, top-center on display.
 */
export const marketSplash = createSplash({
  tiles: 1,
  tileLayout: 'vertical',
  tilePositions: [
    {
      x: Math.floor((DISPLAY_W - G2_IMAGE_MAX_W) / 2),
      y: 16,
      w: 176,
      h: 72,
    },
  ],
  canvasSize: { w: 200, h: 200 },
  minTimeMs: 0,
  maxTimeMs: 0,
  menuText: '',
  render: renderMarketSplash,
});
