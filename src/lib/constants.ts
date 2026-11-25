export const APP_NAME = 'Tenno Ledger';
export const APP_TAGLINE = 'Know exactly what to master next.';
export const APP_DESCRIPTION =
  'A free, open-source Warframe mastery tracker. Your profile data stays in your browser.';

export const PROFILE_TTL_MS = 12 * 60 * 60 * 1000;
export const ITEMS_TTL_MS = 24 * 60 * 60 * 1000;

export const PROFILE_ENDPOINT = 'https://api.warframe.com/cdn/getProfileViewingData.php';
export const WFCD_RAW_BASE =
  'https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json';

export const WFCD_CATEGORY_FILES = [
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
] as const;

export const ITEMS_URL = '/data/items.json';
export const ITEMS_CACHE_KEY = 'items-v1';
export const ITEMS_DATA_VERSION = 2;

export const PROFILE_STORAGE_KEY = 'tenno-ledger.profile.v1';
export const EXTRAS_STORAGE_KEY = 'tenno-ledger.extras.v1';
export const OVERRIDES_STORAGE_KEY = 'tenno-ledger.overrides.v1';
export const THEME_STORAGE_KEY = 'tenno-ledger.theme.v1';

export const SHARE_HASH_PREFIX = '#s=';
export const SHARE_MAX_LENGTH = 16_000;

export const DISCLAIMER =
  'Tenno Ledger is an unofficial fan project. It is not affiliated with, endorsed by, or sponsored by Digital Extremes. Warframe and all related assets are trademarks of Digital Extremes.';

export const GITHUB_URL = 'https://github.com/yHugoSoares/tenno-ledger';
