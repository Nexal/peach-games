-- Copy "Tempo" buff from TEST_INTRO to NOC KUPAŁY
INSERT INTO shop_items (game_id, name, description, type, icon, price, effect, duration_seconds, sort_order, max_per_game, max_per_klan, is_active)
VALUES (
  'ef910ea9-4fec-4ace-9ec8-8842a5674684',
  'Tempo',
  '+50% zdobytych punktów przez 20 min',
  'buff',
  '⚡',
  100,
  '{"type":"points_multiplier","multiplier":1.5}',
  1200,
  5,
  2,
  1,
  true
);
