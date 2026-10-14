import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MapPin, Phone, Send, Navigation, Share2, Clock, ArrowLeft, Tag, LocateFixed } from 'lucide-react';
import { api } from '../api/client.js';
import useAsync from '../hooks/useAsync.js';
import { useLocationCtx } from '../context/LocationContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { foodImages, mapsUrl, categoryLabel } from '../data.js';
import { DAYS, DAY_ORDER, cambodiaWeekday, fmtTime, formatDistance, phoneHref, telegramHref } from '../utils/format.js';
import { VerifiedBadge, DemoBadge, OpenStatusPill, StatusChip } from '../components/ui/Badges.jsx';
import { RatingLine } from '../components/ui/Stars.jsx';
import { Skeleton, ErrorState } from '../components/ui/States.jsx';
import Gallery from '../components/ui/Gallery.jsx';
import MapView from '../components/ui/MapView.jsx';
import Reviews from '../components/Reviews.jsx';

function DetailsSkeleton() {
  return (
    <div role="status" aria-label="Loading restaurant">
      <Skeleton h={340} r={20} />
      <Skeleton w="50%" h={30} style={{ marginTop: 18 }} />
      <Skeleton w="30%" h={16} style={{ marginTop: 12 }} />
      <Skeleton h={90} r={14} style={{ marginTop: 18 }} />
    </div>
  );
}

export default function FoodDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { coords, status, request } = useLocationCtx();
  const lat = coords ? coords.lat.toFixed(5) : undefined;
  const lng = coords ? coords.lng.toFixed(5) : undefined;
  const { data, loading, error, reload } = useAsync(() => api.food(id, { lat, lng }), [id, lat, lng]);
  const [, setNow] = useState(0);

  useEffect(() => { window.scrollTo(0, 0); }, [id]);
  useEffect(() => { if (data?.food) document.title = `${data.food.name} · Food Finder Cambodia`; return () => { document.title = 'Food Finder Cambodia'; }; }, [data]);

  if (loading && !data) return <DetailsSkeleton />;
  if (error) {
    const gone = error.status === 404;
    return <ErrorState title={gone ? 'This place could not be found.' : 'Unable to load this place.'} message={gone ? 'It may have been removed or is still waiting for approval.' : 'Please try again.'} onRetry={gone ? () => nav('/') : reload} />;
  }
  const f = data.food;
  const images = foodImages(f);
  const today = cambodiaWeekday();
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: f.name, text: `${f.name} — ${f.address || f.city}`, url });
      else { await navigator.clipboard.writeText(url); toast.success('Link copied.'); }
    } catch { /* cancelled */ }
  };

  return (
    <article className="details">
      <button className="backlink" onClick={() => (window.history.length > 1 ? nav(-1) : nav('/'))}><ArrowLeft size={16} aria-hidden="true" /> Back</button>

      {f.status && f.status !== 'approved' && (
        <div className={`status ${f.status === 'rejected' ? 'warn' : ''}`}>
          <span>This is your submission. It is <StatusChip status={f.status} /> and only you can see it for now.{f.rejectionReason ? ` Note: ${f.rejectionReason}` : ''}</span>
        </div>
      )}

      <div className="details-top">
        <Gallery images={images} alt={f.name} />
        <div className="details-head">
          <div className="badgerow">
            {f.isDemo ? <DemoBadge /> : f.isVerified && <VerifiedBadge />}
            <span className="badge plain"><Tag size={13} aria-hidden="true" /> {categoryLabel(f.category)}</span>
            {f.priceRange && <span className="badge plain">{f.priceRange}</span>}
          </div>
          <h1>{f.name}</h1>
          <RatingLine avg={f.ratingAvg} count={f.ratingCount} />
          <div className="openline"><OpenStatusPill status={f.openStatus} withDetail /></div>
          <p className="desc">{f.description}</p>
          {f.isDemo && <p className="sub demo-note">Demo Listing: an illustrative example, not a verified vendor or exact storefront.</p>}
          {f.features?.length > 0 && <div className="featurelist ro">{f.features.map((x) => <span className="chip" key={x}>{x}</span>)}</div>}
          <div className="actions">
            <a className="btn" href={mapsUrl(f)} target="_blank" rel="noopener noreferrer"><Navigation size={18} aria-hidden="true" /> Get Directions</a>
            {f.phone && <a className="btn secondary" href={phoneHref(f.phone)}><Phone size={18} aria-hidden="true" /> Call</a>}
            <button className="mutedbtn" onClick={share}><Share2 size={16} aria-hidden="true" /> Share</button>
          </div>
        </div>
      </div>

      <div className="details-grid">
        <section className="card-panel" aria-labelledby="info-h">
          <h2 id="info-h" className="sectiontitle">Information</h2>
          <ul className="infolist">
            <li><MapPin size={18} aria-hidden="true" /><div><b>Address</b><span>{f.address}{f.address && !f.address.includes(f.city) ? `, ${f.city}` : ''}</span></div></li>
            {f.phone && <li><Phone size={18} aria-hidden="true" /><div><b>Phone</b><a href={phoneHref(f.phone)}>{f.phone}</a></div></li>}
            {f.telegram && <li><Send size={18} aria-hidden="true" /><div><b>Telegram</b><a href={telegramHref(f.telegram)} target="_blank" rel="noopener noreferrer">{f.telegram}</a></div></li>}
            <li><LocateFixed size={18} aria-hidden="true" /><div><b>Distance from you</b>
              {f.distanceKm != null ? <span>{formatDistance(f.distanceKm)} (straight line)</span> : (
                <span>Location is off. <button className="linkbtn" onClick={request}>{status === 'loading' ? 'Locating…' : 'Show distance'}</button></span>
              )}</div></li>
          </ul>
        </section>

        <section className="card-panel" aria-labelledby="hours-h">
          <h2 id="hours-h" className="sectiontitle"><Clock size={18} aria-hidden="true" /> Business hours</h2>
          {f.businessHours?.length ? (
            <table className="hours">
              <tbody>
                {DAY_ORDER.map((d) => {
                  const h = f.businessHours.find((x) => x.day === d);
                  return (
                    <tr key={d} className={d === today ? 'today' : ''}>
                      <th scope="row">{DAYS[d]}</th>
                      <td>{!h || h.isClosed ? 'Closed' : h.open === h.close ? 'Open 24 hours' : `${fmtTime(h.open)} – ${fmtTime(h.close)}`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : <p className="sub">Business hours have not been added yet.</p>}
        </section>
      </div>

      <section className="card-panel" aria-labelledby="map-h">
        <h2 id="map-h" className="sectiontitle">Location</h2>
        <MapView place={{ lat: f.latitude, lng: f.longitude, name: f.name }} user={coords} />
        <div className="maprow">
          <span className="sub">{coords ? (f.distanceKm != null ? `About ${formatDistance(f.distanceKm)} from you.` : '') : 'Allow location to see where you are on the map.'}</span>
          <a className="maplink" href={mapsUrl(f)} target="_blank" rel="noopener noreferrer"><Navigation size={14} aria-hidden="true" /> Get Directions</a>
        </div>
      </section>

      {f.status === 'approved' || !f.status ? <Reviews foodId={f.id} onChanged={() => { reload(); setNow((n) => n + 1); }} /> : null}
    </article>
  );
}
