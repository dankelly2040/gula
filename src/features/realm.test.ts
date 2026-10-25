import { describe, expect, test } from 'bun:test';
import {
  KINGDOMS,
  PLACES,
  TIERS,
  countByTier,
  kingdomById,
  kingdomFill,
  kingdomForPoint,
  placesInKingdom,
  visibleLabelKingdoms,
  visibleTiers,
} from './realm';
import { KINGDOM_FILLS } from '@/constants/theme';

describe('realm data', () => {
  test('ships the 20 Seattle districts as kingdoms', () => {
    expect(KINGDOMS).toHaveLength(20);
    expect(KINGDOMS.map((k) => k.name)).toContain('Ballard');
    expect(KINGDOMS.map((k) => k.name)).toContain('Capitol Hill');
  });

  test('every place belongs to a kingdom and a known tier', () => {
    expect(PLACES.length).toBeGreaterThan(100);
    for (const p of PLACES) {
      expect(kingdomById(p.kingdomId)).not.toBeNull();
      expect(TIERS[p.tier]).toBeDefined();
    }
  });

  test('every kingdom has at least one place', () => {
    for (const k of KINGDOMS) {
      expect(placesInKingdom(k.id).length).toBeGreaterThan(0);
    }
  });
});

describe('kingdomForPoint', () => {
  test('finds the kingdom each seeded place sits in', () => {
    // Seed-time assignment used the full-resolution rings; the app ships
    // simplified ones. Allow a handful of border cases to differ.
    const mismatches = PLACES.filter((p) => kingdomForPoint(p.lat, p.lng)?.id !== p.kingdomId);
    expect(mismatches.length).toBeLessThanOrEqual(3);
  });

  test('returns null outside the city', () => {
    expect(kingdomForPoint(47.6101, -122.2015)).toBeNull(); // Bellevue
    expect(kingdomForPoint(0, 0)).toBeNull();
  });
});

describe('tiers and fills', () => {
  test('tier points climb from chain to elite', () => {
    expect(TIERS[1].points).toBeLessThan(TIERS[2].points);
    expect(TIERS[2].points).toBeLessThan(TIERS[3].points);
    expect(TIERS[3].points).toBeLessThan(TIERS[4].points);
  });

  test('countByTier totals the input', () => {
    const counts = countByTier(PLACES);
    expect(counts[1] + counts[2] + counts[3] + counts[4]).toBe(PLACES.length);
  });

  test('kingdom fills rotate through the four tints', () => {
    const fills = new Set(KINGDOMS.map(kingdomFill));
    expect(fills.size).toBe(KINGDOM_FILLS.length);
  });
});

describe('visibleTiers', () => {
  test('city zoom shows only destination and elite', () => {
    expect(visibleTiers(10.4)).toEqual([4, 3]);
  });

  test('close zoom shows every tier', () => {
    expect(visibleTiers(14)).toEqual([4, 3, 2, 1]);
  });
});

describe('visibleLabelKingdoms', () => {
  test('city zoom holds back the six crowded names', () => {
    expect(visibleLabelKingdoms(10.4)).toHaveLength(14);
  });

  test('closer zoom shows every name', () => {
    expect(visibleLabelKingdoms(12)).toHaveLength(20);
  });
});
