import { describe, expect, it } from 'vitest';
import { compressToEncodedURIComponent } from 'lz-string';
import { itemByName, testItems } from '@/fixtures/testData';
import {
  buildShareSnapshot,
  decodeShare,
  encodeShare,
  shareUrl,
} from '@/lib/share';

const profile = {
  displayName: 'ShareTenno',
  playerLevel: 12,
  xp: {
    [itemByName('Excalibur').uniqueName]: 900_000,
    [itemByName('Braton').uniqueName]: 100_000,
  },
};

describe('buildShareSnapshot', () => {
  it('drops zero-XP items and unknown overrides', () => {
    const snapshot = buildShareSnapshot(profile, { junctions: 2, intrinsics: 0, starChartPoints: 0 }, {
      [itemByName('Braton').uniqueName]: true,
      '/not/a/real/item': true,
    }, testItems);

    expect(Object.keys(snapshot.xp)).toHaveLength(2);
    expect(Object.keys(snapshot.overrides)).toEqual([itemByName('Braton').uniqueName]);
    expect(snapshot.displayName).toBe('ShareTenno');
    expect(snapshot.playerLevel).toBe(12);
  });

  it('compacts fully ranked items', () => {
    const snapshot = buildShareSnapshot(profile, { junctions: 0, intrinsics: 0, starChartPoints: 0 }, {}, testItems);
    expect(snapshot.xp[itemByName('Excalibur').uniqueName]).toBe(-1);
    expect(snapshot.xp[itemByName('Braton').uniqueName]).toBe(100_000);
  });

  it('applies overrides when building the snapshot', () => {
    const snapshot = buildShareSnapshot(
      { displayName: 'Override', playerLevel: 1, xp: {} },
      { junctions: 0, intrinsics: 0, starChartPoints: 0 },
      { [itemByName('Lato').uniqueName]: true },
      testItems,
    );
    expect(snapshot.xp[itemByName('Lato').uniqueName]).toBe(-1);
  });

  it('clamps negative manual values', () => {
    const snapshot = buildShareSnapshot(
      profile,
      { junctions: -4, intrinsics: -2, starChartPoints: -100 },
      {},
      testItems,
    );
    expect(snapshot.extras).toEqual({ junctions: 0, intrinsics: 0, starChartPoints: 0 });
  });
});

describe('encode and decode', () => {
  it('round-trips a snapshot through the URL hash', () => {
    const snapshot = buildShareSnapshot(
      profile,
      { junctions: 15, intrinsics: 4, starChartPoints: 3_000 },
      { [itemByName('Braton').uniqueName]: false },
      testItems,
      1_700_000_000_000,
    );
    const encoded = encodeShare(snapshot);
    expect(encoded.hash.startsWith('#s=')).toBe(true);
    expect(encoded.tooLarge).toBe(false);

    const decoded = decodeShare(encoded.hash);
    expect(decoded).not.toBeNull();
    expect(decoded!.displayName).toBe('ShareTenno');
    expect(decoded!.playerLevel).toBe(12);
    expect(decoded!.extras).toEqual({ junctions: 15, intrinsics: 4, starChartPoints: 3_000 });
    expect(decoded!.overrides[itemByName('Braton').uniqueName]).toBe(false);
    expect(decoded!.createdAt).toBe(1_700_000_000_000);
  });

  it('restores fully ranked markers as a very large XP value', () => {
    const snapshot = buildShareSnapshot(profile, { junctions: 0, intrinsics: 0, starChartPoints: 0 }, {}, testItems);
    const decoded = decodeShare(encodeShare(snapshot).hash);
    expect(decoded!.xp[itemByName('Excalibur').uniqueName]).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('returns null for malformed or foreign hashes', () => {
    expect(decodeShare('#s=')).toBeNull();
    expect(decodeShare('#s=not-valid-compressed')).toBeNull();
    expect(decodeShare('#other=1')).toBeNull();
    expect(decodeShare('')).toBeNull();
  });

  it('rejects valid compression with the wrong schema', () => {
    const encoded = encodeShare({
      version: 1,
      displayName: 'x',
      playerLevel: 1,
    xp: {},
    missions: [],
    intrinsicRanks: 0,
    extras: { junctions: 0, intrinsics: 0, starChartPoints: 0 },
      overrides: {},
      createdAt: 1,
    });
    expect(decodeShare(encoded.hash)).not.toBeNull();

    const wrongVersion = compressToEncodedURIComponent(JSON.stringify({ v: 2, n: 'x' }));
    expect(decodeShare(`#s=${wrongVersion}`)).toBeNull();
  });

  it('marks very large snapshots as too large', () => {
    const xp: Record<string, number> = {};
    let seed = 12345;
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed.toString(36);
    };
    for (let index = 0; index < 3_000; index += 1) {
      xp[`/Lotus/${random()}${random()}${random()}/${random()}${random()}`] = 123_456 + index;
    }
    const encoded = encodeShare({
      version: 1,
      displayName: 'Big',
      playerLevel: 30,
      xp,
      missions: [],
      intrinsicRanks: 0,
      extras: { junctions: 0, intrinsics: 0, starChartPoints: 0 },
      overrides: {},
      createdAt: 1,
    });
    expect(encoded.length).toBeGreaterThan(16_000);
    expect(encoded.tooLarge).toBe(true);
  });
});

describe('shareUrl', () => {
  it('joins origin and hash without a trailing slash', () => {
    const snapshot = buildShareSnapshot(profile, { junctions: 0, intrinsics: 0, starChartPoints: 0 }, {}, testItems);
    const url = shareUrl('https://tenno.example/', snapshot);
    expect(url.url).toBe(`https://tenno.example/${url.hash}`);
  });
});
