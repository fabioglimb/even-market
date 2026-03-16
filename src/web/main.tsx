import '../web/styles/app.css';
import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import type { Store } from '../state/store';
import { StoreProvider } from './contexts/store-context';
import { App } from './App';

export function initWebUI(store: Store): void {
  const app = document.getElementById('app');
  if (!app) return;

  createRoot(app).render(
    <StrictMode>
      <StoreProvider store={store}>
        <App />
      </StoreProvider>
    </StrictMode>,
  );
}
