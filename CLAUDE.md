# Gula: Pizza Quest

Pizza logging app becoming a territory game: the world is one grid of six-sided cells, each cell is a kingdom, and a logged pizza puts its points in the kingdom where it was eaten. It works in any city with no data for that city. Seattle also has shipped data (land outline, district names, a tiered list of pizza places). Product brief: `docs/pizza-quest-brief.md`.

## Structure

```
src/
├── app/                   # Expo Router file-based routes
│   ├── _layout.tsx        # Root Stack with providers
│   ├── index.tsx          # Entry redirect
│   ├── (onboarding)/      # First run: one animated "How it works" screen, then straight into logging
│   ├── (tabs)/            # My Pizza, Realm (kingdom map), Leaderboard, Profile
│   ├── log/               # Modal multi-step logging flow
│   ├── pizza/[id].tsx     # Pizza log detail
│   ├── spot/[id].tsx      # Spot detail
│   ├── settings.tsx
│   ├── reward.tsx
│   └── +not-found.tsx
├── components/            # Shared UI (MoneyShotSlider, ScorePips, PizzaCard, etc.)
├── features/              # Domain modules (logging, rankings, rewards, spots)
├── lib/                   # Supabase client, image upload, location, analytics
├── db/                    # Schema types, queries
├── state/                 # Zustand stores (session, draft log)
├── constants/             # Theme, slider zones, tag enums
├── data/                  # Generated, Seattle only: kingdoms.json (the 20 districts), places.json, realm-lines.json (do not hand-edit)
└── hooks/                 # Custom hooks
```

Seed inputs live in `data/seed/` (Seattle district polygons, OSM pizza places, `tier-overrides.csv`). Regenerate `src/data/` with `bun scripts/build-realm-data.ts` after editing any of them.

## Principles

- Target iOS, Android, web.
- Install dependencies with `bunx expo add <package>`
- Use `expo-image` for images and icons.
- Routes go in `src/app/`, components go in `src/components/`
- Use kebab-case for file names (e.g., `user-card.tsx`)
- Backend: Supabase (Postgres, auth, storage)
- Server state: TanStack Query
- Local state: Zustand (session + draft log only)
- The Money Shot (0-100 slider) is the core ranking metric, never auto-computed
- Sub-scores are 1-5 taps
- Community data sharing is opt-in

## Architecture (phase 1, SDK 58)

- Expo SDK 58 (React Native 0.88, React 19.3), React Compiler on, CNG (`ios/` is gitignored, regenerate with `npx expo prebuild -p ios`).
- Native UI: `@expo/ui` (SwiftUI + universal components). Prefer it for forms, pickers, toggles; keep custom brand components (Money Shot slider) in plain RN.
- Data is local-first: writes land in AsyncStorage (`db/local-store.ts`) and are queued (`SyncOp`), then `db/sync.ts` flushes to Supabase and pull-merges by `updatedAt` whenever a session exists. Cloud failures are silent; the app never blocks on the network.
- Auth: silent `signInAnonymously()` on first launch (`lib/auth.ts`), later upgraded to email via OTP. Route gating uses `Stack.Protected` keyed off `hasCompletedOnboarding` in the persisted session store. First run: `(onboarding)/index` (lines animate in after the launch splash, gated by `lib/splash-gate`) → `log/capture` → rate → details → `reward` (points count up) → `sign-in?intent=first-log` ("Keep your Pizza Points", skippable).
- Ids are UUID v4 (`lib/id.ts`) so local records sync straight into Postgres uuid columns.
- Points/streaks/achievements are pure functions in `features/gamification.ts`; `useSaveLog` applies them and returns `LogRewards` for the reward modal.
- Supabase schema lives in `supabase/migrations/`. Backend setup requires: run the migration SQL, enable anonymous sign-ins (Authentication settings).
- My Pizza is a two-column grid of `FloatingPizza` (`components/floating-pizza.tsx`): each log's pizza hangs in perspective with the spot name and score under it, no cards. It shows, best first, the lifted cutout, the photo as a round pie, or the drawn slice. Cutouts are copied to `Documents/cutouts/<logId>.png` on save (`lib/cutouts.ts`); they are local only and keyed by log id, so nothing about them is stored on the log or synced. The simulator cannot run the Vision lift, so cutouts only appear on a device.
- Photos: compressed via `expo-image-manipulator`, uploaded to the `pizza-photos` storage bucket during sync; logs keep `photoUri` (local) and `photoUrl` (remote).
- Kingdoms are grid cells (`features/grid.ts`): pointy-top hexagons on the Web Mercator plane, id `"q,r"`, found from a coordinate by arithmetic (`cellForPoint`). `CELL_SIZE` is 2000 Mercator meters from middle to corner, so on the ground a cell is about 1.35 km in Seattle, 1.5 km in New York and 2 km on the equator. Changing `CELL_SIZE` changes every kingdom id, so do not change it once ids are stored on a server. In code, "kingdom" always means a cell (`Kingdom = Cell` in `features/realm.ts`) and "district" means one of Seattle's 20 named areas. Districts were the kingdoms until November 2026; now they only give Seattle its outline, the names on the map and a name for the kingdoms on them. The generated files keep old names: `kingdoms.json` holds districts and a place's `kingdomId` is a district id.
- Realm map (`app/(tabs)/realm.tsx`, `components/realm-map.tsx`, `features/realm.ts`): drawn by the app with Skia, not by a map service, so the page stays white and nothing is on it that was not put there. The map is fitted to one region (`homeRegion`), the same size on the ground in every city: the area around the player's position when location is allowed (framed on the pizzas they have eaten near there), else around their latest located pizza, else Seattle. A region that falls in Seattle uses Seattle's own bounds. It draws the real city for that region (`features/city.ts`, `lib/city-tiles.ts`, `hooks/use-city.ts`): water one step off white, the shore as a thin red line, streets as thin grey lines, and place names in Montserrat capitals that arrive in three steps as the user zooms in (`placeNames` only takes a name that has room). The city is OpenStreetMap data from OpenFreeMap's public vector tiles (OpenMapTiles schema, zoom 11, about a dozen tiles per region), decoded in JavaScript with `pbf` and `@mapbox/vector-tile` and drawn by the app, so there is still no map service view and no native dependency. The credit line on the map (`CITY_CREDIT`) is a license condition; do not remove it. A request carries a tile number only. The grid is NOT drawn (Dan rejected the honeycomb look, November 23, 2026): only the kingdom the user opens shows its six-sided shape. Heat is drawn as radial glows on top of the city. The shipped Seattle pizza places show as small rings when the user is close. If the tiles do not load, the map falls back to the shipped Seattle outline (`src/data/realm-lines.json`) and district names, and is blank white with heat elsewhere. Pan, pinch and tap run on the UI thread; line widths are divided by the zoom. The user can drag the map anywhere: when a drag or pinch comes to rest more than a fifth of the region away from its middle, the map calls `onMove`, the screen answers with a region around that point, and the map keeps the same view over it while the next tiles load (the city already drawn stays on screen until they arrive). The screen follows My Pizza: a white header with a red headline and the players' figures. Heat: every located pizza glows where it was eaten, sized by its points (`pointsByKingdom` / `kingdomLeader` / `heatSources`), and counts in any city. Red is the player, charcoal is the rival. The rival is INVENTED in `features/realm-demo.ts` because no server endpoint for other players exists yet; it eats only in Seattle, so the screen shows no rival when the map is another city. A development build shows a sample for the player when none of their logs has a location. Every tap on the map is in a kingdom, so it opens that kingdom's panel; a second tap on the same kingdom closes it. The headline is "The realm of <city>." (`hooks/use-realm-names.ts`). A kingdom's name, shown in its panel, is the district under it, else the phone's reverse geocoder (`areaNameAt` in `lib/location.ts`, which sends the kingdom's middle to the platform service, one request at a time), else, in the panel only, its coordinates. The user's position is a red dot in a ring marked YOU; it is read without a prompt on each visit (`getCoordsIfAllowed`), and the locate button at the top right of the map asks for permission if needed, moves the map to the user when they are outside its region, and opens their kingdom. Its Pizza places figure lists the shipped places in that kingdom, or, where there are none, MapKit search results inside the kingdom (display only, never stored). Tiers are hidden from the map UI because `data/seed/tier-overrides.csv` is empty, so no place is marked elite or destination yet. `expo-maps` (Apple Maps) is still used by the spot detail screen, `app/spot/[id].tsx`, only.
- Look: a pizza-shop sign. Pure white ground, near-black ink, steel-grey neutrals, one deep signal red (`colors.brand`) as the only tap color. Headlines, buttons and small labels are Montserrat capitals (`fonts.display` Black, `fonts.label` ExtraBold, loaded in the root layout; never add fontWeight to them). No screen gradients, no tinted tiles. Shapes are flat, one language app-wide (see `shape`, `lift` and the notes above them in `constants/theme.ts`): nothing has an outline or a hard offset shadow; buttons are solid rounded rectangles and icon buttons solid grey circles (`components/sticker.tsx`); tabs are words with a red rule under the chosen one (`components/text-tabs.tsx`); containers are not drawn, so content sits on white with spacing and hairlines; only floating things (log button, map panel, modals) get the soft `lift` shadow. The old `sticker` tokens still exist but draw nothing; do not use them in new code. The four `kingdomSage/Powder/Blush/Mustard` tints are no longer used on the map.
- Nearby pizza places: inline Expo module (`src/native/PizzaPlacesModule.swift`, experiments.inlineModules) wrapping MapKit MKLocalSearch. Display-only per Apple ToS — never written to the spots table; a venue becomes a community spot only when a user logs there. JS access via `lib/pizza-places.ts` + `usePizzaPlaces`.
- EAS services: Build (eas.json profiles w/ channels), Update (expo-updates, runtimeVersion appVersion policy, channels development/preview/production), Submit (Apple team in eas.json; needs ASC app record), Workflows (.eas/workflows: deploy.yml fingerprint-gated OTA-or-build on push to main, development-build.yml, production-release.yml), Observe (expo-observe: ObserveRoot wrap + expo-router integration; markInteractive fires at splash handoff and per tab route).
