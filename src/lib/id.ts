export const PLAYER_ID_LENGTH = 24;
export const PLAYER_ID_REGEX = /^[a-f0-9]{24}$/i;

export type InputKind = 'empty' | 'id' | 'json' | 'unknown';

export function normalizePlayerId(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidPlayerId(input: string): boolean {
  return PLAYER_ID_REGEX.test(input.trim());
}

export function detectInputKind(input: string): InputKind {
  const value = input.trim();
  if (!value) return 'empty';
  if (PLAYER_ID_REGEX.test(value)) return 'id';
  if (value.startsWith('{') || value.startsWith('[')) return 'json';
  return 'unknown';
}

export function playerIdHint(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (isValidPlayerId(value)) return null;
  if (/^[a-f0-9]+$/i.test(value)) {
    return `A player ID must be exactly 24 hexadecimal characters (this one is ${value.length}).`;
  }
  return 'That does not look like a player ID. Paste the profile JSON instead, or use a 24-character hexadecimal gid.';
}
