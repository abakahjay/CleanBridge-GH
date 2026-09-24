import { useEffect, useState } from 'react';
import L from 'leaflet';
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { useTheme } from '../lib/theme.jsx';
import { ACCRA } from '../lib/ghana.js';

// Standard OpenStreetMap tiles (free, no API key - attribution required).
// Dark mode is a CSS filter on the tile layer (see .cb-tiles-dark in app.css).
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
// Satellite imagery (Esri World Imagery, free with attribution) - lets people
// find their actual roof and gate where street maps are thin.
const SATELLITE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const SATELLITE_LABELS_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
const SATELLITE_ATTRIBUTION = 'Imagery &copy; Esri, Maxar, Earthstar Geographics';

export const isTouchDevice = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

const svg = (paths) => `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
const GLYPHS = {
  home: svg('<path d="M3 10a2 2 0 0 1 .7-1.5l7-6a2 2 0 0 1 2.6 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 21v-8h6v8"/>'),
  pickup: svg('<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'),
  truck: svg('<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>'),
  hub: svg('<path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/>')
};

// kind: home | pickup | truck | hub | stop | me ; text: short label (e.g. stop number)
export const pinIcon = (kind = 'home', text = '', tone = '') => {
  if (kind === 'me') {
    return L.divIcon({ className: '', html: '<div class="cb-me"><i></i></div>', iconSize: [22, 22], iconAnchor: [11, 11] });
  }
  const inner = text !== '' ? `<b>${String(text).replace(/[^\w-]/g, '').slice(0, 3)}</b>` : (GLYPHS[kind] || GLYPHS.pickup);
  return L.divIcon({
    className: '',
    html: `<div class="cb-pin cb-pin-${kind} ${tone ? `cb-tone-${tone}` : ''}"><span>${inner}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -32]
  });
};

export function BaseTiles({ layer = 'map' }) {
  const { theme } = useTheme();
  if (layer === 'satellite') {
    return <>
      <TileLayer key="sat" url={SATELLITE_URL} attribution={SATELLITE_ATTRIBUTION} maxZoom={19} maxNativeZoom={18} />
      <TileLayer key="sat-labels" url={SATELLITE_LABELS_URL} maxZoom={19} maxNativeZoom={18} />
    </>;
  }
  return <TileLayer key={theme} url={TILE_URL} attribution={ATTRIBUTION} maxZoom={19} className={theme === 'dark' ? 'cb-tiles-dark' : ''} />;
}

// Map / Satellite switch (top-right corner of the map).
export function LayerToggle({ layer, onChange }) {
  return <div className="map-layer-toggle" role="group" aria-label="Map style">
    {[['map', 'Map'], ['satellite', 'Satellite']].map(([k, label]) => <button key={k} type="button" className={layer === k ? 'active' : ''} onClick={(e) => { e.stopPropagation(); onChange(k); }} data-testid={`button-layer-${k}`}>{label}</button>)}
  </div>;
}

// Keeps the page from fighting the map:
// - mouse wheel scrolls the page; Ctrl/Cmd + wheel zooms the map (with a hint)
// - on touch screens one finger scrolls the page until the map is tapped
export function ScrollGuard({ onHint }) {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const touch = isTouchDevice();
    let hintTimer;
    const hint = (text) => { onHint?.(text); clearTimeout(hintTimer); hintTimer = setTimeout(() => onHint?.(''), 1400); };
    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) map.zoomIn(); else map.zoomOut();
      } else {
        hint('Use Ctrl + scroll to zoom the map');
      }
    };
    const unlock = () => { if (touch && !map.dragging.enabled()) { map.dragging.enable(); hint('Map unlocked — drag to move'); } };
    const lockOnOutside = (e) => { if (touch && !el.contains(e.target) && map.dragging.enabled()) map.dragging.disable(); };
    if (touch) map.dragging.disable();
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('click', unlock);
    document.addEventListener('pointerdown', lockOnOutside);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('click', unlock);
      document.removeEventListener('pointerdown', lockOnOutside);
      clearTimeout(hintTimer);
    };
  }, [map, onHint]);
  return null;
}

// Leaflet measures its container once; re-measure when the layout changes.
export function SizeFix() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

export function FitBounds({ points, maxZoom = 16 }) {
  const map = useMap();
  const key = points.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join('|');
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) map.setView([points[0].lat, points[0].lng], Math.max(map.getZoom(), 15), { animate: true });
    else map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [42, 42], maxZoom, animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map, maxZoom]);
  return null;
}

function ClickHandler({ onClick }) {
  useMapEvents({ click: (e) => onClick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

const valid = (p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng);

/**
 * markers: [{ id, position:{lat,lng}, kind, text, tone, popup }]
 * polyline: [{lat,lng}], circles: [{ id, center:{lat,lng}, radiusKm }]
 */
export default function MapView({ markers = [], polyline, circles = [], height = 360, center = ACCRA, zoom = 12, fit = true, onMapClick, className = '', children }) {
  const shown = markers.filter((m) => valid(m.position));
  const [layer, setLayer] = useState('map');
  const [hint, setHint] = useState('');
  return <div className={`map-shell ${className}`} style={{ height }}>
    <LayerToggle layer={layer} onChange={setLayer} />
    {hint && <div className="map-hint">{hint}</div>}
    <MapContainer center={[center.lat, center.lng]} zoom={zoom} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
      <BaseTiles layer={layer} />
      <SizeFix />
      <ScrollGuard onHint={setHint} />
      {circles.map((c) => <Circle key={c.id} center={[c.center.lat, c.center.lng]} radius={c.radiusKm * 1000} pathOptions={{ color: '#21927b', weight: 1, fillOpacity: 0.06 }} />)}
      {polyline?.length > 1 && <Polyline positions={polyline.map((p) => [p.lat, p.lng])} pathOptions={{ color: '#ef704e', weight: 4, opacity: 0.85, dashArray: '8 8' }} />}
      {shown.map((m) => <Marker key={m.id} position={[m.position.lat, m.position.lng]} icon={pinIcon(m.kind, m.text, m.tone)}>
        {m.popup && <Popup>{m.popup}</Popup>}
      </Marker>)}
      {fit && <FitBounds points={shown.map((m) => m.position)} />}
      {onMapClick && <ClickHandler onClick={onMapClick} />}
      {children}
    </MapContainer>
  </div>;
}
