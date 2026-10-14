import React, { useState } from 'react';
import { Navigate, NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, UtensilsCrossed, MessageSquare, Users, Megaphone, LogOut, Menu, X, ExternalLink } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { Spinner } from '../components/ui/States.jsx';

const LINKS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/foods', label: 'Foods', icon: UtensilsCrossed },
  { to: '/admin/reviews', label: 'Reviews', icon: MessageSquare },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/promotions', label: 'Promotions', icon: Megaphone },
];

export default function AdminLayout() {
  const { admin, loading, logout } = useAdminAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  if (loading) return <div className="adminloading"><Spinner label="Checking admin access…" /></div>;
  if (!admin) return <Navigate to="/admin/login" state={{ from: loc.pathname }} replace />;

  return (
    <div className="adminshell">
      <header className="adminbar">
        <button className="iconbtn menu" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>{open ? <X size={22} /> : <Menu size={22} />}</button>
        <strong>🍜 Food Finder <span>Admin</span></strong>
      </header>
      <aside className={`adminside ${open ? 'open' : ''}`}>
        <div className="adminbrand">🍜 Food<span>Finder</span> <em>Admin</em></div>
        <nav aria-label="Admin">
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={({ isActive }) => `sidelink ${isActive ? 'active' : ''}`}>
              <Icon size={19} aria-hidden="true" /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidefoot">
          <Link className="sidelink" to="/" target="_blank"><ExternalLink size={19} aria-hidden="true" /> View website</Link>
          <div className="sub who">{admin.name}<br />{admin.email}</div>
          <button className="sidelink" onClick={logout}><LogOut size={19} aria-hidden="true" /> Log out</button>
        </div>
      </aside>
      {open && <div className="sideback" onClick={() => setOpen(false)} />}
      <main className="adminmain"><Outlet /></main>
    </div>
  );
}
