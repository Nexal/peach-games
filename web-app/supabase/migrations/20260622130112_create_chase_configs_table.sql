CREATE TABLE IF NOT EXISTS chase_configs (
  quest_id UUID PRIMARY KEY REFERENCES quests(id) ON DELETE CASCADE,
  speed_mps FLOAT NOT NULL DEFAULT 2.0,
  catch_distance_m FLOAT NOT NULL DEFAULT 5,
  waypoint_count INT NOT NULL DEFAULT 30,
  area JSONB
);

INSERT INTO chase_configs (quest_id, speed_mps, catch_distance_m, waypoint_count, area)
VALUES (
  '771d2933-4dd3-4b37-b9a6-12eef4d844a5',
  3.0,
  5,
  50,
  '[[50.089915,19.714189],[50.089368,19.714428],[50.089570,19.716539],[50.090104,19.716177]]'
)
ON CONFLICT (quest_id) DO UPDATE SET
  speed_mps = 3.0,
  catch_distance_m = 5,
  waypoint_count = 50,
  area = '[[50.089915,19.714189],[50.089368,19.714428],[50.089570,19.716539],[50.090104,19.716177]]';
