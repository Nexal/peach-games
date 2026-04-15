export type PlayerSession = {
  id: string;
  name: string;
  klan_id: string;
  klan_name: string;
  klan_color: string;
  game_id: string;
};

const SESSION_KEY = 'peachgames_player_session';

export function getPlayerSession(): PlayerSession | null {
  const data = sessionStorage.getItem(SESSION_KEY);
  if (!data) return null;
  
  try {
    return JSON.parse(data) as PlayerSession;
  } catch {
    return null;
  }
}

export function setPlayerSession(session: PlayerSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearPlayerSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}