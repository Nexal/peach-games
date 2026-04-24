---
name: peach-games-playwright
description: "Skill do manualnego testowania aplikacji PeachGames używając Playwright MCP. Testuj bez snapshots - operuj na drzewie DOM."
---

# Playwright MCP dla PeachGames

Masz dostęp do Playwright MCP. Możesz testować aplikację bezpośrednio z terminala.

## Zasada: Unikaj snapshots - operuj na DOM

### NIE używaj `playwright_browser_snapshot` często
Snapshot jest kosztowną operacją. Zamiast tego:

1. **Klikaj przez `playwright_browser_click`** bezpośrednio używając `element` (label/text) lub `ref` z poprzedniego snapshotu
2. **Sprawdzaj stan przez `playwright_browser_evaluate`** - szybciej niż snapshot
3. **Network requesty** - `playwright_browser_network_requests` zamiast obserwować UI
4. **Console errors** - `playwright_browser_console_messages` - rzadko bo raczej nie ma błędów

### Tylko snapshot gdy:
- Przeglądarka jest "zawieszona" i nie wiesz co jest na stronie
- Debuggujesz problem z UI
- Screenshot nie wystarczy

## Typowe workflow (bez snapshotów)

### 1. Nawiguj
```
playwright_browser_navigate url="http://localhost:5173"
```

### 2. Klikaj bezpośrednio przez tekst/label
```
playwright_browser_click element="Mapa"  # używa getByRole
playwright_browser_click element="Profil"
```

### 3. Sprawdź stan JS
```
playwright_browser_evaluate function="() => document.title"
playwright_browser_evaluate function="() => document.querySelector('.view--map') !== null"
```

### 4. Wypełniaj formy
```
playwright_browser_fill_form fields=[{"name": "username", "type": "textbox", "value": "test"}]
```

### 5. Debug: Screenshot + Console
```
playwright_browser_take_screenshot filename="test.png"
playwright_browser_console_messages level="error"
```

## Użyteczne komendy (bez snapshotu)

| Komenda | Kiedy używać |
|---------|--------------|
| `navigate` | Otwórz URL |
| `click` | Kliknij przez element name lub ref |
| `fill_form` | Wypełnij formularz |
| `type` | Wpisz tekst w element |
| `evaluate` | Sprawdź stan JS/DOM |
| `wait_for` | Czekaj na tekst/element |
| `console_messages` | Sprawdź błędy (rzadko) |
| `network_requests` | Debug requestów (rzadko) |
| `snapshot` | TYLKO gdy nie wiesz co jest na stronie |
| `screenshot` | Tylko wizualna weryfikacja |

## Przykładowe scenariusze

### Kliknięcie zakładki i sprawdzenie czy działa
```
playwright_browser_navigate url="http://localhost:5173"
playwright_browser_click element="Mapa"
playwright_browser_evaluate function="() => document.querySelector('.view--map') !== null"
```

### Test formularza login
```
playwright_browser_navigate url="http://localhost:5173/join?dev=true"
playwright_browser_click element="q"  # game name
playwright_browser_evaluate function="() => document.querySelector('input')?.value"
playwright_browser_fill_form fields=[{"name": "", "type": "textbox", "ref": "e78", "value": "Rado"}]
playwright_browser_click element="Dołącz do gry"
playwright_browser_evaluate function="() => window.location.pathname"
```

### Sprawdzenie błędów JS
```
playwright_browser_console_messages level="error"
```

## Ważne

1. **Dev server:**
   ```bash
   cd web-app && npm run dev -- --host
   ```

2. **Mobile testing** - użyj IP sieci zamiast localhost:
   ```
   playwright_browser_navigate url="http://192.168.x.x:5173"
   ```

3. **Po testach zamknij:**
   ```
   playwright_browser_close
   ```

## Referencja ref

Ref to identyfikator elementu z snapshotu (np. `e14`). Używaj ichgdy znasz ref z poprzedniego snapshotu. Nowe elementy - klikaj przez `element` ( tekst/label).
