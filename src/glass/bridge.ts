import { EvenBetterSdk } from '@jappyjan/even-better-sdk';
import type { EvenBetterPage, EvenBetterTextElement } from '@jappyjan/even-better-sdk';
import {
  RebuildPageContainer,
  ImageContainerProperty,
  ImageRawDataUpdate,
  TextContainerProperty,
  TextContainerUpgrade,
  type EvenAppBridge,
  type EvenHubEvent,
} from '@evenrealities/even_hub_sdk';
import { DISPLAY_W, DISPLAY_H, CHART_TEXT, IMAGE_TILES } from './layout';

export type PageLayout = 'splash' | 'text' | 'home' | 'chart';

// Column layout for watchlist — 3 equal columns across 576px
const COL1_X = 0;
const COL1_W = 192;
const COL2_X = 192;
const COL2_W = 192;
const COL3_X = 384;
const COL3_W = DISPLAY_W - 384;
const TEXT_H = DISPLAY_H;

function styleBorder(el: EvenBetterTextElement): EvenBetterTextElement {
  // Use thin green borders as column dividers — embrace the G2 styling
  return el.setBorder(b => b.setWidth(1).setColor('0').setRadius(0));
}

export class EvenHubBridge {
  private sdk: EvenBetterSdk;
  private rawBridge: EvenAppBridge | null = null;

  private textPage!: EvenBetterPage;
  private textElement!: EvenBetterTextElement;

  private watchlistPage!: EvenBetterPage;
  private wlColSym!: EvenBetterTextElement;
  private wlColPrice!: EvenBetterTextElement;
  private wlColPct!: EvenBetterTextElement;

  private settingsPage!: EvenBetterPage;
  private settingsElement!: EvenBetterTextElement;

  private chartDummyPage!: EvenBetterPage;

  private _currentLayout: PageLayout | null = null;
  private _pageReady = false;

  constructor() {
    this.sdk = new EvenBetterSdk();
    this.createPages();
  }

  get pageReady(): boolean { return this._pageReady; }
  get currentLayout(): PageLayout | null { return this._currentLayout; }

  private createPages(): void {
    // Splash/generic text page
    this.textPage = this.sdk.createPage('text');
    this.textElement = styleBorder(this.textPage.addTextElement(''));
    this.textElement
      .setPosition(p => p.setX(0).setY(0))
      .setSize(s => s.setWidth(DISPLAY_W).setHeight(DISPLAY_H));
    this.textElement.markAsEventCaptureElement();

    // Watchlist page: event capture overlay + 3 columns = 4 containers
    this.watchlistPage = this.sdk.createPage('watchlist');

    const wlCapture = styleBorder(this.watchlistPage.addTextElement(''));
    wlCapture
      .setPosition(p => p.setX(0).setY(0))
      .setSize(s => s.setWidth(DISPLAY_W).setHeight(DISPLAY_H));
    wlCapture.markAsEventCaptureElement();

    this.wlColSym = styleBorder(this.watchlistPage.addTextElement(''));
    this.wlColSym
      .setPosition(p => p.setX(COL1_X).setY(0))
      .setSize(s => s.setWidth(COL1_W).setHeight(TEXT_H));

    this.wlColPrice = styleBorder(this.watchlistPage.addTextElement(''));
    this.wlColPrice
      .setPosition(p => p.setX(COL2_X).setY(0))
      .setSize(s => s.setWidth(COL2_W).setHeight(TEXT_H));

    this.wlColPct = styleBorder(this.watchlistPage.addTextElement(''));
    this.wlColPct
      .setPosition(p => p.setX(COL3_X).setY(0))
      .setSize(s => s.setWidth(COL3_W).setHeight(TEXT_H));

    // Settings page: empty overlay for event capture + visible text element
    this.settingsPage = this.sdk.createPage('settings');

    const setCapture = styleBorder(this.settingsPage.addTextElement(''));
    setCapture
      .setPosition(p => p.setX(0).setY(0))
      .setSize(s => s.setWidth(DISPLAY_W).setHeight(DISPLAY_H));
    setCapture.markAsEventCaptureElement();

    this.settingsElement = styleBorder(this.settingsPage.addTextElement(''));
    this.settingsElement
      .setPosition(p => p.setX(0).setY(0))
      .setSize(s => s.setWidth(DISPLAY_W).setHeight(DISPLAY_H));

    // Chart dummy page (for SDK state tracking)
    this.chartDummyPage = this.sdk.createPage('chart-dummy');
    const chartDummyText = styleBorder(this.chartDummyPage.addTextElement(''));
    chartDummyText
      .setPosition(p => p.setX(0).setY(0))
      .setSize(s => s.setWidth(1).setHeight(1));
    chartDummyText.markAsEventCaptureElement();
  }

  async init(): Promise<void> {
    this.rawBridge = await EvenBetterSdk.getRawBridge() as unknown as EvenAppBridge;
    this._pageReady = true;
  }

  async setupTextPage(): Promise<boolean> {
    if (!this._pageReady) return false;
    try {
      this.textElement.setContent('');
      await this.sdk.renderPage(this.textPage);
      this._currentLayout = 'text';
      return true;
    } catch { return false; }
  }

  async switchToWatchlist(colSym: string, colPrice: string, colPct: string): Promise<boolean> {
    if (!this._pageReady) return false;
    try {
      this.wlColSym.setContent(colSym);
      this.wlColPrice.setContent(colPrice);
      this.wlColPct.setContent(colPct);
      await this.sdk.renderPage(this.watchlistPage);
      this._currentLayout = 'text';
      return true;
    } catch { return false; }
  }

  async updateWatchlist(colSym: string, colPrice: string, colPct: string): Promise<void> {
    if (!this._pageReady) return;
    this.wlColSym.setContent(colSym);
    this.wlColPrice.setContent(colPrice);
    this.wlColPct.setContent(colPct);
    await this.sdk.renderPage(this.watchlistPage);
  }

  async switchToSettings(text: string): Promise<boolean> {
    if (!this._pageReady) return false;
    try {
      this.settingsElement.setContent(text);
      await this.sdk.renderPage(this.settingsPage);
      this._currentLayout = 'text';
      return true;
    } catch { return false; }
  }

  async updateSettings(text: string): Promise<void> {
    if (!this._pageReady) return;
    this.settingsElement.setContent(text);
    await this.sdk.renderPage(this.settingsPage);
  }

  async updateText(content: string): Promise<void> {
    if (!this._pageReady) return;
    this.textElement.setContent(content);
    await this.sdk.renderPage(this.textPage);
  }

  async switchToHomeLayout(menuText: string): Promise<boolean> {
    if (!this.rawBridge || !this._pageReady) return false;
    try {
      await this.sdk.renderPage(this.chartDummyPage);
      const tile = IMAGE_TILES[0]!;
      // 3 containers: empty overlay (event capture) + menu text + image tile
      await this.rawBridge.rebuildPageContainer(
        new RebuildPageContainer({
          containerTotalNum: 3,
          textObject: [
            // Container 1: empty overlay for event capture (no bounce)
            new TextContainerProperty({
              containerID: 1, containerName: 'overlay',
              xPosition: 0, yPosition: 0, width: DISPLAY_W, height: DISPLAY_H,
              borderWidth: 0, borderColor: 0, paddingLength: 0,
              content: '', isEventCapture: 1,
            }),
            // Container 5: menu text below image
            new TextContainerProperty({
              containerID: 5, containerName: 'menu',
              xPosition: 0, yPosition: 100, width: DISPLAY_W, height: DISPLAY_H - 100,
              borderWidth: 0, borderColor: 0, paddingLength: 6,
              content: menuText, isEventCapture: 0,
            }),
          ],
          imageObject: [
            new ImageContainerProperty({
              containerID: tile.id, containerName: tile.name,
              xPosition: tile.x, yPosition: tile.y, width: tile.w, height: tile.h,
            }),
          ],
        }),
      );
      this._currentLayout = 'home';
      return true;
    } catch { return false; }
  }

  async updateHomeText(content: string): Promise<void> {
    if (!this.rawBridge || !this._pageReady || this._currentLayout !== 'home') return;
    await this.rawBridge.textContainerUpgrade(
      new TextContainerUpgrade({
        containerID: 5, containerName: 'menu',
        contentOffset: 0, contentLength: 2000, content,
      }),
    );
  }

  async switchToChartLayout(topText: string): Promise<boolean> {
    if (!this.rawBridge || !this._pageReady) return false;
    if (this._currentLayout === 'chart') return true;
    try {
      await this.sdk.renderPage(this.chartDummyPage);
      await this.rawBridge.rebuildPageContainer(
        new RebuildPageContainer({
          containerTotalNum: 4,
          textObject: [makeText(CHART_TEXT, topText, 1)],
          imageObject: IMAGE_TILES.map((t) =>
            new ImageContainerProperty({
              containerID: t.id, containerName: t.name,
              xPosition: t.x, yPosition: t.y, width: t.w, height: t.h,
            }),
          ),
        }),
      );
      this._currentLayout = 'chart';
      return true;
    } catch { return false; }
  }

  async updateChartText(content: string): Promise<void> {
    if (!this.rawBridge || !this._pageReady || this._currentLayout !== 'chart') return;
    await this.rawBridge.textContainerUpgrade(
      new TextContainerUpgrade({
        containerID: 1, containerName: 'main',
        contentOffset: 0, contentLength: 2000, content,
      }),
    );
  }

  async sendImage(containerID: number, containerName: string, pngBytes: Uint8Array): Promise<void> {
    if (!this.rawBridge || !this._pageReady || this._currentLayout === 'text' || pngBytes.length === 0) return;
    await this.rawBridge.updateImageRawData(
      new ImageRawDataUpdate({ containerID, containerName, imageData: pngBytes }),
    );
  }

  onEvent(handler: (event: EvenHubEvent) => void): void {
    this.sdk.addEventListener(handler);
  }

  dispose(): void {
    this.rawBridge = null;
  }
}

function makeText(
  slot: { id: number; name: string; x: number; y: number; w: number; h: number },
  content: string, isEventCapture: number,
): TextContainerProperty {
  return new TextContainerProperty({
    containerID: slot.id, containerName: slot.name,
    xPosition: slot.x, yPosition: slot.y,
    width: slot.w, height: slot.h,
    borderWidth: 0, borderColor: 0, paddingLength: 0,
    content, isEventCapture,
  });
}
