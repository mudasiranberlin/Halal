import React from 'react';
import { Link } from 'react-router-dom';
import { UtensilsCrossed, Clock, CheckCircle2, XCircle, Users, MessageSquare, MessageSquareWarning, FlaskConical } from 'lucide-react';
import { adminApi } from '../api/client.js';
import useAdminAsync from './useAdminAsync.js';
import { Skeleton, ErrorState } from '../components/ui/States.jsx';
import { formatDate } from '../utils/format.js';
import { Stars } from '../components/ui/Stars.jsx';

const TILES = [
  { key: 'foods', label: 'Total food listings', icon: UtensilsCrossed, to: '/admin/foods', tone: 'blue' },
  { key: 'pendingFoods', label: 'Pending listings', icon: Clock, to: '/admin/foods?status=pending', tone: 'amber' },
  { key: 'approvedFoods', label: 'Approved listings', icon: CheckCircle2, to: '/admin/foods?status=approved', tone: 'green' },
  { key: 'rejectedFoods', label: 'Rejected listings', icon: XCircle, to: '/admin/foods?status=rejected', tone: 'red' },
  { key: 'demoFoods', label: 'Demo listings', icon: FlaskConical, to: '/admin/foods?status=demo', tone: 'grey' },
  { key: 'users', label: 'Total users', icon: Users, to: '/admin/users', tone: 'blue' },
  { key: 'reviews', label: 'Total reviews', icon: MessageSquare, to: '/admin/reviews', tone: 'green' },
  { key: 'pendingReviews', label: 'Pending reviews', icon: MessageSquareWarning, to: '/admin/reviews?status=pending', tone: 'amber' },
];

export default function Dashboard() {
  const { data, loading, error, reload } = useAdminAsync(() => adminApi.dashboard(), []);
  return (
    <>
      <h1 className="pagetitle">Dashboard</h1>
      {error ? <ErrorState title="Unable to load the dashboard." message="Please try again." onRetry={reload} /> : (
        <>
          <div className="statgrid">
            {TILES.map(({ key, label, icon: Icon, to, tone }) => (
              <Link key={key} to={to} className={`stat ${tone}`}>
                <span className="staticon"><Icon size={22} aria-hidden="true" /></span>
                <span className="statnum">{loading ? <Skeleton w={40} h={28} /> : data.stats[key]}</span>
                <span className="statlabel">{label}</span>
              </Link>
            ))}
          </div>

          <div className="twocol">
            <section className="card-panel">
              <div className="sechead"><h2 className="sectiontitle">Waiting for approval</h2><Link className="seemore" to="/admin/foods?status=pending">See all</Link></div>
              {loading ? <Skeleton h={60} r={12} /> : data.recentPending.length === 0 ? <p className="sub">Nothing is waiting. 🎉</p> : (
                <ul className="minilist">
                  {data.recentPending.map((f) => (
                    <li key={f.id}><div><b>{f.name}</b><span className="sub">{f.submittedBy?.name || 'Unknown'} · {formatDate(f.createdAt)}</span></div><Link className="btn small" to={`/admin/foods?status=pending&q=${encodeURIComponent(f.name)}`}>Review</Link></li>
                  ))}
                </ul>
              )}
            </section>
            <section className="card-panel">
              <div className="sechead"><h2 className="sectiontitle">Latest reviews</h2><Link className="seemore" to="/admin/reviews">See all</Link></div>
              {loading ? <Skeleton h={60} r={12} /> : data.recentReviews.length === 0 ? <p className="sub">No reviews yet.</p> : (
                <ul className="minilist">
                  {data.recentReviews.map((r) => (
                    <li key={r.id}><div><b>{r.food?.name || 'Removed place'}</b><span className="sub"><Stars value={r.rating} size={12} /> {r.user?.name || 'Unknown'} · {formatDate(r.createdAt)}</span><span className="sub clamp">{r.comment}</span></div></li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
