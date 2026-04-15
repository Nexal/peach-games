-- Add audio_url column for TTS messages
ALTER TABLE messages ADD COLUMN audio_url TEXT;