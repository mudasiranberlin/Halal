import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Navigation } from 'lucide-react';
import { mapsUrl, foodImages, categoryLabel } from '../data.js';
import { formatDistance } from '../utils/format.js';
import { VerifiedBadge, DemoBadge, OpenStatusPill } from './ui/Badges.jsx';
import { RatingLine } from './ui/Stars.jsx';
import { EmptyState } from './ui/States.jsx';

export function FoodCard({ f }) {
  const img = foodImages(f)[0];
  return (
    <article className="food">
      <Link to={`/food/${f.id}`} className="photo" aria-label={`View ${f.name}`}>
        <img loading="lazy" decoding="async" src={img} alt={f.name} />
        <span className="tag">{categoryLabel(f.category)}</span>
        <span className="photo-badges">{f.isDemo ? <DemoBadge small /> : f.isVerified ? <VerifiedBadge small /> : null}</span>
      </Link>
      <div className="cardbody">
        <h3>
          <Link to={`/food/${f.id}`}>{f.name}</Link>
        </h3>
        <div className="cardmeta">
          <RatingLine avg={f.ratingAvg} count={f.ratingCount} compact />
          <OpenStatusPill status={f.openStatus} />
        </div>
        <p className="carddesc">{f.description}</p>
        <div className="sub cardplace">
          <MapPin size={14} aria-hidden="true" /> <span>{f.address || f.city}</span>
        </div>
        <div className="cardfoot">
          <span className="distance">{f.distanceKm != null ? `${formatDistance(f.distanceKm)} away` : f.city}</span>
          <a className="maplink" href={mapsUrl(f)} target="_blank" rel="noopener noreferrer" aria-label={`Directions to ${f.name}`}>
            <Navigation size={14} aria-hidden="true" /> Directions
          </a>
        </div>
      </div>
    </article>
  );
}

export default function FoodGrid({ list, empty }) {
  if (!list.length) {
    return (
      <div className="grid">
        {empty || <EmptyState wide title="No matching food found" text="Try another dish, category, or city." />}
      </div>
    );
  }
  return (
    <div className="grid">
      {list.map((f) => (
        <FoodCard key={f.id} f={f} />
      ))}
    </div>
  );
}
