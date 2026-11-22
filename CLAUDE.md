# Gula: Pizza Quest

Pizza logging app becoming a territory game: Seattle is split into 20 kingdoms, every pizza place has a tier, and logging a pizza earns tier points inside its kingdom. Product brief: `docs/pizza-quest-brief.md`.

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
├── data/                  # Generated: kingdoms.json, places.json (do not hand-edit)
└── hooks/                 # Custom hooks
```

Seed inputs live in `data/seed/` (district polygons, OSM pizza places, `tier-overrides.csv`). Regenerate `src/data/` with `bun scripts/build-realm-data.ts` after editing any of them.

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
- Realm map (`app/(tabs)/realm.tsx`, `components/realm-map.tsx`, `features/realm.ts`): drawn by the app with Skia, not by a map service, so the page stays white and nothing is on it that was not put there. `scripts/build-realm-data.ts` derives `src/data/realm-lines.json` from the district shapes: edges used by one district form the land outline, edges shared by two form the kingdom borders, so each border is one line. The map draws the outline as a thin red line, the borders as finer red lines, heat as radial glows, kingdom names (Montserrat capitals) once the user zooms in, and pizza places as small rings closer still. Pan, pinch and tap run on the UI thread; line widths are divided by the zoom. The screen follows My Pizza: a white header with a red headline and the two players' figures. Heat: every logged pizza glows where it was eaten, sized by its points (`pointsByKingdom` / `kingdomLeader` / `heatSources` in `features/realm.ts`). Red is the player, charcoal is the rival. The rival is INVENTED in `features/realm-demo.ts` because no server endpoint for other players exists yet; a development build also shows a sample for the player when none of their logs are inside the realm. Tapping a kingdom opens a panel with both scores; its Pizza places figure opens the list of places in that kingdom. Tiers are hidden from the map UI because `data/seed/tier-overrides.csv` is empty, so no place is marked elite or destination yet. `kingdomForPoint` does point-in-polygon on the shipped simplified rings for taps and for user-added spots. `expo-maps` (Apple Maps) is still used by the spot detail screen, `app/spot/[id].tsx`, only.
- Look: a pizza-shop sign. Pure white ground, near-black ink, steel-grey neutrals, one deep signal red (`colors.brand`) as the only tap color. Headlines, buttons and small labels are Montserrat capitals (`fonts.display` Black, `fonts.label` ExtraBold, loaded in the root layout; never add fontWeight to them). No screen gradients, no tinted tiles. Shapes are flat, one language app-wide (see `shape`, `lift` and the notes above them in `constants/theme.ts`): nothing has an outline or a hard offset shadow; buttons are solid rounded rectangles and icon buttons solid grey circles (`components/sticker.tsx`); tabs are words with a red rule under the chosen one (`components/text-tabs.tsx`); containers are not drawn, so content sits on white with spacing and hairlines; only floating things (log button, map panel, modals) get the soft `lift` shadow. The old `sticker` tokens still exist but draw nothing; do not use them in new code. The four `kingdomSage/Powder/Blush/Mustard` tints are no longer used on the map.
- Nearby pizza places: inline Expo module (`src/native/PizzaPlacesModule.swift`, experiments.inlineModules) wrapping MapKit MKLocalSearch. Display-only per Apple ToS — never written to the spots table; a venue becomes a community spot only when a user logs there. JS access via `lib/pizza-places.ts` + `usePizzaPlaces`.
- EAS services: Build (eas.json profiles w/ channels), Update (expo-updates, runtimeVersion appVersion policy, channels development/preview/production), Submit (Apple team in eas.json; needs ASC app record), Workflows (.eas/workflows: deploy.yml fingerprint-gated OTA-or-build on push to main, development-build.yml, production-release.yml), Observe (expo-observe: ObserveRoot wrap + expo-router integration; markInteractive fires at splash handoff and per tab route).
