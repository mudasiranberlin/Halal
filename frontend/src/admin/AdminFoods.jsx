import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, X, Pencil, Trash2, Plus, ExternalLink } from 'lucide-react';
import { adminApi } from '../api/client.js';
import useAdminAsync from './useAdminAsync.js';
import useDebounce from '../hooks/useDebounce.js';
import { useToast } from '../context/ToastContext.jsx';
import { foodImages, categoryLabel } from '../data.js';
import { formatDate } from '../utils/format.js';
import { StatusChip, DemoBadge, VerifiedBadge } from '../components/ui/Badges.jsx';
import { Skeleton, ErrorState, EmptyState } from '../components/ui/States.jsx';
import { ConfirmDialog, Modal } from '../components/ui/Modal.jsx';
import FoodForm from '../components/FoodForm.jsx';
import { Pager } from './parts.jsx';

const FILTERS = [['', 'All'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['demo', 'Demo']];

export default function AdminFoods() {
  const toast = useToast();
  const [sp, setSp] = useSearchParams();
  const status = sp.get('status') || '';
  const page = Number(sp.get('page')) || 1;
  const [q, setQ] = useState(sp.get('q') || '');
  const dq = useDebounce(q, 350);
  const { data, loading, error, reload } = useAdminAsync(() => adminApi.foods({ status, q: dq, page, limit: 15 }), [status, dq, page]);
  const [busyId, setBusyId] = useState('');
  const [reject, setReject] = useState(null);
  const [reason, setReason] = useState('');
  const [del, setDel] = useState(null);
  const [edit, setEdit] = useState(null); // food | 'new'

  const setParam = (k, v) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); if (k !== 'page') n.delete('page'); setSp(n, { replace: true }); };

  const act = async (id, fn, okMsg) => {
    setBusyId(id);
    try { const d = await fn(); toast.success(okMsg || d.message); reload(); return true; }
    catch (e) { toast.error(e.message); return false; }
    finally { setBusyId(''); }
  };

  return (
    <>
      <div className="sechead">
        <h1 className="pagetitle">Foods</h1>
        <button className="btn" onClick={() => setEdit('new')}><Plus size={18} aria-hidden="true" /> Add food</button>
      </div>

      <div className="filterbar">
        <input aria-label="Search listings" placeholder="Search name, address, city…" value={q} onChange={(e) => { setQ(e.target.value); setParam('page', ''); }} />
      </div>
      <div className="chips" role="group" aria-label="Filter by status">
        {FILTERS.map(([v, l]) => <button key={v} className={`chip ${status === v ? 'active' : ''}`} aria-pressed={status === v} onClick={() => setParam('status', v)}>{l}</button>)}
      </div>

      {error ? <ErrorState title="Unable to load listings." message="Please try again." onRetry={reload} /> : loading ? <Skeleton h={90} r={14} /> : data.items.length === 0 ? (
        <EmptyState title="No listings found" text="Try a different filter or search." />
      ) : (
        <>
          <ul className="adminlist">
            {data.items.map((f) => (
              <li key={f.id} className="adminrow">
                <img src={foodImages(f)[0]} alt="" loading="lazy" />
                <div className="rowmain">
                  <b>{f.name}</b>
                  <span className="sub">{categoryLabel(f.category)} · {f.city} · added {formatDate(f.createdAt)}</span>
                  <span className="sub">{f.isDemo ? 'Demo data' : f.submittedBy ? `By ${f.submittedBy.name} (${f.submittedBy.email})` : 'Submitted by a deleted user'}</span>
                  <div className="rowtags"><StatusChip status={f.status} />{f.isDemo ? <DemoBadge small /> : f.isVerified && <VerifiedBadge small />}</div>
                  {f.status === 'rejected' && f.rejectionReason && <span className="sub">Reason: {f.rejectionReason}</span>}
                </div>
                <div className="actions">
                  {f.status !== 'approved' && <button className="btn small green" disabled={busyId === f.id} onClick={() => act(f.id, () => adminApi.approveFood(f.id))}><Check size={16} aria-hidden="true" /> Approve</button>}
                  {f.status !== 'rejected' && <button className="btn small secondary" disabled={busyId === f.id} onClick={() => { setReject(f); setReason(''); }}><X size={16} aria-hidden="true" /> Reject</button>}
                  <button className="mutedbtn small" onClick={() => setEdit(f)}><Pencil size={15} aria-hidden="true" /> Edit</button>
                  {f.status === 'approved' && <Link className="mutedbtn small" to={`/food/${f.id}`} target="_blank"><ExternalLink size={15} aria-hidden="true" /> View</Link>}
                  <button className="iconbtn danger" aria-label={`Delete ${f.name}`} onClick={() => setDel(f)}><Trash2 size={17} /></button>
                </div>
              </li>
            ))}
          </ul>
          <Pager data={data} onPage={(p) => setParam('page', p > 1 ? p : '')} />
        </>
      )}

      {reject && (
        <ConfirmDialog title="Reject this listing?" confirmLabel="Reject" danger busy={busyId === reject.id} message={`"${reject.name}" will stay hidden from the public. You can add a short note for the submitter.`}
          onCancel={() => setReject(null)} onConfirm={async () => { if (await act(reject.id, () => adminApi.rejectFood(reject.id, reason))) setReject(null); }}>
          <div className="field" style={{ marginTop: 12 }}><label htmlFor="rej">Reason (optional)</label><textarea id="rej" rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Duplicate of an existing listing" /></div>
        </ConfirmDialog>
      )}
      {del && <ConfirmDialog title="Delete permanently?" confirmLabel="Delete" danger busy={busyId === del.id} message={`"${del.name}", its photos and its reviews will be removed for good.`} onCancel={() => setDel(null)} onConfirm={async () => { if (await act(del.id, () => adminApi.deleteFood(del.id))) setDel(null); }} />}
      {edit && (
        <Modal title={edit === 'new' ? 'Add a food listing' : `Edit: ${edit.name}`} width={760} onClose={() => setEdit(null)}>
          <FoodForm
            initial={edit === 'new' ? undefined : edit}
            submitLabel={edit === 'new' ? 'Create & publish' : 'Save changes'}
            note={edit === 'new' ? 'Listings you add are published immediately with a Verified badge.' : 'Saving keeps the current approval status.'}
            onSubmit={async (fd, onProgress) => {
              const d = edit === 'new' ? await adminApi.createFood(fd, onProgress) : await adminApi.updateFood(edit.id, fd, onProgress);
              toast.success(d.message);
              setEdit(null);
              reload();
            }}
          />
        </Modal>
      )}
    </>
  );
}
