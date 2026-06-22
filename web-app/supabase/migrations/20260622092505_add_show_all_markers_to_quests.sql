ALTER TABLE quests ADD COLUMN IF NOT EXISTS show_all_markers BOOLEAN DEFAULT false;

COMMENT ON COLUMN quests.show_all_markers IS 'When true, all photo/qr markers for this quest are visible after activation (not just current task)';
