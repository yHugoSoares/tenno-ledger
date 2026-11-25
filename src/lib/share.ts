import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { z } from 'zod';
import { SHARE_HASH_PREFIX, SHARE_MAX_LENGTH } from './constants';
import type { Item, ManualExtras, Overrides, ShareSnapshot, StoredProfile } from './types';

const WireSchema = z.object({
  v: z.literal(1),
  n: z.string().min(1).max(120),
  mr: z.number().int().min(0).max(200),
  xp: z.array(z.tuple([z.string().min(1), z.number().finite()])).max(5_000),
  ms: z.array(z.tuple([z.string().min(1), z.number().int().nonnegative()])).max(1_000),
  ir: z.number().int().nonnegative().max(10_000),
  ex: z.object({
    j: z.number().int().min(0).max(10_000),
    i: z.number().int().min(0).max(10_000),
    s: z.number().int().min(0).max(100_000_000),
  }),
  ov: z.array(z.tuple([z.string().min(1), z.boolean()])).max(5_000),
  t: z.number().int().nonnegative(),
});

type WireShare = z.infer<typeof WireSchema>;

export interface EncodedShare {
  hash: string;
  length: number;
  tooLarge: boolean;
}

export function buildShareSnapshot(
  profile: Pick<StoredProfile, 'displayName' | 'playerLevel' | 'xp'> &
    Partial<Pick<StoredProfile, 'missions' | 'intrinsicRanks'>>,
  extras: ManualExtras,
  overrides: Overrides,
  items: Item[],
  now = Date.now(),
): ShareSnapshot {
  const xp: Record<string, number> = {};
  const validNames = new Set<string>();

  for (const item of items) {
    validNames.add(item.uniqueName);
    const override = overrides[item.uniqueName];
    const raw =
      override === true
        ? item.maxXp
        : override === false
          ? 0
          : Math.max(0, profile.xp[item.uniqueName] ?? 0);
    if (raw <= 0) continue;
    xp[item.uniqueName] = raw >= item.maxXp ? -1 : Math.round(raw);
  }

  const keptOverrides: Overrides = {};
  for (const [uniqueName, value] of Object.entries(overrides)) {
    if (validNames.has(uniqueName) && typeof value === 'boolean') {
      keptOverrides[uniqueName] = value;
    }
  }

  return {
    version: 1,
    displayName: profile.displayName,
    playerLevel: profile.playerLevel,
    xp,
    missions: profile.missions ?? [],
    intrinsicRanks: profile.intrinsicRanks ?? 0,
    extras: {
      junctions: Math.max(0, Math.floor(extras.junctions)),
      intrinsics: Math.max(0, Math.floor(extras.intrinsics)),
      starChartPoints: Math.max(0, Math.floor(extras.starChartPoints)),
    },
    overrides: keptOverrides,
    createdAt: now,
  };
}

function toWire(snapshot: ShareSnapshot): WireShare {
  return {
    v: 1,
    n: snapshot.displayName,
    mr: snapshot.playerLevel,
    xp: Object.entries(snapshot.xp).map(([uniqueName, xp]) => [uniqueName, xp] as [string, number]),
    ms: snapshot.missions.map((mission) => [mission.tag, mission.completes]),
    ir: snapshot.intrinsicRanks,
    ex: {
      j: snapshot.extras.junctions,
      i: snapshot.extras.intrinsics,
      s: snapshot.extras.starChartPoints,
    },
    ov: Object.entries(snapshot.overrides).map(
      ([uniqueName, value]) => [uniqueName, value] as [string, boolean],
    ),
    t: snapshot.createdAt,
  };
}

function fromWire(wire: WireShare): ShareSnapshot {
  const xp: Record<string, number> = {};
  for (const [uniqueName, value] of wire.xp) {
    // -1 is the compact "fully ranked" marker.
    xp[uniqueName] = value === -1 ? Number.MAX_SAFE_INTEGER : value;
  }
  const overrides: Overrides = {};
  for (const [uniqueName, value] of wire.ov) overrides[uniqueName] = value;
  return {
    version: 1,
    displayName: wire.n,
    playerLevel: wire.mr,
    xp,
    missions: wire.ms.map(([tag, completes]) => ({ tag, completes })),
    intrinsicRanks: wire.ir,
    extras: {
      junctions: wire.ex.j,
      intrinsics: wire.ex.i,
      starChartPoints: wire.ex.s,
    },
    overrides,
    createdAt: wire.t,
  };
}

export function encodeShare(snapshot: ShareSnapshot): EncodedShare {
  const compressed = compressToEncodedURIComponent(JSON.stringify(toWire(snapshot)));
  return {
    hash: `${SHARE_HASH_PREFIX}${compressed}`,
    length: compressed.length,
    tooLarge: compressed.length > SHARE_MAX_LENGTH,
  };
}

export function decodeShare(hash: string): ShareSnapshot | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw.startsWith('s=')) return null;
  const compressed = raw.slice(2);
  if (!compressed) return null;
  const json = decompressFromEncodedURIComponent(compressed);
  if (!json) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  const result = WireSchema.safeParse(parsed);
  if (!result.success) return null;
  return fromWire(result.data);
}

export function shareUrl(origin: string, snapshot: ShareSnapshot): EncodedShare & { url: string } {
  const encoded = encodeShare(snapshot);
  return { ...encoded, url: `${origin.replace(/\/$/, '')}/${encoded.hash}` };
}
