# Pizza Quest brief

Draft 1, October 22, 2026. A re-imagining of Gula / Local Pizza as a territory game.

## The idea in one paragraph

Seattle is split into kingdoms. Every pizza place in the city belongs to one kingdom and sits in one of four tiers. When you log a pizza at a place, you earn that place's tier points inside its kingdom. Whoever holds the most points in a kingdom rules it. Rulers can be dethroned, so the map keeps changing. The Money Shot rating stays as the personal record of how good the pizza was, but it does not move territory points, so the scoring stays objective.

## What the research found

- **Kingdoms.** The City of Seattle publishes the Neighborhood Map Atlas as open data. It has 20 districts and 94 neighborhoods, as polygons. Both files are saved in `data/seed/`.
- **Pizza places.** OpenStreetMap lists 183 named pizza places inside city limits. The query is saved as `data/seed/osm-seattle-pizza.overpassql` so it can be re-run. 40 of them carry a chain brand tag (Domino's, MOD, Pagliacci, Papa John's, Zeeks, Papa Murphy's, Costco).
- **Coverage.** Every one of the 20 districts contains at least one OSM pizza place. Downtown has the most with 34. Beacon Hill, Interbay, Magnolia, and Seward Park have 2 each.
- **Map support.** The installed expo-maps (58.0.10) draws polygons on Apple Maps with fill color, line color, and a tap handler. No new native code is needed for the kingdom map.
- **Licenses.** OSM data is ODbL, which allows storing and tiering it with attribution. Apple MapKit search results (the current `PizzaPlacesModule`) are display only and cannot be stored, so MapKit cannot be the source of record.

OSM will miss some places. The log flow already lets a user add a spot by name, so the list grows from use. Overture Maps and Foursquare Open Source Places are open-licensed bulk sources that could fill gaps later. I have not measured their Seattle counts.

## Recommendations

| Decision | Recommendation | Why |
| --- | --- | --- |
| Kingdom size | The 20 districts | 183 places across 94 neighborhoods leaves most empty. 20 districts each have pizza, and the names (Ballard, Capitol Hill, Rainier Valley) read like realms. |
| Dominion window | Rolling 90 days | A throne you can lose keeps people eating. All-time points stay on the profile as a lifetime score. |
| Tie break | Most recent qualifying log | Simple to explain. |
| Who sets tiers | Dan, via a CSV in `data/seed/places.csv` | Tiers are editorial. A seed script sets chains to tier 1 and everything else to tier 2, then Dan promotes to tiers 3 and 4 by hand. |
| Does the rating affect points | No | Tiers stay objective. Rating still drives the Nirvana achievement and personal rankings. |
| App name | Pizza Quest | The territory game is the product now. |

## Scoring

Four tiers. Points are earned in the kingdom that contains the place.

| Tier | Meaning | Points per log |
| --- | --- | --- |
| 1 | Chain delivery and grocery (Domino's, Papa John's, Costco) | 1 |
| 2 | Neighborhood slice shop | 3 |
| 3 | Destination pizzeria, people cross town for it | 6 |
| 4 | Elite, the places that define Seattle pizza | 10 |

Bonuses, small so no single log dwarfs a tier:

- First ever log at a place: +2.
- First log in a kingdom: +3. Encourages exploring the whole map.
- Same place more than once in a day: no points for the repeat.

The existing streak and milestone points keep running as the lifetime score. Territory points are a separate column so the leaderboard and the map never disagree.

## Map UI

The Discover tab becomes **Realm**.

- Full-screen Apple Map with the 20 district polygons. Fill color shows state: your kingdoms in the brand tint, rival-held in a muted rival tint, unclaimed in pale parchment. Thin ink borders between kingdoms.
- Tap a kingdom to open a form sheet: kingdom name, current ruler, top three, your standing, days until the oldest points expire, and the places inside grouped by tier.
- Place markers show tier. Tier 4 gets a crown glyph. Tier 1 markers hide when zoomed out so the map reads as kingdoms first, places second.
- The log flow picks a place from the seeded list first, with "add a place" as the fallback. Logging at a place returns the reward screen with "+6 in Ballard" as the headline line.
- Profile gains "Your realm": kingdoms held, kingdoms contested, and a mini map.

## Look and feel

Lighter, paler, nostalgic. A faded 1970s pizzeria menu rather than the current neobrutalist sticker sheet.

Proposed palette as a starting point:

- Background: parchment `#F7F1E3`, cards `#FFFBF2`.
- Ink: warm charcoal `#4A3F35` instead of espresso, with thinner 1px outlines.
- Brand: faded tomato `#D96C5A`, the only tap color.
- Kingdom fills: dusty sage `#C9D6B8`, powder blue `#C3D4E0`, blush `#EFCFC4`, mustard `#EAD48C`, all at 55 percent on the map.
- Gold for points: `#B8923E`.
- Text: `#4A3F35` primary, `#8A7B6B` secondary.

Shadows drop from hard 4px offsets to soft 1px to 2px. Corners stay continuous. Type stays system but headings lose weight.

## Schema changes

- `districts`: id, name, geojson. Seeded once from `data/seed/seattle-districts.geojson`.
- `places`: id, osm_id, name, lat, lng, address, brand, tier, district_id. Seeded from OSM, tiers from the CSV.
- `pizza_logs`: add place_id, district_id, territory_points.
- RPC `realm_overview(window_start)`: ruler and ruler points per district, one call for the map.
- RPC `kingdom_standings(district_id, window_start)`: ranked points for the sheet.

Point-in-polygon runs at seed time for places, and on the client at log time for user-added spots, so logs never wait on the network.

## Build order

Map first, so the thing that proves the idea is visible early.

1. **Realm map.** Done October 22, 2026. New palette, Discover became Realm, the 20 polygons from the seed file with name labels, OSM places as tiered markers. Static, no scoring yet. Marker and label visibility is zoom-gated because expo-maps annotation text has one fixed size.
2. **Places and tiers.** `places` and `districts` tables, seed script, the CSV, log flow picks from the list.
3. **Territory points.** Scoring function with tests, the two RPCs, kingdom sheet with rulers, reward screen line.
4. **Your realm.** Profile section, leaderboard by kingdom, rename to Pizza Quest, new icon and splash.

## SDK 58

Done in the working tree on branch `pizza-quest-sdk58`: every Expo package moved to SDK 58, React Native 0.88, React 19.3. Typecheck and all 21 tests pass. Expo doctor passes 20 of 20. The two Swift 6.2 patches were dropped because upstream rewrote the code they patched. A local iOS build with Xcode 27 is the final check.
