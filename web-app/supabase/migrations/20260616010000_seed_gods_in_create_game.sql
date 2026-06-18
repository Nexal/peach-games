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

  INSERT INTO gods (name, klan_id, voice_id) VALUES
    ('Perun', perun_klan_id, 'rpg9PEuAEDV7I1OjYrbj'),
    ('Weles', weles_klan_id, 'PLACEHOLDER_WELES'),
    ('Mokosz', mokosz_klan_id, 'PLACEHOLDER_MOKOSZ');

  RETURN new_game_id;
END;
$$;
