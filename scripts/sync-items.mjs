#!/usr/bin/env node
/**
 * Downloads the WFCD warframe-items dataset, trims it to the fields Tenno Ledger
 * needs, and writes a single JSON file plus a gzip sibling for Caddy.
 *
 * WFCD stopped publishing data/json/All.json, so this script merges the
 * per-category files instead. It never calls Digital Extremes' profile endpoint.
 */
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const DEFAULT_BASE =
  process.env.WFCD_ITEMS_BASE ??
  'https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json';

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
];

const FIELDS = [
  'uniqueName',
  'name',
  'category',
  'type',
  'masterable',
  'masteryReq',
  'imageName',
];

function parseArgs(argv) {
  const args = { out: 'public/data/items.json', base: DEFAULT_BASE };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out' && argv[i + 1]) {
      args.out = argv[i + 1];
      i += 1;
    } else if (arg === '--base' && argv[i + 1]) {
      args.base = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'TennoLedger/1.0 (static mastery tracker data sync)',
      },
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText} for ${url}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function pickItem(item) {
  const picked = {};
  for (const field of FIELDS) {
    if (item[field] !== undefined) picked[field] = item[field];
  }
  picked.masterable = item.masterable === true;
  picked.masteryReq = Number.isFinite(item.masteryReq) ? item.masteryReq : 0;
  return picked;
}

function trimAndMerge(rawItems) {
  const byUniqueName = new Map();
  for (const item of rawItems) {
    if (item?.masterable !== true) continue;
    if (typeof item.uniqueName !== 'string' || typeof item.name !== 'string') continue;
    byUniqueName.set(item.uniqueName, pickItem(item));
  }
  return [...byUniqueName.values()].sort((a, b) => {
    const category = a.category.localeCompare(b.category);
    return category !== 0 ? category : a.name.localeCompare(b.name);
  });
}

async function main() {
  const { out, base } = parseArgs(process.argv.slice(2));
  const outputPath = resolve(process.cwd(), out);
  console.log(`[data-sync] Fetching ${CATEGORY_FILES.length} WFCD category files from ${base}`);

  const rawItems = [];
  for (const file of CATEGORY_FILES) {
    const url = `${base}/${file}.json`;
    process.stdout.write(`[data-sync] ${file} ... `);
    const data = await fetchJson(url);
    if (!Array.isArray(data)) {
      throw new Error(`${file}.json did not return an array`);
    }
    rawItems.push(...data);
    console.log(`${data.length} entries`);
  }

  const items = trimAndMerge(rawItems);
  if (items.length < 500) {
    throw new Error(`Only ${items.length} masterable items found; refusing to overwrite good data`);
  }

  const json = `${JSON.stringify(items)}\n`;
  const gzip = gzipSync(Buffer.from(json, 'utf8'), { level: 9 });

  await mkdir(dirname(outputPath), { recursive: true });
  const tmpPath = `${outputPath}.tmp`;
  await writeFile(tmpPath, json, 'utf8');
  await rename(tmpPath, outputPath);
  await writeFile(`${outputPath}.gz`, gzip);

  console.log(
    `[data-sync] Wrote ${items.length} masterable items to ${outputPath} (${(
      Buffer.byteLength(json) / 1024
    ).toFixed(1)} KiB, gzip ${(gzip.length / 1024).toFixed(1)} KiB)`,
  );
}

main().catch((error) => {
  console.error(`[data-sync] Failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
