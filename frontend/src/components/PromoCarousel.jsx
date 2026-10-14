import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { api } from '../api/client.js';
import useAsync from '../hooks/useAsync.js';

const INTERVAL = 5000;

function SlideLink({ href, className, children, tabIndex }) {
  if (/^https?:\/\//.test(href)) {
    return (
      <a href={href} className={className} target="_blank" rel="noopener noreferrer" tabIndex={tabIndex}>
        {children}
      </a>
    );
  }
  return (
    <Link to={href || '/'} className={className} tabIndex={tabIndex}>
      {children}
    </Link>
  );
}

export default function PromoCarousel() {
  const { data, loading, error } = useAsync(() => api.promotions(), []);
  const slides = data?.items || [];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touch = useRef(null);
  const n = slides.length;

  const go = useCallback((i) => setIndex(n ? (i + n) % n : 0), [n]);

  useEffect(() => {
    if (n < 2 || paused) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = setInterval(() => setIndex((i) => (i + 1) % n), INTERVAL);
    return () => clearInterval(t);
  }, [n, paused]);

  if (loading) return <div className="carousel carousel-skel skel" aria-hidden="true" />;
  if (error || !n) return null; // promotions are a nice-to-have, so fail quietly

  const onTouchStart = (e) => {
    touch.current = e.touches[0].clientX;
    setPaused(true);
  };
  const onTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - (touch.current ?? 0);
    if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
    touch.current = null;
    setPaused(false);
  };

  return (
    <section
      className="carousel"
      aria-roledescription="carousel"
      aria-label="Promotions"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="carousel-track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {slides.map((s, i) => (
          <div className="slide" key={s.id} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${n}`} aria-hidden={i !== index}>
            <img src={s.image} alt="" loading={i === 0 ? 'eager' : 'lazy'} fetchpriority={i === 0 ? 'high' : 'auto'} decoding="async" draggable="false" />
            <div className="slide-shade" />
            <div className="slide-text">
              <h2>{s.title}</h2>
              {s.description && <p>{s.description}</p>}
              <SlideLink href={s.link} className="btn slide-btn" tabIndex={i === index ? 0 : -1}>
                Explore <ArrowRight size={16} aria-hidden="true" />
              </SlideLink>
            </div>
          </div>
        ))}
      </div>

      {n > 1 && (
        <>
          <button className="car-btn prev" onClick={() => go(index - 1)} aria-label="Previous promotion">
            <ChevronLeft size={22} />
          </button>
          <button className="car-btn next" onClick={() => go(index + 1)} aria-label="Next promotion">
            <ChevronRight size={22} />
          </button>
          <div className="car-dots" role="tablist" aria-label="Choose promotion">
            {slides.map((s, i) => (
              <button key={s.id} role="tab" aria-selected={i === index} aria-label={`Go to promotion ${i + 1}: ${s.title}`} className={i === index ? 'on' : ''} onClick={() => go(i)} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
