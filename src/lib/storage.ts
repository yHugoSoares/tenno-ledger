import {
  EXTRAS_STORAGE_KEY,
  OVERRIDES_STORAGE_KEY,
  PROFILE_STORAGE_KEY,
  THEME_STORAGE_KEY,
} from './constants';
import type { ManualExtras, Overrides, StoredProfile } from './types';

export type ThemePreference = 'dark' | 'light' | 'system';

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable in private modes. The app still works in memory.
  }
}

function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStoredProfile(value: unknown): value is StoredProfile {
  if (!isRecord(value)) return false;
  if (value.version !== 1) return false;
  if (typeof value.fetchedAt !== 'number' || !Number.isFinite(value.fetchedAt)) return false;
  if (value.source !== 'fetch' && value.source !== 'paste' && value.source !== 'demo') return false;
  if (typeof value.displayName !== 'string') return false;
  if (typeof value.playerLevel !== 'number') return false;
  if (!isRecord(value.xp)) return false;
  if (value.missions !== undefined && !Array.isArray(value.missions)) return false;
  if (value.intrinsicRanks !== undefined && typeof value.intrinsicRanks !== 'number') return false;
  return Object.values(value.xp).every((xp) => typeof xp === 'number' && Number.isFinite(xp));
}

export function loadProfile(): StoredProfile | null {
  const raw = safeGet(PROFILE_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredProfile(parsed)) return null;
    return {
      ...parsed,
      missions: parsed.missions ?? [],
      intrinsicRanks: parsed.intrinsicRanks ?? 0,
    };
  } catch {
    return null;
  }
}

export function saveProfile(profile: StoredProfile): void {
  safeSet(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

export function clearProfile(): void {
  safeRemove(PROFILE_STORAGE_KEY);
}

export function defaultExtras(): ManualExtras {
  return { junctions: 0, intrinsics: 0, starChartPoints: 0 };
}

function isExtras(value: unknown): value is ManualExtras {
  if (!isRecord(value)) return false;
  return (
    typeof value.junctions === 'number' &&
    Number.isFinite(value.junctions) &&
    typeof value.intrinsics === 'number' &&
    Number.isFinite(value.intrinsics) &&
    typeof value.starChartPoints === 'number' &&
    Number.isFinite(value.starChartPoints)
  );
}

export function loadExtras(): ManualExtras {
  const raw = safeGet(EXTRAS_STORAGE_KEY);
  if (!raw) return defaultExtras();
  try {
    const parsed: unknown = JSON.parse(raw);
    return isExtras(parsed) ? parsed : defaultExtras();
  } catch {
    return defaultExtras();
  }
}

export function saveExtras(extras: ManualExtras): void {
  safeSet(EXTRAS_STORAGE_KEY, JSON.stringify(extras));
}

export function clearExtras(): void {
  safeRemove(EXTRAS_STORAGE_KEY);
}

function isOverrides(value: unknown): value is Overrides {
  if (!isRecord(value)) return false;
  return Object.values(value).every((entry) => typeof entry === 'boolean');
}

export function loadOverrides(): Overrides {
  const raw = safeGet(OVERRIDES_STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return isOverrides(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function saveOverrides(overrides: Overrides): void {
  safeSet(OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
}

export function clearOverrides(): void {
  safeRemove(OVERRIDES_STORAGE_KEY);
}

export function loadTheme(): ThemePreference {
  const raw = safeGet(THEME_STORAGE_KEY);
  return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'dark';
}

export function saveTheme(theme: ThemePreference): void {
  safeSet(THEME_STORAGE_KEY, theme);
}

export function clearAllLocalData(): void {
  clearProfile();
  clearExtras();
  clearOverrides();
  safeRemove(THEME_STORAGE_KEY);
}
