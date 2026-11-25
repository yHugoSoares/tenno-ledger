import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  directProfile,
  emptyResultsProfile,
  missingXPInfoProfile,
  nestedProfile,
  validProfileResponse,
} from '@/fixtures/testData';
import {
  cacheRemainingMs,
  fetchProfile,
  isCacheFresh,
  parseProfileJson,
  ProfileParseError,
  toStoredProfile,
} from '@/lib/profile';

function json(value: unknown): string {
  return JSON.stringify(value);
}

describe('parseProfileJson', () => {
  it('parses the standard Results[0].LoadOutInventory.XPInfo shape', () => {
    const parsed = parseProfileJson(json(validProfileResponse));
    expect(parsed.displayName).toBe('TestTenno');
    expect(parsed.playerLevel).toBe(12);
    expect(parsed.accountId).toBe('0123456789abcdef01234567');
    expect(parsed.xpInfoPath).toBe('LoadOutInventory.XPInfo');
    expect(parsed.entryCount).toBe(4);
    expect(parsed.missions).toEqual([
      { tag: 'SolNode63', completes: 1 },
      { tag: 'EarthToVenusJunction', completes: 1 },
      { tag: 'SolNode27', completes: 0 },
    ]);
    expect(parsed.intrinsicRanks).toBe(2);
    expect(parsed.xp['/Lotus/Powersuits/Excalibur/Excalibur']).toBe(900_000);
  });

  it('parses a bare Results[0] object', () => {
    const parsed = parseProfileJson(json(directProfile));
    expect(parsed.displayName).toBe('DirectTenno');
    expect(parsed.xpInfoPath).toBe('LoadOutInventory.XPInfo');
    expect(parsed.xp['/Lotus/Weapons/Tenno/Rifle/Braton']).toBe(450_000);
  });

  it('finds XPInfo nested anywhere', () => {
    const parsed = parseProfileJson(json(nestedProfile));
    expect(parsed.displayName).toBe('NestedTenno');
    expect(parsed.xpInfoPath).toContain('XPInfo');
    expect(parsed.xp['/Lotus/Weapons/Tenno/Melee/Swords/Skana']).toBe(123_456);
  });

  it('keeps the highest XP when an item appears twice', () => {
    const duplicated = {
      Results: [
        {
          DisplayName: 'Dup',
          LoadOutInventory: {
            XPInfo: [
              { ItemType: '/a', XP: 100 },
              { ItemType: '/a', XP: 250 },
            ],
          },
        },
      ],
    };
    expect(parseProfileJson(json(duplicated)).xp['/a']).toBe(250);
  });

  it('rejects empty input and invalid JSON with helpful errors', () => {
    expect(() => parseProfileJson('   ')).toThrow(ProfileParseError);
    expect(() => parseProfileJson('not json')).toThrow(/not valid JSON/i);
  });

  it('reports top-level keys when XPInfo is missing', () => {
    try {
      parseProfileJson(json(missingXPInfoProfile));
      throw new Error('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ProfileParseError);
      const parseError = error as ProfileParseError;
      expect(parseError.topLevelKeys).toContain('Results');
      expect(parseError.message).toMatch(/XPInfo/);
    }
  });

  it('rejects an empty Results array', () => {
    expect(() => parseProfileJson(json(emptyResultsProfile))).toThrow(/empty Results/i);
  });

  it('defaults missing metadata instead of failing', () => {
    const parsed = parseProfileJson(
      json({ Results: [{ LoadOutInventory: { XPInfo: [{ ItemType: '/x', XP: 1 }] } }] }),
    );
    expect(parsed.displayName).toBe('Unknown Tenno');
    expect(parsed.playerLevel).toBe(0);
    expect(parsed.accountId).toBeUndefined();
  });
});

describe('stored profile and cache helpers', () => {
  it('wraps a parsed profile with source and timestamp', () => {
    const parsed = parseProfileJson(json(validProfileResponse));
    const stored = toStoredProfile(parsed, 'paste', 1_700_000_000_000);
    expect(stored.version).toBe(1);
    expect(stored.source).toBe('paste');
    expect(stored.fetchedAt).toBe(1_700_000_000_000);
    expect(stored.displayName).toBe('TestTenno');
  });

  it('treats cache age correctly', () => {
    const now = 1_700_000_000_000;
    expect(isCacheFresh(now - 1_000, now)).toBe(true);
    expect(isCacheFresh(now - 13 * 60 * 60 * 1_000, now)).toBe(false);
    expect(cacheRemainingMs(now - 60 * 60 * 1_000, now)).toBe(11 * 60 * 60 * 1_000);
    expect(cacheRemainingMs(now - 24 * 60 * 60 * 1_000, now)).toBe(0);
  });
});

describe('fetchProfile', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects malformed IDs without making a request', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const result = await fetchProfile('abc');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe('invalid-id');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('parses a successful JSON response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(json(validProfileResponse), { status: 200 })),
    );
    const result = await fetchProfile('515d0a861a4d80bc14000020');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.profile.displayName).toBe('TestTenno');
  });

  it('maps 403 and 429 to throttling', async () => {
    for (const status of [403, 429]) {
      vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status })));
      const result = await fetchProfile('515d0a861a4d80bc14000020');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.kind).toBe('throttled');
    }
  });

  it('treats an empty 409 as throttling and a populated 409 as not found', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 409 })));
    const empty = await fetchProfile('515d0a861a4d80bc14000020');
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.kind).toBe('throttled');

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<p>Player not found</p>', { status: 409 })),
    );
    const populated = await fetchProfile('515d0a861a4d80bc14000020');
    expect(populated.ok).toBe(false);
    if (!populated.ok) {
      expect(populated.kind).toBe('not-found');
      expect(populated.message).toContain('Player not found');
    }
  });

  it('maps network failures to a CORS hint', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    const result = await fetchProfile('515d0a861a4d80bc14000020');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe('cors');
      expect(result.message).toMatch(/Paste the profile JSON/i);
    }
  });

  it('flags non-JSON bodies as invalid responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>blocked</html>', { status: 200 })));
    const result = await fetchProfile('515d0a861a4d80bc14000020');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe('invalid-response');
  });
});
