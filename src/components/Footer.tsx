import { Link } from 'react-router-dom';
import { APP_NAME, APP_TAGLINE, DISCLAIMER, GITHUB_URL } from '@/lib/constants';
import { Logo } from './Logo';

const githubUrl = import.meta.env.VITE_GITHUB_URL || GITHUB_URL;

const explore = [
  { to: '/', label: 'Home' },
  { to: '/inventory', label: 'Inventory' },
  { to: '/crafting', label: 'Crafting' },
  { to: '/relics', label: 'Relics' },
];

const project = [
  { to: '/about', label: 'About and privacy' },
  { to: '/about#how-it-works', label: 'How the numbers work' },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-line/10 bg-surface/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm leading-6 text-muted">{APP_TAGLINE}</p>
          <p className="max-w-sm text-xs leading-5 text-muted">{DISCLAIMER}</p>
        </div>

        <nav aria-label="Explore">
          <p className="kicker">Explore</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {explore.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="text-muted no-underline transition-colors hover:text-body">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Project">
          <p className="kicker">Project</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {project.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="text-muted no-underline transition-colors hover:text-body">
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <a
                href={githubUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-muted no-underline transition-colors hover:text-body"
              >
                Source code
              </a>
            </li>
            <li>
              <a
                href="https://github.com/WFCD/warframe-items"
                target="_blank"
                rel="noreferrer noopener"
                className="text-muted no-underline transition-colors hover:text-body"
              >
                Item data (WFCD)
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-line/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {year} {APP_NAME}. Profile data is processed in your browser.
          </p>
          <p>No accounts. No analytics.</p>
        </div>
      </div>
    </footer>
  );
}
