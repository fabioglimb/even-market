import { useState, useEffect } from 'react';
import type { Screen } from '../state/types';
import { useSelector, useDispatch } from './hooks/use-store';
import { SideDrawer, DrawerTrigger, NavHeader, Button } from 'even-toolkit/web';
import type { SideDrawerItem } from 'even-toolkit/web';
import { IcMenuHome, IcEditSettings, IcChevronBack } from 'even-toolkit/web/icons/svg-icons';
import { WatchlistScreen } from './screens/watchlist-screen';
import { ChartScreen } from './screens/chart-screen';
import { SettingsScreen } from './screens/settings-screen';
import { HowItWorksScreen } from './screens/how-it-works-screen';

type WebScreen = Screen | 'how-it-works';

const iconProps = { width: 18, height: 18, className: 'text-current' };

const MENU_ITEMS: SideDrawerItem[] = [
  { id: 'watchlist', label: 'Watchlist', section: 'Market', icon: <IcMenuHome {...iconProps} /> },
];

const BOTTOM_ITEMS: SideDrawerItem[] = [
  { id: 'settings', label: 'Settings', section: 'App', icon: <IcEditSettings {...iconProps} /> },
];

// Screens accessible from the drawer menu
const TOP_LEVEL_SCREENS = new Set(['splash', 'home', 'watchlist', 'settings']);

function getScreenTitle(screen: WebScreen): string {
  switch (screen) {
    case 'splash':
    case 'home':
    case 'watchlist': return 'ER Market';
    case 'stock-detail': return 'Stock';
    case 'settings': return 'Settings';
    case 'how-it-works': return 'How It Works';
    default: return 'ER Market';
  }
}


function App() {
  const dispatch = useDispatch();
  const storeScreen = useSelector((s) => s.screen);
  const [webScreen, setWebScreen] = useState<WebScreen>(storeScreen);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setWebScreen(storeScreen);
  }, [storeScreen]);

  function handleNavigate(screen: string) {
    setDrawerOpen(false);
    if (screen === 'how-it-works') {
      setWebScreen('how-it-works');
    } else {
      const s = screen as Screen;
      dispatch({ type: 'NAVIGATE', screen: s });
      setWebScreen(s);
    }
  }

  function handleBack() {
    dispatch({ type: 'NAVIGATE', screen: 'watchlist' });
    setWebScreen('watchlist');
  }

  const isNested = !TOP_LEVEL_SCREENS.has(webScreen);

  return (
    <SideDrawer
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      onNavigate={handleNavigate}
      activeId={webScreen}
      items={MENU_ITEMS}
      bottomItems={BOTTOM_ITEMS}
      title="ER Market"
    >
      <div className="flex flex-col h-full">
        <div className="shrink-0">
          <NavHeader
            title={getScreenTitle(webScreen)}
            left={isNested
              ? <Button variant="ghost" size="icon" onClick={handleBack}><IcChevronBack width={16} height={16} /></Button>
              : <DrawerTrigger onClick={() => setDrawerOpen(true)} />
            }
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 pt-4 pb-8">
            {renderScreen(webScreen)}
          </div>
        </div>
      </div>
    </SideDrawer>
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
