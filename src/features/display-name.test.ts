import { describe, expect, test } from 'bun:test';
import { cleanDisplayName, needsName, NAME_MAX } from './display-name';

describe('cleanDisplayName', () => {
  test('keeps a plain name', () => {
    expect(cleanDisplayName('Katie')).toBe('Katie');
  });

  test('trims the ends and joins runs of spaces', () => {
    expect(cleanDisplayName('  Slice   King \n')).toBe('Slice King');
  });

  test('nothing, or only spaces, is no name', () => {
    expect(cleanDisplayName('')).toBeNull();
    expect(cleanDisplayName('   ')).toBeNull();
    expect(cleanDisplayName(null)).toBeNull();
    expect(cleanDisplayName(undefined)).toBeNull();
  });

  test('cuts a long name and leaves no space at the cut', () => {
    const long = `${'a'.repeat(NAME_MAX - 1)} bcdef`;
    const cut = cleanDisplayName(long);
    expect(cut).toBe('a'.repeat(NAME_MAX - 1));
    expect(cut!.length).toBeLessThanOrEqual(NAME_MAX);
  });
});

describe('needsName', () => {
  test('a player with no name needs one', () => {
    expect(needsName(null)).toBe(true);
    expect(needsName('  ')).toBe(true);
  });

  test('a player with a name does not', () => {
    expect(needsName('Dan')).toBe(false);
  });
});
