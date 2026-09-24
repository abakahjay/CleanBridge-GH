import { HandCoins, Landmark, Truck } from 'lucide-react';
import { cedi } from '../lib/format.js';

export const FEE_LABELS = {
  baseFee: 'Base fee',
  distanceFee: 'Distance from hub',
  quantityFee: 'Quantity',
  wasteTypeFee: 'Waste type',
  vehicleFee: 'Vehicle',
  urgencyFee: 'Express pickup',
  weekendFee: 'Weekend',
  minimumTopUp: 'Minimum charge top-up'
};

const Row = ({ label, value, strong, muted }) => <div className={`pb-row ${strong ? 'strong' : ''} ${muted ? 'muted' : ''}`}><span>{label}</span><span>{value}</span></div>;

/**
 * Itemised price: fees → subtotal → Ghana taxes → total, then the split.
 * Works with a quote ({ breakdown, subtotal, taxes, taxTotal, total, split })
 * or a saved pickup ({ priceBreakdown, subtotal, taxes, taxAmount, estimatedPrice }).
 */
export default function PriceBreakdown({ breakdown, subtotal, taxes = [], taxTotal, total, split, vehicleType, sharePct, showSplit = true }) {
  const fees = Object.entries(breakdown || {}).filter(([, v]) => v > 0);
  const net = subtotal ?? total;
  const tax = taxTotal ?? taxes.reduce((s, t) => s + (t.amount || 0), 0);
  const collectorShare = split?.collector ?? (sharePct != null ? Math.round(net * sharePct) / 100 : null);
  const platform = split?.platform ?? (collectorShare != null ? Math.round((net - collectorShare) * 100) / 100 : null);

  return <div className="price-breakdown">
    {fees.map(([k, v]) => <Row key={k} label={k === 'vehicleFee' && vehicleType ? `Vehicle · ${vehicleType}` : FEE_LABELS[k] || k} value={cedi(v)} />)}
    <Row label="Subtotal" value={cedi(net)} strong />
    {taxes.map((t) => <Row key={t.code} label={`${t.label} (${t.pct}%)`} value={cedi(t.amount)} muted />)}
    {taxes.length === 0 && <Row label="Taxes" value="Not charged" muted />}
    <Row label="Total to pay" value={cedi(total)} strong />

    {showSplit && collectorShare != null && <div className="pb-split">
      <div className="pb-split-title">Where your money goes</div>
      <div className="pb-bar" aria-hidden>
        <i style={{ flex: collectorShare }} className="c" />
        <i style={{ flex: Math.max(platform, 0) }} className="p" />
        {tax > 0 && <i style={{ flex: tax }} className="t" />}
      </div>
      <Row label={<><Truck size={13} /> Your collector{split?.collectorSharePct != null ? ` (${split.collectorSharePct}%)` : ''}</>} value={cedi(collectorShare)} />
      <Row label={<><HandCoins size={13} /> CleanBridge (app, support, operations)</>} value={cedi(platform)} />
      {tax > 0 && <Row label={<><Landmark size={13} /> Taxes paid to GRA</>} value={cedi(tax)} />}
    </div>}
  </div>;
}
