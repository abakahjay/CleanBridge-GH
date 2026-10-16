import { useState } from 'react';
import { Link } from 'wouter';
import { CalendarClock, ChevronRight, Pause, Play, Plus, Repeat, Trash2 } from 'lucide-react';
import Shell from '../../components/Shell.jsx';
import { Async, EmptyState, InfoRow, Modal, PageHead, Spinner, StatusBadge } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { useApi } from '../../lib/hooks.js';
import { useToast } from '../../lib/toast.jsx';
import { cedi, formatDate, plural, planSchedule } from '../../lib/format.js';

const FREQ_LABEL = { weekly: 'Weekly plan', monthly: 'Monthly plan' };

function PlanCard({ plan, onChanged }) {
  const toast = useToast();
  const [busy, setBusy] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);

  const setStatus = async (status) => {
    setBusy(status);
    try {
      const { subscription, cancelledVisits } = await api.patch(`/subscriptions/${plan.id}/status`, { status });
      const what = { active: 'resumed', paused: 'paused', cancelled: 'cancelled' }[status];
      toast(`${plan.code} ${what}.${cancelledVisits ? ` ${plural(cancelledVisits, 'upcoming visit')} cancelled.` : ''}`);
      onChanged(subscription);
      setConfirmCancel(false);
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(''); }
  };

  const next = plan.upcomingPickup;
  return <div className={`panel panel-pad plan-card ${plan.status}`} data-testid={`card-plan-${plan.code}`}>
    <div className="plan-head">
      <div className="card-icon"><Repeat size={18} /></div>
      <div className="plan-title">
        <strong>{FREQ_LABEL[plan.frequency]} · {plan.code}</strong>
        <span>{planSchedule(plan.frequency, plan.startDate)} · {plan.timeWindow}</span>
      </div>
      <StatusBadge status={plan.status} />
    </div>
    <div className="data-list">
      <InfoRow label="Where">{plan.address}</InfoRow>
      <InfoRow label="What">{plan.wasteType} · {plural(plan.bags, 'bag')}{plan.binWash ? ' · bin wash' : ''}{plan.floors ? ` · ${plural(plan.floors, 'floor')} up` : ''}</InfoRow>
      <InfoRow label="Per visit">{cedi(plan.pricePerVisit)}{plan.discountPct ? <span className="badge badge-green" style={{ marginLeft: '.4rem' }}>{plan.discountPct}% off</span> : null}</InfoRow>
      <InfoRow label="Payment">{plan.paymentMethod === 'momo' ? 'Online (MoMo / card), each visit' : 'Cash at the gate'}</InfoRow>
      <InfoRow label="Visits booked">{plan.visitsBooked}</InfoRow>
      {plan.status === 'active' && <InfoRow label="Next booking">{formatDate(plan.nextDate, { weekday: 'short', day: 'numeric', month: 'short' })}</InfoRow>}
    </div>
    {next && <Link href={`/pickups/${next.id}`} className="plan-next row-link" data-testid={`link-plan-next-${plan.code}`}>
      <CalendarClock size={16} />
      <div><strong>Upcoming: {next.code}</strong><span>{formatDate(next.scheduledDate)} · {next.timeWindow} · {next.collectorName || 'Finding a collector'}</span></div>
      <StatusBadge status={next.status} /><ChevronRight size={15} />
    </Link>}
    {plan.status !== 'cancelled' && <div className="row-actions" style={{ marginTop: '.9rem' }}>
      {plan.status === 'active'
        ? <button className="btn btn-outline btn-sm" onClick={() => setStatus('paused')} disabled={Boolean(busy)} data-testid={`button-pause-${plan.code}`}>{busy === 'paused' ? <Spinner size={14} /> : <Pause size={14} />} Pause</button>
        : <button className="btn btn-primary btn-sm" onClick={() => setStatus('active')} disabled={Boolean(busy)} data-testid={`button-resume-${plan.code}`}>{busy === 'active' ? <Spinner size={14} /> : <Play size={14} />} Resume</button>}
      <button className="btn btn-quiet btn-sm danger-text" onClick={() => setConfirmCancel(true)} disabled={Boolean(busy)} data-testid={`button-cancel-${plan.code}`}><Trash2 size={14} /> Cancel plan</button>
    </div>}
    {confirmCancel && <Modal title={`Cancel ${plan.code}?`} onClose={() => setConfirmCancel(false)} width={420}>
      <p className="muted" style={{ fontSize: '.82rem', lineHeight: 1.55 }}>We’ll stop booking visits and cancel any upcoming visit that hasn’t started. Visits you already paid for online stay booked. To skip a while instead, use <strong>Pause</strong>.</p>
      <div className="modal-actions">
        <button className="btn btn-outline" onClick={() => setConfirmCancel(false)}>Keep plan</button>
        <button className="btn btn-primary" onClick={() => setStatus('cancelled')} disabled={busy === 'cancelled'} data-testid="button-confirm-cancel-plan">{busy === 'cancelled' ? <Spinner size={14} /> : <Trash2 size={14} />} Cancel plan</button>
      </div>
    </Modal>}
  </div>;
}

export default function Plans() {
  const state = useApi('/subscriptions', { live: true });
  const update = (sub) => state.setData((d) => ({ ...d, subscriptions: d.subscriptions.map((s) => (s.id === sub.id ? { ...s, ...sub } : s)) }));

  return <Shell title="My plans" subtitle="Weekly and monthly collections that book themselves.">
    <PageHead eyebrow="Recurring pickups" title="Set it once. We’ll keep coming." text="Each visit is booked automatically two days ahead, and you get a reminder. Plans cost less per visit than one-off pickups.">
      <Link className="btn btn-primary" href="/pickup" data-testid="button-new-plan"><Plus size={15} /> New plan</Link>
    </PageHead>
    <Async state={state}>{({ subscriptions }) => subscriptions.length === 0
      ? <div className="panel"><EmptyState icon={Repeat} title="No plans yet" action={<Link className="btn btn-primary" href="/pickup"><Plus size={15} /> Start a weekly plan</Link>}>
        Choose <strong>Every week</strong> or <strong>Every month</strong> when you request a pickup, and we’ll book every visit for you.
      </EmptyState></div>
      : <div className="plan-grid">{subscriptions.map((p) => <PlanCard key={p.id} plan={p} onChanged={(sub) => { update(sub); state.reload({ quiet: true }); }} />)}</div>}
    </Async>
  </Shell>;
}
