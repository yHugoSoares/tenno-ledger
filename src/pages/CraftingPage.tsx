import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useGameData } from '@/hooks/useGameData';
import { useManualInventory } from '@/hooks/useManualInventory';
import { buildRelicIndex } from '@/lib/gameData';
import { componentNeeds, craftSummary, sortSources } from '@/lib/crafting';
import { formatNumber } from '@/lib/format';
import { PLACEHOLDER_IMAGE, itemImageUrl } from '@/lib/items';
import { Card } from '@/components/Card';

interface CraftOption {
  uniqueName: string;
  name: string;
  category: string;
  type: string;
  imageName?: string;
  ready: boolean;
  missing: number;
}

const MAX_RESULTS = 60;

type ReadinessFilter = 'all' | 'ready' | 'missing';
type CraftSort = 'name' | 'missing';

function RecipeArt({ imageName, size = 'sm' }: { imageName?: string; size?: 'sm' | 'lg' }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? PLACEHOLDER_IMAGE : (itemImageUrl(imageName) ?? PLACEHOLDER_IMAGE);
  const box = size === 'lg' ? 'h-16 w-16' : 'h-9 w-9';
  const img = size === 'lg' ? 'h-14 w-14' : 'h-8 w-8';
  return (
    <span className={`grid shrink-0 place-items-center rounded border border-line/10 bg-surface-3 ${box}`}>
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className={`${img} object-contain`}
      />
    </span>
  );
}

export function CraftingPage() {
  useDocumentTitle('Crafting');
  const game = useGameData();
  const [inventory] = useManualInventory();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [readiness, setReadiness] = useState<ReadinessFilter>('all');
  const [sort, setSort] = useState<CraftSort>('name');
  const [selected, setSelected] = useState<string | null>(null);

  const recipeStats = useMemo(() => {
    const map = new Map<string, { ready: boolean; missing: number }>();
    if (!game.recipes) return map;
    for (const [uniqueName, recipe] of Object.entries(game.recipes)) {
      const needs = componentNeeds(recipe, inventory);
      map.set(uniqueName, {
        ready: needs.every((need) => need.missing === 0),
        missing: needs.filter((need) => need.missing > 0).length,
      });
    }
    return map;
  }, [game.recipes, inventory]);

  const options = useMemo<CraftOption[]>(() => {
    if (!game.recipes) return [];
    return Object.entries(game.recipes)
      .map(([uniqueName, recipe]) => {
        const stats = recipeStats.get(uniqueName);
        return {
          uniqueName,
          name: recipe.name,
          category: recipe.category ?? '',
          type: recipe.type ?? '',
          imageName: recipe.imageName,
          ready: stats?.ready ?? false,
          missing: stats?.missing ?? 0,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [game.recipes, recipeStats]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const option of options) if (option.category) set.add(option.category);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [options]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = options.filter((option) => {
      if (category !== 'all' && option.category !== category) return false;
      if (readiness === 'ready' && !option.ready) return false;
      if (readiness === 'missing' && option.ready) return false;
      if (q) {
        const haystack = `${option.name} ${option.category} ${option.type}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    list.sort((a, b) => {
      if (sort === 'missing') return b.missing - a.missing || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [options, query, category, readiness, sort]);

  const visibleMatches = matches.slice(0, MAX_RESULTS);
  const relicIndex = useMemo(() => (game.relics ? buildRelicIndex(game.relics) : new Map()), [game.relics]);

  const recipe = selected && game.recipes ? game.recipes[selected] : undefined;
  const needs = useMemo(() => (recipe ? componentNeeds(recipe, inventory) : []), [recipe, inventory]);
  const summary = craftSummary(needs);
  const selectedOption = selected ? options.find((option) => option.uniqueName === selected) : undefined;

  useDocumentTitle(recipe ? `${recipe.name} · Crafting` : 'Crafting');

  if (game.error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-sm text-rose-700 dark:text-rose-300">{game.error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-3xl font-semibold">Crafting</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Pick an item to see every component, how many you already have, and which relics drop the missing parts.
          Filters match category, readiness, and name.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside aria-label="Craftable items" className="space-y-3">
          <div className="grid gap-2">
            <div>
              <label htmlFor="craft-search" className="sr-only">
                Find a craftable item
              </label>
              <input
                id="craft-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search a craftable item"
                className="field"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="craft-category" className="sr-only">
                  Category
                </label>
                <select
                  id="craft-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="field"
                >
                  <option value="all">All categories</option>
                  {categories.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="craft-readiness" className="sr-only">
                  Crafting readiness
                </label>
                <select
                  id="craft-readiness"
                  value={readiness}
                  onChange={(event) => setReadiness(event.target.value as ReadinessFilter)}
                  className="field"
                >
                  <option value="all">Any readiness</option>
                  <option value="ready">Ready to craft</option>
                  <option value="missing">Missing parts</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="craft-sort" className="sr-only">
                Sort craftable items
              </label>
              <select
                id="craft-sort"
                value={sort}
                onChange={(event) => setSort(event.target.value as CraftSort)}
                className="field"
              >
                <option value="name">Sort: name</option>
                <option value="missing">Sort: most missing</option>
              </select>
            </div>
          </div>

          <p className="text-xs text-muted tabular" aria-live="polite">
            {formatNumber(matches.length)} recipes match
            {matches.length > visibleMatches.length ? ` · showing ${formatNumber(visibleMatches.length)}` : ''}
          </p>

          {!game.recipes ? (
            <p className="text-sm text-muted">Loading recipes…</p>
          ) : (
            <ul className="max-h-[62vh] space-y-1 overflow-y-auto pr-1">
              {visibleMatches.map((option) => (
                <li key={option.uniqueName}>
                  <button
                    type="button"
                    onClick={() => setSelected(option.uniqueName)}
                    aria-current={selected === option.uniqueName ? 'true' : undefined}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors ${
                      selected === option.uniqueName ? 'bg-accent text-accent-contrast' : 'hover:bg-surface-3'
                    }`}
                  >
                    <RecipeArt imageName={option.imageName} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{option.name}</span>
                      <span
                        className={`block truncate text-xs ${
                          selected === option.uniqueName ? 'text-accent-contrast/80' : 'text-muted'
                        }`}
                      >
                        {option.category || option.type || 'Craftable'}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${
                        option.ready
                          ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                          : 'bg-surface-3 text-muted'
                      }`}
                    >
                      {option.ready ? 'Ready' : `${option.missing} missing`}
                    </span>
                  </button>
                </li>
              ))}
              {visibleMatches.length === 0 && <li className="px-3 py-2 text-sm text-muted">No match.</li>}
            </ul>
          )}
        </aside>

        <section aria-live="polite" className="min-w-0">
          {!recipe ? (
            <Card className="p-6 text-sm text-muted">
              <p>Choose an item to see its components, what you already have, and where the missing parts drop.</p>
              <p className="mt-2">
                Counts come from your{' '}
                <Link to="/inventory" className="text-accent underline underline-offset-4">
                  inventory
                </Link>
                .
              </p>
            </Card>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <RecipeArt imageName={selectedOption?.imageName} size="lg" />
                <div className="min-w-0">
                  <h2 className="text-2xl font-semibold">{recipe.name}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {[recipe.category, recipe.type].filter(Boolean).join(' · ') || 'Craftable item'}
                  </p>
                  <p
                    className={`mt-2 text-sm ${
                      summary.ready ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted'
                    }`}
                  >
                    {summary.ready
                      ? 'You have every component. Ready to craft.'
                      : `${formatNumber(summary.missingParts)} of ${formatNumber(needs.length)} component types are missing.`}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-line/10 bg-surface-2">
                <table className="w-full text-sm">
                  <caption className="sr-only">Components for {recipe.name}</caption>
                  <thead className="border-b border-line/10 text-left text-xs text-muted">
                    <tr>
                      <th scope="col" className="px-4 py-2.5 font-medium">Component</th>
                      <th scope="col" className="px-4 py-2.5 text-right font-medium">Need</th>
                      <th scope="col" className="px-4 py-2.5 text-right font-medium">Have</th>
                      <th scope="col" className="px-4 py-2.5 text-right font-medium">Missing</th>
                      <th scope="col" className="hidden px-4 py-2.5 font-medium md:table-cell">
                        Where it drops (Radiant)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/10">
                    {needs.map((need, index) => {
                      const component = recipe.components[index];
                      const sources = sortSources(relicIndex.get(need.name) ?? []).slice(0, 3);
                      const generic = component ? component.uniqueName.includes('/Items/') : false;
                      return (
                        <tr key={need.name}>
                          <th scope="row" className="px-4 py-2.5 text-left font-normal">
                            {need.name}
                            {generic && <span className="ml-2 text-xs text-muted">resource</span>}
                          </th>
                          <td className="px-4 py-2.5 text-right tabular">{need.need}</td>
                          <td className="px-4 py-2.5 text-right tabular">{need.have}</td>
                          <td
                            className={`px-4 py-2.5 text-right font-medium tabular ${
                              need.missing > 0
                                ? 'text-rose-700 dark:text-rose-300'
                                : 'text-emerald-700 dark:text-emerald-300'
                            }`}
                          >
                            {need.missing}
                          </td>
                          <td className="hidden px-4 py-2.5 text-muted md:table-cell">
                            {sources.length === 0 ? (
                              <span>Not in any relic</span>
                            ) : (
                              <ul className="space-y-0.5">
                                {sources.map((source) => (
                                  <li key={`${source.relic.name}-${source.reward.name}`}>
                                    {source.relic.name} · {source.reward.rarity} · {source.reward.chance}%
                                    {source.relic.vaulted && <span className="ml-1 text-xs">(vaulted)</span>}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted">
                Nested crafts (for example, a resource that is itself crafted) are not expanded yet. Counts are your own
                entries, so keep them up to date in the inventory. Relic chances are for Radiant refinement.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
