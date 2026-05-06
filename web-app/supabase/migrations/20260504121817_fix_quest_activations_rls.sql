DROP POLICY IF EXISTS "Users can view own clan activations" ON quest_activations;
DROP POLICY IF EXISTS "Users can insert own clan activations" ON quest_activations;
DROP POLICY IF EXISTS "Users can update own clan activations" ON quest_activations;

ALTER TABLE quest_activations DISABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view quest activations" ON quest_activations FOR SELECT USING (true);
CREATE POLICY "Anyone can insert quest activations" ON quest_activations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update quest activations" ON quest_activations FOR UPDATE USING (true);