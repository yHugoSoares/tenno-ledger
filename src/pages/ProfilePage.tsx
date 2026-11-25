import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { buildDemoProfile } from '@/fixtures/demo';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useHotkey } from '@/hooks/useHotkey';
import { useItemData } from '@/hooks/useItemData';
import { useShareSnapshot } from '@/hooks/useShareSnapshot';
import { copyText } from '@/lib/clipboard';
import { buildJsonExport, buildMarkdown, downloadText, safeFilename } from '@/lib/export';
import { formatNumber } from '@/lib/format';
import { ITEM_TABS } from '@/lib/items';
import { calculateMissionBreakdown } from '@/lib/missions';
import { categoryBreakdown, computeItemStates, computeMasteryStats, type BreakdownRow } from '@/lib/mastery';
import { buildShareSnapshot, encodeShare } from '@/lib/share';
import type { ManualExtras, MissionProgress, Overrides, TabId } from '@/lib/types';
import { useAppState } from '@/state/AppStateProvider';
import { useToast } from '@/state/ToastProvider';
import { Button, buttonClasses } from '@/components/Button';
import { BreakdownBars } from '@/components/BreakdownBars';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Filters, type MasteryFilter, type SortMode } from '@/components/Filters';
import { NextUp } from '@/components/NextUp';
import { ProfileHeader } from '@/components/ProfileHeader';
import { ProfileSkeleton } from '@/components/Skeleton';
import { ShareBanner } from '@/components/ShareBanner';
import { Tabs, type TabDefinition } from '@/components/Tabs';
import { VirtualItemGrid } from '@/components/VirtualItemGrid';
import { TrophyIcon, ZapIcon, TargetIcon, StarIcon } from '@/components/Icons';

type ActiveTab = TabId | 'all';
type Section = 'overview' | 'points' | 'items' | 'next';

const SECTIONS: TabDefinition[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'points', label: 'Points' },
  { id: 'items', label: 'Items' },
  { id: 'next', label: 'Next up' },
];

interface OutletContext {
  openSettings: () => void;
}

export function ProfilePage() {
  const { profile, setProfile, extras: localExtras, overrides: localOverrides, setOverride } = useAppState();
  const { toast } = useToast();
  const { openSettings } = useOutletContext<OutletContext>();
  const { items, status, error, warning, reload } = useItemData();
  const { snapshot, invalid, clear } = useShareSnapshot();

  const [section, setSection] = useState<Section>('overview');
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [search, setSearch] = useState('');
  const [masteryFilter, setMasteryFilter] = useState<MasteryFilter>('all');
  const [sort, setSort] = useState<SortMode>('points');
  const searchRef = useRef<HTMLInputElement>(null);

  const shared = snapshot !== null;
  const readOnly = shared;
  const displayName = shared ? snapshot.displayName : (profile?.displayName ?? '');
  const profileRank = shared ? snapshot.playerLevel : (profile?.playerLevel ?? 0);
  const xp = shared ? snapshot.xp : (profile?.xp ?? {});
  const missions: MissionProgress[] = shared ? snapshot.missions : (profile?.missions ?? []);
  const intrinsicRanks = shared ? snapshot.intrinsicRanks : (profile?.intrinsicRanks ?? 0);
  const extras: ManualExtras = shared ? snapshot.extras : localExtras;
  const overrides: Overrides = shared ? snapshot.overrides : localOverrides;
  const source = shared ? 'share' : (profile?.source ?? 'paste');
  const fetchedAt = shared ? undefined : profile?.fetchedAt;
  const sharedAt = shared ? snapshot.createdAt : undefined;

  useDocumentTitle(displayName ? `${displayName} · Tenno Ledger` : 'Profile');

  const focusSearch = useCallback(() => {
    searchRef.current?.focus();
  }, []);

  useHotkey('/', (event) => {
    event.preventDefault();
    setSection('items');
    window.setTimeout(focusSearch, 0);
  });

  const states = useMemo(() => computeItemStates(items, xp, overrides), [items, xp, overrides]);
  const stats = useMemo(
    () => computeMasteryStats(states, extras, missions, intrinsicRanks),
    [states, extras, missions, intrinsicRanks],
  );
  const rows = useMemo(() => categoryBreakdown(states, stats), [states, stats]);
  const missionDetail = useMemo(() => calculateMissionBreakdown(missions), [missions]);

  const categoryTabs = useMemo<TabDefinition[]>(() => {
    const all: TabDefinition = { id: 'all', label: 'All', count: states.length, mastered: stats.masteredCount };
    const tabs = ITEM_TABS.map((tab) => {
      const tabStates = states.filter((state) => state.item.tab === tab.id);
      return {
        id: tab.id,
        label: tab.label,
        count: tabStates.length,
        mastered: tabStates.filter((state) => state.mastered).length,
      };
    });
    return [all, ...tabs];
  }, [states, stats.masteredCount]);

  const visibleStates = useMemo(() => {
    const base = activeTab === 'all' ? states : states.filter((state) => state.item.tab === activeTab);
    const query = search.trim().toLowerCase();
    const filtered = base.filter((state) => {
      if (masteryFilter === 'mastered' && !state.mastered) return false;
      if (masteryFilter === 'missing' && state.mastered) return false;
      if (query) {
        const haystack = `${state.item.name} ${state.item.type} ${state.item.category}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      if (sort === 'points') return b.item.points - a.item.points || a.item.name.localeCompare(b.item.name);
      if (sort === 'mr') return a.item.masteryReq - b.item.masteryReq || a.item.name.localeCompare(b.item.name);
      if (a.mastered !== b.mastered) return a.mastered ? 1 : -1;
      return a.remainingXp - b.remainingXp || a.item.name.localeCompare(b.item.name);
    });
  }, [states, activeTab, search, masteryFilter, sort]);

  const tabCountsById = useMemo(() => {
    const counts = new Map<string, { mastered: number; count: number }>();
    for (const state of states) {
      const entry = counts.get(state.item.tab) ?? { mastered: 0, count: 0 };
      entry.count += 1;
      if (state.mastered) entry.mastered += 1;
      counts.set(state.item.tab, entry);
    }
    return counts;
  }, [states]);

  const handleOverride = useCallback(
    (uniqueName: string, value: boolean | undefined) => {
      if (readOnly) return;
      setOverride(uniqueName, value);
    },
    [readOnly, setOverride],
  );

  async function handleCopyShare() {
    const shareSnapshot = buildShareSnapshot(
      { displayName, playerLevel: profileRank, xp, missions, intrinsicRanks },
      extras,
      overrides,
      items,
    );
    const encoded = encodeShare(shareSnapshot);
    if (encoded.tooLarge) {
      toast('This snapshot is too large for a link. Use the JSON export instead.', 'error');
      return;
    }
    const url = `${window.location.origin}/${encoded.hash}`;
    const copied = await copyText(url);
    toast(
      copied ? 'Share link copied. It contains this snapshot only.' : 'Could not copy the link. Copy it from the address bar instead.',
      copied ? 'success' : 'error',
    );
  }

  function handleExportMarkdown() {
    downloadText(`${safeFilename(displayName)}-mastery.md`, buildMarkdown(displayName, stats, states, extras), 'text/markdown');
    toast('Markdown checklist downloaded.', 'success');
  }

  function handleExportJson() {
    const json = buildJsonExport({ displayName, playerLevel: profileRank, source }, stats, states, extras, overrides);
    downloadText(`${safeFilename(displayName)}-mastery.json`, json, 'application/json');
    toast('JSON snapshot downloaded.', 'success');
  }

  function handleViewAllMissing() {
    setSection('items');
    setActiveTab('all');
    setMasteryFilter('missing');
    setSort('closeness');
    setSearch('');
  }

  function clearFilters() {
    setSearch('');
    setMasteryFilter('all');
    setSort('points');
    setActiveTab('all');
  }

  function handleDemo() {
    if (items.length === 0) return;
    setProfile(buildDemoProfile(items));
    toast('Demo profile loaded. It is generated locally and is not a real account.', 'info');
  }

  if (status === 'loading') {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <ProfileSkeleton />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <ErrorState
          title="The item list could not be loaded"
          message={error ?? 'The item data could not be loaded.'}
          actions={<Button onClick={() => reload(true)}>Try again</Button>}
        />
      </div>
    );
  }

  if (invalid && !profile) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <ErrorState
          title="This share link cannot be read"
          message="The link may be cut off or come from an older version of Tenno Ledger. Ask for a new link, or load your own profile."
          actions={
            <Link to="/" className={buttonClasses('primary', 'md')}>
              Go to the home page
            </Link>
          }
        />
      </div>
    );
  }

  if (!shared && !profile) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <EmptyState
          title="No profile loaded"
          description="Load a profile from the home page, or use demo data to see the breakdown and item list."
          action={
            <Link to="/" className={buttonClasses('primary', 'md')}>
              Load a profile
            </Link>
          }
          secondaryAction={
            <Button variant="secondary" onClick={handleDemo}>
              Use demo data
            </Button>
          }
        />
      </div>
    );
  }

  const intrinsicRankCount = Math.round(stats.intrinsicPoints / 1_500);
  const categoryLabel = activeTab === 'all' ? 'items' : (ITEM_TABS.find((tab) => tab.id === activeTab)?.label ?? '').toLowerCase();
  const categoryTotal = activeTab === 'all' ? states.length : (tabCountsById.get(activeTab)?.count ?? 0);

  const details: Record<BreakdownRow['id'], string> = {
    warframes: categoryDetail('warframes'),
    primary: categoryDetail('primary'),
    secondary: categoryDetail('secondary'),
    melee: categoryDetail('melee'),
    companions: categoryDetail('companions'),
    archwing: categoryDetail('archwing'),
    necramechs: categoryDetail('necramechs'),
    other: categoryDetail('other'),
    nodes: missionDetail.hasProfileData
      ? `${formatNumber(stats.completedMissions)} of ${formatNumber(stats.totalMissionNodes)} known nodes`
      : 'Not in this profile',
    junctions: missionDetail.hasProfileData
      ? `${stats.completedJunctions} of ${stats.totalJunctions} junctions`
      : `${extras.junctions} entered manually`,
    intrinsics: `${intrinsicRankCount} ${intrinsicRankCount === 1 ? 'rank' : 'ranks'}`,
    starchart: 'Entered in Settings',
  };

  function categoryDetail(id: TabId): string {
    const counted = tabCountsById.get(id);
    return counted ? `${formatNumber(counted.mastered)} of ${formatNumber(counted.count)} mastered` : '';
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      {shared && snapshot && (
        <ShareBanner
          createdAt={snapshot.createdAt}
          onCopy={() => void handleCopyShare()}
          onClear={clear}
          hasLocalProfile={Boolean(profile)}
        />
      )}
      {invalid && profile && (
        <div className="flex flex-col gap-3 rounded-lg border border-rose-500/40 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted">The share link is invalid. Showing your own profile instead.</p>
          <Button variant="ghost" size="sm" onClick={clear}>
            Dismiss
          </Button>
        </div>
      )}
      {warning && <p className="text-sm text-muted">{warning}</p>}

      <ProfileHeader
        displayName={displayName}
        profileRank={profileRank}
        stats={stats}
        fetchedAt={fetchedAt}
        source={source}
        readOnly={readOnly}
        sharedAt={sharedAt}
        onCopyShare={() => void handleCopyShare()}
        onExportMarkdown={handleExportMarkdown}
        onExportJson={handleExportJson}
      />

      <Tabs tabs={SECTIONS} active={section} onChange={(id) => setSection(id as Section)} idPrefix="section" label="Profile sections" />

      <div role="tabpanel" className="blur-in" id="section-panel-overview" aria-labelledby="section-overview" hidden={section !== 'overview'}>
        {section === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile icon={<ZapIcon className="h-5 w-5" />} label="Mastery points" value={formatNumber(stats.totalPoints)} tone="text-accent bg-accent/15" />
              <StatTile icon={<TrophyIcon className="h-5 w-5" />} label="Items mastered" value={`${formatNumber(stats.masteredCount)} / ${formatNumber(stats.totalItems)}`} tone="text-gold bg-gold/15" />
              <StatTile icon={<TargetIcon className="h-5 w-5" />} label="Junctions" value={`${stats.completedJunctions} / ${stats.totalJunctions}`} tone="text-fuchsia-700 dark:text-fuchsia-300 bg-fuchsia-500/15" />
              <StatTile icon={<StarIcon className="h-5 w-5" />} label="Item completion" value={`${(stats.completion * 100).toFixed(1)}%`} tone="text-emerald-700 dark:text-emerald-300 bg-emerald-500/15" />
            </div>
            <NextUp states={states} rank={stats.rank} onViewAll={handleViewAllMissing} limit={3} />
          </div>
        )}
      </div>

      <div role="tabpanel" className="blur-in" id="section-panel-points" aria-labelledby="section-points" hidden={section !== 'points'}>
        {section === 'points' && (
          <section aria-labelledby="breakdown-title" className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="breakdown-title" className="text-xl font-semibold">
                  Points by source
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Every source that adds to the total of {formatNumber(stats.totalPoints)}.
                </p>
              </div>
              {!readOnly && (
                <Button variant="secondary" size="sm" onClick={openSettings}>
                  Add extra points
                </Button>
              )}
            </div>
            <BreakdownBars rows={rows} total={stats.totalPoints} details={details} />
            {(missionDetail.unknownCompletedTags.length > 0 || !missionDetail.hasProfileData) && (
              <div className="space-y-1 rounded-lg border border-line/10 bg-surface-2 p-4 text-sm text-muted">
                {missionDetail.unknownCompletedTags.length > 0 && (
                  <p>
                    {formatNumber(missionDetail.unknownCompletedTags.length)} completed nodes are not in the mastery map
                    yet, so they are not counted.
                  </p>
                )}
                {!missionDetail.hasProfileData && <p>This profile has no mission data, so junctions and intrinsics come from Settings.</p>}
              </div>
            )}
          </section>
        )}
      </div>

      <div role="tabpanel" className="blur-in" id="section-panel-items" aria-labelledby="section-items" hidden={section !== 'items'}>
        {section === 'items' && (
          <section className="space-y-5" aria-labelledby="items-title">
            <div>
              <h2 id="items-title" className="text-xl font-semibold">
                Every masterable item
              </h2>
              <p className="mt-1 text-sm text-muted">
                Pick a category, then search or filter. Use the override on a card if the profile is out of date.
              </p>
            </div>

            <Tabs tabs={categoryTabs} active={activeTab} onChange={(id) => setActiveTab(id as ActiveTab)} label="Item categories" idPrefix="cat" />

            <Filters
              search={search}
              onSearch={setSearch}
              masteryFilter={masteryFilter}
              onMasteryFilter={setMasteryFilter}
              sort={sort}
              onSort={setSort}
              resultCount={visibleStates.length}
              totalCount={categoryTotal}
              searchRef={searchRef}
            />

            {visibleStates.length === 0 ? (
              <Card className="p-6 text-sm text-muted">
                <p>No {categoryLabel} match these filters.</p>
                <Button variant="secondary" size="sm" className="mt-4" onClick={clearFilters}>
                  Clear filters
                </Button>
              </Card>
            ) : (
              <VirtualItemGrid items={visibleStates} readOnly={readOnly} onOverride={handleOverride} labelledBy={`cat-${activeTab}`} />
            )}
          </section>
        )}
      </div>

      <div role="tabpanel" className="blur-in" id="section-panel-next" aria-labelledby="section-next" hidden={section !== 'next'}>
        {section === 'next' && <NextUp states={states} rank={stats.rank} onViewAll={handleViewAllMissing} limit={24} />}
      </div>

      <p className="pt-4 text-xs leading-5 text-muted">
        Mastery rank N needs 2,500 × N² points. Affinity thresholds are 500 × rank² for weapons and 1,000 × rank² for
        Warframes, companions, and Archwings. Overlevelled weapons and Necramechs use their published Forma tables.
        Star Chart nodes and junctions count once, on first completion.
      </p>
    </div>
  );
}

function StatTile({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-line/10 bg-surface-2 p-4 transition-colors hover:border-line/25">
      <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>{icon}</span>
      <p className="mt-3 text-xs text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold leading-none tabular sm:text-3xl">{value}</p>
    </div>
  );
}
