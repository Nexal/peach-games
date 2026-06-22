import L from 'leaflet';

export const baseIcon = new L.Icon({
  iconUrl: '/markers/ognisko-Photoroom.png',
  iconSize: [48, 26],
  iconAnchor: [24, 26],
  popupAnchor: [0, -26],
});

export const questIcon = new L.Icon({
  iconUrl: '/markers/quest.svg',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

export const clanIcon = new L.Icon({
  iconUrl: '/markers/clan.svg',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

export const chaseIcon = new L.Icon({
  iconUrl: '/markers/chase.svg',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
});

export const qrIcon = new L.Icon({
  iconUrl: '/markers/qr.svg',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
});

export const photoIcon = new L.Icon({
  iconUrl: '/markers/photo.svg',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
});

/*
 * Aby użyć PNG zamiast SVG, umieść pliki w `/public/markers/png/`
 * i podmień `iconUrl` np. na `'/markers/png/quest.png'`.
 * Leaflet obsługuje PNG natywnie — wystarczy podmiana ścieżki.
 */
