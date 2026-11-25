import { describe, expect, it } from 'vitest';
import { detectInputKind, isValidPlayerId, normalizePlayerId, playerIdHint } from '@/lib/id';

const validId = '515d0a861a4d80bc14000020';

describe('player ID validation', () => {
  it('accepts 24 hexadecimal characters in either case', () => {
    expect(isValidPlayerId(validId)).toBe(true);
    expect(isValidPlayerId(validId.toUpperCase())).toBe(true);
    expect(isValidPlayerId(`  ${validId}  `)).toBe(true);
  });

  it('rejects wrong lengths, non-hex characters, and empty values', () => {
    expect(isValidPlayerId('')).toBe(false);
    expect(isValidPlayerId(validId.slice(0, 23))).toBe(false);
    expect(isValidPlayerId(`${validId}0`)).toBe(false);
    expect(isValidPlayerId('zzzzzzzzzzzzzzzzzzzzzzzz')).toBe(false);
    expect(isValidPlayerId('515d0a86 1a4d80bc14000020')).toBe(false);
  });

  it('normalizes whitespace and case', () => {
    expect(normalizePlayerId(`  ${validId.toUpperCase()}  `)).toBe(validId);
  });
});

describe('input detection', () => {
  it('detects empty, ID, JSON, and unknown input', () => {
    expect(detectInputKind('')).toBe('empty');
    expect(detectInputKind('   ')).toBe('empty');
    expect(detectInputKind(validId)).toBe('id');
    expect(detectInputKind('{"Results":[]}')).toBe('json');
    expect(detectInputKind('[{"ItemType":"x","XP":1}]')).toBe('json');
    expect(detectInputKind('hello')).toBe('unknown');
  });

  it('returns useful hints without rejecting valid IDs', () => {
    expect(playerIdHint(validId)).toBeNull();
    expect(playerIdHint('')).toBeNull();
    expect(playerIdHint('abcdef')).toContain('24');
    expect(playerIdHint('not-an-id')).toContain('does not look like a player ID');
  });
});
