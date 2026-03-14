import type { Store } from '../state/store';
import type { Screen } from '../state/types';
import { renderWatchlist } from './screens/watchlist';
import { renderChart } from './screens/chart';
import { renderSettings } from './screens/settings';
import { renderHowItWorks } from './screens/how-it-works';

type WebScreen = Screen | 'how-it-works';
let currentScreen: WebScreen | null = null;

export function initWebUI(store: Store): void {
  const app = document.getElementById('app');
  if (!app) return;

  // Navigation bar
  const nav = document.createElement('nav');
  nav.className = 'nav-bar';
  nav.innerHTML = `
    <button id="nav-watchlist" class="nav-btn active">Watchlist</button>
    <button id="nav-settings" class="nav-btn">Settings</button>
    <button id="nav-how" class="nav-btn">How It Works</button>
  `;
  app.innerHTML = '';
  app.appendChild(nav);

  const content = document.createElement('div');
  content.id = 'content';
  content.className = 'content';
  app.appendChild(content);

  function showScreen(screen: WebScreen, force = false): void {
    if (screen === currentScreen && !force) return;
    currentScreen = screen;

    // Update nav active state
    document.querySelectorAll('.nav-btn').forEach((btn) => btn.classList.remove('active'));
    if (screen === 'watchlist' || screen === 'stock-detail') {
      document.getElementById('nav-watchlist')?.classList.add('active');
    } else if (screen === 'settings') {
      document.getElementById('nav-settings')?.classList.add('active');
    } else if (screen === 'how-it-works') {
      document.getElementById('nav-how')?.classList.add('active');
    }

    switch (screen) {
      case 'watchlist':
        renderWatchlist(content, store);
        break;
      case 'stock-detail':
        renderChart(content, store);
        break;
      case 'settings':
        renderSettings(content, store);
        break;
      case 'how-it-works':
        renderHowItWorks(content);
        break;
      default:
        renderWatchlist(content, store);
        break;
    }
  }

  // Nav button handlers — all go through showScreen directly
  document.getElementById('nav-watchlist')?.addEventListener('click', () => {
    store.dispatch({ type: 'NAVIGATE', screen: 'watchlist' });
    showScreen('watchlist', true);
  });
  document.getElementById('nav-settings')?.addEventListener('click', () => {
    store.dispatch({ type: 'NAVIGATE', screen: 'settings' });
    showScreen('settings', true);
  });
  document.getElementById('nav-how')?.addEventListener('click', () => {
    showScreen('how-it-works', true);
  });

  // Initial render
  showScreen(store.getState().screen);

  // Subscribe to screen changes from non-web sources (glasses, keyboard)
  store.subscribe((state, prev) => {
    if (state.screen !== prev.screen) {
      showScreen(state.screen);
    }
  });
}
