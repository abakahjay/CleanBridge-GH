import { useState } from 'react';
import { useLocation } from 'wouter';
import { Trash2 } from 'lucide-react';
import { Modal, Spinner } from './ui.jsx';
import { request } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useToast } from '../lib/toast.jsx';

// In-app account deletion (required by Google Play and the App Store).
export default function DeleteAccount() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  if (user.role === 'admin') return null;

  const remove = async () => {
    setBusy(true);
    try {
      await request('DELETE', '/auth/me', { confirm: 'DELETE' });
      logout();
      toast('Your account has been deleted.');
      navigate('/');
    } catch (e) {
      toast(e.message, 'error');
      setBusy(false);
    }
  };

  return <div className="panel panel-pad danger-zone">
    <div className="mini-title"><h3>Delete account</h3><Trash2 size={17} className="danger-text" /></div>
    <p className="muted" style={{ fontSize: '.76rem', marginTop: 0, lineHeight: 1.55 }}>Permanently removes your profile, photo{user.role === 'collector' ? ', vehicle' : ''} and notifications. Completed pickup records are kept for accounting with your name removed.</p>
    <button className="btn btn-outline danger-text" onClick={() => setOpen(true)} data-testid="button-delete-account"><Trash2 size={15} /> Delete my account</button>
    {open && <Modal title="Delete your account?" onClose={() => setOpen(false)}>
      <p className="muted" style={{ fontSize: '.8rem', lineHeight: 1.55, marginTop: 0 }}>This can’t be undone. Open pickups must be finished or cancelled first.</p>
      <div className="field"><label htmlFor="del-confirm">Type <strong>DELETE</strong> to confirm</label><input id="del-confirm" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" /></div>
      <div className="modal-actions"><button className="btn btn-outline" onClick={() => setOpen(false)}>Keep account</button><button className="btn btn-danger" disabled={text !== 'DELETE' || busy} onClick={remove} data-testid="button-confirm-delete">{busy ? <Spinner size={15} /> : <Trash2 size={15} />} Delete account</button></div>
    </Modal>}
  </div>;
}
