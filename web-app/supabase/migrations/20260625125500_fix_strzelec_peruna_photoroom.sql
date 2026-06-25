-- Update Strzelec Peruna icon to Photoroom version
UPDATE quests SET icon_url = '/markers/strzelec-peruna-Photoroom.png'
WHERE title = 'Strzelec Peruna' AND game_id = 'ef910ea9-4fec-4ace-9ec8-8842a5674684';

UPDATE map_markers SET icon_url = '/markers/strzelec-peruna-Photoroom.png'
WHERE quest_id = (SELECT id FROM quests WHERE title = 'Strzelec Peruna' AND game_id = 'ef910ea9-4fec-4ace-9ec8-8842a5674684');

-- Also update the insert function
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
    'Na trasie rozmieszczone są tarcze z wizerunkami demonów. Aby zdobyć amunicję — jedną strzałkę do pistoletu Nerf lub strzałę do łuku — musicie najpierw rzucić frisbee do celu tak, by suma strzelonych liczb była równa 21. Każda zdobyta strzałka daje jedną próbę zestrzelenia tarczy. Za zestrzelenie trzech celów Perun odsłania przed wami Oko Demona — zeskanujcie kod QR, by potwierdzić triumf!',
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
