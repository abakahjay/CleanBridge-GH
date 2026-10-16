import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, ArrowRight, Banknote, Building2, CalendarClock, Check, CircleAlert, Droplets, Minus, Plus, Repeat, Smartphone, Truck, Zap } from 'lucide-react';
import Shell from '../../components/Shell.jsx';
import LocationPicker from '../../components/LocationPicker.jsx';
import { InfoRow, Spinner } from '../../components/ui.jsx';
import PriceBreakdown from '../../components/PriceBreakdown.jsx';
import { api, appUrl } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { useApi, useDebounced } from '../../lib/hooks.js';
import { useToast } from '../../lib/toast.jsx';
import { FREQUENCIES, GHANA_POST_GPS_REGEX, isOffHoursWindow, normalizeGps, TIME_WINDOWS, WASTE_TYPES } from '../../lib/ghana.js';
import { cedi, formatDate, isoDay, planSchedule } from '../../lib/format.js';

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
  const [frequency, setFrequency] = useState('once');
  const [floors, setFloors] = useState(0);
  const [binWash, setBinWash] = useState(false);
  const settings = useApi('/settings');
  const fees = settings.data?.pricing;
  const discounts = settings.data?.recurring || {};
  const recurring = frequency !== 'once';

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
  const quoteKey = useDebounced(place ? JSON.stringify({ lat: place.lat, lng: place.lng, wasteType, bags, date, urgent, vehicleType, timeWindow, floors, binWash, frequency }) : '', 350);
  useEffect(() => {
    if (!quoteKey) { setQuote(null); return undefined; }
    let cancelled = false;
    setQuoting(true);
    setQuoteError('');
    api.post('/pickups/quote', { location: { lat: place.lat, lng: place.lng }, wasteType, bags, scheduledDate: date, urgent: recurring ? false : urgent, vehicleType: vehicleType || undefined, timeWindow, floors, binWash, frequency })
      .then((q) => { if (!cancelled) setQuote(q); })
      .catch((e) => { if (!cancelled) { setQuote(null); setQuoteError(e.message); } })
      .finally(() => { if (!cancelled) setQuoting(false); });
    return () => { cancelled = true; };
  }, [quoteKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const gpsValue = normalizeGps(gps);
  const gpsInvalid = gps && !GHANA_POST_GPS_REGEX.test(gpsValue);
  const step1Ready = place && service?.serviceable && address.trim().length >= 3 && !gpsInvalid;
  const step2Ready = timeWindow && date >= today && vehicleType;

  const startPayment = async (pickup) => {
    try {
      const { authorizationUrl } = await api.post(`/payments/pickups/${pickup.id}/initialize`, { callbackUrl: appUrl('payment/callback') });
      window.location.assign(authorizationUrl);
      return true;
    } catch (e) {
      toast(`Booked, but payment could not start: ${e.message}. You can pay from the pickup page.`, 'error');
      return false;
    }
  };

  const submit = async () => {
    setSubmitting(true);
    const order = {
      location: { lat: place.lat, lng: place.lng },
      area: place.area || place.city || place.name,
      region: place.region,
      address: address.trim(),
      ghanaPostGps: gps ? gpsValue : undefined,
      gateNote: gateNote.trim() || undefined,
      wasteType, bags, timeWindow, paymentMethod, vehicleType, floors, binWash
    };
    try {
      if (recurring) {
        const { subscription, pickup } = await api.post('/subscriptions', { ...order, frequency, startDate: date });
        if (paymentMethod === 'momo' && pickup && await startPayment(pickup)) return;
        toast(`${subscription.code} started. ${planSchedule(frequency, date)}, first pickup ${formatDate(date)}.`);
        navigate('/plans');
        return;
      }
      const { pickup } = await api.post('/pickups', { ...order, scheduledDate: date, urgent });
      if (paymentMethod === 'momo') {
        if (await startPayment(pickup)) return;
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
          <p className="muted step-text">We’ll try to detect your location. Search, or use “Adjust pin” to put it exactly on your gate.</p>
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
            <label>How often?</label>
            <div className="freq-grid" role="radiogroup" aria-label="How often">
              {FREQUENCIES.map((f) => {
                const pct = f.value === 'weekly' ? discounts.weeklyDiscountPct : f.value === 'monthly' ? discounts.monthlyDiscountPct : 0;
                return <label key={f.value} className={`freq-card ${frequency === f.value ? 'active' : ''}`}>
                  <input type="radio" name="frequency" value={f.value} checked={frequency === f.value} onChange={() => setFrequency(f.value)} data-testid={`radio-frequency-${f.value}`} />
                  <span className="freq-top">{f.value === 'once' ? <CalendarClock size={16} /> : <Repeat size={16} />}<strong>{f.label}</strong></span>
                  <span className="freq-hint">{f.hint}</span>
                  {pct > 0 && <span className="badge badge-green">Save {pct}%</span>}
                </label>;
              })}
            </div>
            {recurring && <small className="freq-note"><Repeat size={12} /> {planSchedule(frequency, date)}, starting {formatDate(date, { weekday: 'short', day: 'numeric', month: 'short' })}. We book each visit 2 days ahead. Pause or cancel any time from <strong>My plans</strong>.</small>}
          </div>
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
            <div className="field"><label htmlFor="date">{recurring ? 'First pickup' : 'Date'}</label><input id="date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} data-testid="input-pickup-date" /></div>
            {recurring
              ? <div className="field"><label>Express pickup</label><small className="muted" style={{ display: 'block', paddingTop: '.7rem' }}>Not needed on a plan: your slot is reserved for every visit.</small></div>
              : <div className="field">
                <label>Express pickup</label>
                <label className={`toggle-row ${urgent ? 'on' : ''}`}><input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} data-testid="toggle-urgent" /><Zap size={15} /> Prioritise my pickup{fees?.urgencyFee ? ` · +${cedi(fees.urgencyFee)}` : ''}</label>
              </div>}
          </div>
          <div className="field">
            <label>Time window</label>
            {windows.length === 0
              ? <small className="field-error">No windows left today — choose another date.</small>
              : <div className="chip-row">{windows.map((w) => <button type="button" key={w} className={`chip ${timeWindow === w ? 'active' : ''}`} onClick={() => setTimeWindow(w)} data-testid={`chip-window-${w.slice(0, 2)}`}>{w}{isOffHoursWindow(w) && fees?.offHoursFee > 0 && <span className="chip-extra"> +{cedi(fees.offHoursFee)}</span>}</button>)}</div>}
          </div>
          <div className="field">
            <label>Extras <span className="muted">(optional)</span></label>
            <div className="extras-grid">
              <div className={`extra-card ${floors > 0 ? 'active' : ''}`}>
                <span className="freq-top"><Building2 size={16} /><strong>Carry down from upstairs</strong></span>
                <span className="freq-hint">No lift? Floors above ground{fees?.carryFeePerFloor ? ` · ${cedi(fees.carryFeePerFloor)} per floor` : ''}</span>
                <div className="stepper-input compact">
                  <button type="button" className="icon-btn" onClick={() => setFloors((f) => Math.max(0, f - 1))} disabled={floors <= 0} aria-label="Fewer floors"><Minus size={14} /></button>
                  <strong data-testid="text-floors">{floors === 0 ? 'Ground floor' : `${floors} floor${floors > 1 ? 's' : ''} up`}</strong>
                  <button type="button" className="icon-btn" onClick={() => setFloors((f) => Math.min(30, f + 1))} aria-label="More floors" data-testid="button-floors-more"><Plus size={14} /></button>
                </div>
              </div>
              <label className={`extra-card ${binWash ? 'active' : ''}`}>
                <span className="freq-top"><input type="checkbox" checked={binWash} onChange={(e) => setBinWash(e.target.checked)} data-testid="toggle-bin-wash" /><Droplets size={16} /><strong>Bin wash & sanitise</strong></span>
                <span className="freq-hint">We rinse and disinfect your bin after emptying it{fees?.binWashFee ? ` · +${cedi(fees.binWashFee)}` : ''}</span>
              </label>
            </div>
          </div>
        </div>}

        {step === 3 && <div>
          <h2 className="display step-title">Review & pay</h2>
          <p className="muted step-text">Check the details, then choose how you’ll pay.</p>
          <div className="data-list panel" style={{ padding: '0 1rem', marginBottom: '1rem' }}>
            <InfoRow label="Where">{address}</InfoRow>
            <InfoRow label="What">{wasteType} · {bags} {unit}{bags > 1 ? 's' : ''}</InfoRow>
            <InfoRow label="Vehicle">{vehicleType}</InfoRow>
            <InfoRow label={recurring ? 'First pickup' : 'When'}>{formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })} · {timeWindow}</InfoRow>
            {recurring && <InfoRow label="Repeats">{planSchedule(frequency, date)}</InfoRow>}
            {!recurring && urgent && <InfoRow label="Priority">Express</InfoRow>}
            {(floors > 0 || binWash) && <InfoRow label="Extras">{[floors > 0 && `Carry down ${floors} floor${floors > 1 ? 's' : ''}`, binWash && 'Bin wash'].filter(Boolean).join(' · ')}</InfoRow>}
          </div>
          <div className="field">
            <label>Payment method</label>
            <div className="pay-options">
              <label className={`pay-option ${paymentMethod === 'momo' ? 'active' : ''}`}>
                <input type="radio" name="pay" checked={paymentMethod === 'momo'} onChange={() => setPaymentMethod('momo')} data-testid="radio-pay-momo" />
                <Smartphone size={20} /><div><strong>{recurring ? 'Pay online for each visit' : 'Pay online now'}</strong><span>{recurring ? 'Pay the first visit now; we remind you before each one. ' : ''}MTN MoMo, Telecel Cash, AirtelTigo Money, Visa/Mastercard, bank transfer, USSD or QR — secured by Paystack</span></div>
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
              {submitting ? <><Spinner size={15} /> {paymentMethod === 'momo' ? 'Opening payment…' : 'Booking…'}</>
                : recurring ? <><Repeat size={15} /> Start {frequency} plan · {quote ? `${cedi(quote.total)}/visit` : ''}</>
                  : paymentMethod === 'momo' ? <>Pay {quote ? cedi(quote.total) : ''} & book</> : <>Book pickup · {quote ? cedi(quote.total) : ''}</>}
            </button>}
        </div>
      </div>

      <aside className="panel panel-pad quote-card" aria-live="polite">
        <div className="mini-title"><h3>Price estimate</h3>{quoting && <Spinner size={15} />}</div>
        {!place && <p className="muted" style={{ fontSize: '.78rem' }}>Set your location to see the price.</p>}
        {quoteError && <div className="form-alert"><CircleAlert size={15} /><span>{quoteError}</span></div>}
        {quote && <>
          <div className="quote-total" data-testid="text-quote-total">{cedi(quote.total)}{recurring && <span className="quote-per"> / visit</span>}</div>
          {recurring && <div className="plan-chip"><Repeat size={12} /> {planSchedule(frequency, date)}{quote.discountPct ? ` · ${quote.discountPct}% off` : ''}</div>}
          <div className="muted" style={{ fontSize: '.72rem', marginBottom: '.8rem' }}>From our {quote.hub?.name} hub · {quote.distanceKm} km by road</div>
          <PriceBreakdown {...quote} vehicleType={vehicleType} />
          <p className="muted" style={{ fontSize: '.68rem', lineHeight: 1.5, marginTop: '.8rem' }}>Price is fixed when you book. Taxes are Ghana VAT and levies, paid to the Ghana Revenue Authority. Weekend, express and early/evening charges apply only when they apply to your booking.{recurring ? ' Each visit is priced when it is booked, so a fuel or price change can move it slightly.' : ''}</p>
        </>}
      </aside>
    </div>
  </Shell>;
}
