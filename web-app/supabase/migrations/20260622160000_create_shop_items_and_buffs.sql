-- Katalog sklepu (shop_items) + modyfikacje clan_items + RPC award_clan_points

-- 1. Nowa tabela: katalog przedmiotów dostępnych w sklepie
CREATE TABLE shop_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id         UUID REFERENCES games(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('buff', 'curse', 'tool')),
  icon            TEXT NOT NULL,
  price           INTEGER NOT NULL,
  effect          JSONB NOT NULL DEFAULT '{}',
  duration_seconds INTEGER,
  max_per_game    INTEGER,
  max_per_klan    INTEGER,
  sort_order      INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read on shop_items" ON shop_items FOR SELECT USING (true);
CREATE POLICY "Public insert on shop_items" ON shop_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update on shop_items" ON shop_items FOR UPDATE USING (true);
CREATE POLICY "Public delete on shop_items" ON shop_items FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE shop_items;

-- 2. Modyfikacje clan_items — referencje do katalogu, target klanu, game_id
ALTER TABLE clan_items ADD COLUMN IF NOT EXISTS shop_item_id UUID REFERENCES shop_items(id);
ALTER TABLE clan_items ADD COLUMN IF NOT EXISTS target_klan_id UUID REFERENCES klans(id);
ALTER TABLE clan_items ADD COLUMN IF NOT EXISTS game_id UUID REFERENCES games(id);

-- 3. RPC: centralne przyznawanie punktów z obsługą buffów
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

  -- Oczyść przeterminowane buffy przy okazji
  UPDATE clan_items
  SET active = false
  WHERE klan_id = p_klan_id
    AND active = true
    AND activated_at IS NOT NULL
    AND duration_seconds IS NOT NULL
    AND activated_at + make_interval(secs => duration_seconds) <= NOW();

  -- Atomowe zwiększenie punktów
  UPDATE klans SET points = points + v_final_points WHERE id = p_klan_id;

  RETURN v_final_points;
END;
$$;
