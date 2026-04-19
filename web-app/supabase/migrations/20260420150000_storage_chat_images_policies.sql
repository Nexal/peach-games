-- Allow public read access to chat-images bucket
CREATE POLICY "Public read access on chat-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-images');

-- Allow public insert to chat-images (for anonymous uploads)
CREATE POLICY "Public insert to chat-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-images');

-- Allow public update on chat-images
CREATE POLICY "Public update on chat-images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'chat-images')
WITH CHECK (bucket_id = 'chat-images');

-- Allow public delete on chat-images
CREATE POLICY "Public delete on chat-images"
ON storage.objects FOR DELETE
USING (bucket_id = 'chat-images');
