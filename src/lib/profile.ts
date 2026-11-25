import { PROFILE_TTL_MS } from './constants';
import type { MissionProgress, ParsedProfile, StoredProfile } from './types';
import { intrinsicRanksFromSkills } from './missions';

export class ProfileParseError extends Error {
  readonly topLevelKeys: string[];
  readonly resultKeys: string[];
  readonly details?: string;

  constructor(
    message: string,
    options: { topLevelKeys?: string[]; resultKeys?: string[]; details?: string } = {},
  ) {
    super(message);
    this.name = 'ProfileParseError';
    this.topLevelKeys = options.topLevelKeys ?? [];
    this.resultKeys = options.resultKeys ?? [];
    this.details = options.details;
  }
}

interface XpEntry {
  ItemType: string;
  XP: number;
}

interface FoundXpInfo {
  entries: XpEntry[];
  path: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isXpEntry(value: unknown): value is XpEntry {
  return (
    isRecord(value) &&
    typeof value.ItemType === 'string' &&
    value.ItemType.length > 0 &&
    typeof value.XP === 'number' &&
    Number.isFinite(value.XP)
  );
}

function getPath(root: unknown, path: (string | number)[]): unknown {
  let current = root;
  for (const key of path) {
    if (current === null || current === undefined) return undefined;
    if (typeof key === 'number') {
      if (!Array.isArray(current)) return undefined;
      current = current[key];
    } else {
      if (!isRecord(current)) return undefined;
      current = current[key];
    }
  }
  return current;
}

function findXPInfo(root: unknown): FoundXpInfo | null {
  const known = getPath(root, ['Results', 0, 'LoadOutInventory', 'XPInfo']);
  if (Array.isArray(known) && known.length > 0 && known.every(isXpEntry)) {
    return { entries: known, path: 'Results[0].LoadOutInventory.XPInfo' };
  }

  const knownDirect = getPath(root, ['LoadOutInventory', 'XPInfo']);
  if (Array.isArray(knownDirect) && knownDirect.length > 0 && knownDirect.every(isXpEntry)) {
    return { entries: knownDirect, path: 'LoadOutInventory.XPInfo' };
  }

  const visited = new Set<object>();
  const visit = (value: unknown, path: string): FoundXpInfo | null => {
    if (value === null || typeof value !== 'object') return null;
    if (visited.has(value)) return null;
    visited.add(value);

    if (Array.isArray(value)) {
      if (value.length > 0 && value.every(isXpEntry)) {
        return { entries: value, path };
      }
      for (let index = 0; index < value.length; index += 1) {
        const found = visit(value[index], path ? `${path}[${index}]` : `[${index}]`);
        if (found) return found;
      }
      return null;
    }

    if (isRecord(value)) {
      if (Array.isArray(value.XPInfo) && value.XPInfo.length > 0 && value.XPInfo.every(isXpEntry)) {
        return { entries: value.XPInfo, path: path ? `${path}.XPInfo` : 'XPInfo' };
      }
      for (const [key, child] of Object.entries(value)) {
        const found = visit(child, path ? `${path}.${key}` : key);
        if (found) return found;
      }
    }
    return null;
  };

  return visit(root, '');
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function readAccountId(value: unknown): string | undefined {
  if (typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value)) return value.toLowerCase();
  if (isRecord(value)) {
    const oid = readString(value.$oid);
    if (oid && /^[a-f0-9]{24}$/i.test(oid)) return oid.toLowerCase();
  }
  return undefined;
}

function readMissions(value: unknown): MissionProgress[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.Tag !== 'string') return [];
    const completes = readNumber(entry.Completes) ?? 0;
    return [{ tag: entry.Tag, completes: Math.max(0, Math.floor(completes)) }];
  });
}

/**
 * Accepts either the full profile response (`{ Results: [...] }`) or the
 * `Results[0]` object. Finds the XPInfo array recursively because DE's nesting
 * has changed over time.
 */
export function parseProfileJson(text: string): ParsedProfile {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new ProfileParseError('There is nothing to parse. Paste the profile JSON or enter a player ID.');
  }

  let root: unknown;
  try {
    root = JSON.parse(trimmed);
  } catch {
    throw new ProfileParseError(
      'That is not valid JSON. Copy the entire profile response (starting with a curly brace) and try again.',
    );
  }

  const topLevelKeys = isRecord(root) ? Object.keys(root) : [];

  let candidate: unknown = root;
  if (isRecord(root) && Array.isArray(root.Results)) {
    if (root.Results.length === 0) {
      throw new ProfileParseError('The profile response has an empty Results array.', {
        topLevelKeys,
        details: 'Expected Results[0] to contain the player profile.',
      });
    }
    candidate = root.Results[0];
  }

  const resultKeys = isRecord(candidate) ? Object.keys(candidate) : [];
  const found = findXPInfo(candidate) ?? findXPInfo(root);
  if (!found) {
    throw new ProfileParseError(
      'Could not find an XPInfo array in that profile. The response may be an error page or an unsupported format.',
      {
        topLevelKeys,
        resultKeys,
        details: 'The parser looks for an array of objects shaped like { ItemType, XP }.',
      },
    );
  }

  const xp: Record<string, number> = {};
  let validEntries = 0;
  for (const entry of found.entries) {
    if (!isXpEntry(entry)) continue;
    validEntries += 1;
    const current = xp[entry.ItemType];
    xp[entry.ItemType] = current === undefined ? entry.XP : Math.max(current, entry.XP);
  }

  if (validEntries === 0) {
    throw new ProfileParseError('The XPInfo array did not contain any usable entries.', {
      topLevelKeys,
      resultKeys,
      details: `XPInfo was found at ${found.path} but every entry was malformed.`,
    });
  }

  const displayName =
    readString(isRecord(candidate) ? candidate.DisplayName : undefined) ??
    readString(isRecord(root) ? root.DisplayName : undefined) ??
    'Unknown Tenno';

  const playerLevel =
    readNumber(isRecord(candidate) ? candidate.PlayerLevel : undefined) ??
    readNumber(isRecord(root) ? root.PlayerLevel : undefined) ??
    0;

  const accountId = readAccountId(
    isRecord(candidate) ? candidate.AccountId : isRecord(root) ? root.AccountId : undefined,
  );

  const missions = readMissions(isRecord(candidate) ? candidate.Missions : undefined);
  const playerSkills = isRecord(candidate) && isRecord(candidate.PlayerSkills)
    ? candidate.PlayerSkills
    : undefined;

  return {
    displayName,
    accountId,
    playerLevel: Math.max(0, Math.floor(playerLevel)),
    xp,
    missions,
    intrinsicRanks: intrinsicRanksFromSkills(playerSkills),
    xpInfoPath: found.path,
    entryCount: validEntries,
  };
}

export function toStoredProfile(
  parsed: ParsedProfile,
  source: StoredProfile['source'],
  now = Date.now(),
): StoredProfile {
  return {
    version: 1,
    fetchedAt: now,
    source,
    displayName: parsed.displayName,
    accountId: parsed.accountId,
    playerLevel: parsed.playerLevel,
    xp: parsed.xp,
    missions: parsed.missions,
    intrinsicRanks: parsed.intrinsicRanks,
  };
}

export function isCacheFresh(fetchedAt: number, now = Date.now(), ttl = PROFILE_TTL_MS): boolean {
  if (!Number.isFinite(fetchedAt)) return false;
  const age = now - fetchedAt;
  return age >= 0 && age < ttl;
}

export function cacheRemainingMs(fetchedAt: number, now = Date.now(), ttl = PROFILE_TTL_MS): number {
  if (!Number.isFinite(fetchedAt)) return 0;
  return Math.max(0, ttl - (now - fetchedAt));
}

export type FetchFailureKind =
  | 'invalid-id'
  | 'not-found'
  | 'throttled'
  | 'cors'
  | 'upstream'
  | 'invalid-response';

export type FetchProfileResult =
  | { ok: true; profile: ParsedProfile }
  | { ok: false; kind: FetchFailureKind; message: string; status?: number };

function plainText(body: string): string {
  return body
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}

export async function fetchProfile(playerId: string): Promise<FetchProfileResult> {
  if (!/^[a-f0-9]{24}$/i.test(playerId.trim())) {
    return {
      ok: false,
      kind: 'invalid-id',
      message: 'A player ID must be exactly 24 hexadecimal characters. Bad IDs can get you throttled, so it was rejected locally.',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  const url = `https://api.warframe.com/cdn/getProfileViewingData.php?playerId=${encodeURIComponent(
    playerId.trim(),
  )}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
      headers: {
        Accept: 'application/json, text/plain, */*',
      },
      signal: controller.signal,
    });

    const body = await response.text();

    if (response.status === 409) {
      const message = plainText(body);
      if (message) {
        return {
          ok: false,
          kind: 'not-found',
          status: 409,
          message: `Account not found. ${message}`,
        };
      }
      return {
        ok: false,
        kind: 'throttled',
        status: 409,
        message:
          'Digital Extremes returned an empty 409. That usually means the profile endpoint is throttling this IP. Wait at least 12 hours and do not retry automatically. Pasting the profile JSON always works.',
      };
    }

    if (response.status === 403 || response.status === 429) {
      return {
        ok: false,
        kind: 'throttled',
        status: response.status,
        message:
          'Digital Extremes is rate-limiting profile requests right now. Wait at least 12 hours, then try again. Do not retry automatically. Pasting the profile JSON always works.',
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        kind: 'upstream',
        status: response.status,
        message: `The profile endpoint returned HTTP ${response.status}. Try again later, or paste the profile JSON instead.`,
      };
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(body);
    } catch {
      return {
        ok: false,
        kind: 'invalid-response',
        status: response.status,
        message:
          'The profile endpoint returned a response that is not JSON. This is usually a CORS or anti-bot page. Paste the profile JSON instead.',
      };
    }

    try {
      return { ok: true, profile: parseProfileJson(JSON.stringify(parsedJson)) };
    } catch (error) {
      return {
        ok: false,
        kind: 'invalid-response',
        status: response.status,
        message:
          error instanceof ProfileParseError
            ? error.message
            : 'The profile response could not be parsed. Paste the profile JSON instead.',
      };
    }
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === 'AbortError';
    return {
      ok: false,
      kind: 'cors',
      message: aborted
        ? 'The browser request timed out. This endpoint is often blocked by CORS or throttling. Paste the profile JSON instead — it always works.'
        : 'The browser could not reach the profile endpoint. It may be blocked by CORS, an extension, or the network. Paste the profile JSON instead — it always works.',
    };
  } finally {
    clearTimeout(timeout);
  }
}
