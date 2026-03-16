/**
 * Two page layouts, switched via rebuildPageContainer:
 *
 * TEXT LAYOUT (watchlist, settings, splash):
 *   1 text container (full display, event capture)
 *   = 1 container
 *
 * CHART LAYOUT (stock detail):
 *   1 text container on top (data + event capture)
 *   3 image tiles below (chart)
 *   = 4 containers
 */
export const DISPLAY_W = 576;
export const DISPLAY_H = 288;

export const G2_IMAGE_MAX_W = 200;
export const G2_IMAGE_MAX_H = 100;

// ── Text-only layout ──

export const TEXT_FULL = {
  id: 1,
  name: 'main',
  x: 0,
  y: 0,
  w: DISPLAY_W,
  h: DISPLAY_H,
};

// ── Chart layout ──

const TEXT_TOP_H = 88;
const TILE_W = 200;
const TILE_H = 100;
const TILE_Y = TEXT_TOP_H;

export const TEXT_TOP = {
  id: 1,
  name: 'main',
  x: 0,
  y: 0,
  w: DISPLAY_W,
  h: TEXT_TOP_H,
};

export interface TileSlot {
  id: number;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  crop: { sx: number; sy: number; sw: number; sh: number };
}

// Canvas for chart: 600x100, mapped 1:1 to 3 tiles
export const CHART_CANVAS_W = 600;
export const CHART_CANVAS_H = 100;

export const TILE_1: TileSlot = {
  id: 2, name: 'tile-1',
  x: 0, y: TILE_Y,
  w: TILE_W, h: TILE_H,
  crop: { sx: 0, sy: 0, sw: 200, sh: 100 },
};

export const TILE_2: TileSlot = {
  id: 3, name: 'tile-2',
  x: 200, y: TILE_Y,
  w: TILE_W, h: TILE_H,
  crop: { sx: 200, sy: 0, sw: 200, sh: 100 },
};

export const TILE_3: TileSlot = {
  id: 4, name: 'tile-3',
  x: 400, y: TILE_Y,
  w: TILE_W, h: TILE_H,
  crop: { sx: 400, sy: 0, sw: 200, sh: 100 },
};

export const IMAGE_TILES = [TILE_1, TILE_2, TILE_3];
