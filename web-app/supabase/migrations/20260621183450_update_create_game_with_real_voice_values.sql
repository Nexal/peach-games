-- Add elevenlabs_api_key to gods if not present (was added via dashboard)
ALTER TABLE gods ADD COLUMN IF NOT EXISTS elevenlabs_api_key TEXT;

-- Update create_game to use real voice IDs and API keys from TEST_INTRO game
CREATE OR REPLACE FUNCTION create_game(game_name TEXT, game_description TEXT DEFAULT '')
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_game_id UUID;
  perun_klan_id UUID;
  weles_klan_id UUID;
  mokosz_klan_id UUID;
BEGIN
  INSERT INTO games (name, description, status)
  VALUES (game_name, game_description, 'draft')
  RETURNING id INTO new_game_id;

  INSERT INTO klans (name, theme_color, points, game_id) VALUES
    ('Klan Peruna', '#FFD700', 0, new_game_id)
  RETURNING id INTO perun_klan_id;

  INSERT INTO klans (name, theme_color, points, game_id) VALUES
    ('Klan Welesa', '#8A2BE2', 0, new_game_id)
  RETURNING id INTO weles_klan_id;

  INSERT INTO klans (name, theme_color, points, game_id) VALUES
    ('Klan Mokoszy', '#2E8B57', 0, new_game_id)
  RETURNING id INTO mokosz_klan_id;

  INSERT INTO gods (name, klan_id, voice_id, elevenlabs_api_key) VALUES
    ('Perun', perun_klan_id, 'rpg9PEuAEDV7I1OjYrbj', 'sk_64904fc992dc245b861f67deb81f8b38a9e8aff4e67a2623'),
    ('Weles', weles_klan_id, '2jg1NzSU75qikcXNP1M8', 'sk_a361020ac2f4c36e1a7adeb0d1ed96c901408f27b72b7b46'),
    ('Mokosz', mokosz_klan_id, '1ivTxaccsxknxsjgYuBt', 'sk_64904fc992dc245b861f67deb81f8b38a9e8aff4e67a2623');

  RETURN new_game_id;
END;
$$;
