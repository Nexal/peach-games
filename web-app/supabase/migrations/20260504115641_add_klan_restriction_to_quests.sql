ALTER TABLE quests ADD COLUMN klan_id UUID REFERENCES klans(id) ON DELETE SET NULL;

COMMENT ON COLUMN quests.klan_id IS 'If set, only this clan can access the quest. NULL = all clans have access.';