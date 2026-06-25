-- Update insert_noc_kupaly_skrzaty_quests: rename "Ślepy Golem - Brzoskwinia" to "Ślepy Golem"
CREATE OR REPLACE FUNCTION insert_noc_kupaly_skrzaty_quests(p_game_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  quest1_id UUID;
  quest2_id UUID;
  task1_id UUID;
  task2_id UUID;
BEGIN
  INSERT INTO quests (game_id, title, description, type, reward_points, icon_url)
  VALUES (
    p_game_id,
    'Poszukiwanie Złotych Kamieni',
    'Domowojowie! Waszym zadaniem jest odnalezienie ukrytych w ogrodzie, zaroślach i na trasie złotych kamieni oraz drewnianych amuletów. Musicie zebrać przynajmniej 7 amuletów lub złotych kamieni — zróbcie finalne zdjęcie całej kolekcji jako dowód ukończenia zadania!',
    'photo',
    150,
    '/markers/zlote-kamienie-Photoroom.png'
  )
  RETURNING id INTO quest1_id;

  INSERT INTO tasks (quest_id, title, description, type, reward_points, sort_order)
  VALUES (
    quest1_id,
    'Złote kamienie i amulety',
    'Zbierz przynajmniej 7 złotych kamieni lub drewnianych amuletów i zrób zdjęcie całej kolekcji jako dowód dla klanu.',
    'photo',
    150,
    0
  )
  RETURNING id INTO task1_id;

  INSERT INTO quests (game_id, title, description, type, reward_points, icon_url)
  VALUES (
    p_game_id,
    'Ślepy Golem',
    'Przeprowadź dorosłego z zasłoniętymi oczami przez bagno (tor przeszkód z lin na trawie) po cenne zbiory — leki Mokoszy. Udokumentuj wykonanie zadania zdjęciem lub filmem przy markerze Brzoskwinia!',
    'photo',
    200,
    '/markers/slepy-golem3-Photoroom.png'
  )
  RETURNING id INTO quest2_id;

  INSERT INTO tasks (quest_id, title, description, type, reward_points, sort_order)
  VALUES (
    quest2_id,
    'Przejście Ślepego Golema',
    'Przeprowadź dorosłego z zasłoniętymi oczami przez tor przeszkód. Zrób zdjęcie lub nagraj film jako dowód wykonania.',
    'photo',
    200,
    0
  )
  RETURNING id INTO task2_id;

  INSERT INTO map_markers (game_id, type, title, description, lat, lng, quest_id, task_id, icon_url, is_active)
  VALUES (
    p_game_id,
    'photo',
    'Ślepy Golem',
    'Punkt startowy toru przeszkód Ślepego Golema. Przeprowadź dorosłego z zasłoniętymi oczami i prześlij dowód zdjęciem!',
    50.089892,
    19.713826,
    quest2_id,
    task2_id,
    '/markers/slepy-golem3-Photoroom.png',
    true
  );
END;
$$;
