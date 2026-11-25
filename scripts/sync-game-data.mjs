#!/usr/bin/env node
/**
 * Builds two static files from the WFCD warframe-items dataset:
 *   public/data/recipes.json  crafting components for every craftable item
 *   public/data/relics.json   every relic with its rewards, rarity, and chance
 *
 * Only WFCD's public GitHub data is used. Digital Extremes' profile endpoint is never called.
 */
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const BASE =
  process.env.WFCD_ITEMS_BASE ??
  'https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json';

/** Community export with per-relic unlock and vault timestamps. No DE endpoints are used. */
const RELIC_EXPORT_URL =
  process.env.WF_RELIC_EXPORT ??
  'https://raw.githubusercontent.com/calamity-inc/warframe-public-export-plus/master/ExportRelics.json';

const CATEGORY_FILES = [
  'Warframes',
  'Primary',
  'Secondary',
  'Melee',
  'Pets',
  'Sentinels',
  'SentinelWeapons',
  'Archwing',
  'Arch-Gun',
  'Arch-Melee',
  'Misc',
  'Gear',
  'Resources',
];

const outDir = resolve(process.cwd(), process.env.OUT_DIR ?? 'public/data');

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'TennoLedger/1.0 (static game data sync)' },
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function writeAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  const json = `${JSON.stringify(value)}\n`;
  await writeFile(tmp, json, 'utf8');
  await rename(tmp, path);
  return Buffer.byteLength(json);
}

/** Part names WFCD uses in unique IDs that differ from the in-game reward names. */
const PART_ALIASES = { Helmet: 'Neuroptics' };

function camelToWords(text) {
  return text.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2').trim();
}

/**
 * Relic rewards use full names ("Ash Prime Chassis"). The live WFCD component entries have only
 * a unique ID (for example "AshPrimeChassisComponent"), so the name is derived from that ID.
 * Entries that do include a name or drop list are used as they are.
 */
function rewardNameFor(parentName, component) {
  const counts = new Map();
  for (const drop of component.drops ?? []) {
    if (drop?.type) counts.set(drop.type, (counts.get(drop.type) ?? 0) + 1);
  }
  if (counts.size > 0) return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];

  const unique = component.uniqueName ?? '';
  const last = unique.split('/').pop() ?? '';
  if (!unique.includes('/Recipes/')) {
    return component.name ? component.name : camelToWords(last);
  }
  if (component.name) return `${parentName} ${component.name}`;

  const parentId = parentName.replace(/\s+/g, '');
  let part = last.startsWith(parentId) ? last.slice(parentId.length) : last;
  part = part.replace(/Component$/, '');
  const word = PART_ALIASES[part] ?? camelToWords(part);
  // Relic rewards list Warframe parts as blueprints ("Ash Prime Chassis Blueprint").
  const isWarframePart = unique.includes('/WarframeRecipes/') && word !== 'Blueprint';
  return `${parentName} ${word}${isWarframePart ? ' Blueprint' : ''}`.replace(/ Blueprint Blueprint$/, ' Blueprint').trim();
}

const recipes = {};
for (const file of CATEGORY_FILES) {
  process.stdout.write(`[game-data] ${file} ... `);
  const items = await fetchJson(`${BASE}/${file}.json`);
  if (!Array.isArray(items)) throw new Error(`${file}.json is not an array`);
  let count = 0;
  for (const item of items) {
    if (!Array.isArray(item.components) || item.components.length === 0) continue;
    recipes[item.uniqueName] = {
      name: item.name,
      category: item.category ?? '',
      type: item.type ?? '',
      imageName: item.imageName ?? '',
      components: item.components.map((component) => ({
        name: rewardNameFor(item.name, component),
        uniqueName: component.uniqueName ?? '',
        itemCount: Number.isFinite(component.itemCount) ? component.itemCount : 1,
      })),
    };
    count += 1;
  }
  console.log(`${count} craftable`);
}

console.log('[game-data] Relics.json + ExportRelics.json ...');
const [rawRelics, relicExport] = await Promise.all([
  fetchJson(`${BASE}/Relics.json`),
  fetchJson(RELIC_EXPORT_URL),
]);
if (!Array.isArray(rawRelics)) throw new Error('Relics.json is not an array');
if (typeof relicExport !== 'object' || relicExport === null) {
  throw new Error('ExportRelics.json is not an object');
}

const RELIC_QUALITIES = ['Intact', 'Exceptional', 'Flawless', 'Radiant'];
const QUALITY_SUFFIX = new RegExp(` (${RELIC_QUALITIES.join('|')})$`);

/** "Axi A1 Radiant" -> "Axi A1". Generic placeholders stay untouched and are skipped later. */
function baseRelicName(name) {
  return String(name ?? '').replace(QUALITY_SUFFIX, '').trim();
}

/**
 * WFCD publishes four entries per relic (one per refinement). The site shows one card per relic
 * using the Radiant drop table, which is what players usually want for planning.
 */
const relicGroups = new Map();
for (const relic of rawRelics) {
  if (!Array.isArray(relic.rewards) || relic.rewards.length === 0) continue;
  const base = baseRelicName(relic.name);
  if (!base || /^(Lith|Meso|Neo|Axi|Requiem|Void) Relic$/.test(base)) continue;
  const group = relicGroups.get(base) ?? [];
  group.push(relic);
  relicGroups.set(base, group);
}

function epochMs(seconds) {
  const value = Number(seconds);
  return Number.isFinite(value) && value > 0 ? value * 1000 : undefined;
}

const relics = [...relicGroups.entries()]
  .map(([base, variants]) => {
    const radiant =
      variants.find((variant) => / Radiant$/.test(variant.name)) ??
      variants.find((variant) => / Flawless$/.test(variant.name)) ??
      variants[0];
    const exportEntry = relicExport[radiant.uniqueName];
    const vaultedAt = epochMs(exportEntry?.vaultedAt);
    const vaulted = exportEntry ? Boolean(vaultedAt) : variants.some((variant) => variant.vaulted === true);
    return {
      name: `${base} Relic`,
      tier: base.split(' ')[0] ?? '',
      imageName: radiant.imageName ?? '',
      vaulted,
      vaultedAt,
      introducedAt: epochMs(exportEntry?.introducedAt),
      rewards: radiant.rewards
        .filter((reward) => reward?.item?.name)
        .map((reward) => ({
          name: reward.item.name,
          rarity: reward.rarity,
          chance: reward.chance,
        })),
    };
  })
  .filter((relic) => relic.rewards.length > 0)
  .sort((a, b) => a.name.localeCompare(b.name));

const recipeBytes = await writeAtomic(resolve(outDir, 'recipes.json'), recipes);
const relicBytes = await writeAtomic(resolve(outDir, 'relics.json'), relics);
console.log(
  `[game-data] Wrote ${Object.keys(recipes).length} recipes (${(recipeBytes / 1024).toFixed(0)} KiB) and ${relics.length} grouped relics (${(relicBytes / 1024).toFixed(0)} KiB)`,
);
