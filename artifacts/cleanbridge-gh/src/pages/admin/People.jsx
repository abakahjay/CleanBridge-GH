import { useState } from 'react';
import { useSearch } from 'wouter';
import { Ban, Check, Plus, RotateCcw, Search, UsersRound, X } from 'lucide-react';
import Shell from '../../components/Shell.jsx';
import { Async, Avatar, EmptyState, Modal, PageHead, Spinner, StatusBadge } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { useApi, useDebounced } from '../../lib/hooks.js';
import { useToast } from '../../lib/toast.jsx';
import { detectNetwork, formatPhone, isValidGhanaPhone } from '../../lib/ghana.js';
import { cedi, formatDate } from '../../lib/format.js';

function useSuspend(reload) {
  const toast = useToast();
  return async (u) => {
    try {
      await api.patch(`/admin/users/${u.id}/active`, { isActive: !u.isActive });
      toast(u.isActive ? `${u.name} suspended — they can no longer sign in.` : `${u.name} reinstated.`);
      reload({ quiet: true });
    } catch (e) { toast(e.message, 'error'); }
  };
}

const Person = ({ u }) => <div className="person"><Avatar user={u} size={34} /><div className="data-main"><strong>{u.name}</strong><span>{u.email}</span></div></div>;
const ActiveBadge = ({ u }) => <StatusBadge status={u.isActive ? 'active' : 'suspended'} />;

export function AdminCustomers() {
  const [q, setQ] = useState('');
  const query = useDebounced(q, 300);
  const state = useApi(`/admin/customers${query ? `?q=${encodeURIComponent(query)}` : ''}`);
  const suspend = useSuspend(state.reload);

  return <Shell title="Customers" subtitle="Households and businesses using CleanBridge.">
    <PageHead eyebrow="People" title="Customers" text="Search, review activity and suspend accounts that abuse the service." />
    <div className="panel">
      <div className="filter-bar"><div className="search-box"><Search size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone or area" data-testid="input-search-customers" /></div></div>
      <Async state={state}>{({ customers }) => customers.length === 0
        ? <EmptyState icon={UsersRound} title="No customers found" />
        : <div className="table-wrap"><table className="table">
          <thead><tr><th>Customer</th><th>Phone</th><th>Area</th><th>Pickups</th><th>Spent</th><th>Last pickup</th><th>Joined</th><th>Status</th><th /></tr></thead>
          <tbody>{customers.map((u) => <tr key={u.id}>
            <td><Person u={u} /></td>
            <td>{u.phone ? <>{formatPhone(u.phone)}<div className="cell-sub">{u.phoneNetwork}</div></> : <span className="muted">Not added</span>}</td>
            <td>{u.area || '—'}{u.ghanaPostGps && <div className="cell-sub">{u.ghanaPostGps}</div>}</td>
            <td>{u.pickups}</td><td>{cedi(u.totalSpent)}</td>
            <td>{u.lastPickup ? formatDate(u.lastPickup) : '—'}</td>
            <td>{formatDate(u.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
            <td><ActiveBadge u={u} /></td>
            <td><button className="btn btn-quiet btn-sm" onClick={() => suspend(u)}>{u.isActive ? <><Ban size={14} /> Suspend</> : <><RotateCcw size={14} /> Reinstate</>}</button></td>
          </tr>)}</tbody>
        </table></div>}
      </Async>
    </div>
  </Shell>;
}

function AddUserModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ role: 'collector', name: '', email: '', phone: '', password: '' });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const phoneOk = isValidGhanaPhone(form.phone);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { user } = await api.post('/admin/users', form);
      toast(`${user.name} can now sign in with the temporary password.`);
      onCreated();
      onClose();
    } catch (err) {
      toast(err.message, 'error');
      setSaving(false);
    }
  };

  return <Modal title="Add a team member" onClose={onClose}>
    <form onSubmit={submit}>
      <div className="field"><label>Role</label><div className="chip-row">{[['collector', 'Collector'], ['admin', 'Operations admin']].map(([v, l]) => <button type="button" key={v} className={`chip ${form.role === v ? 'active' : ''}`} onClick={() => setForm((f) => ({ ...f, role: v }))}>{l}</button>)}</div></div>
      <div className="field"><label htmlFor="n-name">Full name</label><input id="n-name" value={form.name} onChange={set('name')} required /></div>
      <div className="input-grid">
        <div className="field"><label htmlFor="n-email">Email</label><input id="n-email" type="email" value={form.email} onChange={set('email')} required /></div>
        <div className={`field ${form.phone && !phoneOk ? 'has-error' : ''}`}><label htmlFor="n-phone">Mobile number</label><input id="n-phone" type="tel" value={form.phone} onChange={set('phone')} placeholder="024 123 4567" required /><small className={form.phone && !phoneOk ? 'field-error' : ''}>{form.phone && !phoneOk ? 'Enter a Ghana mobile number' : detectNetwork(form.phone) || 'Also used as their MoMo payout number'}</small></div>
      </div>
      <div className="field"><label htmlFor="n-pw">Temporary password</label><input id="n-pw" value={form.password} onChange={set('password')} minLength={6} required /><small>Share it privately; they can change it on their profile.</small></div>
      <div className="modal-actions"><button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={saving || !phoneOk}>{saving ? <Spinner size={15} /> : <Plus size={15} />} Create account</button></div>
    </form>
  </Modal>;
}

const VEHICLE_FILTERS = [['All', ''], ['Awaiting verification', 'pending'], ['Verified', 'verified'], ['No vehicle', 'none']];

export function AdminCollectors() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState(new URLSearchParams(useSearch()).get('vehicles') || '');
  const [adding, setAdding] = useState(false);
  const query = useDebounced(q, 300);
  const state = useApi(`/admin/collectors${query ? `?q=${encodeURIComponent(query)}` : ''}`);
  const suspend = useSuspend(state.reload);

  const verify = async (vehicle, verificationStatus) => {
    try {
      await api.patch(`/vehicles/${vehicle.id}/verification`, { verificationStatus });
      toast(verificationStatus === 'verified' ? `${vehicle.registration} verified.` : `${vehicle.registration} rejected.`);
      state.reload({ quiet: true });
    } catch (e) { toast(e.message, 'error'); }
  };

  return <Shell title="Collectors" subtitle="The people moving the network every day.">
    <PageHead eyebrow="People" title="Collectors" text="Verify vehicles, watch balances and manage access.">
      <button className="btn btn-primary" onClick={() => setAdding(true)} data-testid="button-add-collector"><Plus size={15} /> Add collector / admin</button>
    </PageHead>
    <div className="panel">
      <div className="filter-bar wrap">
        <div className="search-box"><Search size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone" data-testid="input-search-collectors" /></div>
        <div className="chip-row">{VEHICLE_FILTERS.map(([l, v]) => <button key={l} className={`chip ${vehicleFilter === v ? 'active' : ''}`} onClick={() => setVehicleFilter(v)}>{l}</button>)}</div>
      </div>
      <Async state={state}>{({ collectors }) => {
        const list = collectors.filter((c) => !vehicleFilter || (vehicleFilter === 'none' ? !c.vehicle : c.vehicle?.verificationStatus === vehicleFilter));
        return list.length === 0
          ? <EmptyState icon={UsersRound} title="No collectors found" />
          : <div className="table-wrap"><table className="table">
            <thead><tr><th>Collector</th><th>Phone / MoMo</th><th>Vehicle</th><th>Jobs</th><th>Earned</th><th>Balance</th><th>Rating</th><th>Duty</th><th>Account</th><th /></tr></thead>
            <tbody>{list.map((c) => <tr key={c.id}>
              <td><Person u={c} /></td>
              <td>{c.phone ? formatPhone(c.phone) : '—'}<div className="cell-sub">{c.momoNumber ? `${c.momoNetwork} MoMo ${formatPhone(c.momoNumber)}` : 'No MoMo number'}</div></td>
              <td>{c.vehicle
                ? <><strong>{c.vehicle.registration}</strong><div className="cell-sub">{c.vehicle.make} {c.vehicle.model} · {c.vehicle.type}</div>
                  <div className="row-actions" style={{ marginTop: '.35rem' }}><StatusBadge status={c.vehicle.verificationStatus} />
                    {c.vehicle.verificationStatus !== 'verified' && <button className="btn btn-primary btn-sm" onClick={() => verify(c.vehicle, 'verified')} data-testid={`button-verify-${c.id}`}><Check size={13} /> Verify</button>}
                    {c.vehicle.verificationStatus === 'pending' && <button className="btn btn-quiet btn-sm" onClick={() => verify(c.vehicle, 'rejected')}><X size={13} /> Reject</button>}
                  </div></>
                : <span className="muted">Not registered</span>}</td>
              <td>{c.completedJobs}</td>
              <td>{cedi(c.totalEarnings)}</td>
              <td className={c.balance < 0 ? 'tone-orange' : ''}>{cedi(c.balance)}</td>
              <td>{c.rating ? `★ ${c.rating.toFixed(1)}` : '—'}<div className="cell-sub">{c.ratingCount} ratings</div></td>
              <td><StatusBadge status={c.collectorStatus} /></td>
              <td><ActiveBadge u={c} /></td>
              <td><button className="btn btn-quiet btn-sm" onClick={() => suspend(c)}>{c.isActive ? <><Ban size={14} /> Suspend</> : <><RotateCcw size={14} /> Reinstate</>}</button></td>
            </tr>)}</tbody>
          </table></div>;
      }}</Async>
    </div>
    {adding && <AddUserModal onClose={() => setAdding(false)} onCreated={() => state.reload({ quiet: true })} />}
  </Shell>;
}
