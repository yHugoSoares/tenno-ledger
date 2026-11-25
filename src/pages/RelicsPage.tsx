import { useMemo, useState } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useGameData } from '@/hooks/useGameData';
import { useManualInventory } from '@/hooks/useManualInventory';
import { PLACEHOLDER_IMAGE, itemImageUrl } from '@/lib/items';
import type { Relic } from '@/lib/gameData';
import { formatElapsed, formatMonthYear, formatNumber } from '@/lib/format';
import { Card } from '@/components/Card';
import { Tabs, type TabDefinition } from '@/components/Tabs';

const PAGE_SIZE = 48;

const TIER_ORDER = ['Lith', 'Meso', 'Neo', 'Axi', 'Vanguard', 'Requiem', 'Void'];

const TIER_CLASSES: Record<string, string> = {
  Lith: 'border-stone-500 bg-stone-500/15 text-stone-800 dark:text-stone-200',
  Meso: 'border-sky-500 bg-sky-500/15 text-sky-800 dark:text-sky-200',
  Neo: 'border-violet-500 bg-violet-500/15 text-violet-800 dark:text-violet-200',
  Axi: 'border-amber-500 bg-amber-500/15 text-amber-800 dark:text-amber-200',
  Vanguard: 'border-indigo-500 bg-indigo-500/15 text-indigo-800 dark:text-indigo-200',
  Requiem: 'border-rose-500 bg-rose-500/15 text-rose-800 dark:text-rose-200',
  Void: 'border-teal-500 bg-teal-500/15 text-teal-800 dark:text-teal-200',
};

const RARITY_CLASSES: Record<string, string> = {
  Common: 'border-stone-500/50 bg-stone-500/10 text-stone-700 dark:text-stone-300',
  Uncommon: 'border-sky-500/50 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  Rare: 'border-amber-500/60 bg-amber-500/15 text-amber-800 dark:text-amber-300',
};

type VaultFilter = 'all' | 'available' | 'vaulted';
type RelicSort = 'name' | 'vaulted' | 'rewards';

function RelicArt({ relic }: { relic: Relic }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? PLACEHOLDER_IMAGE : (itemImageUrl(relic.imageName) ?? PLACEHOLDER_IMAGE);
  return (
    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-md border border-line/10 bg-surface-3">
      <img
        src={src}
        alt=""
        width={48}
        height={48}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="h-12 w-12 object-contain"
      />
    </div>
  );
}

function VaultBox({ relic }: { relic: Relic }) {
  if (!relic.vaulted) {
    return (
      <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-800 dark:text-emerald-300">
        Available in the current drop tables
      </div>
    );
  }

  const elapsed = relic.vaultedAt ? formatElapsed(relic.vaultedAt) : null;
  return (
    <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-800 dark:text-rose-300">
      <span className="font-semibold">Vaulted{elapsed ? ` ${elapsed} ago` : ''}</span>
      <span className="text-rose-700/80 dark:text-rose-300/80">
        {relic.vaultedAt ? ` · since ${formatMonthYear(relic.vaultedAt)}` : ' · exact date unknown'}
      </span>
    </div>
  );
}

export function RelicsPage() {
  useDocumentTitle('Relics');
  const game = useGameData();
  const [inventory, setCount] = useManualInventory();
  const [query, setQuery] = useState('');
  const [tier, setTier] = useState('all');
  const [vaultFilter, setVaultFilter] = useState<VaultFilter>('all');
  const [onlyOwned, setOnlyOwned] = useState(false);
  const [sort, setSort] = useState<RelicSort>('name');
  const [shown, setShown] = useState(PAGE_SIZE);

  const tierTabs = useMemo<TabDefinition[]>(() => {
    if (!game.relics) return [{ id: 'all', label: 'All', count: 0 }];
    const counts = new Map<string, number>();
    for (const relic of game.relics) counts.set(relic.tier, (counts.get(relic.tier) ?? 0) + 1);
    const known = TIER_ORDER.filter((name) => counts.has(name));
    const extra = [...counts.keys()].filter((name) => !TIER_ORDER.includes(name)).sort();
    return [
      { id: 'all', label: 'All', count: game.relics.length },
      ...[...known, ...extra].map((name) => ({ id: name, label: name, count: counts.get(name) ?? 0 })),
    ];
  }, [game.relics]);

  const filtered = useMemo<Relic[]>(() => {
    if (!game.relics) return [];
    const q = query.trim().toLowerCase();
    const list = game.relics.filter((relic) => {
      if (tier !== 'all' && relic.tier !== tier) return false;
      if (vaultFilter === 'vaulted' && !relic.vaulted) return false;
      if (vaultFilter === 'available' && relic.vaulted) return false;
      if (onlyOwned && !(inventory[relic.name] > 0)) return false;
      if (!q) return true;
      if (relic.name.toLowerCase().includes(q)) return true;
      return relic.rewards.some((reward) => reward.name.toLowerCase().includes(q));
    });

    return list.sort((a, b) => {
      if (sort === 'vaulted') {
        if (a.vaulted !== b.vaulted) return a.vaulted ? 1 : -1;
        return (b.vaultedAt ?? 0) - (a.vaultedAt ?? 0) || a.name.localeCompare(b.name);
      }
      if (sort === 'rewards') return b.rewards.length - a.rewards.length || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });
  }, [game.relics, tier, vaultFilter, onlyOwned, inventory, query, sort]);

  const ownedRelics = useMemo(
    () => (game.relics ? game.relics.filter((relic) => (inventory[relic.name] ?? 0) > 0).length : 0),
    [game.relics, inventory],
  );

  const vaultedInFilter = useMemo(
    () => filtered.reduce((total, relic) => total + (relic.vaulted ? 1 : 0), 0),
    [filtered],
  );

  if (game.error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-sm text-rose-700 dark:text-rose-300">{game.error}</p>
      </div>
    );
  }

  const q = query.trim().toLowerCase();

  function resetFilters() {
    setQuery('');
    setTier('all');
    setVaultFilter('all');
    setOnlyOwned(false);
    setSort('name');
    setShown(PAGE_SIZE);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-3xl font-semibold">Relics</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          One card per relic, with the <strong className="font-semibold text-body">Radiant</strong> drop table. Search a
          reward such as “Ash Prime Chassis Blueprint” to see every relic that contains it, or search a relic name.
        </p>
      </div>

      <Card className="space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_10rem_10rem_10rem]">
          <div>
            <label htmlFor="relic-search" className="sr-only">
              Search relics or rewards
            </label>
            <input
              id="relic-search"
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setShown(PAGE_SIZE);
              }}
              placeholder="Search a relic or a reward"
              className="field"
            />
          </div>
          <div>
            <label htmlFor="relic-vault" className="sr-only">
              Vault status
            </label>
            <select
              id="relic-vault"
              value={vaultFilter}
              onChange={(event) => {
                setVaultFilter(event.target.value as VaultFilter);
                setShown(PAGE_SIZE);
              }}
              className="field"
            >
              <option value="all">All relics</option>
              <option value="available">Available</option>
              <option value="vaulted">Vaulted</option>
            </select>
          </div>
          <div>
            <label htmlFor="relic-sort" className="sr-only">
              Sort relics
            </label>
            <select
              id="relic-sort"
              value={sort}
              onChange={(event) => setSort(event.target.value as RelicSort)}
              className="field"
            >
              <option value="name">Sort: name</option>
              <option value="vaulted">Sort: recently vaulted</option>
              <option value="rewards">Sort: most rewards</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyOwned}
              onChange={(event) => {
                setOnlyOwned(event.target.checked);
                setShown(PAGE_SIZE);
              }}
            />
            Only ones I own
          </label>
        </div>
        <p className="text-sm text-muted" aria-live="polite">
          {formatNumber(filtered.length)} relics match · {formatNumber(vaultedInFilter)} vaulted ·{' '}
          {formatNumber(ownedRelics)} owned in total
        </p>
      </Card>

      {!game.relics ? (
        <p className="text-sm text-muted">Loading relics…</p>
      ) : (
        <>
          <Tabs
            tabs={tierTabs}
            active={tier}
            onChange={(id) => {
              setTier(id);
              setShown(PAGE_SIZE);
            }}
            idPrefix="relic-tier"
            label="Relic tiers"
          />

          {filtered.length === 0 ? (
            <Card className="p-6 text-sm text-muted">
              <p>No relics match these filters.</p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 rounded-md border border-line/20 px-3 py-2 text-sm hover:bg-surface-3"
              >
                Clear filters
              </button>
            </Card>
          ) : (
            <>
              <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filtered.slice(0, shown).map((relic) => (
                  <li key={relic.name}>
                    <Card className="flex h-full flex-col gap-3 p-4">
                      <div className="flex items-start gap-3">
                        <RelicArt relic={relic} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded border px-2 py-0.5 text-xs font-semibold ${
                                TIER_CLASSES[relic.tier] ?? 'border-line/30 text-muted'
                              }`}
                            >
                              {relic.tier || 'Relic'}
                            </span>
                            <h2 className="min-w-0 truncate font-semibold" title={relic.name}>
                              {relic.name}
                            </h2>
                          </div>
                          <p className="mt-1 whitespace-nowrap text-xs text-muted">
                            {formatNumber(relic.rewards.length)} rewards · Radiant
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 text-sm">
                          <label htmlFor={`own-${relic.name}`} className="text-xs text-muted">
                            Owned
                          </label>
                          <input
                            id={`own-${relic.name}`}
                            type="number"
                            min={0}
                            value={inventory[relic.name] ?? 0}
                            onChange={(event) => setCount(relic.name, Number.parseInt(event.target.value, 10) || 0)}
                            className="field h-8 w-16 px-2 text-right tabular"
                          />
                        </div>
                      </div>

                      <VaultBox relic={relic} />

                      <ul className="divide-y divide-line/10 text-sm">
                        {relic.rewards.map((reward) => {
                          const match = q.length > 0 && reward.name.toLowerCase().includes(q);
                          return (
                            <li
                              key={reward.name}
                              className={`flex items-center justify-between gap-3 rounded px-1 py-1.5 ${
                                match ? 'bg-gold/10' : ''
                              }`}
                            >
                              <span className="min-w-0 truncate" title={reward.name}>
                                {reward.name}
                                {match && <span className="ml-2 text-xs font-medium text-gold">match</span>}
                              </span>
                              <span className="flex shrink-0 items-center gap-2">
                                <span
                                  className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${
                                    RARITY_CLASSES[reward.rarity] ?? 'border-line/30 text-muted'
                                  }`}
                                >
                                  {reward.rarity}
                                </span>
                                <span className="w-14 text-right tabular">{reward.chance}%</span>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </Card>
                  </li>
                ))}
              </ul>
              {filtered.length > shown && (
                <button
                  type="button"
                  onClick={() => setShown((current) => current + PAGE_SIZE)}
                  className="rounded-md border border-line/20 px-4 py-2 text-sm hover:bg-surface-3"
                >
                  Show {formatNumber(Math.min(PAGE_SIZE, filtered.length - shown))} more
                </button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
