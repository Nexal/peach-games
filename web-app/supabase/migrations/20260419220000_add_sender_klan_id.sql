-- Add sender_klan_id to track which clan the sender belongs to (for coloring in global chat)
ALTER TABLE messages
ADD COLUMN sender_klan_id UUID REFERENCES klans(id);