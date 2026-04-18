import type { Store } from '../state/store';

export function bindKeyboard(store: Store): void {
  document.addEventListener('keydown', (e) => {
    // Don't intercept when typing in input fields
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        store.dispatch({ type: 'HIGHLIGHT_MOVE', direction: 'up' });
        break;
      case 'ArrowDown':
        e.preventDefault();
        store.dispatch({ type: 'HIGHLIGHT_MOVE', direction: 'down' });
        break;
      case 'Enter':
        e.preventDefault();
        store.dispatch({ type: 'SELECT_HIGHLIGHTED' });
        break;
      case 'Escape':
      case 'Backspace':
        e.preventDefault();
        store.dispatch({ type: 'GO_BACK' });
        break;
      case 'c':
        e.preventDefault();
        store.dispatch({ type: 'CANDLE_NAV_TOGGLE' });
        break;
      case 'r': {
        e.preventDefault();
        const state = store.getState();
        if (state.selectedGraphicId) {
          store.dispatch({ type: 'CYCLE_RESOLUTION', graphicId: state.selectedGraphicId });
        }
        break;
      }
    }
  });
}
