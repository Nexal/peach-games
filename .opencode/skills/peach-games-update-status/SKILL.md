---
name: peach-games-update-status
description: Skrypt do bieżącej aktualizacji stanu zadania na tablicy Trello po zakończeniu bloku pracy, w celu zsynchronizowania statusów postępu zespołu.
---

## Jak używać tego skilla

Kiedy jako PM ukończysz omawiany z użytkownikiem etap (np. stwożycie listę zakupów, wygenerujecie opisy motywów lub założycie nowe moduły), użyj skilla do odwzorowania tego na żywo.

1. Tablica Trello: `boardId: 69c9457cae356980d14b74e4` (PeachGames v2).
2. Odszukaj powiązaną kartę w wynikowym "In Progress" / "To Do" (lub utwórz nową w razie braku z wykorzystaniem `mcp_trello_add_card_to_list` i `listId` dla "In Progress").
3. Jeśli uzgodniona praca jest ukończona, przesuń właściwą kartę do listy "Done" przy pomocy `mcp_trello_move_card` podając uaktualnione docelowe `listId`.
4. Możesz też uaktualnić sam opis karty (`mcp_trello_update_card_details`) np. o dodatkowy postęp czy notatki z wykonanych zadań.

**Szybkie kody ID list:**
- 📋 To Do: `69c94b36d85e161ae0b8c7e1`
- 🔄 In Progress: `69c94b3ebba4e5f0191712ca`
- ✅ Done: `69c94b412fdb1eea886ff1ba`
