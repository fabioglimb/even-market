/**
 * Main entry point for ER Market app.
 * Boots the web UI (visible in browser) AND the glasses
 * canvas renderer (hidden, pushes to glasses via SDK).
 */

import { initGlassesRenderer, getStore, getPoller } from './glass/bootstrap';
import { initWebUI } from './web/main';
import { bindKeyboard } from './input/keyboard';

async function boot(): Promise<void> {
  // Initialize glasses renderer (also creates the store)
  await initGlassesRenderer();

  const store = getStore();
  const poller = getPoller();

  // Boot web UI
  initWebUI(store, poller);

  // Bind keyboard for web dev testing
  bindKeyboard(store);
}

boot().catch((err) => {
  const app = document.getElementById('app');
  if (app) app.textContent = 'Failed to initialize app: ' + String(err);
});
