import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const LocationContext = createContext(null);
export const useLocationCtx = () => useContext(LocationContext);

const MESSAGES = {
  idle: 'Turn on location to see food spots near you.',
  loading: 'Finding your location… please allow access if your browser asks.',
  granted: 'Using your current location.',
  denied: 'Location is turned off for this site. You can still browse everything, or allow location in your browser settings and try again.',
  unavailable: 'We could not work out where you are. You can still browse all food spots.',
  insecure: 'Location only works on a secure (HTTPS or localhost) page. You can still browse all food spots.',
  unsupported: 'This browser does not support location. You can still browse all food spots.',
};

export function LocationProvider({ children }) {
  const [coords, setCoords] = useState(null);
  const [status, setStatus] = useState('idle');
  const inFlight = useRef(false);

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) return setStatus('unsupported');
    if (!window.isSecureContext) return setStatus('insecure');
    if (inFlight.current) return undefined;
    inFlight.current = true;
    setStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        inFlight.current = false;
        setCoords({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy });
        setStatus('granted');
      },
      (e) => {
        inFlight.current = false;
        setStatus(e.code === 1 ? 'denied' : 'unavailable');
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 5 * 60 * 1000 }
    );
    return undefined;
  }, []);

  // If the visitor already allowed location before, use it straight away (no popup needed).
  useEffect(() => {
    if (!navigator.permissions?.query) return;
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((p) => {
        if (p.state === 'granted') request();
        else if (p.state === 'denied') setStatus('denied');
      })
      .catch(() => {});
  }, [request]);

  const value = useMemo(() => ({ coords, status, message: MESSAGES[status], request }), [coords, status, request]);
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}
