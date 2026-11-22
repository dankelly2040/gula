import { PLACES, type Eaten } from './realm';

// INVENTED DATA, for design work only.
//
// The app has no way yet to read another player's pizzas: that needs the
// server (public logs summed per kingdom). Until it exists, the map shows one
// made-up rival so the competitive view can be designed and judged. Nothing
// here is a real person or a real log. Replace DEMO_RIVAL with server data
// before this ships.
//
// The rival "eats" at real places from the shipped list, so the heat lands on
// real streets. Each entry is [kingdom id, visits per place, points per visit].

type Plan = [kingdomId: string, visitsPerPlace: number[], pointsPerVisit: number][];

/**
 * Turn a plan into logged pizzas. Places are taken in id order from the
 * independent shops in each kingdom, starting at `skip`, so two plans with
 * different skips never use the same place.
 */
function eat(plan: Plan, skip: number): Eaten[] {
  const eaten: Eaten[] = [];
  for (const [kingdomId, visitsPerPlace, points] of plan) {
    const shops = PLACES.filter((p) => p.kingdomId === kingdomId && p.brand === null).sort(
      (a, b) => a.id.localeCompare(b.id)
    );
    visitsPerPlace.forEach((visits, i) => {
      const place = shops[(skip + i) % shops.length];
      if (!place) return;
      for (let v = 0; v < visits; v++) eaten.push({ lat: place.lat, lng: place.lng, points });
    });
  }
  return eaten;
}

export const DEMO_RIVAL = {
  name: 'Pepperoni Pete',
  eaten: eat(
    [
      ['capitol-hill', [3, 2, 2, 1], 15],
      ['university-district', [2, 2, 1], 15],
      ['downtown', [2, 1, 1], 10],
      ['queen-anne', [1, 1], 10],
      ['ballard', [1], 10],
      ['rainier-valley', [2, 1], 10],
    ],
    0
  ),
};

/**
 * A stand-in for the player, shown only in development builds when none of
 * their own pizzas were logged inside the realm (the simulator's location is
 * not Seattle). Never used in a release build.
 */
export const DEMO_SELF_EATEN: Eaten[] = eat(
  [
    ['ballard', [3, 2, 1], 15],
    ['northwest', [2, 1], 10],
    ['queen-anne', [2, 1], 10],
    ['west-seattle', [2, 2, 1], 15],
    ['downtown', [1], 10],
  ],
  4
);
