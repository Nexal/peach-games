INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('player-avatars', 'player-avatars', true, 10485760, '{image/jpeg,image/png,image/webp}')
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can read player avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'player-avatars');

CREATE POLICY "Anyone can insert player avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'player-avatars');

CREATE POLICY "Anyone can update player avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'player-avatars');
