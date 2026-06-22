-- Potrzebne, żeby filtry realtime (game_id) działały dla UPDATE/DELETE
ALTER TABLE shop_items REPLICA IDENTITY FULL;
ALTER TABLE clan_items REPLICA IDENTITY FULL;
