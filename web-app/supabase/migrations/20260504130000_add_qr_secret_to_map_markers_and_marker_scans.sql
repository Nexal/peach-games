-- Add qr_secret only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'map_markers' AND column_name = 'qr_secret') THEN
    ALTER TABLE map_markers ADD COLUMN qr_secret TEXT;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS quest_marker_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_activation_id UUID NOT NULL REFERENCES quest_activations(id) ON DELETE CASCADE,
  map_marker_id UUID NOT NULL REFERENCES map_markers(id) ON DELETE CASCADE,
  scanned_at TIMESTAMPTZ DEFAULT now(),
  scanned_by_player_id UUID REFERENCES players(id),
  UNIQUE(quest_activation_id, map_marker_id)
);

ALTER TABLE quest_marker_scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view marker scans" ON quest_marker_scans;
DROP POLICY IF EXISTS "Anyone can insert marker scans" ON quest_marker_scans;

CREATE POLICY "Anyone can view marker scans" ON quest_marker_scans FOR SELECT USING (true);
CREATE POLICY "Anyone can insert marker scans" ON quest_marker_scans FOR INSERT WITH CHECK (true);