-- Add 'photo' type to map_markers constraint
ALTER TABLE map_markers DROP CONSTRAINT IF EXISTS map_markers_type_check;
ALTER TABLE map_markers ADD CONSTRAINT map_markers_type_check
  CHECK (type IN ('quest', 'base', 'clan_base', 'chase', 'qr', 'photo', 'text'));
