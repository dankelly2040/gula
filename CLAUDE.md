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
