-- Update insert_strzelec_peruna_quest with more atmospheric description
CREATE OR REPLACE FUNCTION insert_strzelec_peruna_quest(p_game_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  quest_id UUID;
  task_id UUID;
BEGIN
  INSERT INTO quests (game_id, title, description, type, reward_points, icon_url, qr_secret)
  VALUES (
    p_game_id,
    'Strzelec Peruna',
    'Na ścieżce czają się wizerunki demonów — tarcze rozstawione przez Peruna jako próba ognia. Nie wystarczy sama siła ramienia. Wpierw musicie okiełznać dysk i cisnąć nim tak, by suma waszych trafień zrównała się ze świętą liczbą 21. Każde celne uderzenie obdarza was iskrą gniewu Gromowładnego — jedną strzałą. Trzy demony muszą upaść, nim Perun objawi wam Oko Demona. Wtedy odszukajcie kod QR i potwierdźcie swój tryumf.',
    'qr',
    250,
    '/markers/strzelec-peruna-Photoroom.png',
    'OKODEMONA'
  )
  RETURNING id INTO quest_id;

  INSERT INTO tasks (quest_id, title, description, type, reward_points, sort_order)
  VALUES (
    quest_id,
    'Oko Demona — kod QR Strzelca Peruna',
    'Zdobywajcie amunicję rzutami frisbee (suma = 21), zestrzelcie trzy tarcze demonów i zeskanujcie kod QR.',
    'qr',
    250,
    0
  )
  RETURNING id INTO task_id;

  INSERT INTO map_markers (game_id, type, title, description, lat, lng, quest_id, task_id, icon_url, is_active, qr_secret)
  VALUES (
    p_game_id,
    'qr',
    'Strzelec Peruna',
    'Strefa Strzelca Peruna — rzucajcie frisbee, zdobywajcie amunicję i zestrzelcie trzy demony. Następnie zeskanujcie kod QR!',
    50.098490,
    19.709927,
    quest_id,
    task_id,
    '/markers/strzelec-peruna-Photoroom.png',
    true,
    'OKODEMONA'
  );
END;
$$;
