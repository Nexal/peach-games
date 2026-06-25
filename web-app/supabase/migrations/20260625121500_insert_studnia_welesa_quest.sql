-- Insert Studnia Welesa quest (Noc Kupały)
-- Call: SELECT insert_studnia_welesa_quest('<game_id>');

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
END;
$$;
