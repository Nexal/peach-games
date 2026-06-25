-- Simplify Wyprawa Gońców: single stationary chase marker
DO $$
DECLARE
  target_quest_id UUID;
  task2_id UUID;
BEGIN
  SELECT id INTO target_quest_id FROM quests
    WHERE title = 'Wyprawa Gońców' AND game_id = 'ef910ea9-4fec-4ace-9ec8-8842a5674684';

  IF target_quest_id IS NULL THEN RETURN; END IF;

  -- Remove second task and its marker
  DELETE FROM map_markers WHERE quest_id = target_quest_id AND title = 'Pościg za Iskrą';
  DELETE FROM task_completions WHERE task_id IN (
    SELECT id FROM tasks WHERE quest_id = target_quest_id AND title = 'Pościg za Iskrą'
  );
  DELETE FROM tasks WHERE quest_id = target_quest_id AND title = 'Pościg za Iskrą';

  -- Set tiny area so marker stays effectively stationary near the coordinates
  UPDATE chase_configs SET
    area = '{"center":[50.090331,19.713784],"radius":1}',
    speed_mps = 0.1,
    waypoint_count = 1
  WHERE quest_id = target_quest_id;
END;
$$;
