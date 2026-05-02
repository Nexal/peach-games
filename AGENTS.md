# PeachGames — Agent Instructions

## Project Location

```
/home/nexal/peach-games/
├── web-app/          # Main React + Vite + TypeScript PWA
│   ├── src/
│   │   ├── App.tsx
│   │   ├── lib/supabase.ts         # Supabase client
│   │   ├── lib/playerSession.ts    # sessionStorage-based session
│   │   ├── views/                  # HomeView, ChatView, MapView, QuestsView, ShopView, ProfileView
│   │   ├── views/admin/            # AdminLoginView, AdminDashboardView
│   │   └── views/join/             # JoinView (player registration)
│   └── supabase/migrations/        # SQL migrations (auto-push after every change)
└── .opencode/                       # MCP config (Trello, Notion, Playwright)
```

## Dev Commands

```bash
cd web-app
npm run dev          # Dev server (port 5173, auto-reload)
npm run build        # TypeScript check + Vite build (tsc -b && vite build)
npm run lint         # ESLint
```

**Dev server for mobile testing:** use `--host` flag (vite.config.ts allows `thinkpad`, `*.loca.lt`, `*.lgtunnel.info`, `*.trycloudflare.com`). For HTTPS geolocation testing: `npx cloudflared tunnel --url http://localhost:5173`.

## Supabase Workflow (Remote-only, no Docker)

**After every SQL migration change:**

```bash
cd web-app
npx supabase db push --linked    # Push migration to cloud
npx supabase gen types typescript --linked > src/types/database.types.ts  # Regenerate types
```

**Never run:** `npx supabase start` (Docker not available locally).

## Database

- **Remote project:** `xmanqwjuqylwhizkqjsi` (Supabase Dashboard linked)
- **Realtime on `messages`:** requires `ALTER PUBLICATION supabase_realtime ADD TABLE messages;` in migrations
- **Types source:** `src/types/database.types.ts` — generated, do not edit manually

## Secrets (never commit)

- `.env.local` — contains `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ADMIN_PASSWORD=peachgames2026`
- Trello tokens — in `.opencode/opencode.jsonc`
- Supabase keys — in `.env.local`

## Key Conventions

- **UI language:** Polish (all labels, buttons, messages)
- **Clan colors:** Perun=#FFD700, Weles=#8A2BE2, Mokosz=#2E8B57
- **Player session:** stored in `sessionStorage`, keyed by `joined_at IS NOT NULL` (availability filter uses this column)
- **Admin password:** `peachgames2026` at `/admin`
- **URL routing:** Hash-based (`#/join?game=UUID`) — `window.location.hash` includes query string; use `pathname` without hash for path detection
- **Font:** Metamorphous (Google Fonts), with system serif fallback; supports runic Unicode

## Available Skills

```
peach-games-read-status / peach-games-update-status  # Trello board sync
peach-games-read-context / peach-games-update-context # Session context
peach-games-supabase                              # Supabase CLI workflow
peach-games-run-debug                             # TS/Vite error scanning
peach-games-playwright                            # Playwright manual testing
peach-games-themes                                # Notion theme proposals
```

## Relevant Context Files

- `web-app/.opencode/peach-games-context.md` — full session context (tech stack, DB schema, gotchas, session flow)
- `web-app/.opencode/skills/peach-games-supabase/SKILL.md` — detailed Supabase CLI reference
- `web-app/.opencode/skills/peach-games-run-debug/SKILL.md` — dev server + debug instructions
- `PLAN_KUPALA.md` — complete game scenario (Noc Kupały event)
