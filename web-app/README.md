# PeachGames v2 — Noc Kupały

Progressive Web App (PWA) for the "Noc Kupały" (Midsummer Night) Slavic mythology game event. Connects game masters with players through realtime features, a clan system, quests, and an admin panel.

## Quick Start

```bash
cd web-app
npm install
npm run dev          # Dev server (port 5173)
npm run dev -- --host  # Dev server with network access (mobile testing)
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run dev -- --host` | Dev server accessible on local network |
| `npm run build` | TypeScript check + Vite production build |
| `npm run lint` | ESLint check |
| `npm run preview` | Preview production build locally |

## Tech Stack

- **React 19** + **Vite 8** + **TypeScript 6**
- **Supabase** (PostgreSQL + Realtime + Storage)
- **Leaflet** + react-leaflet (maps)
- **html5-qrcode** (QR scanning)
- **Vanilla CSS** (glassmorphism, dark Slavic theme)

## Project Structure

```
src/
├── App.tsx              # Main app + routing + context providers
├── views/               # Page views (Home, Chat, Map, Quests, Shop, Profile, Admin)
├── components/          # Reusable components (tab-bar, map, quest)
├── hooks/               # Custom hooks (geolocation, game state, QR scanner)
├── lib/                 # Supabase client, session management, utilities
├── types/               # TypeScript types (database, map)
├── styles/              # Component-specific CSS
└── constants/           # Static data (runes.json)
```

## Key Features

- **Clan System** — Perun (Gold), Weles (Purple), Mokosz (Green)
- **Realtime Chat** — Klan and global modes with image/audio support
- **Quest System** — GPS, QR, chase, photo, and logic quest types
- **Interactive Map** — Player positions, quest markers, chase tracking
- **Shop** — Buffs, curses, and tools purchasable with clan points
- **Admin Panel** — Full game management at `/admin` (password: `peachgames2026`)

## Supabase Workflow

After every SQL migration change:

```bash
npx supabase db push --linked
npx supabase gen types typescript --linked > src/types/database.types.ts
```

## Dev Mode

Navigate to `http://localhost:5173/join?dev=true` to bypass game invite link requirement and see all games/players for quick session switching.

## Documentation

- [ARCHITECTURE.md](../ARCHITECTURE.md) — System architecture (Polish)
- [PLAN_KUPALA.md](../PLAN_KUPALA.md) — Complete game scenario (Polish)
- [kupala_web_app_architecture.md](./kupala_web_app_architecture.md) — Detailed tech stack and DB schema
- [peach-games-context.md](./.opencode/peach-games-context.md) — Session context for AI agents
