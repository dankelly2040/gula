import { describe, expect, test } from 'bun:test';
import {
  KINGDOMS,
  PLACES,
  TIERS,
  countByTier,
  kingdomById,
  kingdomFill,
  heatSources,
  kingdomForPoint,
  kingdomLeader,
  kingdomsLed,
  placesInKingdom,
  pointsByKingdom,
  visibleLabelKingdoms,
  visibleTiers,
} from './realm';
import { DEMO_RIVAL, DEMO_SELF_EATEN } from './realm-demo';
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
  test('city zoom shows no names, so the map stays clean', () => {
    expect(visibleLabelKingdoms(10.3)).toHaveLength(0);
  });

  test('moving in brings the names, holding back the six crowded ones', () => {
    expect(visibleLabelKingdoms(11.3)).toHaveLength(14);
  });

  test('closer zoom shows every name', () => {
    expect(visibleLabelKingdoms(12)).toHaveLength(20);
  });
});

describe('territory points', () => {
  const ballard = KINGDOMS.find((k) => k.id === 'ballard')!;
  const capitolHill = KINGDOMS.find((k) => k.id === 'capitol-hill')!;
  const inBallard = { lat: ballard.center[0], lng: ballard.center[1] };
  const inCapitolHill = { lat: capitolHill.center[0], lng: capitolHill.center[1] };
  const inBrooklyn = { lat: 40.6782, lng: -73.9442 };

  test('adds up points inside each kingdom', () => {
    const totals = pointsByKingdom([
      { ...inBallard, points: 10 },
      { ...inBallard, points: 25 },
      { ...inCapitolHill, points: 10 },
    ]);
    expect(totals).toEqual({ ballard: 35, 'capitol-hill': 10 });
  });

  test('ignores pizza eaten outside the realm', () => {
    expect(pointsByKingdom([{ ...inBrooklyn, points: 50 }])).toEqual({});
  });

  test('names the leader of a kingdom', () => {
    const you = { ballard: 35, downtown: 10 };
    const rival = { ballard: 20, 'capitol-hill': 40, downtown: 10 };
    expect(kingdomLeader('ballard', you, rival)).toBe('you');
    expect(kingdomLeader('capitol-hill', you, rival)).toBe('rival');
    expect(kingdomLeader('downtown', you, rival)).toBe('tie');
    expect(kingdomLeader('magnolia', you, rival)).toBeNull();
  });

  test('counts kingdoms led, leaving out ties and empty kingdoms', () => {
    const you = { ballard: 35, downtown: 10 };
    const rival = { ballard: 20, 'capitol-hill': 40, downtown: 10 };
    expect(kingdomsLed(you, rival)).toEqual({ you: 1, rival: 1 });
  });

  test('merges repeat visits to one spot into a hotter source', () => {
    const sources = heatSources([
      { ...inBallard, points: 10 },
      { ...inBallard, points: 15 },
      { ...inCapitolHill, points: 10 },
    ]);
    expect(sources).toHaveLength(2);
    expect(sources.find((s) => s.lat === inBallard.lat)?.points).toBe(25);
  });
});

describe('demo rival', () => {
  test('has eaten only at real places inside the realm', () => {
    expect(DEMO_RIVAL.eaten.length).toBeGreaterThan(8);
    for (const e of DEMO_RIVAL.eaten) {
      expect(kingdomForPoint(e.lat, e.lng)).not.toBeNull();
      expect(e.points).toBeGreaterThan(0);
    }
  });

  test('the sample for you and the rival contest some kingdoms and split others', () => {
    const you = pointsByKingdom(DEMO_SELF_EATEN);
    const rival = pointsByKingdom(DEMO_RIVAL.eaten);
    const led = kingdomsLed(you, rival);
    expect(led.you).toBeGreaterThan(0);
    expect(led.rival).toBeGreaterThan(0);
  });
});
