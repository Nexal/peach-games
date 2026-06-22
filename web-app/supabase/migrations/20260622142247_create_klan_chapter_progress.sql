CREATE TABLE IF NOT EXISTS klan_chapter_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES story_chapters(id) ON DELETE CASCADE,
  klan_id UUID NOT NULL REFERENCES klans(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT false,
  activated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(chapter_id, klan_id, game_id)
);

ALTER TABLE klan_chapter_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on klan_chapter_progress" ON klan_chapter_progress FOR ALL USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE klan_chapter_progress;
