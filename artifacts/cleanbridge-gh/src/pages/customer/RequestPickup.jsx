import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, ArrowRight, Banknote, Check, CircleAlert, Minus, Plus, Smartphone, Truck, Zap } from 'lucide-react';
import Shell from '../../components/Shell.jsx';
import LocationPicker from '../../components/LocationPicker.jsx';
import { InfoRow, Spinner } from '../../components/ui.jsx';
import PriceBreakdown from '../../components/PriceBreakdown.jsx';
import { api, appUrl } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { useDebounced } from '../../lib/hooks.js';
import { useToast } from '../../lib/toast.jsx';
import { GHANA_POST_GPS_REGEX, normalizeGps, TIME_WINDOWS, WASTE_TYPES } from '../../lib/ghana.js';
import { cedi, formatDate, isoDay } from '../../lib/format.js';

const STEPS = ['Location', 'Waste & time', 'Review & pay'];

// Vehicles the customer can choose, with live availability near the pickup.
function VehiclePicker({ place, wasteType, bags, value, onChange }) {
  const [state, setState] = useState({ options: null, loading: false });
  const key = useDebounced(place ? `${place.lat},${place.lng},${wasteType},${bags}` : '', 300);

  useEffect(() => {
    if (!key) return undefined;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    api.get(`/pickups/vehicle-options?lat=${place.lat}&lng=${place.lng}&wasteType=${encodeURIComponent(wasteType)}&bags=${bags}`)
      .then(({ options, recommended }) => {
        if (cancelled) return;
        setState({ options, loading: false });
        // Keep the customer's choice if it still fits; otherwise pick the recommended one.
        const current = options.find((o) => o.type === value);
        if (!current || !current.fits) onChange(recommended, true);
      })
      .catch(() => { if (!cancelled) setState({ options: [], loading: false }); });
    return () => { cancelled = true; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!state.options) return <div className="muted" style={{ fontSize: '.78rem' }}>{state.loading ? 'Checking vehicles near you…' : 'Set your location to see vehicles.'}</div>;
  return <div className="vehicle-grid" role="radiogroup" aria-label="Vehicle">
    {state.options.map((o) => <label key={o.type} className={`vehicle-card ${value === o.type ? 'active' : ''} ${o.fits ? '' : 'disabled'}`}>
      <input type="radio" name="vehicle" value={o.type} checked={value === o.type} disabled={!o.fits} onChange={() => onChange(o.type, false)} data-testid={`radio-vehicle-${o.type.split(' ')[0].toLowerCase()}`} />
      <div className="vehicle-top"><Truck size={18} /><strong>{o.type}</strong>{o.recommended && <span className="badge badge-green">Best fit</span>}</div>
      <span className="vehicle-desc">{o.description}</span>
      <span className="vehicle-meta">Up to ~{o.capacityBags} bags · {o.fee > 0 ? `+${cedi(o.fee)}` : 'No extra charge'}</span>
      <span className={`vehicle-avail ${o.available ? 'ok' : ''}`}>
        {!o.fits ? 'Too small for this load' : o.available ? `${o.available} available now${o.nearestKm != null ? ` · nearest ${o.nearestKm} km` : ''}` : 'None on duty right now — you can still book'}
      </span>
    </label>)}
  </div>;
}

// Hour (0-23) right now in Accra.
const accraHour = () => Number(new Date().toLocaleString('en-GB', { timeZone: 'Africa/Accra', hour: '2-digit', hour12: false }));

export default function RequestPickup() {
  const { user } = useAuth();
  const toast = useToast();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);

  const savedPlace = user.location ? { ...user.location, label: user.address || 'Saved home location' } : null;
  const [place, setPlace] = useState(null);
  const [service, setService] = useState(null);
  const [address, setAddress] = useState(user.address || '');
  const [gps, setGps] = useState(user.ghanaPostGps || '');
  const [gateNote, setGateNote] = useState('');

  const [wasteType, setWasteType] = useState('Household mix');
  const [bags, setBags] = useState(1);
  const today = isoDay();
  const [date, setDate] = useState(accraHour() >= 15 ? isoDay(Date.now() + 86400000) : today);
  const [timeWindow, setTimeWindow] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('momo');
  const [vehicleType, setVehicleType] = useState('');

  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const unit = WASTE_TYPES.find((w) => w.value === wasteType)?.unit || 'bag';

  // Hide time windows that have already started today.
  const windows = useMemo(() => TIME_WINDOWS.filter((w) => date !== today || Number(w.slice(0, 2)) > accraHour()), [date, today]);
  useEffect(() => { if (!windows.includes(timeWindow)) setTimeWindow(windows[0] || ''); }, [windows]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPlace = (value, svc) => {
    setPlace(value);
    setService(svc);
    // Suggest a street-level address from the pin; the user can refine it.
    if (value && (!address || address === place?.label)) setAddress(value.label);
  };

  // Live price as the order changes.
  const quoteKey = useDebounced(place ? JSON.stringify({ lat: place.lat, lng: place.lng, wasteType, bags, date, urgent, vehicleType }) : '', 350);
  useEffect(() => {
    if (!quoteKey) { setQuote(null); return undefined; }
    let cancelled = false;
    setQuoting(true);
    setQuoteError('');
    api.post('/pickups/quote', { location: { lat: place.lat, lng: place.lng }, wasteType, bags, scheduledDate: date, urgent, vehicleType: vehicleType || undefined })
      .then((q) => { if (!cancelled) setQuote(q); })
      .catch((e) => { if (!cancelled) { setQuote(null); setQuoteError(e.message); } })
      .finally(() => { if (!cancelled) setQuoting(false); });
    return () => { cancelled = true; };
  }, [quoteKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const gpsValue = normalizeGps(gps);
  const gpsInvalid = gps && !GHANA_POST_GPS_REGEX.test(gpsValue);
  const step1Ready = place && service?.serviceable && address.trim().length >= 3 && !gpsInvalid;
  const step2Ready = timeWindow && date >= today && vehicleType;

  const submit = async () => {
    setSubmitting(true);
    try {
      const { pickup } = await api.post('/pickups', {
        location: { lat: place.lat, lng: place.lng },
        area: place.area || place.city || place.name,
        region: place.region,
        address: address.trim(),
        ghanaPostGps: gps ? gpsValue : undefined,
        gateNote: gateNote.trim() || undefined,
        wasteType, bags, scheduledDate: date, timeWindow, urgent, paymentMethod, vehicleType
      });
      if (paymentMethod === 'momo') {
        try {
          const { authorizationUrl } = await api.post(`/payments/pickups/${pickup.id}/initialize`, { callbackUrl: appUrl('payment/callback') });
          window.location.assign(authorizationUrl);
          return;
        } catch (e) {
          toast(`Pickup booked, but payment could not start: ${e.message}. You can pay from the pickup page.`, 'error');
        }
      } else {
        toast(`Pickup ${pickup.code} booked. Pay your collector in cash at the gate.`);
      }
      navigate(`/pickups/${pickup.id}`);
    } catch (e) {
      toast(e.message, 'error');
      setSubmitting(false);
    }
  };

  return <Shell title="Request a pickup" subtitle="Tell us where, what and when — we’ll show the price upfront.">
    <div className="request-layout">
      <div className="panel form-card request-form">
        <div className="stepper">
          {STEPS.map((label, i) => <span key={label} className={`step ${step >= i + 1 ? 'active' : ''}`}>
            <i>{step > i + 1 ? <Check size={12} /> : i + 1}</i><span>{label}</span>{i < STEPS.length - 1 && <b className="step-line" />}
          </span>)}
        </div>

        {step === 1 && <div>
          <h2 className="display step-title">Where should we collect?</h2>
          <p className="muted step-text">We’ll try to detect your location. Search or drag the pin to your exact gate.</p>
          <LocationPicker value={place} onChange={onPlace} savedPlace={savedPlace} required />
          <div className="field" style={{ marginTop: '1rem' }}>
            <label htmlFor="address">House / building & street</label>
            <input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. House No. 14, Boundary Road, East Legon" data-testid="input-address" />
          </div>
          <div className="input-grid">
            <div className={`field ${gpsInvalid ? 'has-error' : ''}`}>
              <label htmlFor="gps">GhanaPost GPS <span className="muted">(optional)</span></label>
              <input id="gps" value={gps} onChange={(e) => setGps(e.target.value)} placeholder="GA-183-8164" autoCapitalize="characters" data-testid="input-gps" />
              {gpsInvalid ? <small className="field-error">Format: two letters, then numbers, e.g. GA-183-8164</small> : <small>Helps your collector find you faster.</small>}
            </div>
            <div className="field">
              <label htmlFor="note">Gate note <span className="muted">(optional)</span></label>
              <input id="note" value={gateNote} onChange={(e) => setGateNote(e.target.value)} placeholder="Blue gate opposite the church" data-testid="input-gate-note" />
            </div>
          </div>
        </div>}

        {step === 2 && <div>
          <h2 className="display step-title">What and when?</h2>
          <p className="muted step-text">Choose the closest match — you can tell the collector more at the gate.</p>
          <div className="field">
            <label>Waste type</label>
            <div className="waste-grid">
              {WASTE_TYPES.map((w) => <label key={w.value} className={`waste-card ${wasteType === w.value ? 'active' : ''}`}>
                <input type="radio" name="waste" value={w.value} checked={wasteType === w.value} onChange={() => setWasteType(w.value)} />
                <strong>{w.value}</strong><span>{w.hint}</span>
              </label>)}
            </div>
          </div>
          <div className="field">
            <label>How many {unit}s?</label>
            <div className="stepper-input">
              <button type="button" className="icon-btn" onClick={() => setBags((b) => Math.max(1, b - 1))} disabled={bags <= 1} aria-label="Fewer"><Minus size={15} /></button>
              <strong data-testid="text-quantity">{bags} {unit}{bags > 1 ? 's' : ''}</strong>
              <button type="button" className="icon-btn" onClick={() => setBags((b) => Math.min(50, b + 1))} aria-label="More"><Plus size={15} /></button>
            </div>
          </div>
          <div className="field">
            <label>Vehicle</label>
            <VehiclePicker place={place} wasteType={wasteType} bags={bags} value={vehicleType} onChange={(v) => setVehicleType(v)} />
          </div>
          <div className="input-grid">
            <div className="field"><label htmlFor="date">Date</label><input id="date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} data-testid="input-pickup-date" /></div>
            <div className="field">
              <label>Express pickup</label>
              <label className={`toggle-row ${urgent ? 'on' : ''}`}><input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} data-testid="toggle-urgent" /><Zap size={15} /> Prioritise my pickup</label>
            </div>
          </div>
          <div className="field">
            <label>Time window</label>
            {windows.length === 0
              ? <small className="field-error">No windows left today — choose another date.</small>
              : <div className="chip-row">{windows.map((w) => <button type="button" key={w} className={`chip ${timeWindow === w ? 'active' : ''}`} onClick={() => setTimeWindow(w)}>{w}</button>)}</div>}
          </div>
        </div>}

        {step === 3 && <div>
          <h2 className="display step-title">Review & pay</h2>
          <p className="muted step-text">Check the details, then choose how you’ll pay.</p>
          <div className="data-list panel" style={{ padding: '0 1rem', marginBottom: '1rem' }}>
            <InfoRow label="Where">{address}</InfoRow>
            <InfoRow label="What">{wasteType} · {bags} {unit}{bags > 1 ? 's' : ''}</InfoRow>
            <InfoRow label="Vehicle">{vehicleType}</InfoRow>
            <InfoRow label="When">{formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })} · {timeWindow}</InfoRow>
            {urgent && <InfoRow label="Priority">Express</InfoRow>}
          </div>
          <div className="field">
            <label>Payment method</label>
            <div className="pay-options">
              <label className={`pay-option ${paymentMethod === 'momo' ? 'active' : ''}`}>
                <input type="radio" name="pay" checked={paymentMethod === 'momo'} onChange={() => setPaymentMethod('momo')} data-testid="radio-pay-momo" />
                <Smartphone size={20} /><div><strong>Pay online now</strong><span>MTN MoMo, Telecel Cash, AirtelTigo Money, Visa/Mastercard, bank transfer, USSD or QR — secured by Paystack</span></div>
              </label>
              <label className={`pay-option ${paymentMethod === 'cash' ? 'active' : ''}`}>
                <input type="radio" name="pay" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} data-testid="radio-pay-cash" />
                <Banknote size={20} /><div><strong>Cash on pickup</strong><span>Pay the collector at your gate</span></div>
              </label>
            </div>
          </div>
        </div>}

        <div className="wizard-nav">
          {step > 1 ? <button className="btn btn-outline" onClick={() => setStep(step - 1)} data-testid="button-pickup-back"><ArrowLeft size={15} /> Back</button> : <span />}
          {step < 3
            ? <button className="btn btn-primary" onClick={() => setStep(step + 1)} disabled={step === 1 ? !step1Ready : !step2Ready} data-testid="button-pickup-next">Continue <ArrowRight size={15} /></button>
            : <button className="btn btn-primary" onClick={submit} disabled={submitting || !quote} data-testid="button-pickup-submit">
              {submitting ? <><Spinner size={15} /> {paymentMethod === 'momo' ? 'Opening payment…' : 'Booking…'}</> : paymentMethod === 'momo' ? <>Pay {quote ? cedi(quote.total) : ''} & book</> : <>Book pickup · {quote ? cedi(quote.total) : ''}</>}
            </button>}
        </div>
      </div>

      <aside className="panel panel-pad quote-card" aria-live="polite">
        <div className="mini-title"><h3>Price estimate</h3>{quoting && <Spinner size={15} />}</div>
        {!place && <p className="muted" style={{ fontSize: '.78rem' }}>Set your location to see the price.</p>}
        {quoteError && <div className="form-alert"><CircleAlert size={15} /><span>{quoteError}</span></div>}
        {quote && <>
          <div className="quote-total" data-testid="text-quote-total">{cedi(quote.total)}</div>
          <div className="muted" style={{ fontSize: '.72rem', marginBottom: '.8rem' }}>From our {quote.hub?.name} hub · {quote.distanceKm} km by road</div>
          <PriceBreakdown {...quote} vehicleType={vehicleType} />
          <p className="muted" style={{ fontSize: '.68rem', lineHeight: 1.5, marginTop: '.8rem' }}>Price is fixed when you book. Taxes are Ghana VAT and levies, paid to the Ghana Revenue Authority. Weekend and express charges apply only when they apply to your booking.</p>
        </>}
      </aside>
    </div>
  </Shell>;
}
