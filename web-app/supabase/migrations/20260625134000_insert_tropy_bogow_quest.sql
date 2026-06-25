-- Insert Tropy Bogów quest (Noc Kupały) — QR hunt with multiple markers
-- Call: SELECT insert_tropy_bogow_quest('<game_id>');

CREATE OR REPLACE FUNCTION insert_tropy_bogow_quest(p_game_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  quest_id UUID;
  task_id UUID;
BEGIN
  INSERT INTO quests (game_id, title, description, type, reward_points, icon_url, show_all_markers)
  VALUES (
    p_game_id,
    'Tropy Bogów',
    'Podczas Nocy Kupały granica między światami cienieje — a wraz z nią w materialnym świecie pojawiają się drobne okruchy boskiej mocy. Rozsiane wzdłuż całego Szlaku Paproci czekają ukryte artefakty: malutkie gliniane fiolki z „łzą Rusałki", drewniane amulety z wypalonym znakiem Peruna, rzeczne kamienie owinięte sznurkiem… Odszukajcie je wszystkie i zeskanujcie kody QR, by bogowie uznali waszą czujność!',
    'qr',
    300,
    '/markers/tropy-bogow-Photoroom.png',
    true
  )
  RETURNING id INTO quest_id;

  INSERT INTO tasks (quest_id, title, description, type, reward_points, sort_order)
  VALUES (
    quest_id,
    'Artefakty Bogów',
    'Odszukajcie ukryte na trasie artefakty i zeskanujcie wszystkie kody QR.',
    'qr',
    300,
    0
  )
  RETURNING id INTO task_id;

  INSERT INTO map_markers (game_id, type, title, description, lat, lng, quest_id, task_id, icon_url, is_active, qr_secret)
  VALUES
    (p_game_id, 'qr', 'Łza Rusałki', 'Gliniana fiolka ukryta wśród zieleni — zeskanuj kod QR.', 50.090574, 19.714992, quest_id, task_id, '/markers/tropy-bogow-Photoroom.png', true, 'RUSAŁKA'),
    (p_game_id, 'qr', 'Amulet Peruna', 'Drewniany krążek z wypalonym gromem — zeskanuj kod QR.', 50.092394, 19.712327, quest_id, task_id, '/markers/tropy-bogow-Photoroom.png', true, 'PERUN'),
    (p_game_id, 'qr', 'Kamień Rzeczny', 'Otoczak owinięty świętym sznurkiem — zeskanuj kod QR.', 50.094355, 19.714858, quest_id, task_id, '/markers/tropy-bogow-Photoroom.png', true, 'KAMIEŃ'),
    (p_game_id, 'qr', 'Ślad Mokoszy', 'Kropla rosy zaklęta w kamieniu — zeskanuj kod QR.', 50.095689, 19.715752, quest_id, task_id, '/markers/tropy-bogow-Photoroom.png', true, 'MOKOSZ'),
    (p_game_id, 'qr', 'Znak Welesa', 'Runa wyryta na korze prastarego drzewa — zeskanuj kod QR.', 50.098338, 19.716019, quest_id, task_id, '/markers/tropy-bogow-Photoroom.png', true, 'WELES');
END;
$$;
