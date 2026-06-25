-- Replace insert_studnia_welesa_quest with map marker added
CREATE OR REPLACE FUNCTION insert_studnia_welesa_quest(p_game_id UUID)
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
    'Studnia Welesa',
    'Do płotu przytwierdzona jest pionowo gruba rura PVC (z wywierconymi po bokach dziurami). Wewnątrz niej, na samym dnie leży jajko-niespodzianka ze wskazówką w środku. Klan dostaje wiaderko oraz podziurawione chochle do zupy. Musicie błyskawicznie przynosić wodę z basenu lub jacuzzi, żeby napełnić rurę, jednocześnie synchronizując się i zatykając palcami wywiercone w niej dziury — tak, by poziom wody wypchnął pojemniczek na szczyt rury. Udokumentujcie wykonanie zadania zdjęciem lub filmem!',
    'photo',
    200,
    '/markers/studnia_welesa-Photoroom.png'
  )
  RETURNING id INTO quest_id;

  INSERT INTO tasks (quest_id, title, description, type, reward_points, sort_order)
  VALUES (
    quest_id,
    'Napełnienie Studni Welesa',
    'Współpracujcie jako drużyna — przynoście wodę i zatykajcie dziury, by wypchnąć jajko-niespodziankę na szczyt rury. Zrób zdjęcie lub nagraj film jako dowód wykonania.',
    'photo',
    200,
    0
  )
  RETURNING id INTO task_id;

  INSERT INTO map_markers (game_id, type, title, description, lat, lng, quest_id, task_id, icon_url, is_active)
  VALUES (
    p_game_id,
    'photo',
    'Studnia Welesa',
    'Strefa Studni Welesa — napełnijcie rurę wodą, zatykając dziury i wypchnijcie jajko-niespodziankę na szczyt! Prześlijcie dowód zdjęciem!',
    50.089940,
    19.713924,
    quest_id,
    task_id,
    '/markers/studnia_welesa-Photoroom.png',
    true
  );
END;
$$;

-- Add map marker for existing Studnia Welesa in NOC KUPAŁY game
DO $$
DECLARE
  existing_quest_id UUID;
  existing_task_id UUID;
BEGIN
  SELECT id INTO existing_quest_id FROM quests
    WHERE title = 'Studnia Welesa' AND game_id = 'ef910ea9-4fec-4ace-9ec8-8842a5674684';

  IF existing_quest_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM map_markers WHERE quest_id = existing_quest_id
  ) THEN
    SELECT id INTO existing_task_id FROM tasks
      WHERE quest_id = existing_quest_id ORDER BY sort_order LIMIT 1;

    INSERT INTO map_markers (game_id, type, title, description, lat, lng, quest_id, task_id, icon_url, is_active)
    VALUES (
      'ef910ea9-4fec-4ace-9ec8-8842a5674684',
      'photo',
      'Studnia Welesa',
      'Strefa Studni Welesa — napełnijcie rurę wodą, zatykając dziury i wypchnijcie jajko-niespodziankę na szczyt! Prześlijcie dowód zdjęciem!',
      50.089940,
      19.713924,
      existing_quest_id,
      existing_task_id,
      '/markers/studnia_welesa-Photoroom.png',
      true
    );
  END IF;
END;
$$;
