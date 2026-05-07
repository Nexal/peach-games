# Architektura Systemu: PeachGames v2 (Noc Kupały)

Dokument opisuje fundamenty techniczne i założenia projektowe aplikacji kontrolera PWA dla uczestników i organizatorów.

## 1. Stack Techniczny
- **Frontend**: React 19 + Vite 8 + TypeScript 6.
- **Stylizacja**: Vanilla CSS (Custom Properties) z naciskiem na "Glassmorphism" i mroczną estetykę rave.
- **Backend / Realtime**: Supabase (PostgreSQL, Realtime, Storage).
- **PWA**: Wsparcie dla instalacji na ekranie głównym (manifest, service workers).
- **Mapa**: Leaflet + react-leaflet z CartoDB Dark tiles.
- **QR Scanner**: `html5-qrcode` library.

## 2. Design System (Mroczne Słowiaństwo)
- **Kolory**:
    - `--color-perun`: Złoty/Błyskawica (`#FFD700`)
    - `--color-weles`: Purpura/Noc (`#8A2BE2`)
    - `--color-mokosz`: Zieleń/Natura (`#2E8B57`)
    - `--color-glass`: Półprzezroczysty czarny (`rgba(0, 0, 0, 0.6)`)
- **Estetyka**: Rozmyte tła (backdrop-filter), neonowe obramowania, runiczne detale (Unicode: Starszy Futhark).
- **Font**: Metamorphous (Google Fonts) z system serif fallback.

## 3. Moduły Aplikacji

### A. Runa Początku (Onboarding)
- Moduł rejestracji przez `/join?game=UUID`.
- Gracz wybiera swoje imię z listy pre-definiowanej przez Admina.
- Opcjonalna zmiana pseudonimu.
- `joined_at` ustawiany w bazie, sesja w `sessionStorage`.
- Tryb deweloperski: `/join?dev=true` — pokazuje wszystkie gry i graczy.

### B. Głos Bogów (Komunikacja)
- System Realtime Chat oparty na Supabase.
- Dwa tryby: **Klan** (wiadomości klanu + komunikaty Bogów) i **Wspólna** (globalne).
- "Głosy Bogów" — komunikaty od Mistrzów Gry (`sender === 'god'`).
- Wsparcie dla obrazów (kompresja client-side, upload do Supabase Storage).
- Wsparcie dla wiadomości audio (TTS, playback przez `<audio>`).

### C. Próby (Gameplay)
- **Questy GPS** — zadania lokalizacyjne z geofencingiem.
- **Questy QR** — skanowanie kodów QR ukrytych w terenie (wielokrotne markery na task).
- **Questy Chase** — gonitwy za poruszającym się markerem (trajectory-based, Haversine).
- **Questy Photo** — upload zdjęć jako dowód wykonania.
- **Questy Logic** — zagadki runiczne, szyfry.
- System tasków sekwencyjnych (zadania odblokowywane po kolei).
- Progress bar dla tasków QR (skanowane markery / całkowite).
- Modal ukończenia questu z punktami i informacją o graczu.

### D. Mapa
- Leaflet z CartoDB Dark tiles.
- Markery: baza, klany, questy, chase (ruchome), QR.
- Pozycje graczy w czasie rzeczywistym (geolocation watch).
- Center-on-location button.
- Pulsing/animated markers dla efektów wizualnych.
- Popup z informacjami o markerze + przycisk skanowania QR.

### E. Sklep Żercy
- Marketplace buffów/klątw/narzędzi.
- Zakupy za punkty klanu ("ogniki").
- Przedmioty zapisywane w `clan_items`.

### F. Profil Gracza
- Karta gracza z klanem, kolorem, ID sesji.
- Zakładka "Klątwy" — aktywne buffy/debuffy klanu.
- Wylogowanie (czyszczenie sessionStorage).

### G. Panel Admina
- URL: `/admin`, hasło: `peachgames2026`.
- Zarządzanie: gry, klany, gracze, questy, taski, markery mapy, chase sesje.
- Podgląd czatu z filtrem klanowym.
- Mapa z pozycjami wszystkich graczy.

## 4. Schemat Bazy Danych (Supabase)

### Tabele
| Tabela | Opis |
|--------|------|
| `games` | Sesje gier (name, description, status, starts_at, ends_at) |
| `klans` | Klany (name, theme_color, points, game_id) |
| `players` | Gracze (name, klan_id, game_id, role, joined_at) |
| `quests` | Definicje questów (title, description, type, reward_points, klan_id, trajectory, qr_secret) |
| `tasks` | Pod-zadania questów (title, description, type, sort_order, reward_points, quest_id) |
| `quest_activations` | Aktywacje questów (klan_id, quest_id, activated_at, completed_at) |
| `quest_completions` | Ukończone questy (klan_id, quest_id, points_awarded, completed_by_player_id, metadata) |
| `task_completions` | Ukończone taski (task_id, quest_activation_id, completed_at, metadata) |
| `messages` | Wiadomości czatu (sender, klan_id, sender_klan_id, content, image_url, audio_url, tts_requested, game_id) |
| `clan_items` | Przedmioty klanu (klan_id, name, type, effect, duration, uses_remaining, active) |
| `player_positions` | Pozycje graczy (player_id, game_id, lat, lng, accuracy, updated_at) |
| `map_markers` | Markery na mapie (title, lat, lng, type, klan_id, quest_id, task_id, is_active, qr_secret) |
| `chase_sessions` | Sesje gonitw (quest_id, klan_id, start_lat, start_lng, bearing, speed_mps, started_at, completed_at) |

### Widoki i Funkcje
- `games_status` — widok aggregated (count graczy, klanów, questów)
- `create_game` — funkcja tworzenia gry z domyślnymi klanami
- `update_player_position` — upsert pozycji gracza
- `get_game_player_positions` — pozycje wszystkich graczy w grze
- `get_chase_position` — aktualna pozycja markera chase
- `reset_game` — reset wszystkich danych gry

## 5. System Sesji

- Sesja w `sessionStorage`: `{ id, name, pseudonym, klanId, klanName, klanColor, gameId }`
- HomeView blokuje dostęp bez sesji
- Admin działa bez sesji gracza
- TabBar ukryty do momentu zalogowania
- Splash screen z logo przy pierwszym ładowaniu (2s animacja)

## 6. Bezpieczeństwo

- Zmienne środowiskowe w `.env.local`.
- RLS (Row Level Security) na Supabase.
- Hasło admina w `VITE_ADMIN_PASSWORD`.
- Sekrety nigdy nie commitowane (secret scanning protection).

## 7. System Questów

### Typy questów
- `gps` — lokalizacyjne
- `qr` — skanowanie QR
- `photo` — upload zdjęcia
- `logic` — zagadki
- `chase` — gonitwy

### Flow questu
1. Quest dostępny → aktywacja → `quest_activations`
2. Taski sekwencyjne (odblokowywane po kolei)
3. QR taski: progress bar (scanned/total markers)
4. Wszystkie taski ukończone → `quest_completions` → punkty
5. Modal z podsumowaniem

### System Chase
- Trajectory (JSON array lat/lng) + speed (m/s) + bearing
- Pozycja liczona client-side co sekundę
- Catch distance: Haversine formula (domyślnie 20m)
- Po złapaniu: `chase_sessions.completed_at` + punkty
