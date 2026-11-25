import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { clearAllLocalData, loadExtras, loadOverrides, loadProfile, loadTheme, saveExtras, saveOverrides, saveProfile, saveTheme, type ThemePreference } from '@/lib/storage';
import { idbClear } from '@/lib/idb';
import type { ManualExtras, Overrides, StoredProfile } from '@/lib/types';

interface AppStateValue {
  profile: StoredProfile | null;
  setProfile: (profile: StoredProfile | null) => void;
  extras: ManualExtras;
  setExtras: (extras: ManualExtras) => void;
  updateExtras: (patch: Partial<ManualExtras>) => void;
  overrides: Overrides;
  setOverride: (uniqueName: string, value: boolean | undefined) => void;
  clearOverride: (uniqueName: string) => void;
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  resolvedTheme: 'dark' | 'light';
  clearAllData: () => Promise<void>;
}

const AppStateContext = createContext<AppStateValue | null>(null);

function getSystemDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<StoredProfile | null>(() => loadProfile());
  const [extras, setExtrasState] = useState<ManualExtras>(() => loadExtras());
  const [overrides, setOverridesState] = useState<Overrides>(() => loadOverrides());
  const [theme, setThemeState] = useState<ThemePreference>(() => loadTheme());
  const [systemDark, setSystemDark] = useState<boolean>(() => getSystemDark());
  const firstThemeRender = useRef(true);

  useEffect(() => {
    saveExtras(extras);
  }, [extras]);

  useEffect(() => {
    saveOverrides(overrides);
  }, [overrides]);

  useEffect(() => {
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }, []);

  const resolvedTheme: 'dark' | 'light' =
    theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
    document.documentElement.style.colorScheme = resolvedTheme;
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute('content', resolvedTheme === 'dark' ? '#161412' : '#f6f4f0');
    if (!firstThemeRender.current) {
      document.documentElement.dataset.themeChanged = 'true';
    }
    firstThemeRender.current = false;
  }, [resolvedTheme]);

  const setProfile = useCallback((next: StoredProfile | null) => {
    setProfileState(next);
    if (next) saveProfile(next);
    else {
      try {
        window.localStorage.removeItem('tenno-ledger.profile.v1');
      } catch {
        // Ignore.
      }
    }
  }, []);

  const setExtras = useCallback((next: ManualExtras) => {
    setExtrasState(next);
  }, []);

  const updateExtras = useCallback((patch: Partial<ManualExtras>) => {
    setExtrasState((current) => ({ ...current, ...patch }));
  }, []);

  const setOverride = useCallback((uniqueName: string, value: boolean | undefined) => {
    setOverridesState((current) => {
      const next = { ...current };
      if (value === undefined) delete next[uniqueName];
      else next[uniqueName] = value;
      return next;
    });
  }, []);

  const clearOverride = useCallback((uniqueName: string) => {
    setOverridesState((current) => {
      if (!(uniqueName in current)) return current;
      const next = { ...current };
      delete next[uniqueName];
      return next;
    });
  }, []);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
  }, []);

  const clearAllData = useCallback(async () => {
    clearAllLocalData();
    await idbClear();
    setProfileState(null);
    setExtrasState({ junctions: 0, intrinsics: 0, starChartPoints: 0 });
    setOverridesState({});
    setThemeState('dark');
  }, []);

  const value = useMemo<AppStateValue>(
    () => ({
      profile,
      setProfile,
      extras,
      setExtras,
      updateExtras,
      overrides,
      setOverride,
      clearOverride,
      theme,
      setTheme,
      resolvedTheme,
      clearAllData,
    }),
    [
      profile,
      setProfile,
      extras,
      setExtras,
      updateExtras,
      overrides,
      setOverride,
      clearOverride,
      theme,
      setTheme,
      resolvedTheme,
      clearAllData,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used inside AppStateProvider');
  return context;
}
