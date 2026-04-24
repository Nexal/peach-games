---
name: peach-games-run-debug
description: "Służy do analizowania i naprawiania błędów TypeScript oraz ostrzeżeń Vite podczas gdy projekt 'nie działa'. Skanuje błędy i instruje jak je naprawić."
---

# Uruchamianie i Debugowanie PWA

W ekosystemie Vite z ostrym TypeScriptem aplikacja może wyrzucać 'białe ekrany' błędu z racji niewykorzystanych zaimportowanych pakietów lub złych reguł Lintingu. Gdy deweloper poprosi o "sprawdzenie dlaczego nie działa" lub "naprawienie zablokowanego środowiska", Agent natychmiast powinien postępować według tych instrukcji:

## 1. Test Budowania (Skanowanie Błędów TS)

Uruchom build aby wykryć błędy:
```bash
cd web-app && npm run build
```
*(Wskaże plik i linijkę z błędem blokującym aplikację)*

## 2. Automatyczna Naprawa

Popraw niedoróbki w plikach:
- Usuń zbędne importy
- Popraw `import type` gdzie wymagane
- Napraw błędy składniowe

## 3. Zarządzanie Serwerem

Uruchom serwer z `--host` (dostępny w sieci lokalnej):
```bash
cd web-app && npm run dev -- --host
```

Zatrzymaj serwer:
```bash
pkill -f "vite.*--host"
```

Sprawdź status:
```bash
pgrep -f "vite.*--host" > /dev/null && echo "RUNNING" || echo "STOPPED"
```

## 4. Restart Serwera

Po naprawie błędów:
```bash
pkill -f "vite.*--host"; cd web-app && npm run dev -- --host &
```

Serwer `npm run dev` automatycznie przeładowuje zawartość. Jeśli logi milczą, sprawdź czy serwer działa przez `status`.

## 5. Debug Mobile

Gdy aplikacja "nie działa na telefonie":
1. Sprawdź czy serwer ma flagę `--host`
2. Upewnij się że telefon jest w tej samej sieci
3. Użyj tunelu HTTPS jeśli geolokalizacja nie działa:
   ```bash
   npx cloudflared tunnel --url http://localhost:5173
   ```
