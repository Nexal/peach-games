-- Seed Klątwa Chaosu into NOC KUPAŁY shop
INSERT INTO shop_items (game_id, name, description, type, icon, price, effect, duration_seconds, sort_order, max_per_game, max_per_klan, is_active)
VALUES (
  'ef910ea9-4fec-4ace-9ec8-8842a5674684',
  'Klątwa Chaosu',
  'Wprowadza chaos na mapie wrogiego klanu — przez 5 minut wszystkie markery skaczą losowo w promieniu 30 metrów od prawdziwej lokalizacji.',
  'curse',
  '🌀',
  50,
  '{"type":"chaos_markers"}',
  300,
  12,
  2,
  1,
  true
);
