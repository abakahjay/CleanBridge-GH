import { useState } from 'react';
import { Link, useLocation, useRoute } from 'wouter';
import { ArrowLeft, Ban, Navigation, Phone, Smartphone } from 'lucide-react';
import Shell from '../../components/Shell.jsx';
import MapView from '../../components/MapView.jsx';
import { Async, InfoRow, Modal, Spinner, Stars, StatusBadge } from '../../components/ui.jsx';
import PriceBreakdown from '../../components/PriceBreakdown.jsx';
import { api, appUrl } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { useAction, useApi } from '../../lib/hooks.js';
import { useToast } from '../../lib/toast.jsx';
import { directionsLink, formatPhone, telLink } from '../../lib/ghana.js';
import { cedi, formatDate, formatDateTime, plural, timeAgo } from '../../lib/format.js';


function Timeline({ p }) {
  const steps = [
    ['Booked', p.createdAt, `${p.wasteType} · ${plural(p.bags, 'bag')}`],
    ['Collector assigned', p.assignedAt, p.collectorName ? `${p.collectorName}${p.vehicleLabel ? ` · ${p.vehicleLabel}` : ''}` : 'Waiting for a collector to accept'],
    ['On the way', p.startedAt, p.etaMinutes ? `Estimated ${p.etaMinutes} min to your gate` : 'Your collector sets off'],
    p.status === 'cancelled' ? ['Cancelled', p.cancelledAt, 'This pickup was cancelled'] : ['Collected', p.completedAt, 'Receipt appears here']
  ];
  return <div className="timeline">{steps.map(([title, at, text]) => <div className={`timeline-item ${at ? '' : 'pending'}`} key={title}>
    <div className="timeline-dot" /><div className="timeline-copy"><strong>{title}</strong><span>{at ? `${formatDateTime(at)} · ` : ''}{text}</span></div>
  </div>)}</div>;
}

export default function PickupDetail() {
  const [, params] = useRoute('/pickups/:id');
  const { user } = useAuth();
  const toast = useToast();
  const [, navigate] = useLocation();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const state = useApi(`/pickups/${params.id}`, { refreshMs: 15000, live: true });
  const settings = useApi('/settings');
  const [pending, run] = useAction((e) => toast(e.message, 'error'));

  const pay = () => run(async () => {
    const { authorizationUrl } = await api.post(`/payments/pickups/${params.id}/initialize`, { callbackUrl: appUrl('payment/callback') });
    window.location.assign(authorizationUrl);
  });
  const cancel = () => run(async () => {
    await api.patch(`/pickups/${params.id}/status`, { status: 'cancelled' });
    setConfirmCancel(false);
    toast('Pickup cancelled.');
    state.reload({ quiet: true });
  });
  const rate = (rating) => run(async () => {
    await api.post(`/pickups/${params.id}/rate`, { rating });
    toast('Thanks for rating your collector!');
    state.reload({ quiet: true });
  });

  return <Shell title="Pickup details" subtitle="Live status, payment and receipt.">
    <div style={{ marginBottom: '1rem' }}><Link href={user.role === 'customer' ? '/pickups' : user.role === 'collector' ? '/collector/jobs' : '/admin/collections'} className="btn btn-ghost btn-sm" data-testid="link-back"><ArrowLeft size={15} /> Back</Link></div>
    <Async state={state}>{({ pickup: p, collectorLocation, liveEtaMinutes }) => {
      const active = ['assigned', 'on_the_way'].includes(p.status);
      const markers = [
        { id: 'home', position: p.location, kind: 'home', popup: p.address },
        collectorLocation && { id: 'truck', position: collectorLocation, kind: 'truck', popup: `${p.collectorName} · updated ${timeAgo(collectorLocation.updatedAt)}` }
      ].filter(Boolean);
      const canPay = user.role === 'customer' && p.paymentStatus === 'unpaid' && p.status !== 'cancelled';
      const canCancel = user.role === 'customer' && ['requested', 'assigned'].includes(p.status);

      return <div className="grid-2 detail-grid">
        <div className="panel panel-pad">
          <div className="mini-title"><h3>{p.code}</h3><StatusBadge status={p.status} /></div>
          <MapView markers={markers} polyline={collectorLocation && p.status === 'on_the_way' ? [collectorLocation, p.location] : null} height={330} />
          {active && <div className="track-banner">
            {p.status === 'on_the_way'
              ? <><strong>{liveEtaMinutes ?? p.etaMinutes ?? '—'} min</strong><span>{p.collectorName} is on the way{collectorLocation ? '' : ' · live location not shared yet'}</span></>
              : <><strong>{formatDate(p.scheduledDate, { weekday: 'short', day: 'numeric', month: 'short' })}</strong><span>{p.collectorName} will collect between {p.timeWindow}</span></>}
          </div>}
          <div className="action-row">
            {p.collectorPhone && user.role === 'customer' && active && <a className="btn btn-primary" href={telLink(p.collectorPhone)} data-testid="button-call-collector"><Phone size={15} /> Call {p.collectorName.split(' ')[0]}</a>}
            {user.role !== 'customer' && <a className="btn btn-primary" href={directionsLink(p.location)} target="_blank" rel="noreferrer"><Navigation size={15} /> Directions</a>}
            {user.role !== 'customer' && p.customerPhone && <a className="btn btn-outline" href={telLink(p.customerPhone)}><Phone size={15} /> Call customer</a>}
            {canCancel && <button className="btn btn-outline danger-text" onClick={() => setConfirmCancel(true)} data-testid="button-cancel-pickup"><Ban size={15} /> Cancel pickup</button>}
          </div>
          {p.status === 'completed' && user.role === 'customer' && <div className="rate-box">
            <strong>{p.customerRating ? 'You rated this pickup' : `How was ${p.collectorName?.split(' ')[0] || 'your collector'}?`}</strong>
            <Stars value={p.customerRating || 0} onChange={p.customerRating || pending ? undefined : rate} />
          </div>}
        </div>

        <div className="panel panel-pad">
          <div className="mini-title"><h3>Progress</h3><span className="muted mono" style={{ fontSize: '.7rem' }}>{p.code}</span></div>
          <Timeline p={p} />
          <div className="data-list section-rule">
            <InfoRow label="Address">{p.address}</InfoRow>
            {p.ghanaPostGps && <InfoRow label="GhanaPost GPS">{p.ghanaPostGps}</InfoRow>}
            {p.gateNote && <InfoRow label="Gate note">{p.gateNote}</InfoRow>}
            <InfoRow label="When">{formatDate(p.scheduledDate)} · {p.timeWindow}</InfoRow>
            {p.vehicleType && <InfoRow label="Vehicle">{p.vehicleType}</InfoRow>}
            {p.collectorPhone && user.role === 'customer' && <InfoRow label="Collector">{p.collectorName} · {formatPhone(p.collectorPhone)}</InfoRow>}
            {user.role !== 'customer' && <InfoRow label="Customer">{p.customerName} · {formatPhone(p.customerPhone)}</InfoRow>}
          </div>
          <div className="mini-title" style={{ marginTop: '1.2rem' }}><h3>Payment</h3><StatusBadge status={p.paymentStatus} /></div>
          <PriceBreakdown breakdown={p.priceBreakdown} subtotal={p.subtotal} taxes={p.taxes} taxTotal={p.taxAmount} total={p.estimatedPrice} vehicleType={p.vehicleType}
            split={p.collectorEarning != null ? { collector: p.collectorEarning, platform: p.platformFee } : undefined}
            sharePct={settings.data?.payouts?.collectorSharePct} />
          <div className="data-list">
            <InfoRow label="Method">{p.paymentChannelLabel || (p.cashCollected ? 'Cash' : p.paymentMethod === 'momo' ? 'Online (Paystack)' : 'Cash on pickup')}{p.paidAt ? ` · paid ${formatDateTime(p.paidAt)}` : ''}</InfoRow>
          </div>
          {canPay && <button className="btn btn-secondary btn-block" style={{ marginTop: '1rem' }} onClick={pay} disabled={pending} data-testid="button-pay-momo">
            {pending ? <Spinner size={15} /> : <Smartphone size={15} />} Pay {cedi(p.estimatedPrice)} online · MoMo, card, bank
          </button>}
          {canPay && p.paymentMethod === 'cash' && <p className="muted" style={{ fontSize: '.7rem', marginTop: '.5rem' }}>Or pay the collector in cash at pickup.</p>}
        </div>

        {confirmCancel && <Modal title="Cancel this pickup?" onClose={() => setConfirmCancel(false)}>
          <p className="muted" style={{ fontSize: '.82rem', lineHeight: 1.6 }}>{p.collectorName ? `${p.collectorName} will be told the pickup is off. ` : ''}{p.paymentStatus === 'paid' ? 'Your Mobile Money payment will be refunded by our team.' : 'You won’t be charged.'}</p>
          <div className="modal-actions"><button className="btn btn-outline" onClick={() => setConfirmCancel(false)}>Keep pickup</button><button className="btn btn-danger" onClick={cancel} disabled={pending} data-testid="button-confirm-cancel">{pending ? <Spinner size={15} /> : <Ban size={15} />} Cancel pickup</button></div>
        </Modal>}
      </div>;
    }}</Async>
    {state.error?.status === 403 && <button className="btn btn-outline" onClick={() => navigate('/')}>Go home</button>}
  </Shell>;
}
