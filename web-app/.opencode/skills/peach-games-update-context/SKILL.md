---
name: peach-games-update-context
description: Aktualizuje plik kontekstowy projektu PeachGames v2 po zakończeniu bloku pracy, aby zsynchronizować wiedzę o projekcie między sesjami.
---

## Kiedy używać

Po zakończeniu istotnego bloku pracy (np. zakończenie taska, refaktoring, nowe odkrycie, zmiana architektury), zapisz aktualny stan do pliku kontekstowego.

## Ścieżka pliku

```
/home/nexal/peach-games/web-app/.opencode/peach-games-context.md
```

## Co aktualizować

- **Discoveries / Gotchas** — nowe odkrycia techniczne
- **Kluczowe pliki** — nowe pliki lub zmiany w strukturze
- **Session system** — zmiany w logice sesji
- **Next steps** — ukończone taski przenieś do "Accomplished", nowe dodaj do "Next steps"
- **Design language** — nowe kolory, style
- **Admin panel** — nowe funkcje admin panelu

## Jak aktualizować

1. Użyj narzędzia `Read` aby wczytać obecny plik kontekstowy
2. Użyj narzędzia `Edit` aby zaktualizować odpowiednie sekcje
3. Zachowaj strukturę i formatowanie pliku
4. Zaktualizuj datę "Last updated" na górze pliku

## Ważne

- Plik kontekstowy NIE zawiera informacji wrażliwych (secretów, haseł)
- Jeśli dodałeś nowe sekrety, dodaj je do sekcji "Secrets (local only — never commit)"
- Zawsze dawaj znać użytkownikowi co zostało zaktualizowane w kontekście
