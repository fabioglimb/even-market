import { Page } from '../components/shared/page';
import { ScreenHeader } from '../components/shared/screen-header';
import { HowSection } from '../components/shared/how-section';
import { Kbd } from '../components/ui/kbd';

function HowItWorksScreen() {
  return (
    <Page className="max-w-[640px]">
      <ScreenHeader title="How It Works" />

      <HowSection title="Graphics">
        <p>
          Each item in your watchlist is a <strong>graphic</strong> — a symbol paired with a timeframe.
          You can track the same symbol at different timeframes (e.g. AAPL Daily and AAPL 1-min).
        </p>
        <p>
          Supports <strong>stocks</strong> (AAPL, TSLA), <strong>forex</strong> (EURUSD, GBPJPY),{' '}
          <strong>commodities</strong> (XAUUSD, OIL), <strong>crypto</strong> (BTC-USD), and{' '}
          <strong>ETFs</strong> (SPY, QQQ).
        </p>
      </HowSection>

      <HowSection title="Glasses — Watchlist">
        <p>
          <strong>Scroll</strong> to navigate between graphics. <strong>Tap</strong> to open the detail chart.
          The last item is <em>[Settings]</em> where you can change refresh interval and chart type.
        </p>
      </HowSection>

      <HowSection title="Glasses — Stock Detail">
        <p>
          Two action buttons appear top-right: <strong>[TF]</strong> (timeframe) and{' '}
          <strong>[NAV]</strong> (candle navigation).
        </p>
        <p>
          Scroll between them, then tap to enter a mode. The active button <strong>blinks</strong> to
          confirm you're in that mode.
        </p>
        <ul>
          <li>
            <strong>[TF] mode</strong> — Scroll to cycle through M1 / M5 / M15 / H1 / D / W / Mo.
            Candles refetch on each change. Tap to confirm and exit.
          </li>
          <li>
            <strong>[NAV] mode</strong> — Scroll candle-by-candle. The highlighted candle flashes and
            OHLCV + datetime update live. Tap to exit.
          </li>
        </ul>
        <p>
          <strong>Double-tap</strong> always goes back to the watchlist.
        </p>
      </HowSection>

      <HowSection title="Glasses — Settings">
        <p>
          Scroll between <em>Refresh Interval</em> and <em>Chart Type</em>.{' '}
          <strong>Tap</strong> to cycle the value. Double-tap to go back.
        </p>
      </HowSection>

      <HowSection title="Web Dashboard">
        <p>
          The browser shows the same data with a full interactive chart. Click any row to open the
          chart view. Hover over candles to see OHLCV details. Use the time range buttons (1D, 1W,
          1M, 3M) to filter.
        </p>
        <p>
          Add graphics from the watchlist header: type a symbol, pick a timeframe, and click Add.
        </p>
      </HowSection>

      <HowSection title="Keyboard Shortcuts">
        <table className="border-collapse text-sm">
          <tbody>
            <tr>
              <td className="py-1 pr-4 text-text-dim">
                <Kbd>&uarr;</Kbd> <Kbd>&darr;</Kbd>
              </td>
              <td className="py-1 text-text-dim">Navigate / scroll</td>
            </tr>
            <tr>
              <td className="py-1 pr-4 text-text-dim">
                <Kbd>Enter</Kbd>
              </td>
              <td className="py-1 text-text-dim">Select / confirm</td>
            </tr>
            <tr>
              <td className="py-1 pr-4 text-text-dim">
                <Kbd>Esc</Kbd>
              </td>
              <td className="py-1 text-text-dim">Go back</td>
            </tr>
            <tr>
              <td className="py-1 pr-4 text-text-dim">
                <Kbd>c</Kbd>
              </td>
              <td className="py-1 text-text-dim">Toggle candle navigation</td>
            </tr>
            <tr>
              <td className="py-1 pr-4 text-text-dim">
                <Kbd>r</Kbd>
              </td>
              <td className="py-1 text-text-dim">Cycle timeframe</td>
            </tr>
          </tbody>
        </table>
      </HowSection>
    </Page>
  );
}

export { HowItWorksScreen };
