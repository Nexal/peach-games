-- Photo/Video submissions for quest tasks with admin approval workflow

-- 1. Create the submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_activation_id UUID NOT NULL REFERENCES quest_activations(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  klan_id UUID NOT NULL REFERENCES klans(id),
  player_id UUID REFERENCES players(id),
  media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),
  media_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_comment TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT
);

COMMENT ON TABLE submissions IS 'Photo/video evidence submitted by players for photo-type tasks, pending admin review';

-- 2. Enable RLS (but no restrictive policies — same pattern as task_completions)
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions DISABLE ROW LEVEL SECURITY;

-- 3. Create storage bucket for quest submissions
INSERT INTO storage.buckets (id, name, public)
VALUES ('quest-submissions', 'quest-submissions', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage policies — open access (same as chat-images)
-- Allow anyone to upload
CREATE POLICY "Allow anyone to upload quest submissions"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'quest-submissions');

-- Allow anyone to read
CREATE POLICY "Allow anyone to read quest submissions"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'quest-submissions');

-- Allow anyone to update (for overwrites)
CREATE POLICY "Allow anyone to update quest submissions"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'quest-submissions');

-- Allow anyone to delete
CREATE POLICY "Allow anyone to delete quest submissions"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'quest-submissions');

-- 5. Add 'video' type to tasks check constraint (if not already present)
-- The constraint already includes 'photo', but we need to ensure 'video' tasks can also exist
-- Actually, photo tasks can accept both photo and video submissions, so no schema change needed here.
