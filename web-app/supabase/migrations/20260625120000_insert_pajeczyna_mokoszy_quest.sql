-- Insert Pajęczyna Mokoszy quest (Noc Kupały)
-- Call: SELECT insert_pajeczyna_mokoszy_quest('<game_id>');

CREATE OR REPLACE FUNCTION insert_pajeczyna_mokoszy_quest(p_game_id UUID)
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
    'Pajęczyna Mokoszy',
    'Między drzewami w ogrodzie rozpięta jest gęsta sieć z jaskrawej włóczki lub sznurka jutowego, na której powieszone są małe dzwoneczki wędkarskie. Cały Klan musi po kolei przedostać się na drugą stronę "ekranu" z pajęczyny w taki sposób, aby uderzenie w sznurek nie wydało absolutnie żadnego dźwięku dzwoneczkiem. Przy bezbłędnym przejściu całego klanu, organizator (ubrany na czarno) po cichu oddaje wam totem. Udokumentujcie wykonanie zadania zdjęciem lub filmem!',
    'photo',
    200,
    '/markers/pajeczyna mokoszy-Photoroom.png'
  )
  RETURNING id INTO quest_id;

  INSERT INTO tasks (quest_id, title, description, type, reward_points, sort_order)
  VALUES (
    quest_id,
    'Przejście przez pajęczynę Mokoszy',
    'Przedostańcie się całą drużyną przez pajęczynę z dzwoneczkami, nie wydając żadnego dźwięku. Zrób zdjęcie lub nagraj film jako dowód wykonania zadania.',
    'photo',
    200,
    0
  )
  RETURNING id INTO task_id;

  INSERT INTO map_markers (game_id, type, title, description, lat, lng, quest_id, task_id, icon_url, is_active)
  VALUES (
    p_game_id,
    'photo',
    'Pajęczyna Mokoszy',
    'Strefa Pajęczyny Mokoszy — przedostańcie się przez sieć sznurków z dzwoneczkami bez wydania dźwięku i prześlijcie dowód!',
    50.089916,
    19.714033,
    quest_id,
    task_id,
    '/markers/pajeczyna mokoszy-Photoroom.png',
    true
  );
END;
$$;
