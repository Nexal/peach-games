-- Seed Klątwa Mgły into NOC KUPAŁY shop
INSERT INTO shop_items (game_id, name, description, type, icon, price, effect, duration_seconds, sort_order, max_per_game, max_per_klan, is_active)
VALUES (
  'ef910ea9-4fec-4ace-9ec8-8842a5674684',
  'Klątwa Mgły',
  'Spowija wrogi klan gęstą mgłą — przez 5 minut nie widzą żadnych markerów na mapie.',
  'curse',
  '🌫️',
  50,
  '{"type":"hide_markers"}',
  300,
  11,
  2,
  1,
  true
);
