import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { areas, categoryBySlug, categoryLabel } from '../data.js';
import { useLocationCtx } from '../context/LocationContext.jsx';
import CategoryChips from '../components/CategoryChips.jsx';
import CategoryCards from '../components/CategoryCards.jsx';
import FoodGrid from '../components/FoodGrid.jsx';
import LocationBanner from '../components/LocationBanner.jsx';
import useAsync from '../hooks/useAsync.js';
import { SkeletonGrid, ErrorState, EmptyState } from '../components/ui/States.jsx';
import { SlidersHorizontal } from 'lucide-react';

/** /category — pick a category */
export function CategoryIndex() {
  const { data } = useAsync(() => api.categories(), []);
  const counts = data ? Object.fromEntries(data.categories.map((c) => [c.slug, c.count])) : null;
  return (
    <>
      <h1 className="pagetitle">Browse by category</h1>
      <p className="sub">Choose a type of food to see the places that serve it.</p>
      <div style={{ height: 14 }} />
      <CategoryCards counts={counts} />
    </>
  );
}

/**
 * One listing page used by /category/:slug, /nearby and /search so the filters
 * behave the same everywhere. Filters live in the address bar (shareable links).
 */
function Listing({ title, subtitle, fixed = {}, needLocation = false, showCategory = true, onCategory }) {
  const [sp, setSp] = useSearchParams();
  const { coords } = useLocationCtx();
  const [showFilters, setShowFilters] = useState(false);

  const q = sp.get('q') || '';
  const page = Number(sp.get('page')) || 1;
  const f = {
    category: sp.get('category') || '',
    city: sp.get('city') || '',
    minRating: sp.get('minRating') || '',
    openNow: sp.get('openNow') === 'true',
    verified: sp.get('verified') === 'true',
    radiusKm: sp.get('radiusKm') || '',
    sort: sp.get('sort') || '',
  };

  const set = (patch) => {
    const next = new URLSearchParams(sp);
    Object.entries(patch).forEach(([k, v]) => (v === '' || v === false || v == null ? next.delete(k) : next.set(k, String(v))));
    if (!('page' in patch)) next.delete('page');
    setSp(next, { replace: true });
  };

  const [qBox, setQBox] = useState(q);
  useEffect(() => setQBox(q), [q]);

  const params = {
    ...fixed,
    q: q || undefined,
    category: fixed.category || f.category || undefined,
    city: f.city || undefined,
    minRating: f.minRating || undefined,
    openNow: f.openNow ? 'true' : undefined,
    verified: f.verified ? 'true' : undefined,
    radiusKm: needLocation ? f.radiusKm || fixed.radiusKm : undefined,
    sort: f.sort || fixed.sort || undefined,
    page,
    limit: 12,
    ...(coords ? { lat: coords.lat.toFixed(5), lng: coords.lng.toFixed(5) } : {}),
  };
  const key = JSON.stringify(params);
  const { data, loading, error, reload } = useAsync(() => api.foods(params), [key], { enabled: !needLocation || !!coords });

  const activeCount = [f.city, f.minRating, f.openNow, f.verified, !fixed.category && f.category, f.radiusKm].filter(Boolean).length;
  const clear = () => setSp(new URLSearchParams(q ? { q } : {}), { replace: true });

  return (
    <>
      <h1 className="pagetitle">{title}</h1>
      {subtitle && <p className="sub">{subtitle}</p>}

      {needLocation && <LocationBanner />}

      <form className="filterbar" onSubmit={(e) => { e.preventDefault(); set({ q: qBox.trim() }); }} role="search">
        <input aria-label="Search" placeholder="Search name, dish, category or place…" value={qBox} onChange={(e) => setQBox(e.target.value)} />
        <button className="btn" type="submit">Search</button>
        <button type="button" className={`mutedbtn filterbtn ${showFilters ? 'on' : ''}`} onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}>
          <SlidersHorizontal size={16} aria-hidden="true" /> Filters{activeCount ? ` (${activeCount})` : ''}
        </button>
      </form>

      {showCategory && !fixed.category && <CategoryChips value={f.category} onPick={(c) => (onCategory ? onCategory(c) : set({ category: c }))} />}

      {showFilters && (
        <div className="filterpanel">
          <label>
            City / province
            <select value={f.city} onChange={(e) => set({ city: e.target.value })}>
              <option value="">All Cambodia</option>
              {areas.map((a) => <option key={a[0]}>{a[0]}</option>)}
            </select>
          </label>
          <label>
            Minimum rating
            <select value={f.minRating} onChange={(e) => set({ minRating: e.target.value })}>
              <option value="">Any rating</option>
              <option value="3">3★ and up</option>
              <option value="4">4★ and up</option>
              <option value="4.5">4.5★ and up</option>
            </select>
          </label>
          {needLocation && (
            <label>
              Distance
              <select value={f.radiusKm || fixed.radiusKm || ''} onChange={(e) => set({ radiusKm: e.target.value })}>
                <option value="5">Within 5 km</option>
                <option value="10">Within 10 km</option>
                <option value="25">Within 25 km</option>
                <option value="100">Within 100 km</option>
                <option value="500">Anywhere in Cambodia</option>
              </select>
            </label>
          )}
          <label>
            Sort by
            <select value={f.sort} onChange={(e) => set({ sort: e.target.value })}>
              <option value="">{needLocation ? 'Nearest' : 'Popular'}</option>
              <option value="rating">Highest rated</option>
              <option value="newest">Newest</option>
              {coords && !needLocation && <option value="distance">Nearest</option>}
            </select>
          </label>
          <div className="toggles">
            <label className="check"><input type="checkbox" checked={f.openNow} onChange={(e) => set({ openNow: e.target.checked })} /> Open now</label>
            <label className="check"><input type="checkbox" checked={f.verified} onChange={(e) => set({ verified: e.target.checked })} /> Verified only</label>
          </div>
          {activeCount > 0 && <button type="button" className="mutedbtn" onClick={clear}>Clear filters</button>}
        </div>
      )}

      {needLocation && !coords ? (
        <EmptyState icon={SlidersHorizontal} title="Turn on location to see places near you" text="Or browse everything by category or search." action={<Link className="btn secondary" to="/category">Browse categories</Link>} />
      ) : loading ? (
        <SkeletonGrid n={8} />
      ) : error ? (
        <ErrorState title="Unable to load food listings." message="Please try again." onRetry={reload} />
      ) : (
        <>
          <p className="sub resultcount" aria-live="polite">{data.total} place{data.total === 1 ? '' : 's'} found</p>
          <FoodGrid
            list={data.items}
            empty={<EmptyState wide title="No matching food found" text="Try another dish, category, or city." action={activeCount || q ? <button className="btn secondary" onClick={() => { setQBox(''); setSp(new URLSearchParams(), { replace: true }); }}>Clear filters</button> : null} />}
          />
          {data.pages > 1 && (
            <div className="pager">
              <button className="mutedbtn" disabled={page <= 1} onClick={() => { set({ page: page - 1 }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>← Previous</button>
              <span className="sub">Page {data.page} of {data.pages}</span>
              <button className="mutedbtn" disabled={page >= data.pages} onClick={() => { set({ page: page + 1 }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Next →</button>
            </div>
          )}
        </>
      )}
    </>
  );
}

export function CategoryPage() {
  const { category } = useParams();
  const nav = useNavigate();
  const cat = categoryBySlug[category];
  if (!cat) {
    return <EmptyState title="Category not found" text="That category does not exist." action={<Link className="btn secondary" to="/category">See all categories</Link>} />;
  }
  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb"><Link to="/category">Categories</Link> / <span>{categoryLabel(category)}</span></nav>
      <Listing key={category} title={`${cat.emoji} ${cat.label}`} subtitle={`Food spots serving ${cat.label.toLowerCase()}.`} fixed={{ category }} />
      <div className="chipsbottom"><CategoryChips value={category} onPick={(c) => nav(c ? `/category/${c}` : '/category')} /></div>
    </>
  );
}

export const NearbyPage = () => <Listing title="Nearby" subtitle="Food spots closest to where you are." needLocation fixed={{ radiusKm: 25, sort: 'distance' }} />;
export const SearchPage = () => <Listing title="Search" subtitle="Find food by name, dish, category or place." />;
