ALTER TABLE quest_activations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow delete for quest_activations" ON quest_activations;
CREATE POLICY "Allow delete for quest_activations" ON quest_activations FOR DELETE USING (true);
