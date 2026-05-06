CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('qr', 'gps', 'photo', 'logic', 'chase')),
  reward_points INTEGER DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(quest_id, sort_order)
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'map_markers' AND column_name = 'task_id') THEN
    ALTER TABLE map_markers ADD COLUMN task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;
  END IF;
END $$;

DROP TABLE IF EXISTS quest_marker_scans;

CREATE TABLE IF NOT EXISTS task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_activation_id UUID NOT NULL REFERENCES quest_activations(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT now(),
  completed_by_player_id UUID REFERENCES players(id),
  metadata JSONB,
  UNIQUE(quest_activation_id, task_id)
);

ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions DISABLE ROW LEVEL SECURITY;