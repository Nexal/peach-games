-- Add cleanse_curses RPC + seed "Oczyszczenie" shop item

CREATE OR REPLACE FUNCTION cleanse_curses(p_klan_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE clan_items
  SET active = false
  WHERE target_klan_id = p_klan_id
    AND type = 'curse'
    AND active = true
    AND activated_at IS NOT NULL
    AND duration_seconds IS NOT NULL
    AND activated_at + make_interval(secs => duration_seconds) > NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;

-- Seed Oczyszczenie into NOC KUPAŁY shop
INSERT INTO shop_items (game_id, name, description, type, icon, price, effect, duration_seconds, sort_order, max_per_game, max_per_klan, is_active)
VALUES (
  'ef910ea9-4fec-4ace-9ec8-8842a5674684',
  'Oczyszczenie',
  'Jednorazowo usuwa wszystkie aktywne klątwy rzucone na Twój klan przez wrogów.',
  'tool',
  '✨',
  50,
  '{"type":"cleanse_curses"}',
  null,
  7,
  99,
  99,
  true
);
