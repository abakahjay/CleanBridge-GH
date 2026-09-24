import { useEffect, useState } from 'react';
import { Church, Fuel, Globe, GraduationCap, Hospital, Hotel, Landmark, MapPin, Phone, Pill, ShoppingBag, Utensils } from 'lucide-react';
import { api } from '../lib/api.js';

// Icon for a place category from /geo/search (Overture categories, humanised).
export function placeIcon(category) {
  const c = String(category || '').toLowerCase();
  if (/worship|church|religious|mosque/.test(c)) return Church;
  if (/school|learning|college|university|education/.test(c)) return GraduationCap;
  if (/pharmacy|drug/.test(c)) return Pill;
  if (/hospital|clinic|health|medical/.test(c)) return Hospital;
  if (/hotel|lodg|resort|guest/.test(c)) return Hotel;
  if (/restaurant|food|bar|cafe|eat/.test(c)) return Utensils;
  if (/gas station|fuel/.test(c)) return Fuel;
  if (/bank|financ|atm|government|office/.test(c)) return Landmark;
  if (/store|shop|mall|market|supermarket/.test(c)) return ShoppingBag;
  return MapPin;
}

/**
 * "What does this place look like?" under the location picker: a satellite
 * snapshot centred on the pin, plus real photos taken nearby (Wikimedia
 * Commons) when there are any, and the business's phone/website if known.
 */
export default function PlacePreview({ place }) {
  const [media, setMedia] = useState(null);
  const lat = place?.lat;
  const lng = place?.lng;

  useEffect(() => {
    if (lat == null || lng == null) { setMedia(null); return undefined; }
    let cancelled = false;
    setMedia(null);
    api.get(`/geo/photos?lat=${lat}&lng=${lng}`)
      .then((m) => { if (!cancelled) setMedia(m); })
      .catch(() => { if (!cancelled) setMedia({ photos: [] }); });
    return () => { cancelled = true; };
  }, [lat, lng]);

  if (!place) return null;
  const Icon = placeIcon(place.category);
  const title = place.name || place.label || 'Selected location';
  const website = place.website && /^https?:\/\//i.test(place.website) ? place.website : null;

  return <div className="place-preview" data-testid="place-preview">
    <div className="place-preview-head">
      <span className="loc-result-icon"><Icon size={15} /></span>
      <div>
        <strong>{title}</strong>
        <small>{[place.category, place.secondary].filter(Boolean).join(' · ')}</small>
      </div>
    </div>
    {(place.phone || website) && <div className="place-preview-links">
      {place.phone && <a href={`tel:${place.phone}`}><Phone size={13} /> {place.phone}</a>}
      {website && <a href={website} target="_blank" rel="noopener noreferrer"><Globe size={13} /> Website</a>}
    </div>}
    <div className="place-photos">
      {media?.satellite && <figure>
        <img src={media.satellite.url} alt={`Satellite view of ${title}`} loading="lazy" />
        <figcaption>Satellite view</figcaption>
      </figure>}
      {media?.photos?.map((p) => <figure key={p.page}>
        <a href={p.page} target="_blank" rel="noopener noreferrer"><img src={p.thumb} alt={p.title} loading="lazy" /></a>
        <figcaption title={[p.author, p.license].filter(Boolean).join(' · ')}>{p.title}</figcaption>
      </figure>)}
      {!media && <div className="place-photo-skeleton" />}
    </div>
    <small className="place-credit">
      Imagery © Esri, Maxar{media?.photos?.length ? ' · Photos: Wikimedia Commons' : ''} · Places © OpenStreetMap, Overture Maps Foundation
    </small>
  </div>;
}
