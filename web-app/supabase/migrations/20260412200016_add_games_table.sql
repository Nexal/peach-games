-- Tabela gier/rozgrywek - pozwala na wiele niezależnych wydarzeń
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'finished')),
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dodaj game_id do istniejących tabel
ALTER TABLE klans ADD COLUMN game_id UUID REFERENCES games(id);
ALTER TABLE players ADD COLUMN game_id UUID REFERENCES games(id);
ALTER TABLE quests ADD COLUMN game_id UUID REFERENCES games(id);
ALTER TABLE quest_completions ADD COLUMN game_id UUID REFERENCES games(id);
ALTER TABLE messages ADD COLUMN game_id UUID REFERENCES games(id);

-- Funkcja do tworzenia nowej gry z klątami
CREATE OR REPLACE FUNCTION create_game(game_name TEXT, game_description TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  new_game_id UUID;
BEGIN
  INSERT INTO games (name, description, status)
  VALUES (game_name, game_description, 'draft')
  RETURNING id INTO new_game_id;
  
  -- Utwórz 3 klany
  INSERT INTO klans (name, theme_color, points, game_id) VALUES
    ('Klan Peruna', '#FFD700', 0, new_game_id),
    ('Klan Welesa', '#8A2BE2', 0, new_game_id),
    ('Klan Mokoszy', '#2E8B57', 0, new_game_id);
  
  RETURN new_game_id;
END;
$$ LANGUAGE plpgsql;

-- Widok statusu gier
CREATE OR REPLACE VIEW games_status AS
SELECT 
  id,
  name,
  status,
  starts_at,
  ends_at,
  created_at,
  (SELECT COUNT(*) FROM klans WHERE klans.game_id = games.id) as klany_count,
  (SELECT COUNT(*) FROM players WHERE players.game_id = games.id) as gracze_count,
  (SELECT COUNT(*) FROM quest_completions WHERE quest_completions.game_id = games.id) as ukonczone_questy
FROM games
ORDER BY created_at DESC;

-- Zaktualizuj polisę RLS dla games
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read/write access on games" ON games;
CREATE POLICY "Allow public read/write access on games" ON games FOR ALL USING (true);

-- Zaktualizuj klany żeby miały RLS po dodaniu kolumny
DROP POLICY IF EXISTS "Allow public read/write access on klans" ON klans;
CREATE POLICY "Allow public read/write access on klans" ON klans FOR ALL USING (true);
