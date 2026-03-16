/**
 * TEXT LAYOUT (watchlist, settings):
 *   1 text (event capture) = 1 container
 *
 * CHART LAYOUT (stock detail):
 *   1 text on top (event capture, 88px) for OHLC
 *   3 image tiles below (200x100, third tile 176px visible)
 *   = 4 containers
 */
export const DISPLAY_W = 576;
export const DISPLAY_H = 288;
export const G2_IMAGE_MAX_W = 200;
export const G2_IMAGE_MAX_H = 100;

// ── Splash layout (1 centered image) ──

export const SPLASH_IMG = {
  id: 1,
  name: 'splash',
  x: Math.floor((DISPLAY_W - G2_IMAGE_MAX_W) / 2),
  y: Math.floor((DISPLAY_H - G2_IMAGE_MAX_H) / 2),
  w: G2_IMAGE_MAX_W,
  h: G2_IMAGE_MAX_H,
};

// ── Viewport size per timeframe (ideal candle count for 576px chart) ──

export const VIEWPORT_PER_RESOLUTION: Record<string, number> = {
  '1': 60,   // 1 hour
  '5': 48,   // 4 hours
  '15': 40,  // 10 hours
  '60': 36,  // 1.5 days
  'D': 40,   // 2 months
  'W': 30,   // 7 months
  'M': 24,   // 2 years
};

// ── Text-only layout ──

export const TEXT_FULL = {
  id: 1,
  name: 'main',
  x: 0, y: 0,
  w: DISPLAY_W, h: DISPLAY_H,
};

// ── Chart layout ──

const TILE_W = 200;
const TILE_H = 100;
const TILE_Y = 0; // images at the top
const TEXT_BELOW_H = DISPLAY_H - TILE_H; // 188px — tall, short content = minimal bounce

export const CHART_TEXT = {
  id: 1,
  name: 'main',
  x: 0, y: TILE_H,
  w: DISPLAY_W, h: TEXT_BELOW_H,
};

export interface TileSlot {
  id: number; name: string;
  x: number; y: number; w: number; h: number;
  crop: { sx: number; sy: number; sw: number; sh: number };
}

// Canvas: 576x100. Third tile crops from x=376, 200px wide.
// On screen: x=400, only 176px visible (576-400), rest clipped.
export const CHART_CANVAS_W = 576;
export const CHART_CANVAS_H = 100;

export const TILE_1: TileSlot = {
  id: 2, name: 'tile-1',
  x: 0, y: 0,
  w: TILE_W, h: TILE_H,
  crop: { sx: 0, sy: 0, sw: 200, sh: 100 },
};

export const TILE_2: TileSlot = {
  id: 3, name: 'tile-2',
  x: 200, y: 0,
  w: TILE_W, h: TILE_H,
  crop: { sx: 200, sy: 0, sw: 200, sh: 100 },
};

// Third tile: crop 176px from canvas at x=400, render into 200px tile.
// The 24px right padding is black (clipped off-screen anyway).
export const TILE_3: TileSlot = {
  id: 4, name: 'tile-3',
  x: 400, y: 0,
  w: TILE_W, h: TILE_H,
  crop: { sx: 400, sy: 0, sw: 176, sh: 100 },
};

export const IMAGE_TILES = [TILE_1, TILE_2, TILE_3];
