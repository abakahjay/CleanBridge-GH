import { useEffect, useState } from 'react';
import { CircleAlert, Save, ShieldCheck, Truck } from 'lucide-react';
import Shell from '../../components/Shell.jsx';
import { Async, InfoRow, PageHead, Spinner, StatusBadge } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { useApi } from '../../lib/hooks.js';
import { useToast } from '../../lib/toast.jsx';
import { VEHICLE_ECONOMY, VEHICLE_REG_REGEX, VEHICLE_TYPES } from '../../lib/ghana.js';
import { formatDateTime } from '../../lib/format.js';

const EMPTY = { label: '', type: 'Mini truck', make: '', model: '', registration: '', fuelType: 'Diesel', fuelEconomyLPer100Km: VEHICLE_ECONOMY['Mini truck'], capacityTonnes: '' };

export default function CollectorVehicle() {
  const toast = useToast();
  const state = useApi('/vehicles/me');
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const v = state.data?.vehicle;
    if (v) setForm({ ...EMPTY, ...v, label: v.label || '', capacityTonnes: v.capacityTonnes ?? '' });
  }, [state.data]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const onType = (e) => {
    const type = e.target.value;
    setForm((f) => ({ ...f, type, fuelEconomyLPer100Km: VEHICLE_ECONOMY[type] ?? f.fuelEconomyLPer100Km }));
  };
  const reg = form.registration.trim().toUpperCase();
  const regOk = VEHICLE_REG_REGEX.test(reg);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { vehicle } = await api.put('/vehicles/me', {
        label: form.label.trim() || null, type: form.type, make: form.make.trim(), model: form.model.trim(),
        registration: reg, fuelType: form.fuelType, fuelEconomyLPer100Km: Number(form.fuelEconomyLPer100Km),
        capacityTonnes: form.capacityTonnes === '' ? null : Number(form.capacityTonnes)
      });
      state.setData({ vehicle });
      toast('Vehicle saved and sent for verification.');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return <Shell title="Vehicle" subtitle="The vehicle attached to your collector profile.">
    <PageHead eyebrow="Your vehicle" title="Get verified, get jobs." text="Operations checks your details before you can accept pickups. Changing them sends the vehicle back for verification." />
    <Async state={state}>{({ vehicle }) => <div className="grid-2">
      <form className="panel panel-pad" onSubmit={submit}>
        <div className="mini-title"><h3>Vehicle details</h3>{vehicle && <StatusBadge status={vehicle.verificationStatus} />}</div>
        <div className="input-grid">
          <div className="field"><label htmlFor="v-type">Vehicle type</label><select id="v-type" value={form.type} onChange={onType} data-testid="select-vehicle-type">{VEHICLE_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
          <div className={`field ${form.registration && !regOk ? 'has-error' : ''}`}>
            <label htmlFor="v-reg">Registration (DVLA)</label>
            <input id="v-reg" value={form.registration} onChange={set('registration')} placeholder="GR 1234-21" autoCapitalize="characters" required data-testid="input-vehicle-registration" />
            {form.registration && !regOk ? <small className="field-error">Format like GR 1234-21 or GT 4821 X</small> : <small>As shown on the number plate</small>}
          </div>
        </div>
        <div className="input-grid">
          <div className="field"><label htmlFor="v-make">Make</label><input id="v-make" value={form.make} onChange={set('make')} placeholder="Kia" required data-testid="input-vehicle-make" /></div>
          <div className="field"><label htmlFor="v-model">Model</label><input id="v-model" value={form.model} onChange={set('model')} placeholder="K2700" required data-testid="input-vehicle-model" /></div>
        </div>
        <div className="input-grid">
          <div className="field"><label htmlFor="v-fuel">Fuel</label><select id="v-fuel" value={form.fuelType} onChange={set('fuelType')}>{['Diesel', 'Petrol', 'LPG', 'Electric'].map((f) => <option key={f}>{f}</option>)}</select></div>
          <div className="field"><label htmlFor="v-eco">Fuel use (L / 100 km)</label><input id="v-eco" type="number" step="0.1" min="0.5" value={form.fuelEconomyLPer100Km} onChange={set('fuelEconomyLPer100Km')} required /><small>Used to estimate fuel cost on your routes</small></div>
        </div>
        <div className="input-grid">
          <div className="field"><label htmlFor="v-cap">Load capacity (tonnes)</label><input id="v-cap" type="number" step="0.1" min="0" value={form.capacityTonnes} onChange={set('capacityTonnes')} placeholder="1.2" /></div>
          <div className="field"><label htmlFor="v-label">Fleet label <span className="muted">(optional)</span></label><input id="v-label" value={form.label} onChange={set('label')} placeholder="CB 07" /></div>
        </div>
        <button className="btn btn-primary" disabled={saving || !regOk || !form.make.trim() || !form.model.trim()} data-testid="button-save-vehicle">{saving ? <Spinner size={15} /> : <Save size={15} />} {vehicle ? 'Save changes' : 'Register vehicle'}</button>
      </form>
      <div className="panel panel-pad">
        <div className="mini-title"><h3>Verification</h3><ShieldCheck size={18} className="muted" /></div>
        {!vehicle && <p className="muted" style={{ fontSize: '.8rem' }}><Truck size={14} style={{ verticalAlign: 'middle' }} /> No vehicle registered yet.</p>}
        {vehicle && <div className="data-list">
          <InfoRow label="Status"><StatusBadge status={vehicle.verificationStatus} /></InfoRow>
          <InfoRow label="Registration">{vehicle.registration}</InfoRow>
          <InfoRow label="Vehicle">{vehicle.make} {vehicle.model} · {vehicle.type}</InfoRow>
          <InfoRow label="Last updated">{formatDateTime(vehicle.updatedAt)}</InfoRow>
        </div>}
        {vehicle?.verificationStatus === 'pending' && <div className="form-alert warn" style={{ marginTop: '1rem' }}><CircleAlert size={16} /><span>Operations will review your vehicle details. You can accept jobs as soon as it is verified.</span></div>}
        {vehicle?.verificationStatus === 'rejected' && <div className="form-alert" style={{ marginTop: '1rem' }}><CircleAlert size={16} /><span>Your vehicle wasn’t approved. Correct the details and save to resubmit.</span></div>}
      </div>
    </div>}</Async>
  </Shell>;
}
