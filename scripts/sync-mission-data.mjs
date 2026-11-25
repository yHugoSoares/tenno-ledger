#!/usr/bin/env node
/**
 * Refreshes the community-maintained Star Chart mastery map used by the
 * client-side calculator. This is not a Digital Extremes endpoint.
 */
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const source =
  process.env.MISSION_DATA_URL ??
  'https://raw.githubusercontent.com/Paroxity/FrameHub/main/src/resources/nodes.json';
const output = resolve(process.cwd(), 'src/data/node-mastery.json');

const response = await fetch(source, {
  headers: {
    Accept: 'application/json',
    'User-Agent': 'TennoLedger/1.0 (mission mastery data sync)',
  },
});

if (!response.ok) {
  throw new Error(`${response.status} ${response.statusText} for ${source}`);
}

const payload = await response.json();
if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
  throw new Error('Mission data was not an object grouped by planet');
}

const json = `${JSON.stringify(payload, null, 2)}\n`;
await mkdir(dirname(output), { recursive: true });
const temporary = `${output}.tmp`;
await writeFile(temporary, json, 'utf8');
await rename(temporary, output);

let trackedNodes = 0;
let points = 0;
for (const planet of Object.values(payload)) {
  if (!planet || typeof planet !== 'object') continue;
  for (const node of Object.values(planet)) {
    if (typeof node?.xp === 'number') {
      trackedNodes += 1;
      points += node.xp;
    }
  }
}

console.log(`[mission-sync] Wrote ${trackedNodes} nodes and ${points} mission points to ${output}`);
