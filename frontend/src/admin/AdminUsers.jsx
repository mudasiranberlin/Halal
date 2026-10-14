import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, Ban, RotateCcw, Trash2 } from 'lucide-react';
import { adminApi } from '../api/client.js';
import useAdminAsync from './useAdminAsync.js';
import useDebounce from '../hooks/useDebounce.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatDate } from '../utils/format.js';
import { StatusChip } from '../components/ui/Badges.jsx';
import { Skeleton, ErrorState, EmptyState, Spinner } from '../components/ui/States.jsx';
import { ConfirmDialog, Modal } from '../components/ui/Modal.jsx';
import { Pager } from './parts.jsx';

function UserDetail({ id, onClose }) {
  const { data, loading, error } = useAdminAsync(() => adminApi.user(id), [id]);
  return (
    <Modal title="User details" onClose={onClose} width={520}>
      {loading ? <Spinner label="Loading…" /> : error ? <p className="sub">Unable to load this user.</p> : (
        <>
          <dl className="dl">
            <dt>Name</dt><dd>{data.user.name}</dd>
            <dt>Email</dt><dd>{data.user.email}</dd>
            <dt>Phone</dt><dd>{data.user.phone || '—'}</dd>
            <dt>Registered</dt><dd>{formatDate(data.user.createdAt)}</dd>
            <dt>Last login</dt><dd>{data.user.lastLoginAt ? formatDate(data.user.lastLoginAt) : 'Never'}</dd>
            <dt>Status</dt><dd><StatusChip status={data.user.status} /></dd>
            <dt>Reviews</dt><dd>{data.user.reviewCount}</dd>
          </dl>
          <h3>Submissions</h3>
          {data.foods.length === 0 ? <p className="sub">None.</p> : <ul className="minilist">{data.foods.map((f) => <li key={f.id}><div><b>{f.name}</b><span className="sub">{formatDate(f.createdAt)}</span></div><StatusChip status={f.status} /></li>)}</ul>}
        </>
      )}
    </Modal>
  );
}

export default function AdminUsers() {
  const toast = useToast();
  const [sp, setSp] = useSearchParams();
  const status = sp.get('status') || '';
  const page = Number(sp.get('page')) || 1;
  const [q, setQ] = useState('');
  const dq = useDebounce(q, 350);
  const { data, loading, error, reload } = useAdminAsync(() => adminApi.users({ status, q: dq, page, limit: 15 }), [status, dq, page]);
  const [view, setView] = useState(null);
  const [del, setDel] = useState(null);
  const [toggle, setToggle] = useState(null);
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
      <h1 className="pagetitle">Users</h1>
      <div className="filterbar">
        <input aria-label="Search users" placeholder="Search name, email or phone…" value={q} onChange={(e) => { setQ(e.target.value); setParam('page', ''); }} />
        <select aria-label="Filter by status" value={status} onChange={(e) => setParam('status', e.target.value)}>
          <option value="">All accounts</option><option value="active">Active</option><option value="disabled">Disabled</option>
        </select>
      </div>
      {error ? <ErrorState title="Unable to load users." message="Please try again." onRetry={reload} /> : loading ? <Skeleton h={90} r={14} /> : data.items.length === 0 ? <EmptyState title="No users found" /> : (
        <>
          <div className="wide-table">
            <table className="datatable">
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Registered</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u.id}>
                    <td data-label="Name"><b>{u.name}</b><div className="sub">{u.foodCount} submissions · {u.reviewCount} reviews</div></td>
                    <td data-label="Email">{u.email}</td>
                    <td data-label="Phone">{u.phone || '—'}</td>
                    <td data-label="Registered">{formatDate(u.createdAt)}</td>
                    <td data-label="Status"><StatusChip status={u.status} /></td>
                    <td className="actions">
                      <button className="mutedbtn small" onClick={() => setView(u.id)}><Eye size={15} aria-hidden="true" /> View</button>
                      <button className="mutedbtn small" onClick={() => setToggle(u)}>{u.status === 'active' ? <><Ban size={15} aria-hidden="true" /> Disable</> : <><RotateCcw size={15} aria-hidden="true" /> Enable</>}</button>
                      <button className="iconbtn danger" aria-label={`Delete ${u.name}`} onClick={() => setDel(u)}><Trash2 size={17} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager data={data} onPage={(p) => setParam('page', p > 1 ? p : '')} />
        </>
      )}
      {view && <UserDetail id={view} onClose={() => setView(null)} />}
      {toggle && <ConfirmDialog title={toggle.status === 'active' ? 'Disable this account?' : 'Enable this account?'} danger={toggle.status === 'active'} confirmLabel={toggle.status === 'active' ? 'Disable' : 'Enable'} busy={busy} message={toggle.status === 'active' ? `${toggle.name} will be logged out and will not be able to log in.` : `${toggle.name} will be able to log in again.`} onCancel={() => setToggle(null)} onConfirm={async () => { if (await run(() => adminApi.setUserStatus(toggle.id, toggle.status === 'active' ? 'disabled' : 'active'))) setToggle(null); }} />}
      {del && <ConfirmDialog title="Delete this account?" danger confirmLabel="Delete" busy={busy} message={`${del.name}'s account and reviews will be removed, along with any unpublished submissions. Published listings stay online.`} onCancel={() => setDel(null)} onConfirm={async () => { if (await run(() => adminApi.deleteUser(del.id))) setDel(null); }} />}
    </>
  );
}
