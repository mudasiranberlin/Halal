import React from 'react';
import { Loader2, SearchX, CloudOff } from 'lucide-react';

export const Spinner = ({ size = 20, label }) => (
  <span className="spinner-wrap" role="status">
    <Loader2 className="spin" size={size} aria-hidden="true" />
    {label ? <span>{label}</span> : <span className="sr-only">Loading…</span>}
  </span>
);

export const Skeleton = ({ w = '100%', h = 14, r = 8, style }) => (
  <span className="skel" style={{ width: w, height: h, borderRadius: r, ...style }} aria-hidden="true" />
);

export function CardSkeleton() {
  return (
    <div className="food skeleton-card" aria-hidden="true">
      <div className="photo skel" />
      <div className="cardbody">
        <Skeleton w="70%" h={18} />
        <Skeleton w="40%" h={12} style={{ marginTop: 10 }} />
        <Skeleton w="95%" h={12} style={{ marginTop: 12 }} />
        <Skeleton w="60%" h={12} style={{ marginTop: 6 }} />
      </div>
    </div>
  );
}

export const SkeletonGrid = ({ n = 8 }) => (
  <div className="grid" role="status" aria-label="Loading food spots">
    {Array.from({ length: n }, (_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

export function EmptyState({ icon: Icon = SearchX, title, text, action, wide }) {
  return (
    <div className="empty" style={wide ? { gridColumn: '1/-1' } : undefined}>
      <Icon size={40} strokeWidth={1.5} aria-hidden="true" />
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong.', onRetry, title = 'Unable to load.', wide }) {
  return (
    <div className="empty error" role="alert" style={wide ? { gridColumn: '1/-1' } : undefined}>
      <CloudOff size={40} strokeWidth={1.5} aria-hidden="true" />
      <h3>{title}</h3>
      <p>{message}</p>
      {onRetry && (
        <button className="btn secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
