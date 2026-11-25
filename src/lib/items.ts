import { z } from 'zod';
import type { Item, ItemKind, RawItem, TabId } from './types';
import { affinityForRank } from './affinity';

export const ITEM_IMAGE_CDN = 'https://cdn.warframestat.us/img';
export const PLACEHOLDER_IMAGE = '/placeholder-item.svg';

export const RawItemSchema = z.object({
  uniqueName: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  type: z.string().min(1),
  masterable: z.boolean(),
  masteryReq: z.number().finite().optional(),
  imageName: z.string().min(1).optional(),
});

export const RawItemsSchema = z.array(RawItemSchema);

export const ITEM_TABS: { id: TabId; label: string; short: string }[] = [
  { id: 'warframes', label: 'Warframes', short: 'Frames' },
  { id: 'primary', label: 'Primary', short: 'Primary' },
  { id: 'secondary', label: 'Secondary', short: 'Secondary' },
  { id: 'melee', label: 'Melee', short: 'Melee' },
  { id: 'companions', label: 'Companions', short: 'Companions' },
  { id: 'archwing', label: 'Archwing', short: 'Archwing' },
  { id: 'necramechs', label: 'Necramechs', short: 'Necramechs' },
  { id: 'other', label: 'Other', short: 'Other' },
];

export const TAB_LABELS: Record<TabId, string> = Object.fromEntries(
  ITEM_TABS.map((tab) => [tab.id, tab.label]),
) as Record<TabId, string>;

export function isRank40Name(name: string): boolean {
  return /^(Kuva|Tenet|Coda)\s/i.test(name) || name === 'Paracesis';
}

export function itemImageUrl(imageName?: string): string | null {
  if (!imageName) return null;
  return `${ITEM_IMAGE_CDN}/${encodeURIComponent(imageName)}`;
}

interface Classification {
  tab: TabId;
  kind: ItemKind;
  points: number;
  maxRank: number;
  masteryRank: number;
  affinityBase: number;
  xpPerRank: number;
}

export function classifyItem(raw: RawItem): Classification {
  const isNecramech =
    raw.type === 'Necramech' ||
    (raw.category === 'Warframes' && /^(Voidrig|Bonewidow)$/i.test(raw.name));
  const rank40 = isRank40Name(raw.name);

  if (isNecramech) {
    return {
      tab: 'necramechs',
      kind: 'necramech',
      // Necramechs earn 6,000 by rank 30 and another 2,000 between ranks 31–40.
      points: 8_000,
      maxRank: 40,
      masteryRank: 40,
      affinityBase: 1_000,
      xpPerRank: 30_000,
    };
  }

  if (raw.category === 'Warframes') {
    return {
      tab: 'warframes',
      kind: 'frame',
      points: 6_000,
      maxRank: 30,
      masteryRank: 30,
      affinityBase: 1_000,
      xpPerRank: 30_000,
    };
  }

  if (raw.type === 'Companion Weapon') {
    return {
      tab: 'companions',
      kind: 'weapon',
      points: 3_000,
      maxRank: 30,
      masteryRank: 30,
      affinityBase: 500,
      xpPerRank: 15_000,
    };
  }

  if (raw.category === 'Pets' || raw.category === 'Sentinels') {
    return {
      tab: 'companions',
      kind: 'companion',
      points: 6_000,
      maxRank: 30,
      masteryRank: 30,
      affinityBase: 1_000,
      xpPerRank: 30_000,
    };
  }

  if (raw.category === 'Archwing') {
    return {
      tab: 'archwing',
      kind: 'archwing',
      points: 6_000,
      maxRank: 30,
      masteryRank: 30,
      affinityBase: 1_000,
      xpPerRank: 30_000,
    };
  }

  if (raw.category === 'Arch-Gun' || raw.category === 'Arch-Melee') {
    return {
      tab: 'archwing',
      kind: 'weapon',
      points: 3_000,
      maxRank: rank40 ? 40 : 30,
      masteryRank: 30,
      affinityBase: 500,
      xpPerRank: 15_000,
    };
  }

  if (raw.category === 'Primary' || raw.category === 'Secondary' || raw.category === 'Melee') {
    return {
      tab: raw.category.toLowerCase() as TabId,
      kind: 'weapon',
      points: 3_000,
      maxRank: rank40 ? 40 : 30,
      masteryRank: 30,
      affinityBase: 500,
      xpPerRank: 15_000,
    };
  }

  if (raw.category === 'Misc') {
    if (raw.type === 'K-Drive Component') {
      return {
        tab: 'other',
        kind: 'kdrive',
        points: 6_000,
        maxRank: 30,
        masteryRank: 30,
        affinityBase: 1_000,
        xpPerRank: 30_000,
      };
    }
    return {
      tab: 'other',
      kind: 'weapon',
      points: 3_000,
      maxRank: rank40 ? 40 : 30,
      masteryRank: 30,
      affinityBase: 500,
      xpPerRank: 15_000,
    };
  }

  return {
    tab: 'other',
    kind: 'weapon',
    points: 3_000,
    maxRank: rank40 ? 40 : 30,
    masteryRank: 30,
    affinityBase: 500,
    xpPerRank: 15_000,
  };
}

export function toItem(raw: RawItem): Item {
  const classification = classifyItem(raw);
  return {
    ...raw,
    masteryReq: Number.isFinite(raw.masteryReq) ? Math.max(0, raw.masteryReq ?? 0) : 0,
    tab: classification.tab,
    kind: classification.kind,
    points: classification.points,
    maxRank: classification.maxRank,
    masteryRank: classification.masteryRank,
    affinityBase: classification.affinityBase,
    xpPerRank: classification.xpPerRank,
    maxXp: affinityForRank(
      classification.maxRank,
      {
        affinityBase: classification.affinityBase,
        isRank40: classification.maxRank === 40,
        kind: classification.kind,
      },
    ),
    maxXpForPoints: affinityForRank(
      classification.masteryRank,
      {
        affinityBase: classification.affinityBase,
        isRank40: classification.maxRank === 40,
        kind: classification.kind,
      },
    ),
    isRank40: classification.maxRank === 40,
    imageUrl: itemImageUrl(raw.imageName),
  };
}

export function normalizeItems(input: unknown): Item[] {
  const parsed = RawItemsSchema.parse(input);
  const byUniqueName = new Map<string, Item>();
  for (const raw of parsed) {
    if (raw.masterable !== true) continue;
    if (!byUniqueName.has(raw.uniqueName)) {
      byUniqueName.set(raw.uniqueName, toItem(raw));
    }
  }
  return [...byUniqueName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function tabCounts(items: Item[]): Record<TabId, number> {
  const counts = Object.fromEntries(ITEM_TABS.map((tab) => [tab.id, 0])) as Record<TabId, number>;
  for (const item of items) counts[item.tab] += 1;
  return counts;
}

export function itemsInTab(items: Item[], tab: TabId): Item[] {
  return items.filter((item) => item.tab === tab);
}
