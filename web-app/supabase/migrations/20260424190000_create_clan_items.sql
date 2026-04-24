-- Clan items: curses, buffs, debuffs purchased from Sklep Żercy

CREATE TABLE clan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  klan_id UUID REFERENCES klans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'curse', 'buff', 'debuff'
  target_type TEXT NOT NULL, -- 'player', 'klan', 'global'
  effect JSONB NOT NULL, -- e.g. {"stealth": 30, "speed_modifier": -0.5}
  duration_seconds INTEGER, -- null = instant/permanent
  cooldown_seconds INTEGER DEFAULT 0,
  uses_remaining INTEGER, -- null = unlimited
  active BOOLEAN DEFAULT false,
  activated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE clan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read/write access on clan_items" ON clan_items FOR ALL USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE clan_items;
