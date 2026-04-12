---
name: peach-games-run-debug
description: "Służy do analizowania i naprawiania błędów TypeScript oraz ostrzeżeń Vite podczas gdy projekt 'nie działa'. Skanuje błędy i instruje jak je naprawić."
---

# Uruchamianie i Debugowanie PWA

W ekosystemie Vite z ostrym TypeScriptem aplikacja może wyrzucać 'białe ekrany' błędu z racji niewykorzystanych zaimportowanych pakietów lub złych reguł Lintingu. Gdy deweloper poprosi o "sprawdzenie dlaczego nie działa" lub "naprawienie zablokowanego środowiska", Agent natychmiast powinien postępować według tych instrukcji:

1. **Test Próbny Budowania (Skanowanie Błędów TS):**
   Użyj wbudowanego skryptu tsc, aby wyłapać uchybienia składniowe i bezużyteczne importy:
   `npm run build`
   *(Spowoduje to uruchomienie `tsc -b && vite build` i jasno wskaże plik oraz linijkę w logach terminala, która zgłasza krytyczny błąd blokujący aplikację - typowe w rygorystycznym Vite v5+).*

2. **Automatyczna Naprawa Wskazań:**
   Popraw wyłapane przez linter niedoróbki w konkretnych plikach (np. usunięcie zestarzałego `import React from 'react'`, którego nowszy React już nie wymaga, czy poprawa formatu importowania samych typów poprzez użycie prefiksu `import type`).

3. **Restarty Serwera lub Subagenci:**
   Po zlikwidowaniu problemów TS z kompilatora:
   Serwer `npm run dev` na ogół ładuje zawartość w ułamek sekundy poprawnie. Jeśli logi serwera milczą, a aplikacja rzekomo nie działa dla Użytkownika w przeglądarce, agent rozważy puszczenie narzędzia *Browser Subagent* aby zrobić zrzut ekranu okna na porcie `5173`.
