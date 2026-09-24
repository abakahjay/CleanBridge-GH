import { useEffect, useId, useRef, useState } from 'react';
import { Circle, MapContainer, Marker, useMap } from 'react-leaflet';
import { Check, CircleAlert, CircleCheck, Crosshair, House, MapPin, Move, Search, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { getBestPosition, useDebounced } from '../lib/hooks.js';
import { ACCRA } from '../lib/ghana.js';
import { BaseTiles, LayerToggle, pinIcon, ScrollGuard, SizeFix } from './MapView.jsx';
import { Spinner } from './ui.jsx';

function Recenter({ point }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.flyTo([point.lat, point.lng], Math.max(map.getZoom(), 16), { duration: 0.6 });
  }, [point?.lat, point?.lng, map]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// Hands the Leaflet map instance to the picker (for "Adjust pin" mode).
function MapRef({ onReady }) {
  const map = useMap();
  useEffect(() => { onReady(map); }, [map, onReady]);
  return null;
}

/**
 * Bolt-style address picker: detects the user's location, suggests places as
 * they type, and shows the pin on a map right underneath (tap or drag to adjust).
 *
 * value: { label, name, area, city, region, postcode, lat, lng } | null
 * onChange(value, service) - service = { serviceable, reason, hub, distanceKm }
 * savedPlace: optional { label, lat, lng } offered as "Home" when the box is empty
 */
export default function LocationPicker({ value, onChange, autoLocate = true, savedPlace, height = 260, label = 'Pickup location', required }) {
  const inputId = useId();
  const [query, setQuery] = useState(value?.label || '');
  const [typing, setTyping] = useState(false);
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [service, setService] = useState(null);
  const [notice, setNotice] = useState('');
  const [here, setHere] = useState(null); // user's GPS position, biases search
  const [layer, setLayer] = useState('map');
  const [hint, setHint] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [map, setMap] = useState(null);
  const boxRef = useRef(null);
  // Map/marker handlers are memoized; always call the latest onChange.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const debounced = useDebounced(query, 300);

  // Keep the text box in sync when the parent sets a value.
  useEffect(() => { if (!typing) setQuery(value?.label || ''); }, [value?.label]); // eslint-disable-line react-hooks/exhaustive-deps

  // Search as you type.
  useEffect(() => {
    if (!typing) return undefined;
    const q = debounced.trim();
    if (q.length < 2) { setResults([]); return undefined; }
    let cancelled = false;
    setSearching(true);
    const bias = here ? `&lat=${here.lat}&lng=${here.lng}` : value ? `&lat=${value.lat}&lng=${value.lng}` : '';
    api.get(`/geo/search?q=${encodeURIComponent(q)}${bias}`)
      .then(({ results: found }) => { if (!cancelled) { setResults(found); setActive(found.length ? 0 : -1); setOpen(true); } })
      .catch(() => { if (!cancelled) setResults([]); })
      .finally(() => { if (!cancelled) setSearching(false); });
    return () => { cancelled = true; };
  }, [debounced, typing]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close the dropdown on outside click.
  useEffect(() => {
    const onDown = (e) => { if (!boxRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const choose = (place, svc) => {
    setTyping(false);
    setOpen(false);
    setQuery(place.label);
    setService(svc || null);
    setNotice('');
    onChangeRef.current(place, svc || null);
  };

  const resolvePoint = async (point) => {
    setResolving(true);
    try {
      const { place, service: svc } = await api.get(`/geo/reverse?lat=${point.lat}&lng=${point.lng}`);
      if (!place) {
        setService(svc);
        setNotice(svc?.reason || 'That point is outside Ghana.');
        return;
      }
      choose(place, svc);
    } catch (e) {
      setNotice(e.message);
    } finally {
      setResolving(false);
    }
  };

  const locateMe = async ({ silent = false } = {}) => {
    setLocating(true);
    setNotice('');
    try {
      const pos = await getBestPosition();
      setHere(pos);
      await resolvePoint(pos);
      if (pos.accuracy > 60) setNotice(`Your device only knows your position to about ±${Math.round(pos.accuracy)} m. Tap “Adjust pin” and move it to your exact gate — Satellite view helps.`);
    } catch (e) {
      if (!silent) setNotice(e.message);
      else setNotice('Search for your area, or tap “Set on map” and move the pin to your gate.');
    } finally {
      setLocating(false);
    }
  };

  // Detect the user's location automatically the first time.
  useEffect(() => {
    if (autoLocate && !value) locateMe({ silent: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onKeyDown = (e) => {
    if (!open || !results.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % results.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i - 1 + results.length) % results.length); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); choose(results[active], results[active].service); }
    else if (e.key === 'Escape') setOpen(false);
  };

  const point = value ? { lat: value.lat, lng: value.lng } : null;

  // "Adjust pin": the pin stays in the centre and the map moves under it,
  // like ride-hailing apps - no accidental taps or drags change the location.
  const startAdjust = () => {
    if (!map) return;
    setAdjusting(true);
    map.dragging.enable();
    if (point) map.setView([point.lat, point.lng], Math.max(map.getZoom(), 17));
  };
  const confirmAdjust = () => {
    const c = map.getCenter();
    setAdjusting(false);
    resolvePoint({ lat: c.lat, lng: c.lng });
  };
  const showSaved = savedPlace && !query && open;

  return <div className="loc-picker" ref={boxRef}>
    <label htmlFor={inputId} className="loc-label">{label}{required && <span aria-hidden> *</span>}</label>
    <div className="loc-search">
      <Search size={16} className="loc-search-icon" />
      <input
        id={inputId}
        value={query}
        placeholder="Search street, area or landmark — e.g. Accra Mall"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        onChange={(e) => { setTyping(true); setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        data-testid="input-location-search"
      />
      {(searching || resolving) && <Spinner size={15} />}
      {query && !searching && <button type="button" className="loc-clear" onClick={() => { setTyping(true); setQuery(''); setResults([]); setOpen(true); }} aria-label="Clear"><X size={15} /></button>}
      <button type="button" className="btn btn-quiet btn-sm loc-gps" onClick={() => locateMe()} disabled={locating} data-testid="button-use-my-location">
        {locating ? <Spinner size={14} /> : <Crosshair size={14} />}<span>Use my location</span>
      </button>

      {open && (results.length > 0 || showSaved) && <ul className="loc-results" role="listbox">
        {showSaved && <li role="option" aria-selected={false} onMouseDown={(e) => { e.preventDefault(); resolvePoint(savedPlace); }}>
          <span className="loc-result-icon home"><House size={15} /></span>
          <span><strong>Home</strong><small>{savedPlace.label}</small></span>
        </li>}
        {results.map((r, i) => <li key={`${r.id}-${i}`} role="option" aria-selected={i === active} className={i === active ? 'active' : ''} onMouseEnter={() => setActive(i)} onMouseDown={(e) => { e.preventDefault(); choose(r, r.service); }} data-testid={`option-location-${i}`}>
          <span className="loc-result-icon"><MapPin size={15} /></span>
          <span><strong>{r.name}</strong><small>{r.secondary || r.label}</small></span>
          {!r.service?.serviceable && <em>Not served yet</em>}
        </li>)}
      </ul>}
      {open && typing && !searching && debounced.trim().length >= 2 && results.length === 0 && <div className="loc-results loc-empty">No places found in Ghana. Try a nearby landmark, or tap the map.</div>}
    </div>

    <div className={`loc-map ${adjusting ? 'adjusting' : ''}`} style={{ height }}>
      <LayerToggle layer={layer} onChange={setLayer} />
      {hint && !adjusting && <div className="map-hint">{hint}</div>}
      <MapContainer center={[(point || ACCRA).lat, (point || ACCRA).lng]} zoom={point ? 17 : 12} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <BaseTiles layer={layer} />
        <SizeFix />
        <ScrollGuard onHint={setHint} />
        <MapRef onReady={setMap} />
        {here && <Circle center={[here.lat, here.lng]} radius={Math.min(here.accuracy || 0, 2000)} pathOptions={{ color: '#2f7cf6', weight: 1, fillOpacity: 0.08 }} interactive={false} />}
        {here && <Marker position={[here.lat, here.lng]} icon={pinIcon('me')} interactive={false} />}
        {point && !adjusting && <Marker position={[point.lat, point.lng]} icon={pinIcon('home')} interactive={false} />}
        {!adjusting && <Recenter point={point} />}
      </MapContainer>
      {adjusting && <div className="center-pin" aria-hidden><span className="cb-pin cb-pin-home"><span><MapPin size={15} /></span></span></div>}
      <div className="loc-map-actions">
        {adjusting
          ? <><button type="button" className="btn btn-outline btn-sm" onClick={() => setAdjusting(false)}>Cancel</button><button type="button" className="btn btn-primary btn-sm" onClick={confirmAdjust} data-testid="button-confirm-pin"><Check size={14} /> Confirm this spot</button></>
          : <button type="button" className="btn btn-secondary btn-sm" onClick={startAdjust} disabled={!map} data-testid="button-adjust-pin"><Move size={14} /> {point ? 'Adjust pin' : 'Set on map'}</button>}
      </div>
      {adjusting && <div className="loc-map-hint">Move the map so the pin sits on your gate</div>}
      {!point && !adjusting && <div className="loc-map-hint">{locating ? 'Finding your exact location…' : 'Search above or tap “Set on map”'}</div>}
    </div>

    {service && value && <div className={`loc-service ${service.serviceable ? 'ok' : 'bad'}`} data-testid="text-service-area">
      {service.serviceable ? <CircleCheck size={15} /> : <CircleAlert size={15} />}
      <span>{service.serviceable ? <>Served from our <strong>{service.hub.name}</strong> hub · about {service.distanceKm} km by road. Use “Adjust pin” to put it exactly on your gate.</> : service.reason}</span>
    </div>}
    {notice && <div className="loc-notice">{notice}</div>}
  </div>;
}
