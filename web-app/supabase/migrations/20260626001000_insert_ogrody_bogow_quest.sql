-- Insert Ogrody Bogów quest (Noc Kupały) — QR hunt with single marker
-- Call: SELECT insert_ogrody_bogow_quest('<game_id>');

CREATE OR REPLACE FUNCTION insert_ogrody_bogow_quest(p_game_id UUID)
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
    'Ogrody Bogów',
    'W ukrytym ogrodzie bogów rozsiano osiem świętych skarbów — każdy naznaczony znakiem jednego z bóstw. Waszym zadaniem jest odnaleźć je wszystkie, a następnie stanąć przed skrzynią, która czeka w sercu ogrodu. Tylko klan, który zebrał wszystkie dary, godzien jest otworzyć wieko i odebrać symboliczną nagrodę — Nasiona Świętego Gaju, z których odrodzi się pradawna moc. Zeskanujcie kod QR przy skrzyni, by potwierdzić swój triumf!',
    'qr',
    250,
    '/markers/quest.svg'
  )
  RETURNING id INTO quest_id;

  INSERT INTO tasks (quest_id, title, description, type, reward_points, sort_order)
  VALUES (
    quest_id,
    'Skrzynia Bogów',
    'Zbierzcie 8 skarbów z ogrodu, otwórzcie skrzynię i zeskanujcie kod QR.',
    'qr',
    250,
    0
  )
  RETURNING id INTO task_id;

  INSERT INTO map_markers (game_id, type, title, description, lat, lng, quest_id, task_id, icon_url, is_active, qr_secret)
  VALUES (
    p_game_id,
    'qr',
    'Skrzynia Bogów',
    'Skrzynia w sercu ogrodu — zeskanuj kod QR po zebraniu wszystkich skarbów!',
    50.094993,
    19.732763,
    quest_id,
    task_id,
    '/markers/quest.svg',
    true,
    'OGRÓD'
  );
END;
$$;
