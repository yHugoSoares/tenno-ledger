import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Footer } from './Footer';
import { Header } from './Header';
import { SettingsModal } from './SettingsModal';

export function Layout() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (location.hash && !location.hash.startsWith('#s=')) {
      const element = document.getElementById(location.hash.slice(1));
      if (element) {
        element.scrollIntoView({ block: 'start' });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname, location.hash]);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-contrast"
      >
        Skip to content
      </a>
      <Header onOpenSettings={() => setSettingsOpen(true)} />
      <main id="main" className="flex-1">
        <div key={location.pathname} className="blur-in">
          <Outlet context={{ openSettings: () => setSettingsOpen(true) }} />
        </div>
      </main>
      <Footer />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
