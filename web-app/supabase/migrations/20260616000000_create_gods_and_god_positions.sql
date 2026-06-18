-- Create gods table
CREATE TABLE gods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  klan_id UUID REFERENCES klans(id),
  avatar_url TEXT,
  voice_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add god_id to messages table
ALTER TABLE messages ADD COLUMN god_id UUID REFERENCES gods(id);

-- Create god_positions table
CREATE TABLE god_positions (
  god_id UUID PRIMARY KEY REFERENCES gods(id),
  game_id UUID NOT NULL REFERENCES games(id),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable realtime on god_positions
ALTER PUBLICATION supabase_realtime ADD TABLE god_positions;
