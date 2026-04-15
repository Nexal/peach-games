# PeachGames v2 — Session Context

> **Last updated:** 2026-04-13 (session lock fix - joined_at column)
> **Location:** Brzoskwinia town, Polna 12 street
> **Team:** 3-person organizing team

---

## Project Overview

**PeachGames v2** is a Slavic mythology game event app built around "Noc Kupały" (Midsummer Night). The app connects game masters with players through realtime features, a clan system, quests, and an admin panel.

**GitHub repo:** https://github.com/Nexal/peach-games

---

## Tech Stack

- **Frontend:** React + Vite + TypeScript (PWA)
- **Backend:** Supabase (Postgres + Realtime + Auth)
- **Styling:** Custom CSS with glassmorphism and dark Slavic theme ("Mroczne Słowiaństwo")
- **UI Language:** Polish (all labels, buttons, messages)
- **Font:** Metamorphous (Gothic/Latin style) — for headings and UI labels; system serif as fallback. Supports runic unicode characters (ᚹ ᛗ ᚱ ᚠ ᛟ etc)
- **Icons:** Custom PNG icons for all 5 tabs (home, glos-bogow, quests, shop, profile) - generated via AI image generator, transparent background, located in `web-app/public/icons/`

---

## Design Language

### Colors (Clan Colors)

| Clan | Color | Hex |
|------|-------|-----|
| Perun | Gold | `#FFD700` |
| Weles | Purple | `#8A2BE2` |
| Mokosz | Green | `#2E8B57` |

### Theme

- **Dark Slavic ("Mroczne Słowiaństwo")** — deep backgrounds, glowing accents
- **Glassmorphism** — frosted glass panels for cards and modals

---

## Core Architecture

### Database Tables (Supabase)

| Table | Purpose |
|-------|---------|
| `games` | Game event sessions (date, location, admin_notes) |
| `klans` | Clans/teams (name, color, points, game_id) |
| `players` | Player profiles (name, pseudonym, clan_id, game_id) |
| `quests` | Quest definitions (title, description, points, type) |
| `quest_completions` | Player completions (player_id, quest_id, photo_url) |
| `messages` | Chat messages (player_id, clan_id, content, is_gm) |

### Key Files

```
web-app/
├── src/
│   ├── App.tsx                          # Main app + routing + session context
│   ├── lib/
│   │   ├── supabase.ts                 # Supabase client
│   │   ├── playerSession.ts             # Session storage (sessionStorage)
│   │   └── admin/
│   │       └── AdminAuth.tsx            # Admin password auth
│   ├── hooks/
│   │   └── useTabNavigation.ts           # Tab state management
│   ├── components/
│   │   └── tab-bar/
│   │       ├── TabBar.tsx               # Tab navigation
│   │       └── TabBar.css
│   ├── views/
│   │   ├── HomeView.tsx                 # Home with session gate
│   │   ├── ChatView.tsx                 # Realtime chat "Głos Bogów"
│   │   ├── QuestsView.tsx               # Quest list (placeholder)
│   │   ├── ShopView.tsx                 # Shop (placeholder)
│   │   ├── ProfileView.tsx              # Player profile
│   │   ├── admin/
│   │   │   ├── AdminLoginView.tsx
│   │   │   └── AdminDashboardView.tsx    # Full admin panel
│   │   └── join/
│   │       ├── JoinView.tsx             # Player registration
│   │       └── JoinView.css
│   └── types/
│       └── database.types.ts            # Generated: npx supabase gen types typescript --linked > src/types/database.types.ts
├── supabase/migrations/                # SQL migrations
└── .env.local                          # VITE_ADMIN_PASSWORD=peachgames2026
```

---

## Key Discoveries / Gotchas

1. **URL routing for `#join?game=UUID`**: `window.location.hash` includes query string after `#`. Use `window.location.pathname` (without hash) for path detection.

2. **Supabase Realtime**: Tables need explicit enable:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE messages;
   ```

3. **GitHub push protection**: Tokens in commits trigger secret scanning. Secrets must be in `.opencode/opencode.jsonc` (local only, in .gitignore).

4. **Dev server port conflicts**: Multiple Vite instances on ports 5173, 5174, 5175.

5. **Player session flow**:
   1. Admin pre-creates players in admin panel
   2. Player visits `/join?game=UUID`
   3. Player selects their name + optional pseudonym change
   4. `joined_at` is set on player record (marking them as joined)
   5. Session stored in `sessionStorage`
   6. Redirect to home with TabBar visible

6. **Player availability filter**: Uses `joined_at` column — players with `joined_at IS NOT NULL` are marked as joined and hidden from JoinView. Previously used `_joined` suffix hack which was unreliable.

---

## Session System

- Session stored in `sessionStorage` as JSON: `{ playerId, playerName, pseudonym, clanId, clanName, clanColor, gameId }`
- Home view shows blocking screen if no session
- Admin routes (`/admin`) work without player session
- Join route (`/join?game=`) only for login, redirects if already logged in
- TabBar hidden until player has session

---

## Admin Panel

**Password:** `peachgames2026` (stored in `.env.local` as `VITE_ADMIN_PASSWORD`)

**URL:** `/admin`

**Features:**
- Games: create/list games
- Klans: create/list/update clans
- Players: create/list players, assign to clan
- Chat: view all messages, filter by clan

---

## Realtime Chat ("Głos Bogów")

- Channel: `glos_bogow` 
- Realtime subscription via Supabase
- Messages show player name + clan color badge
- GMs see all messages; players see all (no clan filter yet)

---

## Next Steps

1. **Test session flow** — verify blocking screen, join flow, redirects
2. **QuestsView** — GPS tracking, QR scanning, rune puzzles
3. **ShopView** — buffs/curses purchasable with clan points
4. **ProfileView** — show clan points, inventory
5. **Enhance chat** — filter by clan
6. **Git commit** — many changes since last commit
7. **Trello sync** — use skills for reading/updating board

---

## Secrets (local only — never commit)

- `VITE_ADMIN_PASSWORD=peachgames2026` — in `.env.local`
- Trello tokens — in `.opencode/opencode.jsonc`
- Supabase URL/keys — in `.env.local`

---

## Trello Board

**Board:** "PeachGames v2"
Use skills `peach-games-read-status` and `peach-games-update-status` for syncing.
