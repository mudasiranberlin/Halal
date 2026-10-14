import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, LocateFixed, LayoutGrid, Plus, User, Search, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export const NAV = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/nearby', label: 'Nearby', icon: LocateFixed },
  { to: '/category', label: 'Category', icon: LayoutGrid },
  { to: '/add-food', label: 'Add Food', icon: Plus },
  { to: '/account', label: 'Account', icon: User },
];

export default function Header() {
  const navigate = useNavigate();
  const loc = useLocation();
  const { user } = useAuth();
  const [q, setQ] = useState('');

  // keep the box in sync with the search page address
  useEffect(() => {
    if (loc.pathname === '/search') setQ(new URLSearchParams(loc.search).get('q') || '');
    else setQ('');
  }, [loc.pathname, loc.search]);

  const submit = (e) => {
    e.preventDefault();
    const v = q.trim();
    navigate(v ? `/search?q=${encodeURIComponent(v)}` : '/search');
  };

  return (
    <header className="top">
      <div className="topinner">
        <Link to="/" className="logo" aria-label="Food Finder Cambodia — home">
          🍜 Food<span>Finder</span>
        </Link>

        <form className="search" role="search" onSubmit={submit}>
          <Search size={18} aria-hidden="true" className="search-ico" />
          <input aria-label="Search food or place" placeholder="Search food, dish, market, city…" value={q} onChange={(e) => setQ(e.target.value)} enterKeyHint="search" />
          {q && (
            <button type="button" className="search-clear" aria-label="Clear search" onClick={() => setQ('')}>
              <X size={16} />
            </button>
          )}
        </form>

        <nav className="topnav" aria-label="Main">
          {NAV.filter((n) => n.to !== '/add-food' && n.to !== '/account').map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `navlink ${isActive ? 'active' : ''}`}>
              <Icon size={18} aria-hidden="true" /> {label}
            </NavLink>
          ))}
          <NavLink to="/account" className={({ isActive }) => `navlink ${isActive ? 'active' : ''}`}>
            <User size={18} aria-hidden="true" /> {user ? user.name.split(' ')[0] : 'Account'}
          </NavLink>
          <Link to="/add-food" className="btn nav-add">
            <Plus size={18} aria-hidden="true" /> Add Food
          </Link>
        </nav>

        <Link to="/account" className="top-account" aria-label={user ? 'My account' : 'Log in or sign up'}>
          <User size={22} />
        </Link>
      </div>
    </header>
  );
}
