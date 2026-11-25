import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { buildDemoProfile } from '@/fixtures/demo';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useItemData } from '@/hooks/useItemData';
import { useAppState } from '@/state/AppStateProvider';
import { useToast } from '@/state/ToastProvider';
import { CookieGuide } from '@/components/CookieGuide';
import { ProfileInput } from '@/components/ProfileInput';

const steps: { title: string; color: string; body: ReactNode }[] = [
  {
    title: 'Find your gid',
    color: 'bg-violet-600 text-white',
    body: (
      <>
        <p>
          Sign in at warframe.com and copy the value of the <code>gid</code> cookie. It is 24 characters long.
        </p>
        <div className="mt-3">
          <CookieGuide />
        </div>
      </>
    ),
  },
  {
    title: 'Open the profile response',
    color: 'bg-orange-500 text-white',
    body: (
      <p>
        Paste the gid into the box and choose <strong>Open profile response</strong>. The profile opens as text in a
        new tab. Browsers usually block this site from reading it directly, so this step is needed.
      </p>
    ),
  },
  {
    title: 'Paste it back here',
    color: 'bg-emerald-600 text-white',
    body: (
      <p>
        Select all of the text in that tab, copy it, come back here, paste it, and choose{' '}
        <strong>Load pasted text</strong>. It is read in your browser and never uploaded.
      </p>
    ),
  },
];

const features = [
  { title: 'Points by source', body: 'Items, Star Chart missions, junctions, intrinsics, and extras, each with its share.', color: 'border-accent/50' },
  { title: 'Every category', body: 'Warframes, weapons, companions, Archwings, Necramechs, K-Drives, and the rest.', color: 'border-sky-500/70' },
  { title: 'What to finish next', body: 'Missing items you can equip at your rank, sorted by the affinity still needed.', color: 'border-gold/60' },
  { title: 'Exports and links', body: 'A Markdown checklist, a JSON snapshot, and a read-only link. No login data inside.', color: 'border-fuchsia-500/70' },
];

export function LandingPage() {
  useDocumentTitle();
  const { setProfile } = useAppState();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { items, status, error } = useItemData();
  const demoDisabled = status !== 'ready' || items.length === 0;
  const strip = items.filter((item) => item.imageUrl && item.tab === 'warframes').slice(0, 8);
  const weapons = items.filter((item) => item.imageUrl && (item.tab === 'primary' || item.tab === 'melee')).slice(0, 6);

  function handleDemo() {
    if (demoDisabled) {
      toast('Item data is still loading. Try again in a moment.', 'info');
      return;
    }
    setProfile(buildDemoProfile(items));
    toast('Demo profile loaded. It is generated locally and is not a real account.', 'info');
    navigate('/profile');
  }

  return (
    <div className="mx-auto max-w-6xl space-y-14 px-4 pb-8 pt-6 sm:px-6 sm:pt-10">
      <section className="relative overflow-hidden rounded-2xl border border-line/10 shadow-lg">
        <img src="/bg/ledger-hero.svg" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-surface/80" aria-hidden="true" />
        <div className="relative px-6 py-14 sm:px-12 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Warframe mastery tracker</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
            See exactly where your <span className="text-accent">mastery</span> comes from
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted sm:text-lg">
            Every item, every Star Chart node, every junction, in one place. Your profile is read in your browser and
            never sent to this site.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#load" className={`${'inline-flex h-11 items-center rounded-md bg-accent px-5 text-sm font-semibold text-accent-contrast no-underline hover:opacity-90'}`}>
              Load my profile
            </a>
            <Link to="/about" className="inline-flex h-11 items-center rounded-md border border-line/25 bg-surface/60 px-5 text-sm font-medium no-underline hover:bg-surface-3">
              How it works
            </Link>
          </div>
          {strip.length > 0 && (
            <ul className="mt-10 flex flex-wrap gap-3" aria-label="Sample Warframes">
              {strip.map((item) => (
                <li key={item.uniqueName} className="flex h-16 w-16 items-center justify-center rounded-xl border border-violet-600/40 bg-violet-600/10 p-1.5">
                  <img src={item.imageUrl ?? ''} alt={item.name} loading="lazy" width={56} height={56} className="h-full w-full object-contain" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div id="load" className="grid scroll-mt-20 gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <section aria-labelledby="steps-heading">
          <h2 id="steps-heading" className="text-2xl font-semibold">
            Three steps
          </h2>
          <ol className="mt-6 space-y-6">
            {steps.map((step, index) => (
              <li key={step.title} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-4">
                <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${step.color}`}>
                  {index + 1}
                </span>
                <div className="space-y-2 text-sm leading-6 text-muted">
                  <h3 className="text-base font-semibold text-body">{step.title}</h3>
                  {step.body}
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-6 rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-sm text-muted">
            Only the gid is needed. Never copy or share session, remember-me, or XSRF cookies.
          </p>
        </section>

        <section aria-labelledby="load-heading">
          <h2 id="load-heading" className="sr-only">
            Load a profile
          </h2>
          <ProfileInput onTryDemo={handleDemo} demoDisabled={demoDisabled} />
          {status === 'error' && (
            <p className="mt-3 text-sm text-rose-700 dark:text-rose-300">
              Item data could not be loaded, so the demo is unavailable. {error}
            </p>
          )}
        </section>
      </div>

      {weapons.length > 0 && (
        <section aria-label="Sample weapons" className="flex flex-wrap items-center gap-3">
          {weapons.map((item) => (
            <div key={item.uniqueName} className="flex h-14 w-14 items-center justify-center rounded-lg border border-orange-700/40 bg-orange-700/10 p-1">
              <img src={item.imageUrl ?? ''} alt={item.name} loading="lazy" width={48} height={48} className="h-full w-full object-contain" />
            </div>
          ))}
          <p className="text-sm text-muted">Weapons, Warframes, companions and more, each with its own rank.</p>
        </section>
      )}

      <section aria-labelledby="features-heading">
        <h2 id="features-heading" className="text-2xl font-semibold">
          What you get
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div key={feature.title} className={`rounded-xl border-l-4 bg-surface-2 p-5 ${feature.color}`}>
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{feature.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm text-muted">
          Read the{' '}
          <Link to="/about#privacy" className="text-accent underline underline-offset-4">
            privacy statement
          </Link>{' '}
          for exactly what is stored and where.
        </p>
      </section>
    </div>
  );
}
