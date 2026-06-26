-- Set all Tropy Bogów tasks to 30 points each
UPDATE tasks SET reward_points = 30
WHERE quest_id = 'bdf249df-f6e3-429d-b214-774694627201';

-- Update quest total to match
UPDATE quests SET reward_points = 390
WHERE id = 'bdf249df-f6e3-429d-b214-774694627201';
