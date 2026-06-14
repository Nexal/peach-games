-- Włączenie Realtime dla tabeli games,
-- aby gracze otrzymywali zmiany statusu gry (draft -> active -> finished) na żywo.
ALTER PUBLICATION supabase_realtime ADD TABLE games;
