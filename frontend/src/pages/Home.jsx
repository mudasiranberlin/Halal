import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { api } from '../api/client.js';
import useAsync from '../hooks/useAsync.js';
import { useLocationCtx } from '../context/LocationContext.jsx';
import Hero from '../components/Hero.jsx';
import PromoCarousel from '../components/PromoCarousel.jsx';
import CategoryCards from '../components/CategoryCards.jsx';
import FoodSection from '../components/FoodSection.jsx';
import LocationBanner from '../components/LocationBanner.jsx';

const Head = ({ title, sub, to, more = 'See all' }) => (
  <div className="sechead">
    <div>
      <h2 className="sectiontitle">{title}</h2>
      {sub && <p className="sub">{sub}</p>}
    </div>
    {to && (
      <Link to={to} className="seemore">
        {more} <ChevronRight size={16} aria-hidden="true" />
      </Link>
    )}
  </div>
);

export default function Home() {
  const { coords } = useLocationCtx();
  const { data } = useAsync(() => api.categories(), []);
  const counts = data ? Object.fromEntries(data.categories.map((c) => [c.slug, c.count])) : null;
  const near = coords ? { lat: coords.lat.toFixed(5), lng: coords.lng.toFixed(5) } : {};

  return (
    <>
      <Hero />
      <PromoCarousel />

      <Head title="Food categories" sub="Tap a category to see what is cooking." to="/category" more="All categories" />
      <CategoryCards counts={counts} />

      <Head title="Restaurants Near You" sub={coords ? 'Closest to you first.' : undefined} to="/nearby" />
      <LocationBanner compact />
      {coords ? (
        <FoodSection params={{ ...near, sort: 'distance', limit: 4 }} />
      ) : (
        <FoodSection params={{ limit: 4 }} />
      )}

      <Head title="Open Now" sub="Places serving right now (Cambodia time)." to="/search?openNow=true" />
      <FoodSection params={{ ...near, openNow: 'true', limit: 4, ...(coords ? { sort: 'distance' } : {}) }} empty={<p className="sub" style={{ gridColumn: '1/-1' }}>Nothing is open right now. Check back soon!</p>} />

      <div className="toolbar cta">
        <div>
          <h2 className="sectiontitle" style={{ margin: 0 }}>Help map Cambodia&apos;s food</h2>
          <p className="sub">Add a real food stall, restaurant, or hidden gem. An administrator approves it before it appears publicly.</p>
        </div>
        <Link className="btn" to="/add-food">
          ＋ Add a food spot
        </Link>
      </div>
    </>
  );
}
