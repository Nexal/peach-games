# Kupala Night Web App - Architecture & Tech Stack

This document outlines the architecture and technology stack for the Progressive Web App (PWA) controller described in the **PeachGames v2 (Noc Kupały)** plan.

**Status:** Actively developed — core modules implemented.

---

## 🚀 Technology Stack

- **Platform:** Progressive Web App (PWA) — app-like experience (fullscreen, no URL bar), accessed via QR code or URL.
- **Frontend Framework:** **React 19 + Vite 8 + TypeScript 6**. Vite is extremely fast and lightweight.
- **Styling & UI:** **Vanilla CSS** with modern features (CSS variables, Grid, Flexbox). Dark Mode by default, glassmorphism UI elements, glowing neon accents matching clan elements (Perun/Lightning, Weles/Magic, Mokosz/Nature), smooth micro-animations.
- **Backend & Real-time:** **Supabase** — PostgreSQL, Auth (anonymous/PIN-based), Real-time subscriptions, File Storage (photo uploads, chat images).
- **Hosting:** Vercel or Netlify for frontend; Supabase hosts the backend.
- **Map:** **Leaflet + react-leaflet** with CartoDB Dark Matter tiles.
- **QR Scanner:** `html5-qrcode` library.
- **Geolocation:** HTML5 Geolocation API (`navigator.geolocation.watchPosition`) with Haversine formula for distance calculation.
- **Camera:** HTML5 `<input type="file" accept="image/*" capture="user">` with client-side image compression (canvas, max 1200px, JPEG 80%).

---

## 🏗️ Core Application Modules

### 1. Onboarding & Authentication
- Users launch the app via `/join?game=UUID`.
- Player selects their name from a pre-defined list (created by admin).
- Optional pseudonym change.
- `joined_at` set in database, session stored in `sessionStorage`.
- **Dev mode:** `/join?dev=true` — shows all games and players for quick testing.

### 2. Main Dashboard (HomeView)
- **Player Card:** Name, clan name, clan color, clan icon/image.
- **Ogniki Display:** Current klan points (🔥).
- **Logo:** Clickable PeachGames logo with splash animation.
- **Profile Button:** Quick access to profile view.

### 3. Hardware & Sensor Components
- **GPS Tracker:** Radar-like UI showing distance to target coordinates. Triggers success when distance < threshold. Uses `watchPosition` with high accuracy.
- **QR Scanner:** In-app camera view (`html5-qrcode`) to scan physical codes hidden in the garden. Validates against `map_markers.qr_secret`.
- **Camera Upload:** Opens native camera, compresses image client-side, uploads to Supabase Storage (`chat-images` bucket).

### 4. Quest System (QuestsView)
- **Quest Types:** `gps`, `qr`, `photo`, `logic`, `chase`.
- **Activation Flow:** Available → Activate → Active → Completed.
- **Sequential Tasks:** Tasks unlock one by one; current task shows progress.
- **QR Tasks:** Progress bar showing scanned/total markers.
- **Chase Quests:** Moving target with trajectory-based movement (JSON path + speed + bearing). Catch detected via Haversine formula.
- **Completion Modal:** Shows quest name, points awarded, player name.

### 5. Map (MapView)
- Leaflet map with CartoDB Dark tiles.
- **Marker Types:** Base (🔥), Clan bases, Quest markers, Chase markers (moving), QR markers.
- **Player Positions:** Real-time via Supabase `player_positions` table.
- **Animated Markers:** Pulsing/orbiting markers for visual effects.
- **Popup Actions:** Scan QR button, reward points display, quest info.
- **Center-on-Location:** Button to center map on player position.

### 6. Interactive Puzzle Modules
- **Digital Locks:** UI components resembling combination locks (for "Duchy Dzieciństwa" task).
- **Trade Terminal (Targowisko Tajemnic):** Real-time UI for exchanging "Words of the Spell" via chat.

### 7. Shop (Sklep Żercy)
- Digital marketplace for buffs/curses/tools.
- Items: Oczyszczenie (reveal hidden quests), Tempo (2x points for 30min), Klątwa Słabości (-20% points), Radar (show enemy positions).
- Purchase deducts klan points, creates `clan_items` record.
- Owned items marked as "W posiadaniu".

### 8. Communication Channel (Głos Bogów / ChatView)
- **Two Modes:** Klan (klan messages + god broadcasts) and Wspólna (global messages).
- **Real-time:** Supabase Realtime subscriptions for instant message delivery.
- **Image Support:** Upload with compression, preview, enlarge modal.
- **Audio Support:** TTS-generated audio messages with play/pause controls.
- **God Messages:** `sender === 'god'` messages shown with priority styling.
- **Clan Colors:** Messages display sender's clan color badge.

### 9. Profile (ProfileView)
- Player info: name, clan, session ID.
- **Curses Tab:** Active clan buffs/debuffs with activation controls.
- **Logout:** Clears session, reloads page.

### 10. Game Master (Admin) Dashboard
- **URL:** `/admin`, password: `peachgames2026`.
- **Features:**
  - Games: create/list games
  - Klans: create/list/update clans
  - Players: create/list players, assign to clan
  - Chat: view all messages, filter by clan
  - MapPanel: all player positions with clan colors
  - Quests: manage quests, tasks, map markers
  - Chase: manage chase sessions

---

## 🗄️ Database Schema (Supabase)

### Tables

```
games
  id (uuid, pk)
  name (text)
  description (text)
  status (text)
  starts_at (timestamptz)
  ends_at (timestamptz)
  created_at (timestamptz)

klans
  id (uuid, pk)
  game_id (uuid, fk → games)
  name (text)
  theme_color (text)
  points (int4, default 0)

players
  id (uuid, pk)
  game_id (uuid, fk → games)
  klan_id (uuid, fk → klans)
  name (text)
  role (text, default 'player')
  joined_at (timestamptz)
  created_at (timestamptz)

quests
  id (uuid, pk)
  game_id (uuid, fk → games)
  klan_id (uuid, fk → klans, nullable)
  title (text)
  description (text)
  type (text) -- 'gps', 'qr', 'photo', 'logic', 'chase'
  reward_points (int4)
  trajectory (jsonb) -- for chase quests
  qr_secret (text)

tasks
  id (uuid, pk)
  quest_id (uuid, fk → quests)
  title (text)
  description (text)
  type (text)
  sort_order (int4)
  reward_points (int4)

quest_activations
  id (uuid, pk)
  game_id (uuid)
  klan_id (uuid)
  quest_id (uuid)
  activated_at (timestamptz)
  completed_at (timestamptz, nullable)
  completed_by_player_id (uuid, fk → players, nullable)

quest_completions
  id (uuid, pk)
  game_id (uuid)
  klan_id (uuid)
  quest_id (uuid)
  points_awarded (int4)
  completed_by_player_id (uuid, fk → players)
  completed_at (timestamptz)
  metadata (jsonb)

task_completions
  id (uuid, pk)
  quest_activation_id (uuid, fk → quest_activations)
  task_id (uuid, fk → tasks)
  completed_by_player_id (uuid, fk → players)
  completed_at (timestamptz)
  metadata (jsonb) -- { scanned_marker_ids: string[] }

messages
  id (uuid, pk)
  game_id (uuid, fk → games)
  klan_id (uuid, fk → klans, nullable)
  sender_klan_id (uuid, fk → klans, nullable)
  sender (text)
  content (text)
  image_url (text, nullable)
  audio_url (text, nullable)
  tts_requested (bool, default false)
  created_at (timestamptz)

clan_items
  id (uuid, pk)
  klan_id (uuid, fk → klans)
  name (text)
  type (text) -- 'buff', 'curse', 'tool'
  description (text)
  effect (jsonb)
  active (bool)
  uses_remaining (int4)
  duration_seconds (int4)
  cooldown_seconds (int4)
  activated_at (timestamptz)
  created_at (timestamptz)

player_positions
  player_id (uuid, pk, fk → players)
  game_id (uuid, fk → games)
  lat (float8)
  lng (float8)
  accuracy (float4)
  updated_at (timestamptz)

map_markers
  id (uuid, pk)
  game_id (uuid, fk → games)
  klan_id (uuid, fk → klans, nullable)
  quest_id (uuid, fk → quests, nullable)
  task_id (uuid, fk → tasks, nullable)
  title (text)
  description (text)
  type (text) -- 'quest', 'base', 'clan_base', 'chase', 'qr'
  lat (float8)
  lng (float8)
  is_active (bool, default true)
  qr_secret (text, nullable)
  reward_points (int4, nullable)
  icon_url (text, nullable)
  created_at (timestamptz)
  updated_at (timestamptz)

chase_sessions
  id (uuid, pk)
  game_id (uuid, fk → games)
  klan_id (uuid, fk → klans)
  quest_id (uuid, fk → quests)
  start_lat (float8)
  start_lng (float8)
  bearing (float8)
  speed_mps (float8)
  catch_distance_m (float4, default 20)
  started_at (timestamptz)
  completed_at (timestamptz, nullable)
  completed_by_player_id (uuid, fk → players, nullable)
  reward_points (int4)
```

### Views
- `games_status` — Aggregated game statistics

### Functions
- `create_game(game_name, game_description)` — Creates game with default klans
- `update_player_position(p_player_id, p_game_id, p_lat, p_lng, p_accuracy)` — Upserts position
- `get_game_player_positions(p_game_id)` — Returns all player positions
- `get_chase_position(chase_id)` — Returns current chase marker position
- `insert_sample_map_markers(...)` — Inserts test markers
- `reset_game()` — Resets all game data

---

## 🎨 Implemented Features

| Feature | Status |
|---------|--------|
| Session flow (join/login) | ✅ Complete |
| Dev mode (`/join?dev=true`) | ✅ Complete |
| Home view with player card + ogniki | ✅ Complete |
| Realtime chat (klan/global modes) | ✅ Complete |
| Chat image upload + compression | ✅ Complete |
| Chat audio playback | ✅ Complete |
| Leaflet map with player positions | ✅ Complete |
| Chase quest system (trajectory-based) | ✅ Complete |
| QR code scanning | ✅ Complete |
| Quest activation + task progress | ✅ Complete |
| Quest completion modal | ✅ Complete |
| Shop (hardcoded items) | ✅ Complete |
| Profile view + curses tab | ✅ Complete |
| Admin panel (games, klans, players, chat) | ✅ Complete |
| Admin map panel | ✅ Complete |
| Splash screen animation | ✅ Complete |

---

## 🔲 Remaining Work

| Feature | Priority |
|---------|----------|
| Photo upload quests (camera + storage) | Medium |
| Logic puzzles (rune translation, locks) | Medium |
| Dynamic shop items (admin-managed) | Low |
| TTS integration (actual text-to-speech) | Low |
| Geofencing (auto-complete on proximity) | Medium |
| PWA manifest + service worker | Low |
