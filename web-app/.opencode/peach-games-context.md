# PeachGames v2 — Session Context

> **Last updated:** 2026-05-07 (codebase analysis — quests, shop, chat, map fully implemented)
> **Location:** Brzoskwinia town, Polna 12 street
> **Team:** 3-person organizing team

---

## Project Overview

**PeachGames v2** is a Slavic mythology game event app built around "Noc Kupały" (Midsummer Night). The app connects game masters with players through realtime features, a clan system, quests (GPS, QR, chase, photo), and an admin panel.

**GitHub repo:** https://github.com/Nexal/peach-games

---

## Tech Stack

- **Frontend:** React 19 + Vite 8 + TypeScript 6 (PWA)
- **Backend:** Supabase (Postgres + Realtime + Storage)
- **Styling:** Custom CSS with glassmorphism and dark Slavic theme ("Mroczne Słowiaństwo")
- **UI Language:** Polish (all labels, buttons, messages)
- **Font:** Metamorphous (Gothic/Latin style) — for headings and UI labels; system serif as fallback. Supports runic unicode characters (ᚹ ᛗ ᚱ ᚠ ᛟ etc)
- **Icons:** Custom PNG icons for tabs (home, glos-bogow, quests, shop, profile) + clan icons (perun, weles, mokosz) — located in `web-app/public/icons/`
- **Map:** Leaflet + react-leaflet with CartoDB Dark tiles
- **QR Scanner:** `html5-qrcode` library

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
| `games` | Game event sessions (name, description, status, starts_at, ends_at) |
| `klans` | Clans/teams (name, theme_color, points, game_id) |
| `players` | Player profiles (name, klan_id, game_id, role, joined_at) |
| `quests` | Quest definitions (title, description, type, reward_points, klan_id, trajectory, qr_secret) |
| `tasks` | Sub-tasks within quests (title, description, type, sort_order, reward_points, quest_id) |
| `quest_activations` | Tracks which klan activated which quest (klan_id, quest_id, activated_at, completed_at) |
| `quest_completions` | Quest completion records (klan_id, quest_id, points_awarded, completed_by_player_id, metadata) |
| `task_completions` | Task completion records (task_id, quest_activation_id, completed_at, metadata with scanned_marker_ids) |
| `messages` | Chat messages (sender, klan_id, sender_klan_id, content, image_url, audio_url, tts_requested, game_id) |
| `clan_items` | Clan buffs/curse/debuff items (klan_id, name, type, effect, duration, uses_remaining, active, cooldown) |
| `player_positions` | Real-time player geolocation (player_id, game_id, lat, lng, accuracy, updated_at) |
| `map_markers` | Quest/QR markers on map (title, lat, lng, type, klan_id, quest_id, task_id, is_active, qr_secret, reward_points) |
| `chase_sessions` | Active chase quest sessions (quest_id, klan_id, start_lat, start_lng, bearing, speed_mps, started_at, completed_at) |

### Views

| View | Purpose |
|------|---------|
| `games_status` | Aggregated game status (player count, klan count, quest counts) |
| `game_status` | Legacy single-game status view |

### Functions

| Function | Purpose |
|----------|---------|
| `create_game` | Creates a new game with default klans |
| `update_player_position` | Upserts player position |
| `get_game_player_positions` | Returns all player positions for a game |
| `get_chase_position` | Returns current chase marker position |
| `insert_sample_map_markers` | Inserts sample markers for testing |
| `reset_game` | Resets all game data |

### Key Files

```
web-app/
├── src/
│   ├── App.tsx                          # Main app + routing + session context + GameProvider
│   ├── main.tsx                         # Entry point
│   ├── lib/
│   │   ├── supabase.ts                 # Supabase client
│   │   ├── playerSession.ts             # Session storage (sessionStorage)
│   │   ├── qrScanner.ts                 # QR code scanning logic (scanQRCode)
│   │   └── admin/
│   │       └── AdminAuth.tsx            # Admin password auth
│   ├── hooks/
│   │   ├── useTabNavigation.ts           # Tab state management
│   │   ├── usePlayerPosition.tsx         # Player geolocation tracking
│   │   ├── useGameProvider.tsx           # Game context (chase, points, completions)
│   │   ├── useChaseProvider.tsx          # Dedicated chase quest context
│   │   ├── useGeolocation.ts             # Generic geolocation hook
│   │   └── useQRScanner.ts               # QR scanning hook with feedback
│   ├── components/
│   │   ├── tab-bar/
│   │   │   ├── TabBar.tsx               # Bottom tab navigation
│   │   │   └── TabBar.css
│   │   ├── map/
│   │   │   ├── MapControls.tsx           # LocationMarker, CenterOnLocationButton
│   │   │   ├── AnimatedMarkers.tsx       # Animated/pulsing markers
│   │   │   └── markerIcons.ts            # Custom Leaflet icons
│   │   └── quest/
│   │       ├── ChaseQuest.tsx            # Chase quest UI component
│   │       ├── ChaseQuest.css
│   │       ├── QRScannerModal.tsx         # QR scanner modal
│   │       └── QRScannerModal.css
│   ├── views/
│   │   ├── HomeView.tsx                 # Home with player card + ogniki display
│   │   ├── ChatView.tsx                 # Realtime chat (klan/global modes, image upload, audio)
│   │   ├── MapView.tsx                  # Leaflet map with player positions, chase markers, QR markers
│   │   ├── MapView.css
│   │   ├── QuestsView.tsx               # Quest list with activation, tasks, QR scanning
│   │   ├── QuestsView.css
│   │   ├── ShopView.tsx                 # Shop with buffs/curses/tools purchase
│   │   ├── ProfileView.tsx              # Player profile + curses tab
│   │   ├── Views.css
│   │   ├── admin/
│   │   │   ├── AdminLoginView.tsx
│   │   │   └── AdminDashboardView.tsx   # Full admin panel + MapPanel
│   │   ├── join/
│   │   │   ├── JoinView.tsx             # Player registration
│   │   │   └── JoinView.css
│   │   └── profile/
│   │       ├── CursesView.tsx           # Clan buffs/curses/debuffs management
│   │       └── CursesView.css
│   ├── styles/
│   │   └── CompletionModal.css          # Quest completion modal styles
│   ├── constants/
│   │   └── runes.json                   # Runic alphabet for puzzles
│   └── types/
│       ├── database.types.ts            # Generated: npx supabase gen types typescript --linked > src/types/database.types.ts
│       └── map.types.ts                 # Map marker types, tile layers, default config
├── supabase/migrations/                # SQL migrations (auto-push after every change)
├── public/
│   ├── icons/                          # Tab icons + clan icons
│   └── logo_peachgames_kupala-Photoroom.png
└── .env.local                          # VITE_ADMIN_PASSWORD=peachgames2026
```

---

## Key Discoveries / Gotchas

1. **URL routing for `/join?game=UUID`**: `window.location.hash` includes query string after `#`. Use `window.location.pathname` (without hash) for path detection.

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

7. **Chase quest system**: Uses `chase_sessions` table with trajectory-based movement. Marker position calculated client-side from trajectory JSON + speed + elapsed time. Catch distance checked via Haversine formula.

8. **QR scanning**: Uses `map_markers.qr_secret` for validation. Task progress tracked via `task_completions.metadata.scanned_marker_ids`.

9. **Chat image upload**: Images compressed client-side (canvas, max 1200px, JPEG 80%) before upload to `chat-images` bucket.

10. **`(supabase as any)` casts**: Used throughout because generated types don't cover all query patterns (joins, nested selects). This is intentional and works at runtime.

---

## Session System

- Session stored in `sessionStorage` as JSON: `{ id, name, pseudonym, klanId, klanName, klanColor, gameId }`
- Home view shows blocking screen if no session
- Admin routes (`/admin`) work without player session
- Join route (`/join`) only for login, redirects if already logged in
- TabBar hidden until player has session
- Splash screen shown on first session load (logo animation, 2s)

---

## Admin Panel

**Password:** `peachgames2026` (stored in `.env.local` as `VITE_ADMIN_PASSWORD`)

**URL:** `/admin`

**Features:**
- Games: create/list games
- Klans: create/list/update clans
- Players: create/list players, assign to clan
- Chat: view all messages, filter by clan
- MapPanel: shows all players with clan colors on map
- Quests: manage quests, tasks, map markers
- Chase: manage chase sessions

---

## Realtime Chat ("Głos Bogów")

- Channel: `glos_bogow`
- Realtime subscription via Supabase
- Two modes: **klan** (klan messages + god broadcasts) and **global** (all-klan messages only)
- Messages show player name + clan color badge
- Image upload with compression + preview
- Audio message playback (TTS-generated audio_url)
- God messages (`sender === 'god'`) visible in klan mode

---

## Quest System

### Quest Types
- **gps** — Location-based quests
- **qr** — QR code scanning quests (with multiple markers per task)
- **photo** — Photo upload quests
- **logic** — Logic puzzle quests
- **chase** — Moving target chase quests (trajectory-based)

### Quest Flow
1. Quest appears as "available"
2. Player activates quest → `quest_activations` row created
3. Quest becomes "active" with sub-tasks shown in order
4. Tasks completed sequentially (current task unlocked, others locked)
5. QR tasks show progress bar (scanned/total markers)
6. All tasks complete → quest completion → points awarded
7. Completion modal shown with quest name, points, player name

### Chase Quests
- Activated from QuestsView or MapView
- Creates `chase_sessions` row with start position, bearing, speed
- Marker moves along trajectory (JSON array of lat/lng points)
- Position calculated client-side every second
- Catch detected when player within `catch_distance_m` (default 20m)
- On catch: session completed, points awarded to klan

---

## Shop System

- Hardcoded items in `ShopView.tsx` (Oczyszczenie, Tempo, Klątwa Słabości, Radar)
- Items have type: `buff`, `curse`, `tool`
- Purchase deducts points from klan, creates `clan_items` row
- Owned items shown as "W posiadaniu"

---

## Supabase Migration Workflow

**AFTER every change to `supabase/migrations/*.sql`, ALWAYS do:**

```bash
cd web-app
echo "Y" | npx supabase db push
npx supabase gen types typescript --linked > src/types/database.types.ts
```

This pushes the migration to cloud AND regenerates TypeScript types.

---

## Next Steps

1. ✅ **Session flow** — tested, working
2. ✅ **Dev mode login** — `/join?dev=true` for quick testing
3. ✅ **MapView** — Leaflet with CartoDB Dark tiles, player positions, chase markers, QR markers
4. ✅ **CursesView** — clan buffs/curse/debuff activation in Profile tab
5. ✅ **Admin Map Panel** — shows all players with clan colors
6. ✅ **QuestsView** — GPS tracking, QR scanning, task progress, chase quests, activation flow
7. ✅ **ShopView** — buffs/curses purchasable with clan points (hardcoded items)
8. ✅ **Głos Bogów** — clan/global chat modes, image upload, audio playback
9. 🔲 **Photo upload quests** — camera capture + Supabase Storage upload for quests
10. 🔲 **Logic puzzles** — rune translation, combination locks
11. 🔲 **Dynamic shop items** — admin-managed shop items from database
12. 🔲 **TTS integration** — actual text-to-speech for god messages
13. 🔲 **Geofencing** — automatic quest completion when near GPS target

---

## Secrets (local only — never commit)

- `VITE_ADMIN_PASSWORD=peachgames2026` — in `.env.local`
- Trello tokens — in `.opencode/opencode.jsonc`
- Supabase URL/keys — in `.env.local`

---

## Trello Board

**Board:** "PeachGames v2"
Use skills `peach-games-read-status` and `peach-games-update-status` for syncing.
