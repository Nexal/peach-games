-- Table for tracking player positions in real-time
CREATE TABLE player_positions (
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  lat FLOAT NOT NULL,
  lng FLOAT NOT NULL,
  accuracy FLOAT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (player_id, game_id)
);

-- Enable RLS
ALTER TABLE player_positions ENABLE ROW LEVEL SECURITY;

-- Policy: players can update their own position, admins can read all
DROP POLICY IF EXISTS "Players can update own position" ON player_positions;
CREATE POLICY "Players can update own position" ON player_positions
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read player positions" ON player_positions;
CREATE POLICY "Anyone can read player positions" ON player_positions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert player positions" ON player_positions;
CREATE POLICY "Anyone can insert player positions" ON player_positions
  FOR INSERT WITH CHECK (true);

-- Function to update or insert player position
CREATE OR REPLACE FUNCTION update_player_position(
  p_player_id UUID,
  p_game_id UUID,
  p_lat FLOAT,
  p_lng FLOAT,
  p_accuracy FLOAT DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO player_positions (player_id, game_id, lat, lng, accuracy, updated_at)
  VALUES (p_player_id, p_game_id, p_lat, p_lng, p_accuracy, NOW())
  ON CONFLICT (player_id, game_id)
  DO UPDATE SET
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    accuracy = EXCLUDED.accuracy,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_player_positions_game ON player_positions(game_id);
CREATE INDEX IF NOT EXISTS idx_player_positions_updated ON player_positions(updated_at DESC);

-- Function to get all player positions for a game (with player names)
CREATE OR REPLACE FUNCTION get_game_player_positions(p_game_id UUID)
RETURNS TABLE (
  player_id UUID,
  player_name TEXT,
  klan_id UUID,
  klan_name TEXT,
  lat FLOAT,
  lng FLOAT,
  accuracy FLOAT,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as player_id,
    p.name as player_name,
    p.klan_id,
    k.name as klan_name,
    pp.lat,
    pp.lng,
    pp.accuracy,
    pp.updated_at
  FROM player_positions pp
  JOIN players p ON p.id = pp.player_id
  LEFT JOIN klans k ON k.id = p.klan_id
  WHERE pp.game_id = p_game_id
    AND pp.updated_at > NOW() - INTERVAL '5 minutes'; -- Only show recent positions
END;
$$ LANGUAGE plpgsql;