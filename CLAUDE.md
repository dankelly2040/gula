# Gula: Pizza Logging App

Pizza logging, grading, and ranking app built with Expo / React Native.

## Structure

```
src/
├── app/                   # Expo Router file-based routes
│   ├── _layout.tsx        # Root Stack with providers
│   ├── index.tsx          # Entry redirect
│   ├── (onboarding)/      # Welcome, taste setter, sign-in
│   ├── (tabs)/            # Activity, Discover (stub), Profile
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
└── hooks/                 # Custom hooks
```

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

## Architecture (phase 1, SDK 57)

- Expo SDK 57 (React Native 0.86, React 19.2), React Compiler on, CNG (`ios/` is gitignored, regenerate with `npx expo prebuild -p ios`).
- Native UI: `@expo/ui` (SwiftUI + universal components). Prefer it for forms, pickers, toggles; keep custom brand components (Money Shot slider) in plain RN.
- Data is local-first: writes land in AsyncStorage (`db/local-store.ts`) and are queued (`SyncOp`), then `db/sync.ts` flushes to Supabase and pull-merges by `updatedAt` whenever a session exists. Cloud failures are silent; the app never blocks on the network.
- Auth: silent `signInAnonymously()` on first launch (`lib/auth.ts`), later upgraded to email via OTP. Route gating uses `Stack.Protected` keyed off `hasCompletedOnboarding` in the persisted session store.
- Ids are UUID v4 (`lib/id.ts`) so local records sync straight into Postgres uuid columns.
- Points/streaks/achievements are pure functions in `features/gamification.ts`; `useSaveLog` applies them and returns `LogRewards` for the reward modal.
- Pizza Quest phase 1 (data and scoring, no Realm map): kingdoms are half-open bounding boxes, seeded for Seattle in `supabase/migrations/0003_kingdoms.sql` and mirrored in `src/features/kingdoms.ts`. Boxes instead of H3 or PostGIS so the phone and Postgres share one predicate and no extension. A log with coordinates — or a spot that has them — gets a `kingdom_id` on save; a BEFORE trigger assigns it again so the server wins. First slice in a kingdom (+15) and a new spot in that kingdom (+5) are extra lines on the existing breakdown, and the log's full points credit that kingdom. The crown is a rolling 30-day `dense_rank` on public points among players with community sharing on; a tie for first is contested and nobody holds it. Run `0003_kingdoms.sql` after 0001 and 0002.
- Supabase schema lives in `supabase/migrations/`. Backend setup requires: run the migration SQL (0001, 0002, then 0003), enable anonymous sign-ins (Authentication settings).
- Photos: compressed via `expo-image-manipulator`, uploaded to the `pizza-photos` storage bucket during sync; logs keep `photoUri` (local) and `photoUrl` (remote).
- Nearby pizza places: inline Expo module (`src/native/PizzaPlacesModule.swift`, experiments.inlineModules) wrapping MapKit MKLocalSearch. Display-only per Apple ToS — never written to the spots table; a venue becomes a community spot only when a user logs there. JS access via `lib/pizza-places.ts` + `usePizzaPlaces`.
- EAS services: Build (eas.json profiles w/ channels), Update (expo-updates, runtimeVersion appVersion policy, channels development/preview/production), Submit (Apple team in eas.json; needs ASC app record), Workflows (.eas/workflows: deploy.yml fingerprint-gated OTA-or-build on push to main, development-build.yml, production-release.yml), Observe (expo-observe: ObserveRoot wrap + expo-router integration; markInteractive fires at splash handoff and per tab route).
