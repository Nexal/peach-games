export interface MapMarker {
  id: string;
  position: [number, number]; // [lat, lng]
  title: string;
  description?: string;
  type: 'quest' | 'base' | 'clan_base' | 'chase';
  clan_id?: string;
  icon_url?: string;
  is_active: boolean;
  quest_id?: string;
  reward_points?: number;
}

export interface MapConfig {
  center: [number, number]; // [lat, lng]
  zoom: number;
  maxZoom: number;
  minZoom: number;
}

export const DEFAULT_MAP_CONFIG: MapConfig = {
  center: [50.089864, 19.713925], // Ognisko / Baza
  zoom: 16,
  maxZoom: 19,
  minZoom: 13,
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
};