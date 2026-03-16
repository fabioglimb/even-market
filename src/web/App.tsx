import { useState, useEffect } from 'react';
import type { Screen } from '../state/types';
import { useSelector, useDispatch } from './hooks/use-store';
import { NavBar } from './components/shared/nav-bar';
import { WatchlistScreen } from './screens/watchlist-screen';
import { ChartScreen } from './screens/chart-screen';
import { SettingsScreen } from './screens/settings-screen';
import { HowItWorksScreen } from './screens/how-it-works-screen';

type WebScreen = Screen | 'how-it-works';

function App() {
  const dispatch = useDispatch();
  const storeScreen = useSelector((s) => s.screen);

  // Local screen state that also tracks 'how-it-works' (web-only)
  const [webScreen, setWebScreen] = useState<WebScreen>(storeScreen);

  // Sync from store screen changes (glasses/keyboard navigation)
  useEffect(() => {
    setWebScreen(storeScreen);
  }, [storeScreen]);

  function handleNavigate(screen: string) {
    if (screen === 'how-it-works') {
      setWebScreen('how-it-works');
    } else {
      const s = screen as Screen;
      dispatch({ type: 'NAVIGATE', screen: s });
      setWebScreen(s);
    }
  }

  return (
    <>
      <NavBar activeScreen={webScreen} onNavigate={handleNavigate} />
      <div className="min-h-[400px]">
        {renderScreen(webScreen)}
      </div>
    </>
  );
}

function renderScreen(screen: WebScreen) {
  switch (screen) {
    case 'watchlist':
      return <WatchlistScreen />;
    case 'stock-detail':
      return <ChartScreen />;
    case 'settings':
      return <SettingsScreen />;
    case 'how-it-works':
      return <HowItWorksScreen />;
    default:
      return <WatchlistScreen />;
  }
}

export { App };
