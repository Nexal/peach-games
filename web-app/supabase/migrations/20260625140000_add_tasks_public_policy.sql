-- Allow public read/write on tasks (needed by admin panel marker editing)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read/write access on tasks" ON tasks;
CREATE POLICY "Allow public read/write access on tasks" ON tasks FOR ALL USING (true);
