import '../web/styles/app.css';
import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import type { Store } from '../state/store';
import type { Poller } from '../data/poller';
import { StoreProvider } from './contexts/store-context';
import { PollerProvider } from './contexts/poller-context';
import { App } from './App';

export function initWebUI(store: Store, poller?: Poller): void {
  const app = document.getElementById('app');
  if (!app) return;

  const tree = (
    <StrictMode>
      <StoreProvider store={store}>
        {poller ? (
          <PollerProvider poller={poller}>
            <App />
          </PollerProvider>
        ) : (
          <App />
        )}
      </StoreProvider>
    </StrictMode>
  );

  createRoot(app).render(tree);
}
