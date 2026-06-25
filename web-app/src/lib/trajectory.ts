export function generateRandomTrajectory(waypointCount: number, area: any) {
  let randomPoint: () => { lat: number; lng: number };

  if (area && Array.isArray(area) && area.length === 4 && Array.isArray(area[0])) {
    const corners = area.map((p: number[]) => ({ lat: p[0], lng: p[1] }));
    randomPoint = () => {
      const u = Math.random();
      const v = Math.random();
      return {
        lat: Math.round(((1-u)*(1-v)*corners[0].lat + u*(1-v)*corners[1].lat + u*v*corners[2].lat + (1-u)*v*corners[3].lat) * 1e6) / 1e6,
        lng: Math.round(((1-u)*(1-v)*corners[0].lng + u*(1-v)*corners[1].lng + u*v*corners[2].lng + (1-u)*v*corners[3].lng) * 1e6) / 1e6,
      };
    };
  } else if (area && typeof area.center !== 'undefined') {
    const cLat = area.center[0];
    const cLng = area.center[1];
    const radius = area.radius || 20;
    const latPerM = 1 / 111320;
    const lngPerM = 1 / (111320 * Math.cos(cLat * Math.PI / 180));
    randomPoint = () => {
      const angle = Math.random() * 2 * Math.PI;
      const dist = radius * Math.random();
      return {
        lat: Math.round((cLat + dist * latPerM * Math.cos(angle)) * 1e6) / 1e6,
        lng: Math.round((cLng + dist * lngPerM * Math.sin(angle)) * 1e6) / 1e6,
      };
    };
  } else {
    const corners = [
      { lat: 50.089915, lng: 19.714189 },
      { lat: 50.089368, lng: 19.714428 },
      { lat: 50.089570, lng: 19.716539 },
      { lat: 50.090104, lng: 19.716177 },
    ];
    randomPoint = () => {
      const u = Math.random();
      const v = Math.random();
      return {
        lat: Math.round(((1-u)*(1-v)*corners[0].lat + u*(1-v)*corners[1].lat + u*v*corners[2].lat + (1-u)*v*corners[3].lat) * 1e6) / 1e6,
        lng: Math.round(((1-u)*(1-v)*corners[0].lng + u*(1-v)*corners[1].lng + u*v*corners[2].lng + (1-u)*v*corners[3].lng) * 1e6) / 1e6,
      };
    };
  }
  return Array.from({ length: waypointCount }, () => randomPoint());
}
