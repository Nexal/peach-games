---
name: peach-games-supabase
description: "Instrukcja wymuszająca na agencie AI samodzielne zarządzanie tabelami, migracjami i pushowaniem zmian przez Supabase CLI, z pominięciem interwencji programisty."
---

# Supabase CLI na WSL (Brak Dockera)

Projekt `PeachGames` wspiera się bazą Supabase, jednak nasza platforma developerska WSL w tym konkretnym środowisku działa bez włączonego silnika Docker (zwraca błąd o braku integracji WSL z Docker Desktop / daemon error). 

**W ZWIĄZKU Z TYM ZABRONIONE jest używanie absolutnie typowej komendy `npx supabase start`!**

## Auto-Execution Workflow (Zdalna Baza)

To środowisko z zasady omija lokalnego Dockera. Agent ma obowiązek postępować według poniższych kroków **samodzielnie**, wykorzystując odpowiednie narzędzia terminala CLI:

1. **Weryfikacja Połączenia:**
   Upewnij się, że projekt jest przypięty, wykonując:
   `npx supabase projects list` (lub sprawdź plik konfiguracyjny Supabase).

2. **Automatyczne Tworzenie Migracji (SQL):**
   Jeśli wymagana jest nowa tabela lub zmiana schematu:
   Zainicjuj plik: `npx supabase migration new nazwa_migracji`
   Agent musi użyć narzędzia edycji plików i zakodować strukturę SQL we właśnie utworzonym przez polecenie pliku (lokalizacja: `supabase/migrations/<Timestamp>_nazwa_migracji.sql`).

3. **Wdrożenie Bez Pytania:**
   Po zapisaniu SQL, natychmiast wrzuć zmiany na chmurę poleceniem:
   `npx supabase db push`
   (Jeżeli zapyta o input 'Y/n', agent ma obowiązek posłużyć się komendą input command i wstrzyknąć Y).

4. **Aktualizacja Typów (Bezwarunkowa):**
   Od razu po skutecznym `db push`, agent MUSI po cichu zaktualizować interfejsy dla kodu frontendowego, wywołując:
   `npx supabase gen types typescript --linked > src/types/database.types.ts`

Nie instruuj użytkownika by to zrobił. Zrób to dla niego z poziomu terminala podając na koniec tylko wyniki wykonanej pracy.
