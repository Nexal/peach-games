-- Chase sessions for bike/horse chase quests
-- Marker moves at constant speed from start position, players must catch it

CREATE TABLE chase_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID REFERENCES quests(id) ON DELETE CASCADE,
  klan_id UUID REFERENCES klans(id) ON DELETE CASCADE,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  start_lat DOUBLE PRECISION NOT NULL,
  start_lng DOUBLE PRECISION NOT NULL,
  bearing DOUBLE PRECISION NOT NULL, -- direction in degrees (0-360)
  speed_mps DOUBLE PRECISION NOT NULL DEFAULT 2.0, -- meters per second
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by_player_id UUID REFERENCES players(id),
  catch_distance_m INTEGER DEFAULT 20, -- distance to catch in meters
  reward_points INTEGER DEFAULT 100
);

ALTER TABLE chase_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read/write access on chase_sessions" ON chase_sessions FOR ALL USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE chase_sessions;
