-- Convert Wyprawa Gońców to chase quest with sequential chase tasks
DO $$
DECLARE
  target_quest_id UUID;
  task1_id UUID;
  task2_id UUID;
BEGIN
  SELECT id INTO target_quest_id FROM quests
    WHERE title = 'Wyprawa Gońców' AND game_id = 'ef910ea9-4fec-4ace-9ec8-8842a5674684';

  IF target_quest_id IS NULL THEN
    RAISE NOTICE 'Quest not found';
    RETURN;
  END IF;

  -- Change quest type to chase, bump reward
  UPDATE quests SET type = 'chase', reward_points = 250
    WHERE id = target_quest_id;

  -- Remove old tasks
  DELETE FROM task_completions WHERE task_id IN (
    SELECT id FROM tasks WHERE quest_id = target_quest_id
  );
  DELETE FROM submissions WHERE task_id IN (
    SELECT id FROM tasks WHERE quest_id = target_quest_id
  );
  DELETE FROM tasks WHERE quest_id = target_quest_id;

  -- Remove old markers
  DELETE FROM map_markers WHERE quest_id = target_quest_id;

  -- Task 1: Gońcy Peruna (chase)
  INSERT INTO tasks (quest_id, title, description, type, reward_points, sort_order)
  VALUES (
    target_quest_id,
    'Gońcy Peruna',
    'Dogoncie boskiego gońca pędzącego przez ogród! Zbliżcie się na odległość chwytu, by udowodnić swą szybkość.',
    'chase',
    125,
    0
  ) RETURNING id INTO task1_id;

  INSERT INTO map_markers (game_id, type, title, description, lat, lng, quest_id, task_id, icon_url, is_active)
  VALUES (
    'ef910ea9-4fec-4ace-9ec8-8842a5674684',
    'quest',
    'Gońcy Peruna',
    'Pierwszy goniec — złapcie go, by odblokować kolejnego!',
    50.090331,
    19.713784,
    target_quest_id,
    task1_id,
    '/markers/goniec-Photoroom.png',
    true
  );

  -- Task 2: Pościg za Iskrą (chase)
  INSERT INTO tasks (quest_id, title, description, type, reward_points, sort_order)
  VALUES (
    target_quest_id,
    'Pościg za Iskrą',
    'Drugi goniec mknie przez mrok — dogońcie go, nim zniknie w cieniu!',
    'chase',
    125,
    1
  ) RETURNING id INTO task2_id;

  INSERT INTO map_markers (game_id, type, title, description, lat, lng, quest_id, task_id, icon_url, is_active)
  VALUES (
    'ef910ea9-4fec-4ace-9ec8-8842a5674684',
    'quest',
    'Pościg za Iskrą',
    'Drugi goniec — odblokuje się po złapaniu pierwszego!',
    50.090200,
    19.714000,
    target_quest_id,
    task2_id,
    '/markers/goniec-Photoroom.png',
    true
  );

  -- Chase config for trajectory generation
  INSERT INTO chase_configs (quest_id, speed_mps, catch_distance_m, waypoint_count, area)
  VALUES (
    target_quest_id,
    3.0,
    5,
    30,
    '[[50.089915,19.714189],[50.089368,19.714428],[50.089570,19.716539],[50.090104,19.716177]]'
  ) ON CONFLICT (quest_id) DO UPDATE SET
    speed_mps = 3.0,
    catch_distance_m = 5,
    waypoint_count = 30,
    area = '[[50.089915,19.714189],[50.089368,19.714428],[50.089570,19.716539],[50.090104,19.716177]]';
END;
$$;
