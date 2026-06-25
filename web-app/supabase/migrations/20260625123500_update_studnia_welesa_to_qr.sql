-- Update Studnia Welesa: change from photo to QR, more atmospheric description
-- Also update the insert function

-- Update existing quest in NOC KUPAŁY
UPDATE quests SET
  type = 'qr',
  qr_secret = 'GŁĘBINA',
  description = 'U stóp starego płotu wznosi się pionowa rura — zapomniana studnia do podziemnego królestwa Welesa. Na jej dnie, niczym skarb strzeżony przez mroczną toń, spoczywa jajko-niespodzianka z boską wskazówką. Cały klan musi zjednoczyć siły: nieść wodę z basenu i wypełniać czeluść, jednocześnie zatykając palcami szczeliny w świętej rurze, przez które Weles próbuje was powstrzymać. Gdy poziom wody wypchnie tajemnicę na powierzchnię — odszukajcie kod QR, by potwierdzić zwycięstwo.'
WHERE title = 'Studnia Welesa' AND game_id = 'ef910ea9-4fec-4ace-9ec8-8842a5674684';

-- Update existing task
UPDATE tasks SET
  type = 'qr',
  title = 'Kod QR Studni Welesa',
  description = 'Napełnijcie studnię wodą, wypchnijcie jajko na powierzchnię i zeskanujcie kod QR, by wpisać hasło.'
WHERE quest_id = (SELECT id FROM quests WHERE title = 'Studnia Welesa' AND game_id = 'ef910ea9-4fec-4ace-9ec8-8842a5674684');

-- Update existing map marker
UPDATE map_markers SET
  type = 'qr',
  qr_secret = 'GŁĘBINA',
  description = 'Studnia Welesa — napełnijcie rurę wodą, zatykając szczeliny. Gdy jajko wypłynie, zeskanujcie kod QR.'
WHERE quest_id = (SELECT id FROM quests WHERE title = 'Studnia Welesa' AND game_id = 'ef910ea9-4fec-4ace-9ec8-8842a5674684');

-- Replace the insert function with updated version
CREATE OR REPLACE FUNCTION insert_studnia_welesa_quest(p_game_id UUID)
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
    'Studnia Welesa',
    'U stóp starego płotu wznosi się pionowa rura — zapomniana studnia do podziemnego królestwa Welesa. Na jej dnie, niczym skarb strzeżony przez mroczną toń, spoczywa jajko-niespodzianka z boską wskazówką. Cały klan musi zjednoczyć siły: nieść wodę z basenu i wypełniać czeluść, jednocześnie zatykając palcami szczeliny w świętej rurze, przez które Weles próbuje was powstrzymać. Gdy poziom wody wypchnie tajemnicę na powierzchnię — odszukajcie kod QR, by potwierdzić zwycięstwo.',
    'qr',
    200,
    '/markers/studnia_welesa-Photoroom.png',
    'GŁĘBINA'
  )
  RETURNING id INTO quest_id;

  INSERT INTO tasks (quest_id, title, description, type, reward_points, sort_order)
  VALUES (
    quest_id,
    'Kod QR Studni Welesa',
    'Napełnijcie studnię wodą, wypchnijcie jajko na powierzchnię i zeskanujcie kod QR, by wpisać hasło.',
    'qr',
    200,
    0
  )
  RETURNING id INTO task_id;

  INSERT INTO map_markers (game_id, type, title, description, lat, lng, quest_id, task_id, icon_url, is_active, qr_secret)
  VALUES (
    p_game_id,
    'qr',
    'Studnia Welesa',
    'Studnia Welesa — napełnijcie rurę wodą, zatykając szczeliny. Gdy jajko wypłynie, zeskanujcie kod QR.',
    50.089940,
    19.713924,
    quest_id,
    task_id,
    '/markers/studnia_welesa-Photoroom.png',
    true,
    'GŁĘBINA'
  );
END;
$$;
