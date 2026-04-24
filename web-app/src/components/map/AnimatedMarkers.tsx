import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface AnimatedMarkerProps {
  center: [number, number];
  orbitRadius?: number;
  speed?: number;
}

export function AnimatedMarker({ center, orbitRadius = 50, speed = 0.3 }: AnimatedMarkerProps) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    console.log('AnimatedMarker: creating marker');

    const ghostIcon = L.divIcon({
      className: 'animated-ghost-marker',
      html: `<div style="
        width: 32px;
        height: 32px;
        background: #8A2BE2;
        border-radius: 50%;
        border: 3px solid #FFD700;
        box-shadow: 0 0 20px #8A2BE2;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
      ">👻</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    // Create the marker at center
    const position: L.LatLngTuple = [center[0], center[1]];
    markerRef.current = L.marker(position, { icon: ghostIcon })
      .addTo(map)
      .bindPopup('👻 Duch krąży...');

    let angle = 0;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      angle = elapsed * speed;

      // Calculate new position
      const offset = 0.001; // degrees
      const lat = center[0] + offset * Math.cos(angle);
      const lng = center[1] + offset * Math.sin(angle);

      const newPos: L.LatLngTuple = [lat, lng];
      markerRef.current?.setLatLng(newPos);

      // Continue animation
      animationRef.current = requestAnimationFrame(animate);
    };

    // Start animation after a short delay
    const timeoutId = setTimeout(() => {
      animationRef.current = requestAnimationFrame(animate);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (markerRef.current) {
        markerRef.current.remove();
      }
    };
  }, [map, center, orbitRadius, speed]);

  return null;
}

interface PulsingMarkerProps {
  position: [number, number];
}

export function PulsingMarker({ position }: PulsingMarkerProps) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.CircleMarker | null>(null);

  useEffect(() => {
    console.log('PulsingMarker: creating marker');

    const fireIcon = L.divIcon({
      className: 'pulsing-fire-marker',
      html: `
        <div style="
          width: 24px;
          height: 24px;
          background: radial-gradient(circle, #FFD700 0%, #E74C3C 70%);
          border-radius: 50%;
          border: 2px solid #FFF;
          box-shadow: 0 0 10px #FFD700, 0 0 20px rgba(255, 215, 0, 0.5);
        "></div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    markerRef.current = L.marker(position, { icon: fireIcon }).addTo(map);

    circleRef.current = L.circleMarker(position, {
      radius: 15,
      color: '#FFD700',
      fillColor: '#FFD700',
      fillOpacity: 0.4,
      weight: 2,
      className: 'pulse-ring',
    }).addTo(map);

    let scale = 1;
    let growing = true;

    const animate = () => {
      if (!circleRef.current) return;

      if (growing) {
        scale += 0.025;
        if (scale >= 3) growing = false;
      } else {
        scale -= 0.025;
        if (scale <= 1) growing = true;
      }

      circleRef.current.setRadius(12 * scale);
      circleRef.current.setStyle({ fillOpacity: 0.4 / scale });

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      markerRef.current?.remove();
      circleRef.current?.remove();
    };
  }, [map, position]);

  return null;
}