import { useState, useEffect } from 'react';
import type { Screen } from '../state/types';
import { useSelector, useDispatch } from './hooks/use-store';
import { NavBar, AppShell } from 'even-toolkit/web';
import type { NavItem } from 'even-toolkit/web';
import { WatchlistScreen } from './screens/watchlist-screen';
import { ChartScreen } from './screens/chart-screen';
import { SettingsScreen } from './screens/settings-screen';
import { HowItWorksScreen } from './screens/how-it-works-screen';

type WebScreen = Screen | 'how-it-works';

const navItems: NavItem[] = [
  { id: 'watchlist', label: 'Watchlist' },
  { id: 'settings', label: 'Settings' },
  { id: 'how-it-works', label: 'How It Works' },
];

function App() {
  const dispatch = useDispatch();
  const storeScreen = useSelector((s) => s.screen);

  const [webScreen, setWebScreen] = useState<WebScreen>(storeScreen);

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
    <AppShell
      header={
        <NavBar items={navItems} activeId={webScreen === 'stock-detail' ? 'watchlist' : webScreen} onNavigate={handleNavigate} />
      }
    >
      <div className="px-3 pb-8">
        {renderScreen(webScreen)}
      </div>
    </AppShell>
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
