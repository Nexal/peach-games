-- Seed chapters for NOC KUPAŁY game
INSERT INTO story_chapters (id, game_id, chapter_number, title, story_text, is_opened)
VALUES
  ('11111111-1111-1111-1111-111111111001', 'ef910ea9-4fec-4ace-9ec8-8842a5674684', 1, 'Początek Wędrówki', 'Pierwsze kroki na szlaku Nocy Kupały. Czas poznać okolicę i zdobyć pierwsze łaski bogów.', true),
  ('22222222-2222-2222-2222-222222222001', 'ef910ea9-4fec-4ace-9ec8-8842a5674684', 2, 'Próby Bogów', 'Bogowie wystawiają was na cięższe próby. Tylko najodważniejsi staną przed obliczem Peruna, Welesa i Mokoszy.', false)
ON CONFLICT (id) DO NOTHING;

-- Assign quests to chapters
UPDATE quests SET requires_chapter_id = '11111111-1111-1111-1111-111111111001'
WHERE id IN ('f497bf2d-a9f0-4fef-bce5-282cc32b2a24', 'a03b7e50-4c5f-4b9e-9faf-5a184612f73f', '4fee7e5c-9016-4dff-8282-a49072b3fbeb');

UPDATE quests SET requires_chapter_id = '22222222-2222-2222-2222-222222222001'
WHERE id IN ('771d2933-4dd3-4b37-b9a6-12eef4d844a5', 'fde67afb-c161-4f08-ae0c-1b177096bbd5');
