/// <reference types="bun" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import type { PizzaLog, Spot } from '../db/types';
import {
  SEATTLE_KINGDOMS,
  activeKingdomCatalog,
  assignLogKingdom,
  decideCrown,
  kingdomAt,
  kingdomCenter,
  kingdomScores,
  kingdomsNear,
  parseKingdomCatalog,
  rankKingdomStandings,
  type Bounds,
  type Kingdom,
} from './kingdoms';

const emptySubScores = {
  crust: null, charBake: null, sauceCheese: null,
  toppings: null, vibes: null, service: null, value: null,
};

function makeLog(timestamp: string, extra: Partial<PizzaLog> = {}): PizzaLog {
  return {
    id: timestamp,
    userId: 'u',
    spotId: null,
    spotName: null,
    timestamp,
    photoUri: null,
    photoUrl: null,
    moneyShot: 50,
    pizzaScore: null,
    experienceScore: null,
    sendFriend: null,
    subScores: emptySubScores,
    tags: { style: null, format: null, toppings: [], priceTier: null, context: null },
    notes: '',
    pointsEarned: 0,
    lat: null,
    lng: null,
    kingdomId: null,
    isPublic: false,
    updatedAt: timestamp,
    ...extra,
  };
}

function overlaps(a: Bounds, b: Bounds): boolean {
  return a.minLat < b.maxLat && b.minLat < a.maxLat && a.minLng < b.maxLng && b.minLng < a.maxLng;
}

describe('Seattle seed', () => {
  test('boxes do not overlap, and each kingdom contains its own center', () => {
    const boxes = SEATTLE_KINGDOMS.flatMap((kingdom) =>
      kingdom.bounds.map((bounds) => ({ slug: kingdom.slug, bounds }))
    );
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        expect(overlaps(boxes[i].bounds, boxes[j].bounds)).toBe(false);
      }
    }
    for (const kingdom of SEATTLE_KINGDOMS) {
      const center = kingdomCenter(kingdom);
      expect(center).not.toBeNull();
      expect(kingdomAt(center!.lat, center!.lng)?.id).toBe(kingdom.id);
    }
  });

  test('places familiar pizza corners in the neighborhood a person would name', () => {
    expect(kingdomAt(47.68, -122.384)?.slug).toBe('ballard');
    expect(kingdomAt(47.651, -122.35)?.slug).toBe('fremont');
    expect(kingdomAt(47.655, -122.325)?.slug).toBe('wallingford');
    expect(kingdomAt(47.68, -122.33)?.slug).toBe('green-lake');
    expect(kingdomAt(47.66, -122.305)?.slug).toBe('university-district');
    expect(kingdomAt(47.633, -122.357)?.slug).toBe('queen-anne');
    expect(kingdomAt(47.628, -122.338)?.slug).toBe('south-lake-union');
    expect(kingdomAt(47.62, -122.32)?.slug).toBe('capitol-hill');
    expect(kingdomAt(47.61, -122.342)?.slug).toBe('downtown');
    expect(kingdomAt(47.598, -122.323)?.slug).toBe('international-district');
    expect(kingdomAt(47.576, -122.308)?.slug).toBe('beacon-hill');
    expect(kingdomAt(47.545, -122.322)?.slug).toBe('georgetown');
    expect(kingdomAt(47.56, -122.285)?.slug).toBe('columbia-city');
    expect(kingdomAt(47.561, -122.387)?.slug).toBe('west-seattle');
    expect(kingdomAt(47.64, -122.4)?.slug).toBe('magnolia');
  });

  test('leaves the sound unassigned and keeps the north edge half-open', () => {
    expect(kingdomAt(47.6, -122.4)).toBeNull();
    expect(kingdomAt(47.662, -122.4)?.slug).toBe('ballard');
    expect(kingdomAt(47.661, -122.4)?.slug).toBe('magnolia');
    expect(kingdomAt(47.695, -122.4)).toBeNull();
    expect(kingdomAt(Number.NaN, -122.4)).toBeNull();
  });

  test('the migration seeds the same ids, slugs, and boxes', () => {
    const sql = readFileSync(join(import.meta.dir, '../../supabase/migrations/0003_kingdoms.sql'), 'utf8');
    expect(sql).toContain('p_lat >= b.min_lat and p_lat < b.max_lat');
    expect(sql).toContain('p_lng >= b.min_lng and p_lng < b.max_lng');
    expect(sql).toContain('dense_rank');
    expect(sql).toContain("'contested'");
    expect(sql).toContain('share_with_community');
    for (const kingdom of SEATTLE_KINGDOMS) {
      expect(sql).toContain(kingdom.id);
      expect(sql).toContain(`'${kingdom.slug}'`);
      for (const bounds of kingdom.bounds) {
        expect(sql).toContain(`${bounds.minLat}, ${bounds.maxLat}, ${bounds.minLng}, ${bounds.maxLng}`);
      }
    }
  });
});

describe('assignment rules', () => {
  test('smallest box wins, and an equal area breaks on slug', () => {
    const coarse: Kingdom = {
      id: 'coarse', slug: 'coarse', name: 'Coarse', city: null,
      bounds: [{ minLat: 0, maxLat: 10, minLng: 0, maxLng: 10 }],
    };
    const fine: Kingdom = {
      id: 'fine', slug: 'fine', name: 'Fine', city: null,
      bounds: [{ minLat: 1, maxLat: 2, minLng: 1, maxLng: 2 }],
    };
    expect(kingdomAt(1.5, 1.5, [coarse, fine])?.slug).toBe('fine');
    expect(kingdomAt(5, 5, [coarse, fine])?.slug).toBe('coarse');

    const beta: Kingdom = {
      id: 'beta', slug: 'beta', name: 'Beta', city: null,
      bounds: [{ minLat: 0, maxLat: 1, minLng: 0, maxLng: 1 }],
    };
    const alpha: Kingdom = {
      id: 'alpha', slug: 'alpha', name: 'Alpha', city: null,
      bounds: [{ minLat: 0, maxLat: 1, minLng: 0, maxLng: 1 }],
    };
    expect(kingdomAt(0.5, 0.5, [beta, alpha])?.slug).toBe('alpha');
  });

  test('a device fix beats the spot pin, and a spot pin is used when GPS is missing', () => {
    const spots: Spot[] = [{ id: 's', name: 'Delancey', address: null, lat: 47.68, lng: -122.384 }];
    const fromSpot = assignLogKingdom(makeLog('t', { spotId: 's' }), spots);
    expect(fromSpot.kingdomId).toBe(SEATTLE_KINGDOMS.find((k) => k.slug === 'ballard')!.id);
    expect(fromSpot.lat).toBe(47.68);
    expect(fromSpot.lng).toBe(-122.384);

    const fromDevice = assignLogKingdom(
      makeLog('t', { spotId: 's', lat: 47.61, lng: -122.342 }),
      spots
    );
    expect(fromDevice.kingdomId).toBe(SEATTLE_KINGDOMS.find((k) => k.slug === 'downtown')!.id);
    expect(fromDevice.lat).toBe(47.61);

    const nowhere = assignLogKingdom(makeLog('t'), []);
    expect(nowhere.kingdomId).toBeNull();
  });

  test('nearby includes the containing kingdom even at radius 0, and skips a far one', () => {
    const tight = kingdomsNear(47.68, -122.384, 0);
    expect(tight.map((kingdom) => kingdom.slug)).toEqual(['ballard']);
    expect(tight[0].containsPoint).toBe(true);

    const around = kingdomsNear(47.68, -122.384, 12);
    expect(around[0].slug).toBe('ballard');
    expect(around.map((kingdom) => kingdom.slug)).toContain('green-lake');
    expect(around.map((kingdom) => kingdom.slug)).not.toContain('georgetown');
  });

  test('a cached catalog overrides the seed by id and cannot drop the rest', () => {
    expect(activeKingdomCatalog([])).toBe(SEATTLE_KINGDOMS);
    expect(activeKingdomCatalog(null)).toBe(SEATTLE_KINGDOMS);
    const ballard = SEATTLE_KINGDOMS[0];
    const moved: Kingdom = {
      ...ballard,
      name: 'Greater Ballard',
      bounds: [{ minLat: 10, maxLat: 11, minLng: 10, maxLng: 11 }],
    };
    const extra: Kingdom = {
      id: 'new', slug: 'new', name: 'New', city: 'Portland',
      bounds: [{ minLat: 45, maxLat: 46, minLng: -123, maxLng: -122 }],
    };
    const merged = activeKingdomCatalog([moved, extra]);
    expect(merged).toHaveLength(SEATTLE_KINGDOMS.length + 1);
    expect(kingdomAt(10.5, 10.5, merged)?.name).toBe('Greater Ballard');
    expect(kingdomAt(47.651, -122.35, merged)?.slug).toBe('fremont');
    expect(parseKingdomCatalog([{ id: 'x', slug: 'x', name: 'X', bounds: [{ minLat: 1, maxLat: 0, minLng: 0, maxLng: 1 }] }])).toEqual([]);
  });
});

describe('kingdom scores and the crown', () => {
  const ballard = SEATTLE_KINGDOMS.find((kingdom) => kingdom.slug === 'ballard')!;
  const now = new Date('2026-08-01T00:00:00.000Z');

  test('a rolling 30-day window drops the older log and ignores an unplaced one', () => {
    const scores = kingdomScores(
      [
        makeLog(new Date(now.getTime() - 10 * 86400000).toISOString(), { kingdomId: ballard.id, pointsEarned: 10 }),
        makeLog(new Date(now.getTime() - 30 * 86400000).toISOString(), { kingdomId: ballard.id, pointsEarned: 4 }),
        makeLog(new Date(now.getTime() - 30 * 86400000 - 1).toISOString(), { kingdomId: ballard.id, pointsEarned: 7 }),
        makeLog(now.toISOString(), { pointsEarned: 100 }),
      ],
      SEATTLE_KINGDOMS,
      now
    );
    expect(scores).toHaveLength(1);
    expect(scores[0].points).toBe(14);
    expect(scores[0].logs).toBe(2);
    expect(scores[0].allTimePoints).toBe(21);
    expect(scores[0].allTimeLogs).toBe(3);
    expect(scores[0].kingdomName).toBe('Ballard');
  });

  test('the crown is held by a unique leader, contested on a tie, and vacant otherwise', () => {
    expect(decideCrown([])).toMatchObject({ status: 'vacant', holderCount: 0, userId: null });
    expect(decideCrown([{ userId: 'a', points: 0, logs: 4 }])).toMatchObject({ status: 'vacant' });
    expect(decideCrown([
      { userId: 'a', points: 40, logs: 1 },
      { userId: 'b', points: 25, logs: 9 },
    ])).toMatchObject({ status: 'held', userId: 'a', points: 40, logs: 1, holderCount: 1 });
    // More logs do not break a points tie.
    expect(decideCrown([
      { userId: 'a', points: 40, logs: 1 },
      { userId: 'b', points: 40, logs: 8 },
    ])).toMatchObject({ status: 'contested', userId: null, points: 40, logs: null, holderCount: 2 });
  });

  test('dense_rank shares first place and does not skip the next rank', () => {
    expect(rankKingdomStandings([
      { userId: 'c', points: 10, logs: 1 },
      { userId: 'a', points: 30, logs: 1 },
      { userId: 'b', points: 30, logs: 4 },
      { userId: 'z', points: 0, logs: 9 },
    ])).toEqual([
      { userId: 'b', points: 30, logs: 4, rank: 1 },
      { userId: 'a', points: 30, logs: 1, rank: 1 },
      { userId: 'c', points: 10, logs: 1, rank: 2 },
    ]);
  });
});
