-- Remove curse immunity from RPC — handled client-side via ShopView dropdown
CREATE OR REPLACE FUNCTION award_clan_points(
  p_klan_id    UUID,
  p_base_points INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_multiplier FLOAT := 1.0;
  v_divider    FLOAT := 1.0;
  v_final_points INTEGER;
BEGIN
  -- Sprawdź aktywny buff points_multiplier (najwyższy mnożnik, nieprzeterminowany)
  SELECT MAX((effect->>'multiplier')::FLOAT) INTO v_multiplier
  FROM clan_items
  WHERE klan_id = p_klan_id
    AND type = 'buff'
    AND active = true
    AND effect->>'type' = 'points_multiplier'
    AND activated_at IS NOT NULL
    AND duration_seconds IS NOT NULL
    AND activated_at + make_interval(secs => duration_seconds) > NOW();

  IF v_multiplier IS NULL THEN
    v_multiplier := 1.0;
  END IF;

  v_final_points := ROUND(p_base_points * v_multiplier)::INTEGER;

  -- Sprawdź aktywną klątwę points_divider
  SELECT MAX((effect->>'divider')::FLOAT) INTO v_divider
  FROM clan_items
  WHERE target_klan_id = p_klan_id
    AND type = 'curse'
    AND active = true
    AND effect->>'type' = 'points_divider'
    AND activated_at IS NOT NULL
    AND duration_seconds IS NOT NULL
    AND activated_at + make_interval(secs => duration_seconds) > NOW();

  IF v_divider IS NOT NULL AND v_divider > 1.0 THEN
    v_final_points := ROUND(v_final_points / v_divider)::INTEGER;
  END IF;

  -- Oczyść przeterminowane buffy i klątwy przy okazji
  UPDATE clan_items
  SET active = false
  WHERE (klan_id = p_klan_id OR target_klan_id = p_klan_id)
    AND active = true
    AND activated_at IS NOT NULL
    AND duration_seconds IS NOT NULL
    AND activated_at + make_interval(secs => duration_seconds) <= NOW();

  -- Atomowe zwiększenie punktów
  UPDATE klans SET points = points + v_final_points WHERE id = p_klan_id;

  RETURN v_final_points;
END;
$$;
