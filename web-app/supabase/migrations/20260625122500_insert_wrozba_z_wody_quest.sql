-- Insert Wróżba z Wody quest (Noc Kupały)
-- Call: SELECT insert_wrozba_z_wody_quest('<game_id>');

CREATE OR REPLACE FUNCTION insert_wrozba_z_wody_quest(p_game_id UUID)
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
    'Wróżba z Wody',
    'Klan musi ulepić lub złożyć mikroskopijny, bardzo lekki „spławik", zapalić na jego wierzchu morską świeczkę i całkowicie bezdotykowo (np. wyłącznie solidarnie dmuchając lub machając kartonem) przeprawić bezpiecznie „ogień" na drugi koniec nadmuchiwanego basenu lub jacuzzi, omijając wystające przeszkody i unikając zatopienia lub zgaszenia wróżby. Udokumentujcie wykonanie zadania zdjęciem lub filmem!',
    'photo',
    200,
    '/markers/wrozba-Photoroom.png'
  )
  RETURNING id INTO quest_id;

  INSERT INTO tasks (quest_id, title, description, type, reward_points, sort_order)
  VALUES (
    quest_id,
    'Przeprawa Wróżby z Wody',
    'Przeprawcie płonący spławik na drugi koniec basenu bez dotykania — dmuchając lub machając kartonem. Zrób zdjęcie lub nagraj film jako dowód wykonania.',
    'photo',
    200,
    0
  )
  RETURNING id INTO task_id;

  INSERT INTO map_markers (game_id, type, title, description, lat, lng, quest_id, task_id, icon_url, is_active)
  VALUES (
    p_game_id,
    'photo',
    'Wróżba z Wody',
    'Strefa Wróżby z Wody — przeprawcie płonący spławik przez basen bez użycia rąk i prześlijcie dowód zdjęciem!',
    50.090009,
    19.713644,
    quest_id,
    task_id,
    '/markers/wrozba-Photoroom.png',
    true
  );
END;
$$;
