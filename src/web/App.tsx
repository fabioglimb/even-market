import { useState, useEffect, useRef } from 'react';
import type { Screen, PriceAlert } from '../state/types';
import { useSelector, useDispatch } from './hooks/use-store';
import { SideDrawer, DrawerTrigger, NavHeader, Button, Toast } from 'even-toolkit/web';
import type { SideDrawerItem } from 'even-toolkit/web';
import { IcFeatStocks, IcEditSettings, IcChevronBack, IcFeatNotification, IcFeatLearnExplore, IcEditChecklist, IcFeatNews, IcEditAdd, IcEditShare } from 'even-toolkit/web/icons/svg-icons';
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
import { getLatestTriggeredAlert, getUnreadTriggeredAlertCount } from '../state/alert-utils';
import { formatPrice } from '../utils/format';

type WebScreen = Screen | 'how-it-works' | 'news-detail';

const iconProps = { width: 18, height: 18, className: 'text-current' };

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
    case 'news-detail': return 'Article';
    default: return 'ER Market';
  }
}

function getBackScreen(screen: WebScreen): Screen {
  switch (screen) {
    case 'stock-detail': return 'watchlist';
    case 'holding-detail': return 'portfolio';
    case 'holding-form': return 'portfolio';
    case 'how-it-works': return 'watchlist';
    case 'news-detail': return 'news';
    default: return 'watchlist';
  }
}

function App() {
  const dispatch = useDispatch();
  const storeScreen = useSelector((s) => s.screen);
  const alerts = useSelector((s) => s.alerts);
  const [webScreen, setWebScreen] = useState<WebScreen>(storeScreen);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [portfolioAddTrigger, setPortfolioAddTrigger] = useState(0);
  const [alertAddTrigger, setAlertAddTrigger] = useState(0);
  const selectedNewsId = useSelector((s) => s.selectedNewsId);
  const news = useSelector((s) => s.news);
  const selectedNewsArticle = selectedNewsId
    ? news.find((item) => item.id === selectedNewsId) ?? null
    : null;
  const unreadAlertCount = getUnreadTriggeredAlertCount(alerts);
  const [toastAlert, setToastAlert] = useState<PriceAlert | null>(null);
  const lastTriggeredAtRef = useRef(0);

  const menuItems: SideDrawerItem[] = [
    { id: 'watchlist', label: 'Watchlist', section: 'Market', icon: <IcFeatStocks {...iconProps} /> },
    { id: 'overview', label: 'Overview', section: 'Market', icon: <IcFeatLearnExplore {...iconProps} /> },
    { id: 'portfolio', label: 'Portfolio', section: 'Market', icon: <IcEditChecklist {...iconProps} /> },
    { id: 'alerts', label: unreadAlertCount > 0 ? `Alerts (${unreadAlertCount})` : 'Alerts', section: 'Market', icon: <IcFeatNotification {...iconProps} /> },
    { id: 'news', label: 'News', section: 'Market', icon: <IcFeatNews {...iconProps} /> },
  ];

  useEffect(() => {
    setWebScreen(storeScreen);
  }, [storeScreen]);

  useEffect(() => {
    if (webScreen !== 'portfolio' && portfolioAddTrigger !== 0) {
      setPortfolioAddTrigger(0);
    }
    if (webScreen !== 'alerts' && alertAddTrigger !== 0) {
      setAlertAddTrigger(0);
    }
  }, [webScreen, portfolioAddTrigger, alertAddTrigger]);

  useEffect(() => {
    const latest = getLatestTriggeredAlert(alerts);
    const triggeredAt = latest?.triggeredAt ?? 0;
    if (!triggeredAt || triggeredAt <= lastTriggeredAtRef.current) return;
    lastTriggeredAtRef.current = triggeredAt;
    if (webScreen !== 'alerts') {
      setToastAlert(latest);
    }
  }, [alerts, webScreen]);

  function handleNavigate(screen: string) {
    setDrawerOpen(false);
    setToastAlert(null);
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
      items={menuItems}
      bottomItems={BOTTOM_ITEMS}
      title="ER Market"
    >
      <div className="relative flex flex-col h-full">
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
              ) : webScreen === 'news-detail' && selectedNewsArticle ? (
                <Button
                  size="icon"
                  className="bg-black text-white hover:bg-black/90"
                  aria-label="Open article in browser"
                  onClick={() => window.open(selectedNewsArticle.url, '_blank', 'noopener,noreferrer')}
                >
                  <IcEditShare width={16} height={16} />
                </Button>
              ) : undefined
            }
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 pt-4 pb-8">
            {renderScreen(
              webScreen,
              portfolioAddTrigger,
              alertAddTrigger,
              setWebScreen,
            )}
          </div>
        </div>
        {toastAlert && (
          <div className="absolute left-3 right-3 bottom-3 z-[3] pointer-events-none">
            <div className="pointer-events-auto">
              <Toast
                variant="warning"
                message={`${toastAlert.symbol} ${toastAlert.condition === 'above' ? 'rose above' : 'fell below'} $${formatPrice(toastAlert.targetPrice)}`}
                action={
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setToastAlert(null)}>
                      Dismiss
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setToastAlert(null);
                        dispatch({ type: 'NAVIGATE', screen: 'alerts' });
                        setWebScreen('alerts');
                      }}
                    >
                      View
                    </Button>
                  </div>
                }
              />
            </div>
          </div>
        )}
      </div>
    </SideDrawer>
  );
}

function renderScreen(
  screen: WebScreen,
  portfolioAddTrigger?: number,
  alertAddTrigger?: number,
  onScreenChange?: (s: WebScreen) => void,
) {
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
    case 'news-detail':
      return (
        <NewsScreen
          isDetail={screen === 'news-detail'}
          onArticleOpen={() => {
            onScreenChange?.('news-detail');
          }}
        />
      );
    default:
      return <WatchlistScreen />;
  }
}

export { App };
