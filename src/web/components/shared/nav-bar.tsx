import { cn } from '../../utils/cn';

interface NavBarProps {
  activeScreen: string;
  onNavigate: (screen: string) => void;
}

const NAV_ITEMS = [
  { id: 'watchlist', label: 'Watchlist' },
  { id: 'settings', label: 'Settings' },
  { id: 'how-it-works', label: 'How It Works' },
] as const;

function NavBar({ activeScreen, onNavigate }: NavBarProps) {
  const activeId =
    activeScreen === 'stock-detail' ? 'watchlist' : activeScreen;

  return (
    <nav className="sticky top-0 z-10 bg-bg/80 backdrop-blur-sm border-b border-border mb-6 overflow-x-auto scrollbar-hide">
      <div className="flex gap-6">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            className={cn(
              'py-3 text-sm font-medium cursor-pointer transition-colors whitespace-nowrap border-b-2',
              activeId === item.id
                ? 'text-accent border-accent'
                : 'text-text-dim hover:text-text border-transparent',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

export { NavBar };
