import {
  CreateStartUpPageContainer,
  RebuildPageContainer,
  ImageContainerProperty,
  TextContainerProperty,
} from '@evenrealities/even_hub_sdk';
import { DISPLAY_W, DISPLAY_H } from './layout';

// Match the Pong game pattern exactly:
// 1. createStartUpPageContainer with text-only (loading screen)
// 2. rebuildPageContainer with image containers once ready

export interface TileSlot {
  id: number;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

// Single image container matching the Pong game's approach (200x100 works)
// We use 576x286 like the original — but if this fails, we have the text fallback
export const TILE: TileSlot = {
  id: 2,
  name: 'img',
  x: 0,
  y: 0,
  w: DISPLAY_W,
  h: DISPLAY_H - 2,
};

export function composeLoadingPage(): CreateStartUpPageContainer {
  return new CreateStartUpPageContainer({
    containerTotalNum: 1,
    textObject: [
      new TextContainerProperty({
        containerID: 1,
        containerName: 'loading',
        content: 'EvenMarket\nLoading...',
        xPosition: 0,
        yPosition: 0,
        width: DISPLAY_W,
        height: DISPLAY_H,
        isEventCapture: 0,
        paddingLength: 8,
      }),
    ],
  });
}

export function composeImagePage(): RebuildPageContainer {
  return new RebuildPageContainer({
    containerTotalNum: 3,
    textObject: [
      new TextContainerProperty({
        containerID: 1,
        containerName: 'evt',
        content: ' ',
        xPosition: 0,
        yPosition: 0,
        width: DISPLAY_W,
        height: DISPLAY_H,
        isEventCapture: 1,
        paddingLength: 0,
      }),
    ],
    imageObject: [
      new ImageContainerProperty({
        containerID: TILE.id,
        containerName: TILE.name,
        xPosition: TILE.x,
        yPosition: TILE.y,
        width: TILE.w,
        height: TILE.h,
      }),
    ],
  });
}

// Text-only fallback page (if image page fails)
export function composeTextPage(): RebuildPageContainer {
  return new RebuildPageContainer({
    containerTotalNum: 2,
    textObject: [
      new TextContainerProperty({
        containerID: 1,
        containerName: 'evt',
        content: ' ',
        xPosition: 0,
        yPosition: 0,
        width: DISPLAY_W,
        height: DISPLAY_H,
        isEventCapture: 1,
        paddingLength: 0,
      }),
      new TextContainerProperty({
        containerID: 2,
        containerName: 'display',
        content: '',
        xPosition: 0,
        yPosition: 0,
        width: DISPLAY_W,
        height: DISPLAY_H,
        isEventCapture: 0,
        paddingLength: 8,
      }),
    ],
  });
}
