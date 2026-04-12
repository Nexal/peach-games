---
name: peach-games-themes
description: Wczytuje propozycje motywów z Notion dla PeachGames v2 i generuje analizy, porównania lub prompty do obrazów.
---

## Notion Page ID
`332152e3-d932-8127-b60b-f36a227a8dfc`

## Workflow

1. Użyj `notion_notion-fetch` z page ID do pobrania danych z Notion
2. Wyodrębnij wybrane informacje z pobranych danych
3. Na podstawie żądania użytkownika wygeneruj odpowiednią odpowiedź

## Dostepne akcje

- **analizuj [numer]** — szczegółowa analiza wybranego motywu (1-6)
- **porownaj [a] vs [b]** — porównanie dwóch motywów
- **prompty [numer] [kategoria]** — generowanie promptów (kategorie: postacie, dekoracje, gra, rave, zaproszenia)
- **rekomendacja** — rekomendacja najlepszego motywu
- **lista** — lista wszystkich dostępnych motywów

## Jak uzywac

Po załadowaniu skillu, użytkownik podaje komendę. Najpierw pobierz dane z Notion, potem przetwórz zgodnie z żądaniem.
