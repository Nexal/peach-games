-- Insert Trzy Próby Rozumu — Runy Welesa quest (Noc Kupały)
-- Call: SELECT insert_trzy_proby_rozumu_quest('<game_id>');

CREATE OR REPLACE FUNCTION insert_trzy_proby_rozumu_quest(p_game_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  quest_id UUID;
  task_id UUID;
BEGIN
  INSERT INTO quests (game_id, title, description, type, reward_points, icon_url)
  VALUES (
    p_game_id,
    'Trzy Próby Rozumu — Runy Welesa',
    'Weles, bóg magii i podziemi, nie pokazuje się pod gołym niebem. Jego kapliczka czeka wewnątrz domu — to cichy stół, na którym spoczywają trzy drewniane puzzle-runy. Każda to plansza, na której trzeba przekładać święte znaki, aż objawi się ukryty wzór. Miecz tu nie pomoże — liczy się tylko umysł. Udokumentujcie wykonanie zadania zdjęciem lub filmem!',
    'photo',
    200,
    '/markers/runy_welesa-Photoroom.png'
  )
  RETURNING id INTO quest_id;

  INSERT INTO tasks (quest_id, title, description, type, reward_points, sort_order)
  VALUES (
    quest_id,
    'Rozwiązanie Run Welesa',
    'Rozwiążcie trzy drewniane puzzle-runy na stole-kapliczce Welesa. Zrób zdjęcie lub nagraj film jako dowód wykonania.',
    'photo',
    200,
    0
  )
  RETURNING id INTO task_id;

  INSERT INTO map_markers (game_id, type, title, description, lat, lng, quest_id, task_id, icon_url, is_active)
  VALUES (
    p_game_id,
    'photo',
    'Trzy Próby Rozumu — Runy Welesa',
    'Kapliczka Welesa wewnątrz domu — rozwiążcie trzy runiczne puzzle i prześlijcie dowód zdjęciem!',
    50.090343,
    19.713678,
    quest_id,
    task_id,
    '/markers/runy_welesa-Photoroom.png',
    true
  );
END;
$$;
