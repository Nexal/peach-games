-- Add qr_secret column for QR code verification
ALTER TABLE quests ADD COLUMN qr_secret TEXT;
