-- Revert: remove sender_klan_name and sender_klan_color as clan info should be derived from klan_id
ALTER TABLE messages
DROP COLUMN IF EXISTS sender_klan_name,
DROP COLUMN IF EXISTS sender_klan_color;