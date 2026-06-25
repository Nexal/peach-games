-- Restore Wyprawa Gońców to original photo quest
DO $$
DECLARE
  target_quest_id UUID;
BEGIN
  SELECT id INTO target_quest_id FROM quests
    WHERE title = 'Wyprawa Gońców' AND game_id = 'ef910ea9-4fec-4ace-9ec8-8842a5674684';

  IF target_quest_id IS NULL THEN RETURN; END IF;

  -- Remove chase task and its marker
  DELETE FROM map_markers WHERE quest_id = target_quest_id AND title = 'Gońcy Peruna';
  DELETE FROM task_completions WHERE task_id IN (
    SELECT id FROM tasks WHERE quest_id = target_quest_id AND title = 'Gońcy Peruna'
  );
  DELETE FROM tasks WHERE quest_id = target_quest_id AND title = 'Gońcy Peruna';

  -- Remove chase config
  DELETE FROM chase_configs WHERE quest_id = target_quest_id;

  -- Remove chase sessions
  DELETE FROM chase_sessions WHERE quest_id = target_quest_id;

  -- Remove quest activations and completions
  DELETE FROM quest_completions WHERE quest_id = target_quest_id;
  DELETE FROM quest_activations WHERE quest_id = target_quest_id;

  -- Restore quest to photo type
  UPDATE quests SET type = 'photo', reward_points = 150, show_all_markers = false
    WHERE id = target_quest_id;

  -- Fix task sort_order (current tasks have sort 1,2,3 which is correct for photo-only quest)
  -- No need to change sort_order, they're already fine
END;
$$;
