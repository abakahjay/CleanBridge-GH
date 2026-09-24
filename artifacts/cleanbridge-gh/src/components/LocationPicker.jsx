import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { CircleAlert, CircleCheck, Crosshair, House, MapPin, Search, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { getCurrentPosition, useDebounced } from '../lib/hooks.js';
import { ACCRA } from '../lib/ghana.js';
import { BaseTiles, pinIcon, SizeFix } from './MapView.jsx';
import { Spinner } from './ui.jsx';

function Recenter({ point }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.flyTo([point.lat, point.lng], Math.max(map.getZoom(), 16), { duration: 0.6 });
  }, [point?.lat, point?.lng, map]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function MapClicks({ onPick }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
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
      const pos = await getCurrentPosition();
      setHere(pos);
      await resolvePoint(pos);
      if (pos.accuracy > 150 && !silent) setNotice(`Location is approximate (±${Math.round(pos.accuracy)} m). Drag the pin to your gate.`);
    } catch (e) {
      if (!silent) setNotice(e.message);
      else setNotice('Search for your area or tap the map to set your location.');
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
  const markerHandlers = useMemo(() => ({ dragend: (e) => { const { lat, lng } = e.target.getLatLng(); resolvePoint({ lat, lng }); } }), []); // eslint-disable-line react-hooks/exhaustive-deps
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

    <div className="loc-map" style={{ height }}>
      <MapContainer center={[(point || ACCRA).lat, (point || ACCRA).lng]} zoom={point ? 16 : 12} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
        <BaseTiles />
        <SizeFix />
        {here && <Marker position={[here.lat, here.lng]} icon={pinIcon('me')} interactive={false} />}
        {point && <Marker position={[point.lat, point.lng]} icon={pinIcon('home')} draggable eventHandlers={markerHandlers} />}
        <Recenter point={point} />
        <MapClicks onPick={resolvePoint} />
      </MapContainer>
      {!point && <div className="loc-map-hint">{locating ? 'Finding you…' : 'Tap the map to drop a pin'}</div>}
    </div>

    {service && value && <div className={`loc-service ${service.serviceable ? 'ok' : 'bad'}`} data-testid="text-service-area">
      {service.serviceable ? <CircleCheck size={15} /> : <CircleAlert size={15} />}
      <span>{service.serviceable ? <>Served from our <strong>{service.hub.name}</strong> hub · about {service.distanceKm} km by road. Drag the pin to your exact gate.</> : service.reason}</span>
    </div>}
    {notice && <div className="loc-notice">{notice}</div>}
  </div>;
}
