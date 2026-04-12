-- Utworzenie głównych tabel

CREATE TABLE klans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  theme_color TEXT NOT NULL,
  points INTEGER DEFAULT 0
);

CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  klan_id UUID REFERENCES klans(id),
  role TEXT DEFAULT 'member', -- np. member, chief
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- gps, qr, photo, logic
  reward_points INTEGER DEFAULT 0
);

CREATE TABLE quest_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  klan_id UUID REFERENCES klans(id),
  quest_id UUID REFERENCES quests(id),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB -- np. dodane zdjecia czy kod qr
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  klan_id UUID REFERENCES klans(id), -- NULL = globalna
  sender VARCHAR(50) NOT NULL, -- np. 'god', 'klan'
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  tts_requested BOOLEAN DEFAULT false
);

-- Włączenie Realtime dla subskrypcji
ALTER PUBLICATION supabase_realtime ADD TABLE klans;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE quests;
ALTER PUBLICATION supabase_realtime ADD TABLE quest_completions;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Proste polisy RLS umożliwiające na ten moment odczyt i zapis dla wszystkich
ALTER TABLE klans ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read/write access on klans" ON klans FOR ALL USING (true);
CREATE POLICY "Allow public read/write access on players" ON players FOR ALL USING (true);
CREATE POLICY "Allow public read/write access on quests" ON quests FOR ALL USING (true);
CREATE POLICY "Allow public read/write access on quest_completions" ON quest_completions FOR ALL USING (true);
CREATE POLICY "Allow public read/write access on messages" ON messages FOR ALL USING (true);
