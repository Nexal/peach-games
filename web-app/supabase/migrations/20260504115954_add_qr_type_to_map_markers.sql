ALTER TABLE map_markers DROP CONSTRAINT IF EXISTS map_markers_type_check;
ALTER TABLE map_markers ADD CONSTRAINT map_markers_type_check
  CHECK (type = ANY (ARRAY['quest'::text, 'base'::text, 'clan_base'::text, 'chase'::text, 'qr'::text]));