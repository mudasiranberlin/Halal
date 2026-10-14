import React from 'react';
import { Link } from 'react-router-dom';
import { LocateFixed, Plus } from 'lucide-react';
import { useLocationCtx } from '../context/LocationContext.jsx';
import { DemoBadge, VerifiedBadge } from './ui/Badges.jsx';

export default function Hero() {
  const { status, request } = useLocationCtx();
  return (
    <section className="hero">
      <div className="hero-text">
        <h1>Explore Cambodia</h1>
        <p>Discover amazing food, restaurants, cafés, and local food spots around you.</p>
        <div className="hero-actions">
          <button className="btn" onClick={request} disabled={status === 'loading'}>
            <LocateFixed size={18} aria-hidden="true" /> {status === 'granted' ? 'Location on' : status === 'loading' ? 'Locating…' : 'Use my location'}
          </button>
          <Link className="btn ghost" to="/add-food">
            <Plus size={18} aria-hidden="true" /> Add a food spot
          </Link>
        </div>
        <p className="hero-note">
          Community-submitted spots only appear publicly after administrator approval. Approved spots show <VerifiedBadge small />, and examples we added show <DemoBadge small />.
        </p>
      </div>
      <div className="heroemoji" aria-hidden="true">
        🥢🍲
      </div>
    </section>
  );
}
