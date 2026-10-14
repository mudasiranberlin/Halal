import React from 'react';
import { Star } from 'lucide-react';

/** Read-only stars; supports half-star precision through a clipped overlay. */
export function Stars({ value = 0, size = 16 }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  const row = (fill) =>
    Array.from({ length: 5 }, (_, i) => <Star key={i} size={size} fill={fill} strokeWidth={1.5} aria-hidden="true" />);
  return (
    <span className="stars" role="img" aria-label={`${value} out of 5 stars`}>
      <span className="stars-base">{row('none')}</span>
      <span className="stars-fill" style={{ width: `${pct}%` }}>
        {row('currentColor')}
      </span>
    </span>
  );
}

/** Rating summary used on cards and the details page: ★★★★★ 4.5 · Based on 25 reviews */
export function RatingLine({ avg, count, compact = false }) {
  if (!count) return <span className="sub norating">No reviews yet</span>;
  return compact ? (
    <span className="ratingline">
      <Star size={14} fill="currentColor" aria-hidden="true" /> <b>{avg.toFixed(1)}</b>
      <span className="sub"> ({count})</span>
    </span>
  ) : (
    <span className="ratingline big">
      <Stars value={avg} size={18} /> <b>{avg.toFixed(1)}</b>
      <span className="sub"> · Based on {count} review{count === 1 ? '' : 's'}</span>
    </span>
  );
}

/** Clickable 1-5 star picker (keyboard accessible radio group). */
export function StarInput({ value, onChange, id }) {
  const labels = ['Very poor', 'Poor', 'Average', 'Good', 'Excellent'];
  return (
    <div className="starinput" role="radiogroup" aria-label="Rating" id={id}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''} — ${labels[n - 1]}`}
          className={n <= value ? 'on' : ''}
          onClick={() => onChange(n)}
        >
          <Star size={30} fill={n <= value ? 'currentColor' : 'none'} strokeWidth={1.6} />
        </button>
      ))}
      <span className="starinput-label">{value ? labels[value - 1] : 'Tap a star'}</span>
    </div>
  );
}
