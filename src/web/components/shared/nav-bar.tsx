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
    <nav className="flex gap-2 mb-4 border-b border-border pb-2">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onNavigate(item.id)}
          className={cn(
            'border rounded-md px-5 py-2 text-sm cursor-pointer transition-all',
            activeId === item.id
              ? 'bg-accent text-white border-accent'
              : 'bg-transparent border-border text-text-dim hover:text-text hover:border-text-dim',
          )}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

export { NavBar };
