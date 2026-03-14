import type { Store } from '../../state/store';
import type { AppState, ChartResolution } from '../../state/types';
import { formatPrice, formatPercent, formatChange, formatVolume, formatResolutionShort } from '../../utils/format';

const RESOLUTIONS: ChartResolution[] = ['1', '5', '15', '60', 'D', 'W', 'M'];
const RES_LABELS: Record<string, string> = {
  '1': '1 min', '5': '5 min', '15': '15 min', '60': '1 hour',
  'D': 'Daily', 'W': 'Weekly', 'M': 'Monthly',
};

export function renderWatchlist(container: HTMLElement, store: Store): void {
  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'screen-header';
  header.innerHTML = `
    <h1>EvenMarket</h1>
    <div class="add-ticker">
      <input type="text" id="ticker-input" placeholder="Symbol (e.g. AMZN)" maxlength="10" />
      <select id="resolution-input">
        ${RESOLUTIONS.map((r) => `<option value="${r}" ${r === 'D' ? 'selected' : ''}>${RES_LABELS[r]}</option>`).join('')}
      </select>
      <button id="add-ticker-btn">Add</button>
    </div>
  `;
  container.appendChild(header);

  const table = document.createElement('table');
  table.className = 'watchlist-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Symbol</th>
        <th>TF</th>
        <th>Price</th>
        <th>Change</th>
        <th>%Change</th>
        <th>High</th>
        <th>Low</th>
        <th>Volume</th>
        <th></th>
      </tr>
    </thead>
    <tbody id="watchlist-body"></tbody>
  `;
  container.appendChild(table);

  function updateTable(state: AppState): void {
    const tbody = document.getElementById('watchlist-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    for (const graphic of state.settings.graphics) {
      const quote = state.quotes[graphic.symbol];
      const tr = document.createElement('tr');
      const isUp = quote ? quote.changePercent >= 0 : true;
      tr.className = isUp ? 'row-up' : 'row-down';

      tr.innerHTML = `
        <td class="sym">${graphic.symbol}</td>
        <td>${formatResolutionShort(graphic.resolution)}</td>
        <td>${quote ? formatPrice(quote.price) : '--'}</td>
        <td class="${isUp ? 'green' : 'red'}">${quote ? formatChange(quote.change) : '--'}</td>
        <td class="${isUp ? 'green' : 'red'}">${quote ? formatPercent(quote.changePercent) : '--'}</td>
        <td>${quote ? formatPrice(quote.high) : '--'}</td>
        <td>${quote ? formatPrice(quote.low) : '--'}</td>
        <td>${quote ? formatVolume(quote.volume) : '--'}</td>
        <td><button class="remove-btn" data-graphic-id="${graphic.id}">x</button></td>
      `;

      tr.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).classList.contains('remove-btn')) return;
        store.dispatch({ type: 'SELECT_GRAPHIC', graphicId: graphic.id });
      });

      tbody.appendChild(tr);
    }

    tbody.querySelectorAll('.remove-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const graphicId = (btn as HTMLElement).dataset.graphicId!;
        store.dispatch({ type: 'GRAPHIC_REMOVE', graphicId });
      });
    });
  }

  const addBtn = document.getElementById('add-ticker-btn')!;
  const tickerInput = document.getElementById('ticker-input') as HTMLInputElement;
  const resInput = document.getElementById('resolution-input') as HTMLSelectElement;

  function addGraphic(): void {
    const sym = tickerInput.value.trim().toUpperCase();
    const resolution = resInput.value as ChartResolution;
    if (sym) {
      store.dispatch({ type: 'GRAPHIC_ADD', symbol: sym, resolution });
      tickerInput.value = '';
    }
  }

  addBtn.addEventListener('click', addGraphic);
  tickerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addGraphic();
  });

  updateTable(store.getState());
  store.subscribe((state, prev) => {
    if (state.quotes !== prev.quotes || state.settings.graphics !== prev.settings.graphics) {
      updateTable(state);
    }
  });
}
