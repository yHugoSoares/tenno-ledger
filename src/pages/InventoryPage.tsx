import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useGameData } from '@/hooks/useGameData';
import { useItemData } from '@/hooks/useItemData';
import { useManualInventory } from '@/hooks/useManualInventory';
import { computeItemStates } from '@/lib/mastery';
import { SOURCE_COLORS } from '@/lib/categoryColors';
import { formatNumber } from '@/lib/format';
import {
  classifyManualItem,
  MANUAL_TYPE_LABELS,
  type ManualItemType,
} from '@/lib/inventory';
import type { ItemState, TabId } from '@/lib/types';
import { useAppState } from '@/state/AppStateProvider';
import { Button, buttonClasses } from '@/components/Button';
import { Card } from '@/components/Card';
import { ItemCard } from '@/components/ItemCard';
import { Tabs, type TabDefinition } from '@/components/Tabs';

type OwnedStatus = 'all' | 'mastered' | 'progress' | 'unstarted';
type OwnedSort = 'name' | 'mr' | 'progress';
type MrFilter = 'all' | 'available' | 'locked';

const GROUPS: { id: TabId; label: string }[] = [
  { id: 'warframes', label: 'Warframes' },
  { id: 'companions', label: 'Companions' },
  { id: 'primary', label: 'Primaries' },
  { id: 'secondary', label: 'Secondaries' },
  { id: 'melee', label: 'Melee' },
  { id: 'archwing', label: 'Archwing' },
  { id: 'necramechs', label: 'Necramechs' },
  { id: 'other', label: 'Other' },
];

const MANUAL_TYPES = Object.keys(MANUAL_TYPE_LABELS) as ManualItemType[];

function progressFraction(state: ItemState): number {
  return state.item.points > 0 ? state.points / state.item.points : 0;
}

export function InventoryPage() {
  useDocumentTitle('Inventory');
  const { profile } = useAppState();
  const { items, status: itemStatus, error: itemError } = useItemData();
  const game = useGameData();
  const [inventory, setCount] = useManualInventory();

  const [section, setSection] = useState<'owned' | 'manual'>('owned');
  const [category, setCategory] = useState<'all' | TabId>('all');
  const [ownedStatus, setOwnedStatus] = useState<OwnedStatus>('all');
  const [mrFilter, setMrFilter] = useState<MrFilter>('all');
  const [ownedSort, setOwnedSort] = useState<OwnedSort>('name');
  const [ownedSearch, setOwnedSearch] = useState('');

  const [manualSearch, setManualSearch] = useState('');
  const [manualType, setManualType] = useState<'all' | ManualItemType>('all');
  const [manualSort, setManualSort] = useState<'name' | 'count'>('name');
  const [draftName, setDraftName] = useState('');
  const [draftCount, setDraftCount] = useState(1);

  const profileRank = profile?.playerLevel ?? 0;

  const ownedStates = useMemo(() => {
    if (!profile) return [];
    return computeItemStates(items, profile.xp, {}).filter(
      (state) => profile.xp[state.item.uniqueName] !== undefined,
    );
  }, [items, profile]);

  const ownedSummary = useMemo(() => {
    let mastered = 0;
    let inProgress = 0;
    for (const state of ownedStates) {
      if (state.mastered) mastered += 1;
      else if (state.points > 0) inProgress += 1;
    }
    return { total: ownedStates.length, mastered, inProgress };
  }, [ownedStates]);

  const filteredOwned = useMemo(() => {
    const query = ownedSearch.trim().toLowerCase();
    const list = ownedStates.filter((state) => {
      if (category !== 'all' && state.item.tab !== category) return false;
      if (ownedStatus === 'mastered' && !state.mastered) return false;
      if (ownedStatus === 'unstarted' && state.points > 0) return false;
      if (ownedStatus === 'progress' && (state.mastered || state.points === 0)) return false;
      if (mrFilter === 'available' && state.item.masteryReq > profileRank) return false;
      if (mrFilter === 'locked' && state.item.masteryReq <= profileRank) return false;
      if (query) {
        const haystack = `${state.item.name} ${state.item.type} ${state.item.category}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    return list.sort((a, b) => {
      if (ownedSort === 'mr') {
        return a.item.masteryReq - b.item.masteryReq || a.item.name.localeCompare(b.item.name);
      }
      if (ownedSort === 'progress') {
        return progressFraction(b) - progressFraction(a) || a.item.name.localeCompare(b.item.name);
      }
      return a.item.name.localeCompare(b.item.name);
    });
  }, [ownedStates, category, ownedStatus, mrFilter, ownedSort, ownedSearch, profileRank]);

  const groupedOwned = useMemo(() => {
    const byTab = new Map<TabId, ItemState[]>();
    for (const state of filteredOwned) {
      const list = byTab.get(state.item.tab) ?? [];
      list.push(state);
      byTab.set(state.item.tab, list);
    }
    return GROUPS.map((group) => ({ ...group, states: byTab.get(group.id) ?? [] })).filter(
      (group) => group.states.length > 0,
    );
  }, [filteredOwned]);

  const categoryTabs = useMemo<TabDefinition[]>(() => {
    const counts = new Map<TabId, number>();
    for (const state of ownedStates) counts.set(state.item.tab, (counts.get(state.item.tab) ?? 0) + 1);
    return [
      { id: 'all', label: 'All types', count: ownedStates.length },
      ...GROUPS.map((group) => ({ id: group.id, label: group.label, count: counts.get(group.id) ?? 0 })),
    ];
  }, [ownedStates]);

  const relicNames = useMemo(
    () => new Set<string>(game.relics?.map((relic) => relic.name) ?? []),
    [game.relics],
  );

  const rewardNames = useMemo(() => {
    const set = new Set<string>();
    if (game.relics) {
      for (const relic of game.relics) for (const reward of relic.rewards) set.add(reward.name);
    }
    return set;
  }, [game.relics]);

  const names = useMemo(() => {
    const set = new Set<string>();
    if (game.recipes) {
      for (const recipe of Object.values(game.recipes)) {
        set.add(`${recipe.name} Blueprint`);
        for (const component of recipe.components) set.add(component.name);
      }
    }
    for (const name of relicNames) set.add(name);
    for (const name of rewardNames) set.add(name);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [game.recipes, relicNames, rewardNames]);

  const manualRows = useMemo(() => {
    const query = manualSearch.trim().toLowerCase();
    return Object.entries(inventory)
      .map(([name, count]) => ({
        name,
        count,
        type: classifyManualItem(name, relicNames, rewardNames),
      }))
      .filter((row) => manualType === 'all' || row.type === manualType)
      .filter((row) => !query || row.name.toLowerCase().includes(query))
      .sort((a, b) => {
        if (manualSort === 'count') return b.count - a.count || a.name.localeCompare(b.name);
        return a.name.localeCompare(b.name);
      });
  }, [inventory, manualSearch, manualType, manualSort, relicNames, rewardNames]);

  const manualTypeTabs = useMemo<TabDefinition[]>(() => {
    const counts = new Map<ManualItemType, number>();
    for (const name of Object.keys(inventory)) {
      const type = classifyManualItem(name, relicNames, rewardNames);
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }
    return [
      { id: 'all', label: 'All entries', count: Object.keys(inventory).length },
      ...MANUAL_TYPES.map((type) => ({
        id: type,
        label: MANUAL_TYPE_LABELS[type],
        count: counts.get(type) ?? 0,
      })),
    ];
  }, [inventory, relicNames, rewardNames]);

  const sectionTabs: TabDefinition[] = [
    { id: 'owned', label: 'Owned in profile', count: ownedStates.length },
    { id: 'manual', label: 'Entered by you', count: Object.keys(inventory).length },
  ];

  if (itemStatus === 'error' || game.error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-sm text-rose-700 dark:text-rose-300">{itemError ?? game.error}</p>
      </div>
    );
  }

  function addDraft() {
    const name = draftName.trim();
    if (!name) return;
    setCount(name, (inventory[name] ?? 0) + Math.max(1, Math.floor(draftCount)));
    setDraftName('');
    setDraftCount(1);
  }

  function clearOwnedFilters() {
    setOwnedSearch('');
    setCategory('all');
    setOwnedStatus('all');
    setMrFilter('all');
    setOwnedSort('name');
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-3xl font-semibold">Inventory</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Warframes and weapons come from the profile you loaded, grouped by type. Resources, relics, mods, and parts
          cannot be read from the public profile, so enter their counts yourself. Everything stays in this browser.
        </p>
      </div>

      <Tabs
        tabs={sectionTabs}
        active={section}
        onChange={(id) => setSection(id as 'owned' | 'manual')}
        idPrefix="inv"
        label="Inventory sections"
      />

      {section === 'owned' && (
        <section aria-labelledby="inv-owned-title" className="space-y-5">
          <h2 id="inv-owned-title" className="sr-only">
            Owned in profile
          </h2>

          {!profile ? (
            <Card className="p-6 text-sm text-muted">
              <p>Load a profile to see the Warframes and weapons it contains.</p>
              <Link to="/" className={buttonClasses('primary', 'sm', 'mt-4')}>
                Load a profile
              </Link>
            </Card>
          ) : itemStatus === 'loading' ? (
            <p className="text-sm text-muted">Loading items…</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <SummaryTile label="Owned" value={formatNumber(ownedSummary.total)} tone="text-accent bg-accent/15" />
                <SummaryTile
                  label="Mastered"
                  value={formatNumber(ownedSummary.mastered)}
                  tone="text-gold bg-gold/15"
                />
                <SummaryTile
                  label="In progress"
                  value={formatNumber(ownedSummary.inProgress)}
                  tone="text-sky-700 dark:text-sky-300 bg-sky-500/15"
                />
              </div>

              <Card className="space-y-3 p-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_10rem_10rem_10rem]">
                  <div>
                    <label htmlFor="inv-owned-search" className="sr-only">
                      Search owned items
                    </label>
                    <input
                      id="inv-owned-search"
                      type="search"
                      value={ownedSearch}
                      onChange={(event) => setOwnedSearch(event.target.value)}
                      placeholder="Search by name, type, or category"
                      className="field"
                    />
                  </div>
                  <div>
                    <label htmlFor="inv-owned-status" className="sr-only">
                      Mastery status
                    </label>
                    <select
                      id="inv-owned-status"
                      value={ownedStatus}
                      onChange={(event) => setOwnedStatus(event.target.value as OwnedStatus)}
                      className="field"
                    >
                      <option value="all">All statuses</option>
                      <option value="mastered">Mastered</option>
                      <option value="progress">In progress</option>
                      <option value="unstarted">Not started</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="inv-owned-mr" className="sr-only">
                      Mastery rank requirement
                    </label>
                    <select
                      id="inv-owned-mr"
                      value={mrFilter}
                      onChange={(event) => setMrFilter(event.target.value as MrFilter)}
                      className="field"
                    >
                      <option value="all">Any rank requirement</option>
                      <option value="available">Usable at MR {profileRank}</option>
                      <option value="locked">Above MR {profileRank}</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="inv-owned-sort" className="sr-only">
                      Sort owned items
                    </label>
                    <select
                      id="inv-owned-sort"
                      value={ownedSort}
                      onChange={(event) => setOwnedSort(event.target.value as OwnedSort)}
                      className="field"
                    >
                      <option value="name">Sort: name</option>
                      <option value="mr">Sort: rank requirement</option>
                      <option value="progress">Sort: closest to mastered</option>
                    </select>
                  </div>
                </div>
                <p className="text-sm text-muted" aria-live="polite">
                  Showing {formatNumber(filteredOwned.length)} of {formatNumber(ownedStates.length)} owned items.
                </p>
              </Card>

              <Tabs
                tabs={categoryTabs}
                active={category}
                onChange={(id) => setCategory(id as 'all' | TabId)}
                idPrefix="inv-type"
                label="Item types"
              />

              {groupedOwned.length === 0 ? (
                <Card className="p-6 text-sm text-muted">
                  <p>No owned items match these filters.</p>
                  <Button variant="secondary" size="sm" className="mt-4" onClick={clearOwnedFilters}>
                    Clear filters
                  </Button>
                </Card>
              ) : (
                <div className="space-y-8">
                  {groupedOwned.map((group) => {
                    const mastered = group.states.filter((state) => state.mastered).length;
                    const color = SOURCE_COLORS[group.id];
                    return (
                      <section key={group.id} aria-labelledby={`inv-group-${group.id}`}>
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${color.bar}`} aria-hidden="true" />
                          <h3 id={`inv-group-${group.id}`} className="text-lg font-semibold">
                            {group.label}
                          </h3>
                          <span className="text-xs text-muted tabular">
                            {formatNumber(group.states.length)} owned · {formatNumber(mastered)} mastered
                          </span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {group.states.map((state) => (
                            <ItemCard key={state.item.uniqueName} state={state} readOnly />
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {section === 'manual' && (
        <section aria-labelledby="inv-manual-title" className="space-y-5">
          <h2 id="inv-manual-title" className="sr-only">
            Entered by you
          </h2>

          <Card className="p-5">
            <form
              className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                addDraft();
              }}
            >
              <div>
                <label htmlFor="inv-name" className="block text-sm font-medium">
                  Resource, relic, mod, or part
                </label>
                <input
                  id="inv-name"
                  list="inv-names"
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  placeholder="Start typing, e.g. Orokin Cell"
                  className="field mt-1.5"
                />
                <datalist id="inv-names">
                  {names.slice(0, 4000).map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>
              <div>
                <label htmlFor="inv-count" className="block text-sm font-medium">
                  Count
                </label>
                <input
                  id="inv-count"
                  type="number"
                  min={1}
                  value={draftCount}
                  onChange={(event) => setDraftCount(Number.parseInt(event.target.value, 10) || 1)}
                  className="field mt-1.5 tabular"
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={!draftName.trim() || !game.recipes}>
                  Add
                </Button>
              </div>
            </form>
            {!game.recipes && <p className="mt-3 text-xs text-muted">Loading the name list…</p>}
          </Card>

          <Tabs
            tabs={manualTypeTabs}
            active={manualType}
            onChange={(id) => setManualType(id as 'all' | ManualItemType)}
            idPrefix="inv-manual-type"
            label="Manual entry types"
          />

          <Card className="space-y-3 p-4">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
              <div>
                <label htmlFor="inv-filter" className="sr-only">
                  Filter your entries
                </label>
                <input
                  id="inv-filter"
                  type="search"
                  value={manualSearch}
                  onChange={(event) => setManualSearch(event.target.value)}
                  placeholder="Filter your entries"
                  className="field"
                />
              </div>
              <div>
                <label htmlFor="inv-manual-sort" className="sr-only">
                  Sort manual entries
                </label>
                <select
                  id="inv-manual-sort"
                  value={manualSort}
                  onChange={(event) => setManualSort(event.target.value as 'name' | 'count')}
                  className="field"
                >
                  <option value="name">Sort: name</option>
                  <option value="count">Sort: count</option>
                </select>
              </div>
            </div>
            <p className="text-sm text-muted" aria-live="polite">
              {formatNumber(Object.keys(inventory).length)} entries ·{' '}
              {formatNumber(Object.values(inventory).reduce((total, value) => total + value, 0))} total items
            </p>
          </Card>

          {manualRows.length === 0 ? (
            <Card className="p-6 text-sm text-muted">
              Nothing matches. Add resources, relics, mods, or parts above.
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-line/10 bg-surface-2">
              <table className="w-full text-sm">
                <caption className="sr-only">Items you entered</caption>
                <thead className="border-b border-line/10 text-left text-xs text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-medium">Name</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Type</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">Count</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/10">
                  {manualRows.map((row) => (
                    <tr key={row.name}>
                      <th scope="row" className="px-4 py-2 text-left font-normal">{row.name}</th>
                      <td className="px-4 py-2 text-muted">{MANUAL_TYPE_LABELS[row.type]}</td>
                      <td className="px-4 py-2 text-right">
                        <label htmlFor={`count-${row.name}`} className="sr-only">
                          Count of {row.name}
                        </label>
                        <input
                          id={`count-${row.name}`}
                          type="number"
                          min={0}
                          value={row.count}
                          onChange={(event) => setCount(row.name, Number.parseInt(event.target.value, 10) || 0)}
                          className="field ml-auto h-8 w-24 px-2 text-right tabular"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button variant="ghost" size="sm" onClick={() => setCount(row.name, 0)}>
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-lg border border-line/10 bg-surface-2 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold leading-none tabular">
        <span className={`inline-block rounded px-1.5 py-0.5 ${tone}`}>{value}</span>
      </p>
    </div>
  );
}
