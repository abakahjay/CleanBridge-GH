import { useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { Camera, CircleAlert, KeyRound, Mail, MapPinned, Save, Trash2, WalletCards } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import LocationPicker from '../components/LocationPicker.jsx';
import DeleteAccount from '../components/DeleteAccount.jsx';
import PushToggle from '../components/PushToggle.jsx';
import { Avatar, Spinner } from '../components/ui.jsx';
import { api, request } from '../lib/api.js';
import { homeFor, useAuth } from '../lib/auth.jsx';
import { useToast } from '../lib/toast.jsx';
import { detectNetwork, formatPhone, GHANA_POST_GPS_REGEX, isValidGhanaPhone, normalizeGps, REGIONS } from '../lib/ghana.js';

const MAX_PHOTO_MB = 3;

function PhotoCard({ user, setUser }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast('Choose a JPG, PNG or WebP image.', 'error'); return; }
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) { toast(`Photos must be ${MAX_PHOTO_MB} MB or smaller.`, 'error'); return; }
    setBusy(true);
    try {
      const body = new FormData();
      body.append('avatar', file);
      const { user: updated } = await request('PUT', '/auth/me/avatar', body);
      setUser(updated);
      toast('Profile photo updated.');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const { user: updated } = await api.del('/auth/me/avatar');
      setUser(updated);
      toast(updated.avatarSource === 'google' ? 'Back to your Google photo.' : 'Photo removed.');
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  return <div className="profile-hero">
    <div className="avatar-edit">
      <Avatar user={user} size={88} />
      <button className="avatar-edit-btn" onClick={() => fileRef.current?.click()} disabled={busy} aria-label="Change photo" data-testid="button-change-photo">{busy ? <Spinner size={15} /> : <Camera size={15} />}</button>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => upload(e.target.files?.[0])} data-testid="input-photo" />
    </div>
    <div>
      <h3 className="display" style={{ margin: 0, fontSize: '1.4rem' }}>{user.name}</h3>
      <div className="muted" style={{ fontSize: '.76rem', margin: '.25rem 0 .6rem' }}>{user.email}{user.googleLinked && <span className="badge badge-slate" style={{ marginLeft: '.45rem' }}>Google</span>}</div>
      <div className="action-row" style={{ marginTop: 0 }}>
        <button className="btn btn-outline btn-sm" onClick={() => fileRef.current?.click()} disabled={busy}><Camera size={14} /> {user.avatarUrl ? 'Change photo' : 'Add photo'}</button>
        {user.avatarSource === 'upload' && <button className="btn btn-ghost btn-sm" onClick={remove} disabled={busy}><Trash2 size={14} /> {user.googleLinked ? 'Use Google photo' : 'Remove'}</button>}
      </div>
      <small className="muted" style={{ fontSize: '.68rem' }}>{user.avatarSource === 'google' ? 'Showing your Google profile photo.' : `JPG, PNG or WebP, up to ${MAX_PHOTO_MB} MB.`}</small>
    </div>
  </div>;
}

export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [, navigate] = useLocation();
  // Only a missing phone counts - not a stale ?complete=1 in the URL.
  const completing = !user.profileComplete;

  const [form, setForm] = useState({
    name: user.name, phone: user.phone ? formatPhone(user.phone) : '', address: user.address || '',
    region: user.region || '', ghanaPostGps: user.ghanaPostGps || '',
    momoNumber: user.momoNumber ? formatPhone(user.momoNumber) : '', collectorStatus: user.collectorStatus || 'off_duty'
  });
  const [place, setPlace] = useState(user.location ? { ...user.location, label: user.address || 'Saved location' } : null);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [saving, setSaving] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const phoneOk = isValidGhanaPhone(form.phone);
  const momoOk = !form.momoNumber || isValidGhanaPhone(form.momoNumber);
  const gps = normalizeGps(form.ghanaPostGps);
  const gpsOk = !form.ghanaPostGps || GHANA_POST_GPS_REGEX.test(gps);

  const save = async (section, body) => {
    setSaving(section);
    try {
      const { user: updated } = await api.patch('/auth/me', body);
      setUser(updated);
      toast('Saved.');
      return true;
    } catch (e) {
      toast(e.message, 'error');
      return false;
    } finally {
      setSaving('');
    }
  };

  const saveDetails = async (e) => {
    e.preventDefault();
    const wasCompleting = completing;
    const ok = await save('details', { name: form.name.trim(), phone: form.phone, ...(user.role === 'collector' ? { collectorStatus: form.collectorStatus } : {}) });
    // Profile finished: carry on to their dashboard instead of staying here.
    if (ok && wasCompleting) navigate(homeFor(user.role), { replace: true });
  };
  const saveAddress = (e) => {
    e.preventDefault();
    save('address', {
      address: form.address.trim() || null, region: form.region || null, ghanaPostGps: form.ghanaPostGps ? gps : null,
      location: place ? { lat: place.lat, lng: place.lng } : null, area: place?.area || user.area || null
    });
  };
  const savePayout = (e) => { e.preventDefault(); save('payout', { momoNumber: form.momoNumber }); };
  const savePassword = async (e) => {
    e.preventDefault();
    if (await save('password', pw)) setPw({ currentPassword: '', newPassword: '' });
  };

  return <Shell title="Profile" subtitle="Your details, address and account settings.">
    {completing && <div className="form-alert warn" style={{ marginBottom: '1rem' }}><CircleAlert size={16} /><span><strong>One more step:</strong> add your mobile number so {user.role === 'collector' ? 'customers and operations can reach you and we can pay you' : 'your collector can call you at the gate'}.</span></div>}
    <div className="grid-2 profile-grid">
      <div className="panel panel-pad">
        <PhotoCard user={user} setUser={setUser} />
        <form onSubmit={saveDetails} style={{ marginTop: '1.3rem' }}>
          <div className="field"><label htmlFor="p-name">Full name</label><input id="p-name" value={form.name} onChange={set('name')} required data-testid="input-profile-name" /></div>
          <div className="field"><label htmlFor="p-email">Email</label><input id="p-email" value={user.email} disabled /></div>
          <div className={`field ${form.phone && !phoneOk ? 'has-error' : ''}`}>
            <label htmlFor="p-phone">Mobile number</label>
            <input id="p-phone" type="tel" value={form.phone} onChange={set('phone')} placeholder="024 123 4567" required autoFocus={!user.phone} data-testid="input-profile-phone" />
            {form.phone && !phoneOk ? <small className="field-error">Enter a Ghana mobile number, e.g. 024 123 4567</small> : <small>{detectNetwork(form.phone) ? `${detectNetwork(form.phone)} number` : 'MTN, Telecel or AirtelTigo'}</small>}
          </div>
          {user.role === 'collector' && <div className="field">
            <label htmlFor="p-status">Work status</label>
            <select id="p-status" value={form.collectorStatus} onChange={set('collectorStatus')}>
              <option value="available">Available for jobs</option><option value="on_route">On route</option><option value="off_duty">Off duty</option>
            </select>
            <small>Your live location is shared only while you are not off duty.</small>
          </div>}
          <button className="btn btn-primary" disabled={saving === 'details' || !phoneOk || !form.name.trim()} data-testid="button-save-profile">{saving === 'details' ? <Spinner size={15} /> : <Save size={15} />} Save details</button>
        </form>
      </div>

      <div className="panel panel-pad">
        <div className="mini-title"><h3>{user.role === 'customer' ? 'Home address' : 'Base location'}</h3><MapPinned size={17} className="muted" /></div>
        <form onSubmit={saveAddress}>
          <LocationPicker value={place} onChange={(value) => { setPlace(value); if (!form.address) setForm((f) => ({ ...f, address: value.label, region: value.region && REGIONS.includes(value.region) ? value.region : f.region })); }} autoLocate={!user.location} label="Location on the map" height={220} />
          <div className="field" style={{ marginTop: '1rem' }}><label htmlFor="p-address">House / street</label><input id="p-address" value={form.address} onChange={set('address')} placeholder="House No. 14, Boundary Road" /></div>
          <div className="input-grid">
            <div className="field"><label htmlFor="p-region">Region</label><select id="p-region" value={form.region} onChange={set('region')}><option value="">Select region</option>{REGIONS.map((r) => <option key={r}>{r}</option>)}</select></div>
            <div className={`field ${gpsOk ? '' : 'has-error'}`}><label htmlFor="p-gps">GhanaPost GPS</label><input id="p-gps" value={form.ghanaPostGps} onChange={set('ghanaPostGps')} placeholder="GA-183-8164" />{!gpsOk && <small className="field-error">e.g. GA-183-8164</small>}</div>
          </div>
          <button className="btn btn-primary" disabled={saving === 'address' || !gpsOk}>{saving === 'address' ? <Spinner size={15} /> : <Save size={15} />} Save address</button>
        </form>
      </div>

      {user.role === 'collector' && <div className="panel panel-pad">
        <div className="mini-title"><h3>Payout account</h3><WalletCards size={17} className="muted" /></div>
        <form onSubmit={savePayout}>
          <div className={`field ${momoOk ? '' : 'has-error'}`}>
            <label htmlFor="p-momo">Mobile Money number</label>
            <input id="p-momo" type="tel" value={form.momoNumber} onChange={set('momoNumber')} placeholder="024 123 4567" data-testid="input-momo" />
            {momoOk ? <small>{detectNetwork(form.momoNumber) ? `${detectNetwork(form.momoNumber)} Mobile Money` : 'Earnings are sent here when you request a payout.'}</small> : <small className="field-error">Enter an MTN, Telecel or AirtelTigo number</small>}
          </div>
          <button className="btn btn-primary" disabled={saving === 'payout' || !form.momoNumber || !momoOk}>{saving === 'payout' ? <Spinner size={15} /> : <Save size={15} />} Save payout number</button>
        </form>
      </div>}

      <div className="panel panel-pad">
        <div className="mini-title"><h3>Email updates</h3><Mail size={17} className="muted" /></div>
        <label className={`toggle-row ${user.emailNotifications ? 'on' : ''}`}>
          <input type="checkbox" checked={user.emailNotifications} disabled={saving === 'email'} onChange={(e) => save('email', { emailNotifications: e.target.checked })} data-testid="toggle-email-updates" />
          Email me about {user.role === 'collector' ? 'new jobs and payouts' : user.role === 'admin' ? 'account activity' : 'my pickups and payments'}
        </label>
        <small className="muted" style={{ display: 'block', marginTop: '.5rem', fontSize: '.7rem' }}>Sent to {user.email}. You’ll always see updates in the app.</small>
      </div>

      <PushToggle role={user.role} />

      <div className="panel panel-pad">
        <div className="mini-title"><h3>{user.hasPassword ? 'Change password' : 'Set a password'}</h3><KeyRound size={17} className="muted" /></div>
        {!user.hasPassword && <p className="muted" style={{ fontSize: '.76rem', marginTop: 0 }}>You sign in with Google. Add a password to also log in with your email or phone.</p>}
        <form onSubmit={savePassword}>
          {user.hasPassword && <div className="field"><label htmlFor="p-cur">Current password</label><input id="p-cur" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))} required /></div>}
          <div className="field"><label htmlFor="p-new">New password</label><input id="p-new" type="password" autoComplete="new-password" minLength={6} value={pw.newPassword} onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))} required /><small>At least 6 characters.</small></div>
          <button className="btn btn-outline" disabled={saving === 'password' || pw.newPassword.length < 6}>{saving === 'password' ? <Spinner size={15} /> : <KeyRound size={15} />} {user.hasPassword ? 'Update password' : 'Set password'}</button>
        </form>
      </div>
      <DeleteAccount />
    </div>
  </Shell>;
}
