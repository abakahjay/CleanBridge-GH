import { useEffect, useMemo, useState } from 'react';
import { CircleDollarSign, Fuel, HandCoins, Save } from 'lucide-react';
import Shell from '../../components/Shell.jsx';
import { Async, InfoRow, PageHead, Spinner, StatCard } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { useApi } from '../../lib/hooks.js';
import { useToast } from '../../lib/toast.jsx';
import { VEHICLE_TYPES, WASTE_TYPES } from '../../lib/ghana.js';
import { cedi, formatDate, isoDay } from '../../lib/format.js';

const num = (v) => (v === '' ? NaN : Number(v));

export function AdminFuel() {
  const toast = useToast();
  const state = useApi('/settings');
  const routes = useApi('/dashboard/analytics?days=30');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(isoDay());
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.put('/settings/fuel', { currentPrice: num(price), effectiveDate: date });
      state.setData(updated);
      setPrice('');
      toast('Fuel price updated. New routes will use it.');
    } catch (err) { toast(err.message, 'error'); } finally { setSaving(false); }
  };

  return <Shell title="Fuel costs" subtitle="Keep route economics grounded in the pump price.">
    <PageHead eyebrow="Operations" title="Fuel price" text="Update this when the NPA pricing window changes (1st and 16th of each month). Routes snapshot the price when they are planned." />
    <Async state={state}>{({ fuel }) => {
      const change = fuel.currentPrice - fuel.previousPrice;
      return <div className="grid-2">
        <div className="panel panel-pad">
          <div className="mini-title"><h3>Current {fuel.fuelType.toLowerCase()} price</h3><Fuel size={18} className="muted" /></div>
          <div className="stat-value">{cedi(fuel.currentPrice)} <span className="muted" style={{ fontSize: '.9rem' }}>/ L</span></div>
          <div className="stat-foot">Effective {formatDate(fuel.effectiveDate, { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          <div className="data-list section-rule">
            <InfoRow label="Previous price">{cedi(fuel.previousPrice)} / L</InfoRow>
            <InfoRow label="Change"><span className={change > 0 ? 'tone-orange' : 'tone-green'}>{change >= 0 ? '+' : ''}{cedi(change)} / L</span></InfoRow>
          </div>
          <form onSubmit={save} className="section-rule" style={{ paddingTop: '1rem' }}>
            <div className="input-grid">
              <div className="field"><label htmlFor="f-price">New price (GH₵ / L)</label><input id="f-price" type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={fuel.currentPrice.toFixed(2)} required data-testid="input-fuel-price" /></div>
              <div className="field"><label htmlFor="f-date">Effective from</label><input id="f-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            </div>
            <button className="btn btn-primary" disabled={saving || !(num(price) >= 0)} data-testid="button-update-fuel">{saving ? <Spinner size={15} /> : <Save size={15} />} Update fuel price</button>
          </form>
        </div>
        <div className="panel panel-pad">
          <div className="mini-title"><h3>Last 30 days of routes</h3></div>
          <Async state={routes}>{({ fuel: f }) => <div className="data-list">
            <InfoRow label="Routes driven">{f.routes}</InfoRow>
            <InfoRow label="Distance">{f.distanceKm} km</InfoRow>
            <InfoRow label="Fuel used (est.)">{f.fuelLitres} L</InfoRow>
            <InfoRow label="Fuel cost (est.)">{cedi(f.fuelCost)}</InfoRow>
            <InfoRow label="Cost per km">{f.distanceKm ? cedi(f.fuelCost / f.distanceKm) : '—'}</InfoRow>
          </div>}</Async>
        </div>
      </div>;
    }}</Async>
  </Shell>;
}

const PRICING_FIELDS = [
  ['baseFee', 'Base fee', 'Charged on every pickup'],
  ['distanceFeePerKm', 'Distance fee / km', 'Road km from the nearest hub'],
  ['perBagFee', 'Per bag / item', 'Multiplied by quantity'],
  ['urgencyFee', 'Express fee', 'When the customer asks for priority'],
  ['weekendFee', 'Weekend fee', 'Saturday and Sunday pickups'],
  ['minimumFee', 'Minimum charge', 'Small jobs are topped up to this']
];

export function AdminPricing() {
  const toast = useToast();
  const state = useApi('/settings');
  const [pricing, setPricing] = useState(null);
  const [payouts, setPayouts] = useState(null);
  const [saving, setSaving] = useState('');

  useEffect(() => {
    if (!state.data) return;
    setPricing({ ...state.data.pricing, wasteTypeFees: { ...state.data.pricing.wasteTypeFees }, vehicleFees: { ...state.data.vehicleFees }, tax: { ...state.data.tax } });
    setPayouts({ ...state.data.payouts });
  }, [state.data]);

  // Worked example so admins see the effect of their numbers.
  const example = useMemo(() => {
    if (!pricing) return null;
    const p = Object.fromEntries(Object.entries(pricing).map(([k, v]) => [k, typeof v === 'object' ? v : Number(v) || 0]));
    const subtotal = p.baseFee + 6 * p.distanceFeePerKm + 3 * p.perBagFee + (Number(p.wasteTypeFees['Household mix']) || 0);
    const net = Math.max(subtotal, p.minimumFee);
    const t = p.tax || {};
    const taxPct = t.enabled ? ['vatPct', 'nhilPct', 'getFundPct', 'covidLevyPct'].reduce((sum, k) => sum + (Number(t[k]) || 0), 0) : 0;
    const share = (Number(payouts?.collectorSharePct) || 0) / 100;
    return { total: net * (1 + taxPct / 100), collector: net * share, platform: net * (1 - share), tax: net * taxPct / 100 };
  }, [pricing, payouts]);

  const savePricing = async (e) => {
    e.preventDefault();
    setSaving('pricing');
    try {
      const body = Object.fromEntries(PRICING_FIELDS.map(([k]) => [k, num(pricing[k])]));
      body.wasteTypeFees = Object.fromEntries(Object.entries(pricing.wasteTypeFees).map(([k, v]) => [k, num(v)]));
      body.vehicleFees = Object.fromEntries(Object.entries(pricing.vehicleFees).map(([k, v]) => [k, num(v)]));
      body.tax = { enabled: Boolean(pricing.tax.enabled), vatPct: num(pricing.tax.vatPct), nhilPct: num(pricing.tax.nhilPct), getFundPct: num(pricing.tax.getFundPct), covidLevyPct: num(pricing.tax.covidLevyPct) };
      state.setData(await api.put('/settings/pricing', body));
      toast('Pricing saved. New bookings use it immediately.');
    } catch (err) { toast(err.message, 'error'); } finally { setSaving(''); }
  };
  const savePayouts = async (e) => {
    e.preventDefault();
    setSaving('payouts');
    try {
      state.setData(await api.put('/settings/payouts', { collectorSharePct: num(payouts.collectorSharePct), minimumPayout: num(payouts.minimumPayout) }));
      toast('Collector pay rules saved. They apply to jobs completed from now on.');
    } catch (err) { toast(err.message, 'error'); } finally { setSaving(''); }
  };

  return <Shell title="Pricing" subtitle="Transparent rules for fair prices and fair pay.">
    <PageHead eyebrow="Money in, money out" title="Pricing & collector pay" text="All amounts in Ghana cedis. Customers see the full breakdown before booking." />
    <Async state={state}>{() => pricing && payouts && <>
      {example && <div className="grid-3" style={{ marginBottom: '1rem' }}>
        <StatCard label="Example: 3 bags, 6 km, weekday" icon={CircleDollarSign} value={cedi(example.total)} foot={`What the customer pays · incl. ${cedi(example.tax)} tax`} />
        <StatCard label="Collector receives" icon={HandCoins} value={cedi(example.collector)} foot={`${payouts.collectorSharePct}% share`} />
        <StatCard label="CleanBridge keeps" value={cedi(example.platform)} foot="Platform fee" />
      </div>}
      <div className="grid-2">
        <form className="panel panel-pad" onSubmit={savePricing}>
          <div className="mini-title"><h3>Customer pricing</h3><CircleDollarSign size={18} className="muted" /></div>
          {PRICING_FIELDS.map(([key, label, hint]) => <div className="data-row price-row" key={key}>
            <label htmlFor={`p-${key}`} className="data-main"><strong>{label}</strong><span>{hint}</span></label>
            <div className="money-input"><span>GH₵</span><input id={`p-${key}`} type="number" min="0" step="0.5" value={pricing[key]} onChange={(e) => setPricing((p) => ({ ...p, [key]: e.target.value }))} data-testid={`input-pricing-${key}`} /></div>
          </div>)}
          <div className="mini-title" style={{ marginTop: '1.2rem' }}><h3>Waste type surcharges</h3></div>
          {WASTE_TYPES.map(({ value }) => <div className="data-row price-row" key={value}>
            <label htmlFor={`w-${value}`} className="data-main"><strong>{value}</strong></label>
            <div className="money-input"><span>GH₵</span><input id={`w-${value}`} type="number" min="0" step="0.5" value={pricing.wasteTypeFees[value] ?? 0} onChange={(e) => setPricing((p) => ({ ...p, wasteTypeFees: { ...p.wasteTypeFees, [value]: e.target.value } }))} /></div>
          </div>)}
          <div className="mini-title" style={{ marginTop: '1.2rem' }}><h3>Vehicle charges</h3></div>
          {VEHICLE_TYPES.map((v) => <div className="data-row price-row" key={v}>
            <label htmlFor={`v-${v}`} className="data-main"><strong>{v}</strong></label>
            <div className="money-input"><span>GH₵</span><input id={`v-${v}`} type="number" min="0" step="0.5" value={pricing.vehicleFees[v] ?? 0} onChange={(e) => setPricing((p) => ({ ...p, vehicleFees: { ...p.vehicleFees, [v]: e.target.value } }))} /></div>
          </div>)}
          <div className="mini-title" style={{ marginTop: '1.2rem' }}><h3>Ghana taxes</h3></div>
          <label className={`toggle-row ${pricing.tax.enabled ? 'on' : ''}`}><input type="checkbox" checked={Boolean(pricing.tax.enabled)} onChange={(e) => setPricing((p) => ({ ...p, tax: { ...p.tax, enabled: e.target.checked } }))} /> Charge VAT and levies (turn off if not VAT-registered)</label>
          {[['vatPct', 'VAT'], ['nhilPct', 'NHIL'], ['getFundPct', 'GETFund levy'], ['covidLevyPct', 'COVID-19 levy']].map(([k, label]) => <div className="data-row price-row" key={k}>
            <label htmlFor={`t-${k}`} className="data-main"><strong>{label}</strong><span>% of the subtotal</span></label>
            <div className="money-input"><input id={`t-${k}`} type="number" min="0" max="100" step="0.5" value={pricing.tax[k]} disabled={!pricing.tax.enabled} onChange={(e) => setPricing((p) => ({ ...p, tax: { ...p.tax, [k]: e.target.value } }))} /><span>%</span></div>
          </div>)}
          <p className="muted" style={{ fontSize: '.7rem', lineHeight: 1.5 }}>Defaults follow Ghana’s VAT regime from January 2026 (VAT 15% + NHIL 2.5% + GETFund 2.5%; COVID-19 levy abolished). Confirm current rates with GRA.</p>
          <button className="btn btn-primary" style={{ marginTop: '1rem' }} disabled={saving === 'pricing'} data-testid="button-save-pricing">{saving === 'pricing' ? <Spinner size={15} /> : <Save size={15} />} Save pricing</button>
        </form>
        <form className="panel panel-pad" onSubmit={savePayouts} style={{ alignSelf: 'start' }}>
          <div className="mini-title"><h3>Collector pay</h3><HandCoins size={18} className="muted" /></div>
          <div className="data-row price-row">
            <label htmlFor="s-share" className="data-main"><strong>Collector share</strong><span>Of each completed job’s price</span></label>
            <div className="money-input"><input id="s-share" type="number" min="0" max="100" step="1" value={payouts.collectorSharePct} onChange={(e) => setPayouts((p) => ({ ...p, collectorSharePct: e.target.value }))} /><span>%</span></div>
          </div>
          <div className="data-row price-row">
            <label htmlFor="s-min" className="data-main"><strong>Minimum payout</strong><span>Smallest MoMo withdrawal</span></label>
            <div className="money-input"><span>GH₵</span><input id="s-min" type="number" min="0" step="1" value={payouts.minimumPayout} onChange={(e) => setPayouts((p) => ({ ...p, minimumPayout: e.target.value }))} /></div>
          </div>
          <p className="muted" style={{ fontSize: '.72rem', lineHeight: 1.55 }}>Earnings are fixed on each job when it’s completed, so changing the share never alters past earnings. On cash jobs the collector keeps the cash and the platform fee is deducted from their balance.</p>
          <button className="btn btn-primary" disabled={saving === 'payouts'}>{saving === 'payouts' ? <Spinner size={15} /> : <Save size={15} />} Save pay rules</button>
        </form>
      </div>
    </>}</Async>
  </Shell>;
}
