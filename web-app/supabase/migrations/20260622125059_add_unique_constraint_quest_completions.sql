ALTER TABLE quest_completions ADD CONSTRAINT quest_completions_quest_id_klan_id_key UNIQUE (quest_id, klan_id);
