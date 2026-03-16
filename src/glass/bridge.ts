import {
  waitForEvenAppBridge,
  CreateStartUpPageContainer,
  RebuildPageContainer,
  ImageContainerProperty,
  ImageRawDataUpdate,
  TextContainerProperty,
  TextContainerUpgrade,
  type EvenAppBridge,
  type EvenHubEvent,
} from '@evenrealities/even_hub_sdk';
import { TEXT_FULL, TEXT_TOP, IMAGE_TILES, DISPLAY_W, DISPLAY_H } from './layout';

export type PageLayout = 'text' | 'chart';

export class EvenHubBridge {
  private bridge: EvenAppBridge | null = null;
  private unsubEvents: (() => void) | null = null;
  private _pageReady = false;
  private _currentLayout: PageLayout | null = null;

  async init(): Promise<void> {
    this.bridge = await waitForEvenAppBridge();
  }

  get pageReady(): boolean { return this._pageReady; }
  get currentLayout(): PageLayout | null { return this._currentLayout; }

  /** Initial page: text-only (watchlist/splash). */
  async setupTextPage(): Promise<boolean> {
    if (!this.bridge) return false;
    try {
      const result = await this.bridge.createStartUpPageContainer(
        new CreateStartUpPageContainer({
          containerTotalNum: 1,
          textObject: [makeTextContainer(TEXT_FULL, 'EvenMarket\nLoading...', 1)],
        }),
      );
      this._pageReady = result === 0;
      this._currentLayout = 'text';
      return this._pageReady;
    } catch { return false; }
  }

  /** Switch to chart layout: text top + 3 image tiles. */
  async switchToChartLayout(topText: string): Promise<boolean> {
    if (!this.bridge || !this._pageReady) return false;
    if (this._currentLayout === 'chart') return true;
    try {
      await this.bridge.rebuildPageContainer(
        new RebuildPageContainer({
          containerTotalNum: 4,
          textObject: [makeTextContainer(TEXT_TOP, topText, 1)],
          imageObject: IMAGE_TILES.map((t) =>
            new ImageContainerProperty({
              containerID: t.id,
              containerName: t.name,
              xPosition: t.x,
              yPosition: t.y,
              width: t.w,
              height: t.h,
            }),
          ),
        }),
      );
      this._currentLayout = 'chart';
      return true;
    } catch { return false; }
  }

  /** Switch to text-only layout (full screen). */
  async switchToTextLayout(text: string): Promise<boolean> {
    if (!this.bridge || !this._pageReady) return false;
    if (this._currentLayout === 'text') return true;
    try {
      await this.bridge.rebuildPageContainer(
        new RebuildPageContainer({
          containerTotalNum: 1,
          textObject: [makeTextContainer(TEXT_FULL, text, 1)],
        }),
      );
      this._currentLayout = 'text';
      return true;
    } catch { return false; }
  }

  /** Update text content (works for both layouts — container id 1). */
  async updateText(content: string): Promise<void> {
    if (!this.bridge || !this._pageReady) return;
    await this.bridge.textContainerUpgrade(
      new TextContainerUpgrade({
        containerID: 1,
        containerName: 'main',
        contentOffset: 0,
        contentLength: 2000,
        content,
      }),
    );
  }

  /** Send image tile data as Uint8Array (faster serialization than number[]). */
  async sendImage(containerID: number, containerName: string, pngBytes: Uint8Array): Promise<void> {
    if (!this.bridge || !this._pageReady || this._currentLayout !== 'chart' || pngBytes.length === 0) return;
    await this.bridge.updateImageRawData(
      new ImageRawDataUpdate({ containerID, containerName, imageData: pngBytes }),
    );
  }

  onEvent(handler: (event: EvenHubEvent) => void): void {
    this.unsubEvents?.();
    if (!this.bridge) return;
    this.unsubEvents = this.bridge.onEvenHubEvent((event: EvenHubEvent) => {
      handler(event);
    });
  }

  dispose(): void {
    this.unsubEvents?.();
    this.unsubEvents = null;
    this.bridge = null;
  }
}

function makeTextContainer(
  slot: { id: number; name: string; x: number; y: number; w: number; h: number },
  content: string,
  isEventCapture: number,
): TextContainerProperty {
  return new TextContainerProperty({
    containerID: slot.id,
    containerName: slot.name,
    xPosition: slot.x,
    yPosition: slot.y,
    width: slot.w,
    height: slot.h,
    borderWidth: 0,
    borderColor: 0,
    paddingLength: 6,
    content,
    isEventCapture,
  });
}
