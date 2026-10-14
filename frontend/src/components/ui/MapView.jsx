import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const pin = (html, cls) => L.divIcon({ className: `mappin ${cls}`, html, iconSize: [38, 38], iconAnchor: [19, 38] });

/** Interactive map: the restaurant (orange pin) and, when known, the visitor (blue dot). */
export default function MapView({ place, user }) {
  const el = useRef(null);
  const map = useRef(null);
  const userMarker = useRef(null);

  useEffect(() => {
    const m = L.map(el.current, { scrollWheelZoom: false, zoomControl: true }).setView([place.lat, place.lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(m);
    L.marker([place.lat, place.lng], { icon: pin('<span>🍽️</span>', 'place'), title: place.name }).addTo(m).bindPopup(`<b>${place.name.replace(/</g, '&lt;')}</b>`);
    map.current = m;
    setTimeout(() => m.invalidateSize(), 150);
    return () => {
      m.remove();
      map.current = null;
      userMarker.current = null;
    };
  }, [place.lat, place.lng, place.name]);

  useEffect(() => {
    const m = map.current;
    if (!m || !user) return;
    if (userMarker.current) userMarker.current.remove();
    userMarker.current = L.marker([user.lat, user.lng], { icon: pin('<span class="you"></span>', 'you-pin'), title: 'You are here' }).addTo(m).bindPopup('You are here');
    m.fitBounds(L.latLngBounds([[place.lat, place.lng], [user.lat, user.lng]]), { padding: [40, 40], maxZoom: 16 });
  }, [user, place.lat, place.lng]);

  return <div ref={el} className="leafmap" role="region" aria-label={`Map showing ${place.name}`} />;
}
