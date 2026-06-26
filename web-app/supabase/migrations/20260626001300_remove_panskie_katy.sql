-- Remove Pańskie Kąty task from Wyprawa Gońców + update description
DO $$
DECLARE
  target_quest_id UUID;
BEGIN
  SELECT id INTO target_quest_id FROM quests
    WHERE title = 'Wyprawa Gońców' AND game_id = 'ef910ea9-4fec-4ace-9ec8-8842a5674684';
  IF target_quest_id IS NULL THEN RETURN; END IF;

  -- Delete marker for Pańskie Kąty
  DELETE FROM map_markers WHERE quest_id = target_quest_id AND title = 'Pańskie Kąty';

  -- Delete task completions for Pańskie Kąty
  DELETE FROM task_completions WHERE task_id IN (
    SELECT id FROM tasks WHERE quest_id = target_quest_id AND title = 'Pańskie Kąty'
  );

  -- Delete the task
  DELETE FROM tasks WHERE quest_id = target_quest_id AND title = 'Pańskie Kąty';

  -- Update description to remove Pańskie Kąty section
  UPDATE quests SET description = 'Bogowie rozproszyli po okolicy ślady dawnych wieśniaków. Goniec klanu musi przejechać szlakiem przez Nielepice i złożyć dowód foto z każdego z dwóch miejsc, gdzie przodkowie zostawili po sobie znak. Skała z krzyżem — święte miejsce modlitw o urodzaj i pomyślność plonów. Tablica Witolda Pileckiego — gdzie pamięć o niezłomnym bohaterze przetrwała mroki dziejów. Dopiero zebranie obu dowodów pozwoli Klanowi przetrwać Szlak Paproci i zdobyć Klucz Żywiołu.'
  WHERE id = target_quest_id;

  -- Fix sort_order for remaining tasks
  UPDATE tasks SET sort_order = 1 WHERE quest_id = target_quest_id AND title = 'Skała z krzyżem';
  UPDATE tasks SET sort_order = 2 WHERE quest_id = target_quest_id AND title = 'Witold Pilecki';
END;
$$;
