# Architektura Systemu: PeachGames v2 (Noc Kupały)

Dokument opisuje fundamenty techniczne i założenia projektowe aplikacji kontrolera PWA dla uczestników i organizatorów.

## 1. Stack Techniczny
- **Frontend**: React 19 + Vite + TypeScript.
- **Stylizacja**: Vanilla CSS (Custom Properties) z naciskiem na "Glassmorphism" i mroczną estetykę rave.
- **Backend / Realtime**: Supabase (PostgreSQL, Realtime, Storage, Auth).
- **PWA**: Wsparcie dla instalacji na ekranie głównym (manifest, service workers).

## 2. Design System (Mroczne Słowiaństwo)
- **Kolory**:
    - `--color-perun`: Złoty/Błyskawica (`#D4AF37`)
    - `--color-weles`: Purpura/Noc (`#4B0082`)
    - `--color-mokosz`: Zieleń/Natura (`#2E8B57`)
    - `--color-glass`: Półprzezroczysty czarny (`rgba(0, 0, 0, 0.6)`)
- **Estetyka**: Rozmyte tła (backdrop-filter), neonowe obramowania, runiczne detale (Unicode: Starszy Futhark).

## 3. Moduły Aplikacji
### A. Runa Początku (Onboarding)
- Moduł skanowania QR kodów do przypisania gracza do konkretnego Klanu (Weles, Perun, Mokosz).
- Logika wyboru ścieżki fabularnej.

### B. Głos Bogów (Komunikacja)
- System Realtime Chat oparty na Supabase.
- "Głosy Bogów" – komunikaty od Mistrzów Gry wyświetlane z priorytetem złotym (Perun).
- "Szepty Nocy" – komunikacja wewnątrz klanu.

### C. Próby (Gameplay)
- Zadania GPS (geofencing) sprawdzające lokalizację gracza.
- Zagadki runiczne (tłumaczenie tekstów za pomocą `runes.json`).
- Walka o terytorium (skanowanie punktów kontrolnych).

## 4. Schemat Bazy Danych (Supabase)
- `profiles`: Dane graczy, przypisanie do klanu, punkty.
- `messages`: Historia czatu 'Głos Bogów'.
- `tasks`: Definicje zadań fabularnych.
- `inventory`: Przedmioty zdobyte przez klany.

## 5. Bezpieczeństwo
- Zmienne środowiskowe przechowywane w `.env.local`.
- RLS (Row Level Security) na Supabase ograniczający widoczność wiadomości tylko dla klanów.
