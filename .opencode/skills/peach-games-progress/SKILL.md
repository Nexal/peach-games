---
name: peach-games-progress
description: Wskazuje tablicę Trello do trackowania postępu prac dla PeachGames v2.
---

## Tablica Trello

**Board ID:** `69c9457cae356980d14b74e4`
**URL:** https://trello.com/b/DhkXxYDA/peachgames-v2
**Nazwa:** PeachGames v2

## Uzycie

Przed wykonaniem operacji na Trello (dodawanie kart, list, itp.), ustaw aktywną tablicę:

1. Użyj `trello_set_active_board` z `boardId: 69c9457cae356980d14b74e4`
2. Lub podawaj `boardId` w każdym wywołaniu Trello API

## Dostepne operacje Trello

- `trello_get_lists` — pobierz listy na tablicy
- `trello_get_cards_by_list_id` — pobierz karty z listy
- `trello_add_card_to_list` — dodaj kartę do listy
- `trello_move_card` — przesuń kartę między listami
- `trello_update_card_details` — zaktualizuj kartę
- `trello_archive_card` — archiwizuj kartę
- `trello_get_my_cards` — karty przypisane do mnie
- `trello_get_recent_activity` — ostatnia aktywność
