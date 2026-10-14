import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, Trash2 } from 'lucide-react';
import { adminApi } from '../api/client.js';
import useAdminAsync from './useAdminAsync.js';
import useDebounce from '../hooks/useDebounce.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatDate } from '../utils/format.js';
import { Stars } from '../components/ui/Stars.jsx';
import { Skeleton, ErrorState, EmptyState } from '../components/ui/States.jsx';
import { ConfirmDialog } from '../components/ui/Modal.jsx';
import { Pager } from './parts.jsx';

export default function AdminReviews() {
  const toast = useToast();
  const [sp, setSp] = useSearchParams();
  const status = sp.get('status') || '';
  const rating = sp.get('rating') || '';
  const page = Number(sp.get('page')) || 1;
  const [q, setQ] = useState('');
  const dq = useDebounce(q, 350);
  const { data, loading, error, reload } = useAdminAsync(() => adminApi.reviews({ status, rating, q: dq, page, limit: 15 }), [status, rating, dq, page]);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);

  const setParam = (k, v) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); if (k !== 'page') n.delete('page'); setSp(n, { replace: true }); };

  const run = async (fn) => {
    setBusy(true);
    try { const d = await fn(); toast.success(d.message); reload(); return true; }
    catch (e) { toast.error(e.message); return false; }
    finally { setBusy(false); }
  };

  return (
    <>
      <h1 className="pagetitle">Reviews</h1>
      <div className="filterbar">
        <input aria-label="Search reviews" placeholder="Search by restaurant, author or text…" value={q} onChange={(e) => { setQ(e.target.value); setParam('page', ''); }} />
        <select aria-label="Filter by rating" value={rating} onChange={(e) => setParam('rating', e.target.value)}>
          <option value="">Any rating</option>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}
        </select>
        <select aria-label="Filter by status" value={status} onChange={(e) => setParam('status', e.target.value)}>
          <option value="">Any status</option>
          <option value="pending">Pending approval</option>
          <option value="approved">Approved</option>
        </select>
      </div>

      {error ? <ErrorState title="Unable to load reviews." message="Please try again." onRetry={reload} /> : loading ? <Skeleton h={90} r={14} /> : data.items.length === 0 ? (
        <EmptyState title="No reviews found" text="Try a different search or filter." />
      ) : (
        <>
          <ul className="adminlist">
            {data.items.map((r) => (
              <li key={r.id} className="adminrow top">
                <div className="rowmain">
                  <div><Stars value={r.rating} size={15} /> {r.status === 'pending' && <span className="statuschip pending">Pending approval</span>}</div>
                  <p className="revtext">{r.comment}</p>
                  <span className="sub">
                    <b>Restaurant:</b> {r.food ? <Link to={`/food/${r.food.id}`} target="_blank">{r.food.name}</Link> : 'Removed'} · <b>By:</b> {r.user ? `${r.user.name} (${r.user.email})` : 'Deleted user'} · {formatDate(r.createdAt)}
                  </span>
                </div>
                <div className="actions">
                  {r.status === 'pending' && <button className="btn small green" disabled={busy} onClick={() => run(() => adminApi.approveReview(r.id))}><Check size={16} aria-hidden="true" /> Approve</button>}
                  <button className="btn small danger" onClick={() => setDel(r)}><Trash2 size={16} aria-hidden="true" /> Delete</button>
                </div>
              </li>
            ))}
          </ul>
          <Pager data={data} onPage={(p) => setParam('page', p > 1 ? p : '')} />
        </>
      )}
      {del && <ConfirmDialog title="Delete this review?" danger confirmLabel="Delete" busy={busy} message="It will no longer appear publicly and the restaurant's rating will be recalculated." onCancel={() => setDel(null)} onConfirm={async () => { if (await run(() => adminApi.deleteReview(del.id))) setDel(null); }} />}
    </>
  );
}
