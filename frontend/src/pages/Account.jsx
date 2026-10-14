import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { LogOut, Plus, Trash2, Mail, Phone, CalendarDays } from 'lucide-react';
import { api } from '../api/client.js';
import useAsync from '../hooks/useAsync.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { foodImages, categoryLabel } from '../data.js';
import { formatDate } from '../utils/format.js';
import { StatusChip } from '../components/ui/Badges.jsx';
import { Skeleton, ErrorState, EmptyState, Spinner } from '../components/ui/States.jsx';
import { ConfirmDialog } from '../components/ui/Modal.jsx';

export default function Account() {
  const { user, loading, logout } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const { data, loading: l2, error, reload } = useAsync(() => api.myFoods(), [user?.id], { enabled: !!user });
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <Spinner label="Loading your account…" />;
  if (!user) return <Navigate to="/login" state={{ from: '/account' }} replace />;

  const doLogout = async () => {
    await logout();
    toast.info('You have been logged out.');
    nav('/');
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.deleteMyFood(del.id);
      toast.success('Your listing was deleted.');
      setDel(null);
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h1 className="pagetitle">My account</h1>
      <section className="card-panel profile">
        <span className="avatar big" aria-hidden="true">{user.name.charAt(0).toUpperCase()}</span>
        <div className="profile-info">
          <h2>{user.name}</h2>
          <ul>
            <li><Mail size={15} aria-hidden="true" /> {user.email}</li>
            {user.phone && <li><Phone size={15} aria-hidden="true" /> {user.phone}</li>}
            <li><CalendarDays size={15} aria-hidden="true" /> Member since {formatDate(user.createdAt)}</li>
          </ul>
        </div>
        <button className="mutedbtn" onClick={doLogout}><LogOut size={16} aria-hidden="true" /> Log out</button>
      </section>

      <div className="sechead">
        <div><h2 className="sectiontitle">My food submissions</h2><p className="sub">New spots stay private until an administrator approves them.</p></div>
        <Link className="btn small" to="/add-food"><Plus size={16} aria-hidden="true" /> Add food</Link>
      </div>

      {l2 ? <Skeleton h={80} r={14} /> : error ? <ErrorState title="Unable to load your submissions." message="Please try again." onRetry={reload} /> : data.items.length === 0 ? (
        <EmptyState title="Nothing submitted yet" text="Know a great place? Add it and help others find it." action={<Link className="btn" to="/add-food">Add a food spot</Link>} />
      ) : (
        <ul className="mylist">
          {data.items.map((f) => (
            <li key={f.id} className="myitem">
              <img src={foodImages(f)[0]} alt="" loading="lazy" />
              <div className="myinfo">
                <b>{f.status === 'approved' ? <Link to={`/food/${f.id}`}>{f.name}</Link> : f.name}</b>
                <span className="sub">{categoryLabel(f.category)} · {f.city} · {formatDate(f.createdAt)}</span>
                <div><StatusChip status={f.status} /></div>
                {f.status === 'rejected' && f.rejectionReason && <span className="sub">Reason: {f.rejectionReason}</span>}
                {f.status === 'pending' && <span className="sub">Waiting for approval.</span>}
              </div>
              <button className="iconbtn" onClick={() => setDel(f)} aria-label={`Delete ${f.name}`}><Trash2 size={18} /></button>
            </li>
          ))}
        </ul>
      )}

      {del && <ConfirmDialog title="Delete this listing?" danger busy={busy} confirmLabel="Delete" message={`"${del.name}" and its photos will be removed permanently.`} onConfirm={remove} onCancel={() => setDel(null)} />}
    </>
  );
}
