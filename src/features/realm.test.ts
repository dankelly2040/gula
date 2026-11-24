import { describe, expect, test } from 'bun:test';
import {
  DISTRICTS,
  PLACES,
  SEATTLE,
  TIERS,
  countByTier,
  districtById,
  districtFill,
  districtForPoint,
  districtNameFor,
  heatSources,
  homeRegion,
  kingdomForPoint,
  kingdomLeader,
  kingdomsLed,
  placesInKingdom,
  pointsByKingdom,
  visibleLabelDistricts,
  visibleTiers,
  withinBounds,
} from './realm';
import { DEMO_RIVAL, DEMO_SELF_EATEN } from './realm-demo';
import { KINGDOM_FILLS } from '@/constants/theme';

describe('district data', () => {
  test('ships the 20 Seattle districts', () => {
    expect(DISTRICTS).toHaveLength(20);
    expect(DISTRICTS.map((d) => d.name)).toContain('Ballard');
    expect(DISTRICTS.map((d) => d.name)).toContain('Capitol Hill');
  });

  test('every place belongs to a district and a known tier', () => {
    expect(PLACES.length).toBeGreaterThan(100);
    for (const p of PLACES) {
      expect(districtById(p.kingdomId)).not.toBeNull();
      expect(TIERS[p.tier]).toBeDefined();
    }
  });
});

describe('districtForPoint', () => {
  test('finds the district each seeded place sits in', () => {
    // Seed-time assignment used the full-resolution rings; the app ships
    // simplified ones. Allow a handful of border cases to differ.
    const mismatches = PLACES.filter((p) => districtForPoint(p.lat, p.lng)?.id !== p.kingdomId);
    expect(mismatches.length).toBeLessThanOrEqual(3);
  });

  test('returns null outside the city', () => {
    expect(districtForPoint(47.6101, -122.2015)).toBeNull(); // Bellevue
    expect(districtForPoint(0, 0)).toBeNull();
  });
});

describe('kingdoms', () => {
  const brooklyn = { lat: 40.6782, lng: -73.9442 };
  const naples = { lat: 40.8518, lng: 14.2681 };

  test('every coordinate is in a kingdom, in any city', () => {
    expect(kingdomForPoint(brooklyn.lat, brooklyn.lng).id).toBeTruthy();
    expect(kingdomForPoint(naples.lat, naples.lng).id).not.toBe(
      kingdomForPoint(brooklyn.lat, brooklyn.lng).id
    );
  });

  test('every shipped place is listed in exactly one kingdom', () => {
    const ids = new Set(PLACES.map((p) => kingdomForPoint(p.lat, p.lng).id));
    let listed = 0;
    for (const id of ids) listed += placesInKingdom(id).length;
    expect(listed).toBe(PLACES.length);
    // Seattle is a few dozen kingdoms, not 20 and not hundreds.
    expect(ids.size).toBeGreaterThan(20);
    expect(ids.size).toBeLessThan(90);
  });

  test('a kingdom with no shipped places has an empty list', () => {
    expect(placesInKingdom(kingdomForPoint(brooklyn.lat, brooklyn.lng).id)).toEqual([]);
  });

  test('a kingdom on a Seattle district takes its name, others have none', () => {
    const ballard = DISTRICTS.find((d) => d.id === 'ballard')!;
    expect(districtNameFor(kingdomForPoint(ballard.center[0], ballard.center[1]))).toBe('Ballard');
    expect(districtNameFor(kingdomForPoint(brooklyn.lat, brooklyn.lng))).toBeNull();
  });
});

describe('homeRegion', () => {
  const size = (b: typeof SEATTLE) => ({
    lat: b.maxLat - b.minLat,
    km: (b.maxLng - b.minLng) * Math.cos((((b.minLat + b.maxLat) / 2) * Math.PI) / 180),
  });

  test('is Seattle for a player with no located pizza', () => {
    expect(homeRegion([], null)).toBe(SEATTLE);
  });

  test('is Seattle for a player who eats in Seattle', () => {
    const ballard = DISTRICTS.find((d) => d.id === 'ballard')!;
    const at = { lat: ballard.center[0], lng: ballard.center[1] };
    expect(homeRegion([{ ...at, points: 10 }], at)).toBe(SEATTLE);
  });

  test('moves to the city of the latest pizza, at the same size on the ground', () => {
    const naples = { lat: 40.8518, lng: 14.2681 };
    const region = homeRegion(
      [
        { ...naples, points: 10 },
        { lat: 47.6062, lng: -122.3321, points: 500 }, // an old trip to Seattle
      ],
      naples
    );
    expect(withinBounds(region, naples.lat, naples.lng)).toBe(true);
    expect(withinBounds(region, 47.6062, -122.3321)).toBe(false);
    expect(size(region).lat).toBeCloseTo(size(SEATTLE).lat, 6);
    expect(size(region).km).toBeCloseTo(size(SEATTLE).km, 2);
  });

  test('sits between the pizzas of one city, nearer to the bigger one', () => {
    const a = { lat: 40.70, lng: -73.99 };
    const b = { lat: 40.78, lng: -73.95 };
    const region = homeRegion(
      [
        { ...a, points: 30 },
        { ...b, points: 10 },
      ],
      b
    );
    const middle = (region.minLat + region.maxLat) / 2;
    expect(middle).toBeCloseTo(40.72, 6);
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

  test('district fills rotate through the four tints', () => {
    const fills = new Set(DISTRICTS.map(districtFill));
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

describe('visibleLabelDistricts', () => {
  test('city zoom shows no names, so the map stays clean', () => {
    expect(visibleLabelDistricts(10.3)).toHaveLength(0);
  });

  test('moving in brings the names, holding back the six crowded ones', () => {
    expect(visibleLabelDistricts(11.3)).toHaveLength(14);
  });

  test('closer zoom shows every name', () => {
    expect(visibleLabelDistricts(12)).toHaveLength(20);
  });
});

describe('territory points', () => {
  const ballard = DISTRICTS.find((d) => d.id === 'ballard')!;
  const capitolHill = DISTRICTS.find((d) => d.id === 'capitol-hill')!;
  const inBallard = { lat: ballard.center[0], lng: ballard.center[1] };
  const inCapitolHill = { lat: capitolHill.center[0], lng: capitolHill.center[1] };
  const inBrooklyn = { lat: 40.6782, lng: -73.9442 };
  const idOf = (at: { lat: number; lng: number }) => kingdomForPoint(at.lat, at.lng).id;

  test('adds up points inside each kingdom', () => {
    const totals = pointsByKingdom([
      { ...inBallard, points: 10 },
      { ...inBallard, points: 25 },
      { ...inCapitolHill, points: 10 },
    ]);
    expect(totals).toEqual({ [idOf(inBallard)]: 35, [idOf(inCapitolHill)]: 10 });
  });

  test('counts pizza eaten in any city', () => {
    expect(pointsByKingdom([{ ...inBrooklyn, points: 50 }])).toEqual({ [idOf(inBrooklyn)]: 50 });
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
  test('has eaten only at real places inside Seattle', () => {
    expect(DEMO_RIVAL.eaten.length).toBeGreaterThan(8);
    for (const e of DEMO_RIVAL.eaten) {
      expect(districtForPoint(e.lat, e.lng)).not.toBeNull();
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
