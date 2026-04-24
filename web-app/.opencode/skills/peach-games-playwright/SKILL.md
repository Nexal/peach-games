---
name: peach-games-playwright
description: "Skill do manualnego testowania aplikacji PeachGames używając Playwright MCP. Pozwala na interakcję z przeglądarką bez opuszczania terminala."
---

# Playwright MCP dla PeachGames

Masz dostęp do Playwright MCP (narzędzia `playwright_browser_*`). Możesz testować aplikację bezpośrednio z terminala bez ręcznego klikania w przeglądarce.

## Kiedy używać Playwright MCP

**Użyj po implementacji:**
- Nowego komponentu UI
- Nowego widoku (View)
- Zmiany w stylach CSS
- Nowej funkcjonalności JavaScript

**Pozwala na:**
- Otwieranie stron w prawdziwej przeglądarce
- Robienie screenshotów
- Kliknięcia i interakcję z elementami
- Sprawdzanie console logów
- Podgląd network requestów

## Typowe workflow testowania

### 1. Otwórz aplikację
```
playwright_browser_navigate url="http://localhost:5173"
```

### 2. Sprawdź snapshot strony (accessibility tree)
```
playwright_browser_snapshot
```

### 3. Zrób screenshot jeśli potrzebujesz wizualnej weryfikacji
```
playwright_browser_take_screenshot filename="test.png" type="png"
```

### 4. Kliknij element (np. tab "Mapa")
```
playwright_browser_snapshot  # najpierw zobacz strukture
# potem np:
playwright_browser_click element="Mapa" ref="..."
```

### 5. Sprawdź console czy nie ma błędów
```
playwright_browser_console_messages level="error"
```

## Przykładowe scenariusze

### Test zakładki Mapa
1. `playwright_browser_navigate url="http://localhost:5173"`
2. Kliknij tab "Mapa"
3. `playwright_browser_snapshot` — sprawdź czy mapa się załadowała
4. `playwright_browser_console_messages level="error"` — sprawdź błędy

### Test formularza
1. Otwórz stronę z formularzem
2. `playwright_browser_fill_form fields=[...]`
3. `playwright_browser_click` na submit
4. Sprawdź feedback

## Użyteczne komendy

| Komenda | Zastosowanie |
|---------|-------------|
| `navigate` | Otwórz URL |
| `snapshot` | Zobacz strukturę strony |
| `screenshot` | Zrób zdjęcie strony |
| `click` | Kliknij element |
| `fill_form` | Wypełnij formularz |
| `console_messages` | Sprawdź błędy w konsoli |
| `wait_for` | Czekaj na tekst/element |

## Ważne

1. **Start dev server** jeśli nie działa:
   ```bash
   cd web-app && npm run dev -- --host
   ```

2. Na telefonie użyj IP sieci zamiast `localhost`:
   ```
   playwright_browser_navigate url="http://192.168.x.x:5173"
   ```

3. Po zakończeniu testów zamknij przeglądarzę:
   ```
   playwright_browser_close
   ```