export const DISPLAY_W = 576;
export const DISPLAY_H = 288;

export const CONTAINER_IDS = [1, 2, 3] as const;

export const MAIN_SLOT = {
  id: 1,
  name: 'main',
  x: 0,
  y: 0,
  w: DISPLAY_W,
  h: DISPLAY_H - 2,
};

export function dummySlot(index: number) {
  return {
    id: CONTAINER_IDS[index]!,
    name: `d-${index + 1}`,
    x: 0,
    y: DISPLAY_H - 2,
    w: 1,
    h: 1,
  };
}

// Chart area within the display
export const CHART_AREA = {
  x: 18,
  y: 140,
  w: 540,
  h: 130,
};
