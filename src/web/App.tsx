import { useState, useEffect } from 'react';
import type { Screen } from '../state/types';
import { useSelector, useDispatch } from './hooks/use-store';
import { SideDrawer, DrawerTrigger, NavHeader, Button } from 'even-toolkit/web';
import type { SideDrawerItem } from 'even-toolkit/web';
import { IcFeatStocks, IcEditSettings, IcChevronBack, IcFeatNotification, IcFeatLearnExplore, IcEditChecklist, IcFeatNews, IcEditAdd } from 'even-toolkit/web/icons/svg-icons';
import { WatchlistScreen } from './screens/watchlist-screen';
import { ChartScreen } from './screens/chart-screen';
import { SettingsScreen } from './screens/settings-screen';
import { HowItWorksScreen } from './screens/how-it-works-screen';
import { PortfolioScreen } from './screens/portfolio-screen';
import { HoldingDetailScreen } from './screens/holding-detail-screen';
import { HoldingFormScreen } from './screens/holding-form-screen';
import { AlertsScreen } from './screens/alerts-screen';
import { OverviewScreen } from './screens/overview-screen';
import { NewsScreen } from './screens/news-screen';

type WebScreen = Screen | 'how-it-works';

const iconProps = { width: 18, height: 18, className: 'text-current' };

const MENU_ITEMS: SideDrawerItem[] = [
  { id: 'watchlist', label: 'Watchlist', section: 'Market', icon: <IcFeatStocks {...iconProps} /> },
  { id: 'overview', label: 'Overview', section: 'Market', icon: <IcFeatLearnExplore {...iconProps} /> },
  { id: 'portfolio', label: 'Portfolio', section: 'Market', icon: <IcEditChecklist {...iconProps} /> },
  { id: 'alerts', label: 'Alerts', section: 'Market', icon: <IcFeatNotification {...iconProps} /> },
  { id: 'news', label: 'News', section: 'Market', icon: <IcFeatNews {...iconProps} /> },
];

const BOTTOM_ITEMS: SideDrawerItem[] = [
  { id: 'settings', label: 'Settings', icon: <IcEditSettings {...iconProps} /> },
];

// Screens accessible from the drawer menu
const TOP_LEVEL_SCREENS = new Set(['splash', 'home', 'watchlist', 'settings', 'portfolio', 'alerts', 'overview', 'news']);

function getScreenTitle(screen: WebScreen): string {
  switch (screen) {
    case 'splash':
    case 'home':
    case 'watchlist': return 'ER Market';
    case 'stock-detail': return 'Stock';
    case 'settings': return 'Settings';
    case 'how-it-works': return 'How It Works';
    case 'portfolio': return 'Portfolio';
    case 'holding-detail': return 'Holding';
    case 'holding-form': return 'Add Holding';
    case 'alerts': return 'Alerts';
    case 'overview': return 'Overview';
    case 'news': return 'News';
    default: return 'ER Market';
  }
}

function getBackScreen(screen: WebScreen): Screen {
  switch (screen) {
    case 'stock-detail': return 'watchlist';
    case 'holding-detail': return 'portfolio';
    case 'holding-form': return 'portfolio';
    case 'how-it-works': return 'watchlist';
    default: return 'watchlist';
  }
}

function App() {
  const dispatch = useDispatch();
  const storeScreen = useSelector((s) => s.screen);
  const [webScreen, setWebScreen] = useState<WebScreen>(storeScreen);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [portfolioAddTrigger, setPortfolioAddTrigger] = useState(0);
  const [alertAddTrigger, setAlertAddTrigger] = useState(0);

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
    const target = getBackScreen(webScreen);
    dispatch({ type: 'NAVIGATE', screen: target });
    setWebScreen(target);
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
            right={
              webScreen === 'portfolio' ? (
                <Button size="icon" onClick={() => setPortfolioAddTrigger((n) => n + 1)}>
                  <IcEditAdd width={16} height={16} />
                </Button>
              ) : webScreen === 'alerts' ? (
                <Button size="icon" onClick={() => setAlertAddTrigger((n) => n + 1)}>
                  <IcEditAdd width={16} height={16} />
                </Button>
              ) : undefined
            }
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 pt-4 pb-8">
            {renderScreen(webScreen, portfolioAddTrigger, alertAddTrigger)}
          </div>
        </div>
      </div>
    </SideDrawer>
  );
}

function renderScreen(screen: WebScreen, portfolioAddTrigger?: number, alertAddTrigger?: number) {
  switch (screen) {
    case 'watchlist':
      return <WatchlistScreen />;
    case 'stock-detail':
      return <ChartScreen />;
    case 'settings':
      return <SettingsScreen />;
    case 'how-it-works':
      return <HowItWorksScreen />;
    case 'portfolio':
      return <PortfolioScreen addTrigger={portfolioAddTrigger} />;
    case 'holding-detail':
      return <HoldingDetailScreen />;
    case 'holding-form':
      return <HoldingFormScreen />;
    case 'alerts':
      return <AlertsScreen addTrigger={alertAddTrigger} />;
    case 'overview':
      return <OverviewScreen />;
    case 'news':
      return <NewsScreen />;
    default:
      return <WatchlistScreen />;
  }
}

export { App };
