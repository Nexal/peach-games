-- Insert Dary dla Szeptuchy quest (Noc Kupały) — photo, no marker
-- Call: SELECT insert_dary_dla_szeptuchy_quest('<game_id>');

CREATE OR REPLACE FUNCTION insert_dary_dla_szeptuchy_quest(p_game_id UUID)
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
    'Dary dla Szeptuchy',
    'Ruszajcie drużyny na wiejskie rozstaje,
Gdzie w Noc Kupały ożyją zwyczaje.
Szeptucha w swej chacie na bukiet już czeka,
Niech nikt z darami dla niej nie zwleka!
By zyskać jej łaskę i przejść do biesiady,
Zbierzcie te cztery rośliny bez zwady:
Koniczynę z miedzy, co szczęście przynosi,
Biały rumianek, co o miłość prosi,
Zieloną paproć ukrytą w gęstwinie,
I kłos polnej trawy przy samej ścieżynie.
Związane sznurkiem przynieście na metę,
A u Szeptuchy dostaniecie nagrodę i podnietę!',
    'photo',
    200,
    '/markers/quest.svg'
  )
  RETURNING id INTO quest_id;

  INSERT INTO tasks (quest_id, title, description, type, reward_points, sort_order)
  VALUES (
    quest_id,
    'Bukiet dla Szeptuchy',
    'Zbierz cztery święte rośliny: koniczynę, rumianek, paproć i kłos trawy. Zwiąż sznurkiem i udokumentuj zdjęciem.',
    'photo',
    200,
    0
  )
  RETURNING id INTO task_id;
END;
$$;
