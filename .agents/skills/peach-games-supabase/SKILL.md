---
name: peach-games-supabase
description: "Instrukcja wymuszająca na agencie AI samodzielne zarządzanie tabelami, migracjami i pushowaniem zmian przez Supabase CLI, z pominięciem interwencji programisty."
---

# Supabase CLI na WSL (Brak Dockera)

Projekt `PeachGames` wspiera się bazą Supabase, jednak nasza platforma developerska WSL w tym konkretnym środowisku działa bez włączonego silnika Docker (zwraca błąd o braku integracji WSL z Docker Desktop / daemon error).

**W ZWIĄZKU Z TYM ZABRONIONE jest używanie absolutnie typowej komendy `npx supabase start`!**

## Auto-Execution Workflow (Zdalna Baza)

To środowisko z zasady omija lokalnego Dockera. Agent ma obowiązek postępować według poniższych kroków **samodzielnie**.

### 1. Weryfikacja Połączenia

```bash
npx supabase projects list
```

Lub sprawdź czy projekt jest już przypięty:
```bash
cat web-app/supabase/config.toml | grep project_id
```

### 2. Link do projektu (jeśli nie przypięty)

```bash
cd web-app
npx supabase link --project-ref <ref>
```

Reference projektu znajdziesz w Supabase Dashboard → Settings → General.

### 3. Migracje SQL (zmiany schematu)

**Tworzenie migracji:**
```bash
npx supabase migration new nazwa_migracji
```

**Wdrożenie migracji na chmurę:**
```bash
echo "Y" | npx supabase db push
```

**Po migracji - aktualizacja typów TypeScript:**
```bash
npx supabase gen types typescript --linked > src/types/database.types.ts
```

### 4. Bezpośrednie operacje na bazie (SELECT, INSERT, UPDATE, DELETE)

**Używaj `db query --linked`** - łączy się z przypiętym projektem zdalnie:

```bash
npx supabase db query --linked "SELECT * FROM quests LIMIT 5;"
```

**Przykłady:**

```bash
# Wstawienie quest
npx supabase db query --linked "
INSERT INTO quests (title, description, type, reward_points, game_id)
SELECT 'Wyprawa Gońców', 'Opis...', 'chase', 100, id
FROM games WHERE status = 'active' LIMIT 1
RETURNING id, title;
"

# Aktualizacja
npx supabase db query --linked "
UPDATE players SET name = 'NoweImie' WHERE id = 'uuid-here' RETURNING id, name;
"

# Usunięcie
npx supabase db query --linked "DELETE FROM chase_sessions WHERE id = 'uuid';"
```

**WAŻNE:** Local database (Docker) nie działa - ZAWSZE używaj `--linked` do operacji na zdalnej bazie!

## Workflow przy dodawaniu nowego feature

1. **Stwórz plik migracji** w `web-app/supabase/migrations/`
2. **Wypchnij migrację:** `echo "Y" | npx supabase db push`
3. **Zaktualizuj typy:** `npx supabase gen types typescript --linked > src/types/database.types.ts`
4. **Jeśli potrzebujesz dodać testowe dane** - użyj `npx supabase db query --linked`

## Konfiguracja projektu

```
web-app/
├── supabase/
│   ├── config.toml      # Konfiguracja CLI (project_id, api port, etc.)
│   └── migrations/      # Pliki migracji SQL
└── .env.local          # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

## Rozwiązywanie problemów

**"dial error" przy local db:**
- To normalne - Docker nie działa w tym środowisku
- Używaj `--linked` do zdalnej bazy

**"Not linked" error:**
```bash
npx supabase link --project-ref xmanqwjuqylwhizkqjsi
```

**Project ref (do linkowania):**
- https://supabase.com/dashboard/project/xmanqwjuqylwhizkqjsi/settings/general
