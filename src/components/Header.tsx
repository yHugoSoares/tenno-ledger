import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { useAppState } from '@/state/AppStateProvider';
import { Logo } from './Logo';
import { MenuIcon, SettingsIcon, XIcon } from './Icons';
import { ThemeToggle } from './ThemeToggle';

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'relative flex h-16 items-center px-3 text-sm no-underline transition-colors',
    isActive
      ? 'text-body after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-accent'
      : 'text-muted hover:text-body',
  );

const mobileNavClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md px-3 py-2.5 text-sm no-underline transition-colors',
    isActive ? 'bg-accent/10 font-semibold text-body' : 'text-muted hover:bg-surface-3 hover:text-body',
  );

const iconButton =
  'grid h-9 w-9 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-3 hover:text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

export function Header({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { profile } = useAppState();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const links = [
    { to: '/', label: 'Home', end: true },
    ...(profile ? [{ to: '/profile', label: 'Profile' }] : []),
    { to: '/inventory', label: 'Inventory' },
    { to: '/crafting', label: 'Crafting' },
    { to: '/relics', label: 'Relics' },
    { to: '/about', label: 'About' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line/10 bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center md:flex">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={navClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Settings"
            title="Settings"
            className={cn(iconButton, 'hidden md:grid')}
          >
            <SettingsIcon className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            className={cn(iconButton, 'md:hidden')}
          >
            {menuOpen ? <XIcon className="h-[18px] w-[18px]" /> : <MenuIcon className="h-[18px] w-[18px]" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="mobile-nav" className="border-t border-line/10 bg-surface md:hidden">
          <nav aria-label="Mobile" className="mx-auto grid max-w-6xl gap-1 px-4 py-3">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={mobileNavClass}>
                {link.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onOpenSettings();
              }}
              className="mt-1 flex items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm text-muted transition-colors hover:bg-surface-3 hover:text-body"
            >
              <SettingsIcon className="h-4 w-4" />
              Settings
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
