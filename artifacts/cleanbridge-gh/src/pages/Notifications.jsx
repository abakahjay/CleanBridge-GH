import { Link } from 'wouter';
import { Bell, Check } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { Async, EmptyState, PageHead } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { useApi } from '../lib/hooks.js';
import { useToast } from '../lib/toast.jsx';
import { timeAgo } from '../lib/format.js';

export default function Notifications() {
  const state = useApi('/notifications');
  const toast = useToast();

  const markRead = async (id) => {
    state.setData((d) => ({ ...d, notifications: d.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)), unreadCount: Math.max(0, d.unreadCount - 1) }));
    api.patch(`/notifications/${id}/read`).catch(() => {});
  };
  const markAll = async () => {
    try {
      await api.patch('/notifications/read-all');
      state.setData((d) => ({ ...d, notifications: d.notifications.map((n) => ({ ...n, read: true })), unreadCount: 0 }));
    } catch (e) { toast(e.message, 'error'); }
  };

  return <Shell title="Notifications" subtitle="Useful updates, not noise.">
    <PageHead eyebrow="Your inbox" title="Stay in the loop." text="Pickup updates, payments and announcements.">
      <button className="btn btn-outline" onClick={markAll} disabled={!state.data?.unreadCount} data-testid="button-mark-all-read"><Check size={15} /> Mark all read</button>
    </PageHead>
    <div className="panel panel-pad">
      <Async state={state}>{({ notifications }) => notifications.length === 0
        ? <EmptyState icon={Bell} title="All caught up">We’ll let you know when something happens with your pickups.</EmptyState>
        : <div className="data-list">{notifications.map((n) => {
          const body = <div className="notif">
            <div className={`card-icon notif-icon ${n.read ? 'read' : ''}`}><Bell size={15} /></div>
            <div className="data-main"><strong>{n.title} {!n.read && <span className="badge badge-orange" style={{ marginLeft: '.4rem' }}>New</span>}</strong><span>{n.message}</span><span className="notif-time">{timeAgo(n.createdAt)}</span></div>
          </div>;
          return <div className="data-row" key={n.id} data-testid={`row-notification-${n.id}`}>
            {n.pickupId ? <Link href={`/pickups/${n.pickupId}`} onClick={() => !n.read && markRead(n.id)} className="row-link">{body}</Link> : body}
            {!n.read && <button className="btn btn-quiet btn-sm" onClick={() => markRead(n.id)}>Mark read</button>}
          </div>;
        })}</div>}
      </Async>
    </div>
  </Shell>;
}
