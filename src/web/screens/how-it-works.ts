export function renderHowItWorks(container: HTMLElement): void {
  container.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'how-it-works';
  wrapper.innerHTML = `
    <div class="screen-header">
      <h1>How It Works</h1>
    </div>

    <div class="how-section">
      <h2>Graphics</h2>
      <p>Each item in your watchlist is a <strong>graphic</strong> &mdash; a symbol paired with a timeframe.
         You can track the same symbol at different timeframes (e.g. AAPL Daily and AAPL 1-min).</p>
      <p>Supports <strong>stocks</strong> (AAPL, TSLA), <strong>forex</strong> (EURUSD, GBPJPY),
         <strong>commodities</strong> (XAUUSD, OIL), <strong>crypto</strong> (BTC-USD), and <strong>ETFs</strong> (SPY, QQQ).</p>
    </div>

    <div class="how-section">
      <h2>Glasses &mdash; Watchlist</h2>
      <p><strong>Scroll</strong> to navigate between graphics. <strong>Tap</strong> to open the detail chart.
         The last item is <em>[Settings]</em> where you can change refresh interval and chart type.</p>
    </div>

    <div class="how-section">
      <h2>Glasses &mdash; Stock Detail</h2>
      <p>Two action buttons appear top-right: <strong>[TF]</strong> (timeframe) and <strong>[NAV]</strong> (candle navigation).</p>
      <p>Scroll between them, then tap to enter a mode. The active button <strong>blinks</strong> to confirm you're in that mode.</p>
      <ul>
        <li><strong>[TF] mode</strong> &mdash; Scroll to cycle through M1 / M5 / M15 / H1 / D / W / Mo. Candles refetch on each change. Tap to confirm and exit.</li>
        <li><strong>[NAV] mode</strong> &mdash; Scroll candle-by-candle. The highlighted candle flashes and OHLCV + datetime update live. Tap to exit.</li>
      </ul>
      <p><strong>Double-tap</strong> always goes back to the watchlist.</p>
    </div>

    <div class="how-section">
      <h2>Glasses &mdash; Settings</h2>
      <p>Scroll between <em>Refresh Interval</em> and <em>Chart Type</em>. <strong>Tap</strong> to cycle the value.
         Double-tap to go back.</p>
    </div>

    <div class="how-section">
      <h2>Web Dashboard</h2>
      <p>The browser shows the same data with a full interactive chart. Click any row to open the chart view.
         Hover over candles to see OHLCV details. Use the time range buttons (1D, 1W, 1M, 3M) to filter.</p>
      <p>Add graphics from the watchlist header: type a symbol, pick a timeframe, and click Add.</p>
    </div>

    <div class="how-section">
      <h2>Keyboard Shortcuts</h2>
      <table class="how-table">
        <tr><td><kbd>&uarr;</kbd> <kbd>&darr;</kbd></td><td>Navigate / scroll</td></tr>
        <tr><td><kbd>Enter</kbd></td><td>Select / confirm</td></tr>
        <tr><td><kbd>Esc</kbd></td><td>Go back</td></tr>
        <tr><td><kbd>c</kbd></td><td>Toggle candle navigation</td></tr>
        <tr><td><kbd>r</kbd></td><td>Cycle timeframe</td></tr>
      </table>
    </div>
  `;

  container.appendChild(wrapper);
}
