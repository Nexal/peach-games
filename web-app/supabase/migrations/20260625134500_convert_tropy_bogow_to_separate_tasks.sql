-- Convert Tropy Bogów: separate task per marker (instant reward per scan)
DO $$
DECLARE
  target_quest_id UUID;
  old_task_id UUID;
  t1 UUID; t2 UUID; t3 UUID; t4 UUID; t5 UUID; t6 UUID;
BEGIN
  SELECT id INTO target_quest_id FROM quests
    WHERE title = 'Tropy Bogów' AND game_id = 'ef910ea9-4fec-4ace-9ec8-8842a5674684';
  IF target_quest_id IS NULL THEN RETURN; END IF;

  -- Find old task id
  SELECT id INTO old_task_id FROM tasks WHERE quest_id = target_quest_id ORDER BY sort_order LIMIT 1;

  -- Clean up old state
  DELETE FROM task_completions WHERE task_id IN (SELECT id FROM tasks WHERE quest_id = target_quest_id);
  DELETE FROM map_markers WHERE quest_id = target_quest_id;
  DELETE FROM tasks WHERE quest_id = target_quest_id;
  DELETE FROM quest_completions WHERE quest_id = target_quest_id;
  DELETE FROM quest_activations WHERE quest_id = target_quest_id;

  -- Task 1: Łza Rusałki
  INSERT INTO tasks (quest_id, title, description, type, reward_points, sort_order)
  VALUES (target_quest_id, 'Łza Rusałki', 'Gliniana fiolka ukryta wśród zieleni.', 'qr', 50, 0) RETURNING id INTO t1;
  INSERT INTO map_markers (game_id, type, title, description, lat, lng, quest_id, task_id, icon_url, is_active, qr_secret)
  VALUES ('ef910ea9-4fec-4ace-9ec8-8842a5674684', 'qr', 'Łza Rusałki', 'Gliniana fiolka ukryta wśród zieleni — zeskanuj kod QR.', 50.090574, 19.714992, target_quest_id, t1, '/markers/tropy-bogow-Photoroom.png', true, 'RUSAŁKA');

  -- Task 2: Amulet Peruna
  INSERT INTO tasks (quest_id, title, description, type, reward_points, sort_order)
  VALUES (target_quest_id, 'Amulet Peruna', 'Drewniany krążek z wypalonym gromem.', 'qr', 50, 1) RETURNING id INTO t2;
  INSERT INTO map_markers (game_id, type, title, description, lat, lng, quest_id, task_id, icon_url, is_active, qr_secret)
  VALUES ('ef910ea9-4fec-4ace-9ec8-8842a5674684', 'qr', 'Amulet Peruna', 'Drewniany krążek z wypalonym gromem — zeskanuj kod QR.', 50.092394, 19.712327, target_quest_id, t2, '/markers/tropy-bogow-Photoroom.png', true, 'PERUN');

  -- Task 3: Kamień Rzeczny
  INSERT INTO tasks (quest_id, title, description, type, reward_points, sort_order)
  VALUES (target_quest_id, 'Kamień Rzeczny', 'Otoczak owinięty świętym sznurkiem.', 'qr', 50, 2) RETURNING id INTO t3;
  INSERT INTO map_markers (game_id, type, title, description, lat, lng, quest_id, task_id, icon_url, is_active, qr_secret)
  VALUES ('ef910ea9-4fec-4ace-9ec8-8842a5674684', 'qr', 'Kamień Rzeczny', 'Otoczak owinięty świętym sznurkiem — zeskanuj kod QR.', 50.094355, 19.714858, target_quest_id, t3, '/markers/tropy-bogow-Photoroom.png', true, 'KAMIEŃ');

  -- Task 4: Ślad Mokoszy
  INSERT INTO tasks (quest_id, title, description, type, reward_points, sort_order)
  VALUES (target_quest_id, 'Ślad Mokoszy', 'Kropla rosy zaklęta w kamieniu.', 'qr', 50, 3) RETURNING id INTO t4;
  INSERT INTO map_markers (game_id, type, title, description, lat, lng, quest_id, task_id, icon_url, is_active, qr_secret)
  VALUES ('ef910ea9-4fec-4ace-9ec8-8842a5674684', 'qr', 'Ślad Mokoszy', 'Kropla rosy zaklęta w kamieniu — zeskanuj kod QR.', 50.095689, 19.715752, target_quest_id, t4, '/markers/tropy-bogow-Photoroom.png', true, 'MOKOSZ');

  -- Task 5: Znak Welesa
  INSERT INTO tasks (quest_id, title, description, type, reward_points, sort_order)
  VALUES (target_quest_id, 'Znak Welesa', 'Runa wyryta na korze prastarego drzewa.', 'qr', 50, 4) RETURNING id INTO t5;
  INSERT INTO map_markers (game_id, type, title, description, lat, lng, quest_id, task_id, icon_url, is_active, qr_secret)
  VALUES ('ef910ea9-4fec-4ace-9ec8-8842a5674684', 'qr', 'Znak Welesa', 'Runa wyryta na korze prastarego drzewa — zeskanuj kod QR.', 50.098338, 19.716019, target_quest_id, t5, '/markers/tropy-bogow-Photoroom.png', true, 'WELES');

  -- Task 6: Nowy punkt (admin-added)
  INSERT INTO tasks (quest_id, title, description, type, reward_points, sort_order)
  VALUES (target_quest_id, 'Nowy punkt', 'Dodatkowy artefakt na trasie.', 'qr', 50, 5) RETURNING id INTO t6;
  INSERT INTO map_markers (game_id, type, title, description, lat, lng, quest_id, task_id, icon_url, is_active, qr_secret)
  VALUES ('ef910ea9-4fec-4ace-9ec8-8842a5674684', 'qr', 'Nowy punkt', 'Dodatkowy artefakt na trasie.', 50.0895, 19.7135, target_quest_id, t6, '/markers/tropy-bogow-Photoroom.png', true, 'xxx');

  -- Update quest reward to match total (6 × 50)
  UPDATE quests SET reward_points = 300, show_all_markers = true WHERE id = target_quest_id;
END;
$$;

-- Also update the seed function
CREATE OR REPLACE FUNCTION insert_tropy_bogow_quest(p_game_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  quest_id UUID;
  t1 UUID; t2 UUID; t3 UUID; t4 UUID; t5 UUID;
BEGIN
  INSERT INTO quests (game_id, title, description, type, reward_points, icon_url, show_all_markers)
  VALUES (
    p_game_id,
    'Tropy Bogów',
    'Podczas Nocy Kupały granica między światami cienieje — a wraz z nią w materialnym świecie pojawiają się drobne okruchy boskiej mocy. Rozsiane wzdłuż całego Szlaku Paproci czekają ukryte artefakty: malutkie gliniane fiolki z „łzą Rusałki", drewniane amulety z wypalonym znakiem Peruna, rzeczne kamienie owinięte sznurkiem… Każdy odnaleziony i zeskanowany artefakt natychmiast nagradza wasz klan boską przychylnością!',
    'qr',
    250,
    '/markers/tropy-bogow-Photoroom.png',
    true
  )
  RETURNING id INTO quest_id;

  INSERT INTO tasks (quest_id, title, description, type, reward_points, sort_order)
  VALUES (quest_id, 'Łza Rusałki', 'Gliniana fiolka ukryta wśród zieleni.', 'qr', 50, 0) RETURNING id INTO t1;
  INSERT INTO map_markers (game_id, type, title, description, lat, lng, quest_id, task_id, icon_url, is_active, qr_secret)
  VALUES (p_game_id, 'qr', 'Łza Rusałki', 'Gliniana fiolka — zeskanuj kod QR.', 50.090574, 19.714992, quest_id, t1, '/markers/tropy-bogow-Photoroom.png', true, 'RUSAŁKA');

  INSERT INTO tasks (quest_id, title, description, type, reward_points, sort_order)
  VALUES (quest_id, 'Amulet Peruna', 'Drewniany krążek z wypalonym gromem.', 'qr', 50, 1) RETURNING id INTO t2;
  INSERT INTO map_markers (game_id, type, title, description, lat, lng, quest_id, task_id, icon_url, is_active, qr_secret)
  VALUES (p_game_id, 'qr', 'Amulet Peruna', 'Drewniany krążek z gromem — zeskanuj kod QR.', 50.092394, 19.712327, quest_id, t2, '/markers/tropy-bogow-Photoroom.png', true, 'PERUN');

  INSERT INTO tasks (quest_id, title, description, type, reward_points, sort_order)
  VALUES (quest_id, 'Kamień Rzeczny', 'Otoczak owinięty świętym sznurkiem.', 'qr', 50, 2) RETURNING id INTO t3;
  INSERT INTO map_markers (game_id, type, title, description, lat, lng, quest_id, task_id, icon_url, is_active, qr_secret)
  VALUES (p_game_id, 'qr', 'Kamień Rzeczny', 'Otoczak ze sznurkiem — zeskanuj kod QR.', 50.094355, 19.714858, quest_id, t3, '/markers/tropy-bogow-Photoroom.png', true, 'KAMIEŃ');

  INSERT INTO tasks (quest_id, title, description, type, reward_points, sort_order)
  VALUES (quest_id, 'Ślad Mokoszy', 'Kropla rosy zaklęta w kamieniu.', 'qr', 50, 3) RETURNING id INTO t4;
  INSERT INTO map_markers (game_id, type, title, description, lat, lng, quest_id, task_id, icon_url, is_active, qr_secret)
  VALUES (p_game_id, 'qr', 'Ślad Mokoszy', 'Kropla rosy — zeskanuj kod QR.', 50.095689, 19.715752, quest_id, t4, '/markers/tropy-bogow-Photoroom.png', true, 'MOKOSZ');

  INSERT INTO tasks (quest_id, title, description, type, reward_points, sort_order)
  VALUES (quest_id, 'Znak Welesa', 'Runa wyryta na korze drzewa.', 'qr', 50, 4) RETURNING id INTO t5;
  INSERT INTO map_markers (game_id, type, title, description, lat, lng, quest_id, task_id, icon_url, is_active, qr_secret)
  VALUES (p_game_id, 'qr', 'Znak Welesa', 'Runa Welesa — zeskanuj kod QR.', 50.098338, 19.716019, quest_id, t5, '/markers/tropy-bogow-Photoroom.png', true, 'WELES');
END;
$$;
