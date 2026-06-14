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

## Manual Testing

- **Dev mode login:** Navigate to `http://localhost:5173/join?dev=true` — bypasses game invite link requirement, shows all games and players for quick session switching
- **Playwright browser tests:** Use `playwright_browser_*` tools pointing at `http://192.168.0.195:5173` (dev server with `--host`). Cloudflare tunnel (`npx cloudflared tunnel`) for HTTPS/camera access if needed.

## Relevant Context Files

- `web-app/.opencode/peach-games-context.md` — full session context (tech stack, DB schema, gotchas, session flow)
- `web-app/.opencode/skills/peach-games-supabase/SKILL.md` — detailed Supabase CLI reference
- `web-app/.opencode/skills/peach-games-run-debug/SKILL.md` — dev server + debug instructions
- `PLAN_KUPALA.md` — complete game scenario (Noc Kupały event)

---

# Karpathy Guidelines

Behavioral guidelines to reduce common LLM coding mistakes, derived from [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876) on LLM coding pitfalls.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. Branching Strategy

**Przed każdym nowym zadaniem sprawdź aktualny branch (`git branch --show-current`).**

- Jeśli jesteś na branchu `main` (lub `master` / `develop`), utwórz nowy branch dedykowany zadaniu (`git checkout -b feat/nazwa-zadania`).
- Jeśli jesteś już na osobnym branchu (np. `feat/coś`), a nowe zadanie dotyczy czegoś innego — **zapytaj użytkownika**, czy utworzyć nowego brancha, czy kontynuować na obecnym.
- Nazwa brancha powinna odzwierciedlać zadanie (np. `feat/kupala-scoring`, `fix/chat-reconnect`, `refactor/map-view`).

## 6. Self Review przed zakończeniem zadania

**Zanim uznasz zadanie za skończone, wykonaj przegląd własnych zmian:**

- Przejrzyj `git diff` — sprawdź, czy nie ma zbędnych zmian, wykasowanych testów, zostawionych komentarzy, console.logów, tymczasowych plików.
- Upewnij się, że zmiany dotyczą **tylko** tego zadania — brak przypadkowych modyfikacji w niepowiązanych plikach.
- Jeśli zmieniłeś logikę biznesową — sprawdź, czy nie trzeba zaktualizować testów.
- Rzuć okiem na finalny stan plików, które edytowałeś (np. przez `git diff --stat` i szybki przegląd kluczowych plików).
