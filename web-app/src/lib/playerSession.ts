export type PlayerSession = {
  id: string;
  player_id?: string;
  name: string;
  klan_id: string;
  klan_name: string;
  klan_color: string;
  game_id: string;
  avatar_url?: string | null;
  session_start?: string;
  is_test?: boolean;
};

const SESSION_KEY = 'peachgames_player_session';

export function getPlayerSession(): PlayerSession | null {
  const data = localStorage.getItem(SESSION_KEY);
  if (!data) return null;
  
  try {
    const parsed = JSON.parse(data) as PlayerSession;
    parsed.player_id = parsed.player_id || parsed.id;
    return parsed;
  } catch {
    return null;
  }
}

export function setPlayerSession(session: PlayerSession): void {
  const sessionWithPlayerId = {
    ...session,
    player_id: session.player_id || session.id,
    session_start: new Date().toISOString(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionWithPlayerId));
}

export function clearPlayerSession(): void {
  localStorage.removeItem(SESSION_KEY);
}