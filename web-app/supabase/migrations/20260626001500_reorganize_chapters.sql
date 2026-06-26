-- Reorganize chapters for NOC KUPAŁY
DO $$
DECLARE
  ch1 UUID := 'd0000001-0000-0000-0000-000000000001';
  ch2 UUID := 'd0000002-0000-0000-0000-000000000001';
  ch3 UUID := 'd0000003-0000-0000-0000-000000000001';
  ch4 UUID := 'd0000004-0000-0000-0000-000000000001';
  ch5 UUID := 'd0000005-0000-0000-0000-000000000001';
  ch6 UUID := 'd0000006-0000-0000-0000-000000000001';
  v_game_id UUID := 'ef910ea9-4fec-4ace-9ec8-8842a5674684';
BEGIN
  -- Clean up old chapter progress
  DELETE FROM klan_chapter_progress WHERE game_id = v_game_id;

  -- Delete old chapters for this game
  DELETE FROM story_chapters WHERE game_id = v_game_id;

  -- Insert new chapters
  INSERT INTO story_chapters (id, game_id, chapter_number, title, story_text, is_opened) VALUES
    (ch1, v_game_id, 1, 'Łowy na Boskie Żary', 'Perun, Weles i Mokosz rozrzucili po okolicy iskry swej mocy. Tylko najszybsi gońcy zdołają je schwytać, zanim boski ogień zgaśnie.', true),
    (ch2, v_game_id, 2, 'Błotne zabobony', 'Stare przesądy mówią, że w bagnach i studniach kryją się próby, które sprawdzą nie tylko siłę, ale i spryt klanu.', false),
    (ch3, v_game_id, 3, 'Wodne Czary', 'Gdzie woda spotyka magię, a runy szepczą prawdę — tam czekają wyzwania Mokoszy i Welesa. Ogień na wodzie, runy w mroku, pajęczyna w ogrodzie.', false),
    (ch4, v_game_id, 4, 'Wichrowe Wzgórze', 'Wiatr niesie strzały Peruna, a gońcy klanu pędzą ścieżkami przodków. Wichrowe wzgórza kryją ostatnie próby zręczności i pamięci.', false),
    (ch5, v_game_id, 5, 'Ogrody Bogów', 'W ukrytym ogrodzie rozsiano osiem świętych skarbów. Tylko klan, który zbierze je wszystkie, godzien jest otworzyć skrzynię bogów.', false),
    (ch6, v_game_id, 6, 'Powroty są łatwiejsze', 'Droga powrotna wiedzie przez dary i ofiary. Ci, którzy przetrwali próby, wracają z łaską bogów — ale nie wszyscy jeszcze złożyli swoje dary.', false);

  -- Clear all existing chapter assignments
  UPDATE quests SET requires_chapter_id = NULL WHERE game_id = v_game_id;

  -- Chapter 1: Łowy na Boskie Żary
  UPDATE quests SET requires_chapter_id = ch1 WHERE id = '771d2933-4dd3-4b37-b9a6-12eef4d844a5';

  -- Chapter 2: Błotne zabobony
  UPDATE quests SET requires_chapter_id = ch2 WHERE id IN (
    'fde67afb-c161-4f08-ae0c-1b177096bbd5',
    '72625a34-7030-4218-ae27-277248d30d1a'
  );

  -- Chapter 3: Wodne Czary
  UPDATE quests SET requires_chapter_id = ch3 WHERE id IN (
    'adba774f-0280-4c2c-b3d4-e10ff140fc01',
    '6c293b7a-2ea5-4cfe-8270-ae53d5b5f24c',
    '22694979-9b49-4d83-a0b6-8a8617064129'
  );

  -- Chapter 4: Wichrowe Wzgórze
  UPDATE quests SET requires_chapter_id = ch4 WHERE id IN (
    'fe42dec4-1d5c-4e15-8299-33ae2e8a0a4e',
    'f497bf2d-a9f0-4fef-bce5-282cc32b2a24'
  );

  -- Chapter 5: Ogrody Bogów
  UPDATE quests SET requires_chapter_id = ch5 WHERE id = '7525bf2e-72a5-46c2-8b4a-a0a4b5b7229a';

  -- Chapter 6: Powroty są łatwiejsze
  UPDATE quests SET requires_chapter_id = ch6 WHERE id = 'a03b7e50-4c5f-4b9e-9faf-5a184612f73f';

  -- Permanently open (requires_chapter_id stays NULL)
  -- Poszukiwanie Złotych Kamieni (4fee7e5c...)
  -- Dary dla Szeptuchy (a7c35b3e...)
  -- Tropy Bogów (bdf249df...)
END;
$$;
