export interface ClanIntro {
  video: string;
  poster: string;
}

const INTRO_BASE = 'https://groomervision.pl/peach-game2/intro';

export const CLAN_INTROS: Record<string, ClanIntro> = {
  'klan peruna': {
    video: `${INTRO_BASE}/Perun-intro.mp4`,
    poster: '/icons/perun_avatar.png',
  },
  'klan welesa': {
    video: `${INTRO_BASE}/Weles-intro.mp4`,
    poster: '/icons/weles_avatar.jpeg',
  },
  'klan mokoszy': {
    video: `${INTRO_BASE}/Mokosz-intro.mp4`,
    poster: '/icons/mokosz_avatar.jpeg',
  },
};

export const CLAN_INTRO_ICONS: Record<string, string> = {
  'klan peruna': '/icons/perun_symbol-Photoroom.png',
  'klan welesa': '/icons/weles_icon_symbol-Photoroom.png',
  'klan mokoszy': '/icons/mokosz_symbol-Photoroom.png',
};

export const CLAN_INTRO_COLORS: Record<string, string> = {
  'klan peruna': '#FFD700',
  'klan welesa': '#8A2BE2',
  'klan mokoszy': '#2E8B57',
};

export const CLAN_SHORT_NAMES: Record<string, string> = {
  perun: 'klan peruna',
  weles: 'klan welesa',
  mokosz: 'klan mokoszy',
};

export const CLAN_INTRO_LIST = [
  { short: 'perun', label: 'Klan Peruna', color: '#FFD700' },
  { short: 'weles', label: 'Klan Welesa', color: '#8A2BE2' },
  { short: 'mokosz', label: 'Klan Mokoszy', color: '#2E8B57' },
] as const;

export function getClanIntro(klanName: string): ClanIntro | null {
  const key = (klanName || '').toLowerCase().trim();
  return CLAN_INTROS[key] ?? null;
}

export function getClanIntroIcon(klanName: string): string | null {
  const key = (klanName || '').toLowerCase().trim();
  return CLAN_INTRO_ICONS[key] ?? null;
}

export function getClanIntroColor(klanName: string): string | null {
  const key = (klanName || '').toLowerCase().trim();
  return CLAN_INTRO_COLORS[key] ?? null;
}

export function resolveClanShortName(short: string): string | null {
  const key = (short || '').toLowerCase().trim();
  return CLAN_SHORT_NAMES[key] ?? null;
}
