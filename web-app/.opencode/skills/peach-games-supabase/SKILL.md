---
name: peach-games-supabase
description: "Instrukcja wymuszająca na agencie AI samodzielne zarządzanie tabelami, migracjami i pushowaniem zmian przez Supabase CLI, z pominięciem interwencji programisty."
---

# Supabase CLI Workflow (PeachGames v2)

## Środowisko

Projekt `PeachGames` używa Supabase jako backendu (baza danych, realtime, edge functions, auth).

**WAŻNE:** To środowisko NIE ma uruchomionego Dockera. Lokalna baza nie działa. Wszystkie operacje wykonujemy na **zdalnej bazie**.

**ZABRONIONE:** `npx supabase start` (startuje lokalnego Dockera - nie zadziała)

---

## Typowy Workflow przy zmianach w bazie

### 1. Weryfikacja połączenia

```bash
cd web-app
npx supabase projects list
```

Powinien pokazać projekt `PeachGames v2` z statusem `●` (linked).

### 2. Tworzenie migracji SQL

Gdy potrzebujesz dodać tabelę, kolumnę, zmienić schemat:

```bash
cd web-app
npx supabase migration new nazwa_migracji
```

To utworzy plik: `supabase/migrations/<TIMESTAMP>_nazwa_migracji.sql`

**Edytuj ten plik** - wpisz kod SQL zmian.

### 3. Wdrożenie migracji

```bash
cd web-app
npx supabase db push --linked
```

Jeśli zapyta o potwierdzenie `Y/n` - wciśnij `Y` (lub dodaj `--yes`).

### 4. Aktualizacja typów TypeScript

Po skutecznym `db push`, ZAWSZE generuj typy:

```bash
cd web-app
npx supabase gen types typescript --linked > src/types/database.types.ts
```

To nadpisze plik z aktualnymi typami z bazy (nowe kolumny będą dostępne w kodzie).

---

## Edge Functions

### Wdrożenie funkcji

```bash
cd web-app
npx supabase functions deploy nazwa-funkcji
```

### Ustawienie secrets

```bash
npx supabase secrets set NAZWA=wartość
```

### Lista secrets

```bash
npx supabase secrets list
```

---

## Struktura projektu Supabase

```
web-app/supabase/
├── config.toml              # Konfiguracja projektu
├── migrations/             # Migracje SQL
│   └── *_migration_name.sql
├── functions/              # Edge Functions (Deno)
│   └── nazwa-funkcji/
│       └── index.ts
├── storage/                # Pliki (jeśli używane)
└── .env                    # Zmienne lokalne (NIE COMMITUJ!)
```

---

## Typowe komendy

| Cel | Komenda |
|-----|---------|
| Lista projektów | `npx supabase projects list` |
| Status połączenia | `npx supabase status` |
| Nowa migracja | `npx supabase migration new nazwa` |
| Wgrać migracje | `npx supabase db push --linked` |
| Generować typy | `npx supabase gen types typescript --linked` |
| Deploy function | `npx supabase functions deploy nazwa` |
| Lista secrets | `npx supabase secrets list` |
| Ustawić secret | `npx supabase secrets set KLUCZ=wartość` |

---

## Rozwiązywanie problemów

### "Cannot connect to Docker daemon"
To normalne - Docker nie jest uruchomiony. Używaj tylko `--linked` i `-remote` operation.

### "Connection timeout" przy db push
Spróbuj ponownie - to chwilowy błąd sieci.

### Migracja nie weszła
Sprawdź w Supabase Dashboard → SQL Editor czy zmiany są widoczne.

---

## Reference

- Docs: https://supabase.com/docs/guides/cli
- Dashboard: https://supabase.com/dashboard/project/xmanqwjuqylwhizkqjsi
