---
name: peach-games-read-status
description: Skrypt do odczytywania aktualnego stanu prac z tablicy Trello "PeachGames v2", przywracający szybko kontekst LLM.
---

## Jak używać tego skilla

Zawsze korzystaj z tego skilla na początku nowej sesji zadaniowej, aby przypomnieć sobie obecny status projektu.

1. Tablica Trello: `boardId: 69c9457cae356980d14b74e4` (PeachGames v2).
2. Wywołaj narzędzie `mcp_trello_get_cards_by_list_id` dla list (zazwyczaj interesują Cię zadania z "In Progress" oraz "To Do").
3. Przeczytaj uzyskane dane (nazwy zadań i ich opisy), aby zrozumieć, co zostało dotychczas wypracowane, a z czym należy ruszyć do przodu w rozmowie z użytkownikiem.

**Szybkie kody ID list:**
- 📋 To Do: `69c94b36d85e161ae0b8c7e1`
- 🔄 In Progress: `69c94b3ebba4e5f0191712ca`
- ✅ Done: `69c94b412fdb1eea886ff1ba`
