import React from 'react';
import { NavLink } from 'react-router-dom';
import { NAV } from './Header.jsx';

export default function BottomNav() {
  return (
    <nav className="bottom" aria-label="Main">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `bottom-item ${isActive ? 'active' : ''} ${to === '/add-food' ? 'add' : ''}`}>
          <b>
            <Icon size={22} aria-hidden="true" />
          </b>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
