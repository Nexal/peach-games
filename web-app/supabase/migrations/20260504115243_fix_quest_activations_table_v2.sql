-- Recreate quest_activations table (replaces failed previous attempt)
DROP TABLE IF EXISTS quest_activations;

CREATE TABLE quest_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  klan_id UUID NOT NULL REFERENCES klans(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  activated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  completed_by_player_id UUID REFERENCES players(id),
  UNIQUE(quest_id, klan_id)
);

ALTER TABLE quest_activations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clan activations"
  ON quest_activations FOR SELECT
  USING (klan_id IN (SELECT klan_id FROM players WHERE id = auth.uid()));

CREATE POLICY "Users can insert own clan activations"
  ON quest_activations FOR INSERT
  WITH CHECK (klan_id IN (SELECT klan_id FROM players WHERE id = auth.uid()));

CREATE POLICY "Users can update own clan activations"
  ON quest_activations FOR UPDATE
  USING (klan_id IN (SELECT klan_id FROM players WHERE id = auth.uid()));

COMMENT ON TABLE quest_activations IS 'Tracks which quests are activated by which clan in a game';