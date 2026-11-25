import { useAppState } from '@/state/AppStateProvider';
import { MoonIcon, SunIcon } from './Icons';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useAppState();
  const next = resolvedTheme === 'dark' ? 'light' : 'dark';
  const Icon = resolvedTheme === 'dark' ? SunIcon : MoonIcon;

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className="grid h-9 w-9 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-3 hover:text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <Icon key={resolvedTheme} className="icon-in h-[18px] w-[18px]" />
    </button>
  );
}
