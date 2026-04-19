-- Add sender clan info to messages for displaying clan name/color in global chat
ALTER TABLE messages
ADD COLUMN sender_klan_name TEXT,
ADD COLUMN sender_klan_color TEXT;