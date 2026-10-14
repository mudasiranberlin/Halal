import React from 'react';
import { LocateFixed, Loader2 } from 'lucide-react';
import { useLocationCtx } from '../context/LocationContext.jsx';

export default function LocationBanner({ compact }) {
  const { status, message, request } = useLocationCtx();
  if (status === 'granted' && compact) return null;
  const warn = ['denied', 'unavailable', 'insecure', 'unsupported'].includes(status);
  return (
    <div className={`status ${warn ? 'warn' : ''}`} role="status">
      <span>{message}</span>
      {status !== 'granted' && status !== 'unsupported' && status !== 'insecure' && (
        <button className="btn small" onClick={request} disabled={status === 'loading'}>
          {status === 'loading' ? <Loader2 size={16} className="spin" /> : <LocateFixed size={16} />} {warn ? 'Try again' : 'Use my location'}
        </button>
      )}
    </div>
  );
}
