ALTER TABLE quests ADD COLUMN target_lat DOUBLE PRECISION;
ALTER TABLE quests ADD COLUMN target_lng DOUBLE PRECISION;
COMMENT ON COLUMN quests.target_lat IS 'Latitude coordinate for QR/location-based quest marker';
COMMENT ON COLUMN quests.target_lng IS 'Longitude coordinate for QR/location-based quest marker';