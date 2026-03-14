import type { Store } from '../../state/store';
import type { ChartType } from '../../state/types';

const RES_LABELS: Record<string, string> = {
  '1': '1min', '5': '5min', '15': '15min', '60': '1hr',
  'D': 'Daily', 'W': 'Weekly', 'M': 'Monthly',
};

export function renderSettings(container: HTMLElement, store: Store): void {
  container.innerHTML = '';

  const state = store.getState();
  const s = state.settings;

  const wrapper = document.createElement('div');
  wrapper.className = 'settings-screen';
  wrapper.innerHTML = `
    <div class="screen-header">
      <h1>Settings</h1>
    </div>

    <div class="settings-group">
      <label>Data Source</label>
      <div class="data-source-info">Yahoo Finance (no API key required)</div>
    </div>

    <div class="settings-group">
      <label>Refresh Interval</label>
      <select id="refresh-interval">
        ${[5, 10, 15, 30, 60].map((v) =>
          `<option value="${v}" ${v === s.refreshInterval ? 'selected' : ''}>${v}s</option>`
        ).join('')}
      </select>
    </div>

    <div class="settings-group">
      <label>Glass Chart Type</label>
      <select id="chart-type">
        <option value="sparkline" ${s.chartType === 'sparkline' ? 'selected' : ''}>Sparkline</option>
        <option value="candles" ${s.chartType === 'candles' ? 'selected' : ''}>Candles</option>
      </select>
    </div>

    <div class="settings-group">
      <label>Graphics</label>
      <div id="graphics-pills" class="watchlist-pills">
        ${s.graphics.map((g) =>
          `<span class="pill">${g.symbol} (${RES_LABELS[g.resolution] ?? g.resolution}) <button class="pill-remove" data-graphic-id="${g.id}">x</button></span>`
        ).join('')}
      </div>
    </div>

    <div class="settings-group">
      <label>Connection Status</label>
      <div class="status-row">
        <span class="status-dot ${state.connectionStatus === 'connected' ? 'connected' : ''}"></span>
        <span>Glasses: ${state.connectionStatus}</span>
      </div>
    </div>
  `;

  container.appendChild(wrapper);

  // Refresh interval
  document.getElementById('refresh-interval')?.addEventListener('change', (e) => {
    store.dispatch({ type: 'SETTING_CHANGE', key: 'refreshInterval', value: Number((e.target as HTMLSelectElement).value) });
  });

  // Chart type
  document.getElementById('chart-type')?.addEventListener('change', (e) => {
    store.dispatch({ type: 'SETTING_CHANGE', key: 'chartType', value: (e.target as HTMLSelectElement).value as ChartType });
  });

  // Remove graphic pills
  wrapper.querySelectorAll('.pill-remove').forEach((btn) => {
    btn.addEventListener('click', () => {
      const graphicId = (btn as HTMLElement).dataset.graphicId!;
      store.dispatch({ type: 'GRAPHIC_REMOVE', graphicId });
      renderSettings(container, store);
    });
  });
}
