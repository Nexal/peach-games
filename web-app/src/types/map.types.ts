export interface MapMarker {
  id: string;
  position: [number, number]; // [lat, lng]
  title: string;
  description?: string;
  type: 'quest' | 'base' | 'clan_base' | 'chase' | 'qr' | 'photo';
  clan_id?: string;
  icon_url?: string;
  is_active: boolean;
  quest_id?: string;
  task_id?: string;
  reward_points?: number;
}

export interface MapConfig {
  center: [number, number]; // [lat, lng]
  zoom: number;
  maxZoom: number;
  minZoom: number;
}

export const DEFAULT_MAP_CONFIG: MapConfig = {
  center: [50.089739, 19.713854], // Ognisko / Baza
  zoom: 16,
  maxZoom: 21,
  minZoom: 9,
};

export const TILE_LAYERS = {
  osm: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
  },
  dark: {
    url: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap contributors, © CARTO',
  },
  dark_nolabels: {
    url: 'https://basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap contributors, © CARTO',
  },
  light: {
    url: 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap contributors, © CARTO',
  },
};