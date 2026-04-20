-- Table for map markers (quests, bases, clan positions)
CREATE TABLE map_markers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  klan_id UUID REFERENCES klans(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('quest', 'base', 'clan_base')),
  title TEXT NOT NULL,
  description TEXT,
  lat FLOAT NOT NULL,
  lng FLOAT NOT NULL,
  icon_url TEXT,
  is_active BOOLEAN DEFAULT true,
  quest_id UUID REFERENCES quests(id) ON DELETE SET NULL,
  reward_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE map_markers ENABLE ROW LEVEL SECURITY;

-- Allow public read/write (game data is not sensitive)
DROP POLICY IF EXISTS "Allow public read/write access on map_markers" ON map_markers;
CREATE POLICY "Allow public read/write access on map_markers" ON map_markers FOR ALL USING (true);

-- Index for faster queries
CREATE INDEX idx_map_markers_game_id ON map_markers(game_id);
CREATE INDEX idx_map_markers_klan_id ON map_markers(klan_id);
CREATE INDEX idx_map_markers_is_active ON map_markers(is_active);

-- Insert some sample markers for testing
-- These will be replaced with actual game data

-- Function to insert sample markers for a game
CREATE OR REPLACE FUNCTION insert_sample_map_markers(p_game_id UUID, p_klan_perun_id UUID, p_klan_weles_id UUID, p_klan_mokosz_id UUID)
RETURNS void AS $$
BEGIN
-- Base marker (visible to all)
  INSERT INTO map_markers (game_id, type, title, description, lat, lng, is_active)
  VALUES (p_game_id, 'base', '🔥 Ognisko / Baza', 'Centrum wydarzenia - Noc Kupały', 50.089864, 19.713925, true);

  -- Clan bases (visible to respective clans)
  INSERT INTO map_markers (game_id, klan_id, type, title, description, lat, lng, is_active)
  VALUES
    (p_game_id, p_klan_perun_id, 'clan_base', '⚡ Baza Peruna', 'Obóz wojowników Peruna', 50.0910, 19.7160, true),
    (p_game_id, p_klan_weles_id, 'clan_base', '🌙 Baza Welesa', 'Kryjówka magów lasu', 50.0885, 19.7120, true),
    (p_game_id, p_klan_mokosz_id, 'clan_base', '🌊 Baza Mokoszy', 'Przyczółek nad wodą', 50.0890, 19.7180, true);

  -- Sample quest markers (visible to clan members)
  INSERT INTO map_markers (game_id, klan_id, type, title, description, lat, lng, reward_points, is_active)
  VALUES
    (p_game_id, p_klan_perun_id, 'quest', '⚡ Piorun Peruna', 'Odnajdź święty kamień przy kapliczce', 50.0920, 19.7200, 100, true),
    (p_game_id, p_klan_weles_id, 'quest', '🌲 Sekta Leśna', 'Tajemne spotkanie w mroku', 50.0860, 19.7100, 150, true),
    (p_game_id, p_klan_mokosz_id, 'quest', '💧 Wodospad Mokoszy', 'Zbierz świętą wodę', 50.0915, 19.7175, 120, true);
END;
$$ LANGUAGE plpgsql;