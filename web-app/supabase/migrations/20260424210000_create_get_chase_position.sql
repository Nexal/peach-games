CREATE OR REPLACE FUNCTION get_chase_position(chase_id UUID)
RETURNS TABLE(lat DOUBLE PRECISION, lng DOUBLE PRECISION, distance_m DOUBLE PRECISION) AS $$
DECLARE
  s chase_sessions%ROWTYPE;
  elapsed DOUBLE PRECISION;
  dist_m DOUBLE PRECISION;
  earth_radius_m DOUBLE PRECISION := 6371000;
  d_lat DOUBLE PRECISION;
  d_lng DOUBLE PRECISION;
BEGIN
  SELECT * INTO s FROM chase_sessions WHERE id = chase_id AND completed_at IS NULL;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  elapsed := EXTRACT(EPOCH FROM (NOW() - s.started_at));
  dist_m := elapsed * s.speed_mps;

  d_lat := (dist_m / earth_radius_m) * COS(RADIANS(s.bearing));
  d_lng := (dist_m / (earth_radius_m * COS(RADIANS(s.start_lat)))) * SIN(RADIANS(s.bearing));

  lat := s.start_lat + (d_lat * 180 / PI());
  lng := s.start_lng + (d_lng * 180 / PI());
  distance_m := dist_m;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;
