import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LocateFixed, Loader2, X, ImagePlus } from 'lucide-react';
import { areas, categories, FEATURES } from '../data.js';
import { defaultHours } from '../utils/format.js';
import { Field } from './ui/Field.jsx';
import HoursEditor from './HoursEditor.jsx';
import { useLocationCtx } from '../context/LocationContext.jsx';
import { compressImage, MAX_TOTAL_UPLOAD } from '../utils/compressImage.js';

const MAX_MB = 15; // before shrinking; we resize photos in the browser, so large phone photos are fine
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Add / edit listing form, shared by visitors (Add Food) and administrators.
 * `initial` (optional) is an existing listing; its photos can be kept or replaced.
 * `onSubmit(FormData, onProgress)` must return a promise.
 */
export default function FoodForm({ initial, onSubmit, submitLabel = 'Send for approval', note }) {
  const { coords, status, request } = useLocationCtx();
  const [v, setV] = useState(() => ({
    name: initial?.name || '',
    category: initial?.category || 'khmer',
    description: initial?.description || '',
    address: initial?.address || '',
    city: initial?.city || 'Phnom Penh',
    phone: initial?.phone || '',
    telegram: initial?.telegram || '',
    latitude: initial?.latitude != null ? String(initial.latitude) : '',
    longitude: initial?.longitude != null ? String(initial.longitude) : '',
    priceRange: initial?.priceRange || '',
    features: initial?.features || [],
    businessHours: initial?.businessHours?.length === 7 ? initial.businessHours.map((h) => ({ ...h, open: h.open || '08:00', close: h.close || '20:00' })) : defaultHours(),
  }));
  const [kept, setKept] = useState(initial?.images || []);
  const [files, setFiles] = useState([]); // File[]
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const wantLoc = useRef(false);
  const fileInput = useRef(null);

  const set = (k, val) => {
    setV((s) => ({ ...s, [k]: val }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  // fill coordinates once location arrives after the user pressed the button
  useEffect(() => {
    if (wantLoc.current && coords) {
      wantLoc.current = false;
      setV((s) => ({ ...s, latitude: coords.lat.toFixed(6), longitude: coords.lng.toFixed(6) }));
      setErrors((e) => ({ ...e, latitude: undefined, longitude: undefined }));
    }
  }, [coords]);

  const useMyLocation = () => {
    wantLoc.current = true;
    if (coords) {
      wantLoc.current = false;
      setV((s) => ({ ...s, latitude: coords.lat.toFixed(6), longitude: coords.lng.toFixed(6) }));
    } else request();
  };

  const total = kept.length + files.length;

  const addFiles = (list) => {
    const picked = [...list];
    const next = [...files];
    let err = '';
    for (const f of picked) {
      if (!OK_TYPES.includes(f.type)) err = `"${f.name}" is not a JPG, PNG or WebP image.`;
      else if (f.size > MAX_MB * 1024 * 1024) err = `"${f.name}" is over ${MAX_MB} MB. Please choose a smaller photo.`;
      else if (kept.length + next.length >= 3) err = 'You can add up to 3 photos.';
      else next.push(f);
    }
    setFiles(next);
    setErrors((e) => ({ ...e, images: err || undefined }));
    if (fileInput.current) fileInput.current.value = '';
  };

  const validate = () => {
    const e = {};
    if (v.name.trim().length < 2) e.name = 'Please enter the name';
    if (v.description.trim().length < 10) e.description = 'Please write at least 10 characters';
    if (v.address.trim().length < 5) e.address = 'Please enter the address';
    if (!initial?.isDemo && !v.phone.trim()) e.phone = 'Phone number is required';
    if (!Number.isFinite(+v.latitude) || v.latitude === '' || +v.latitude < -90 || +v.latitude > 90) e.latitude = 'Latitude must be between -90 and 90';
    if (!Number.isFinite(+v.longitude) || v.longitude === '' || +v.longitude < -180 || +v.longitude > 180) e.longitude = 'Longitude must be between -180 and 180';
    if (total < 2 || total > 3) e.images = 'Please add 2 or 3 photos.';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      document.querySelector('.has-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const fd = new FormData();
    ['name', 'category', 'description', 'address', 'city', 'phone', 'telegram', 'latitude', 'longitude', 'priceRange'].forEach((k) => fd.append(k, String(v[k]).trim()));
    fd.append('features', JSON.stringify(v.features));
    fd.append('businessHours', JSON.stringify(v.businessHours.map((h) => (h.isClosed ? { day: h.day, isClosed: true } : h))));
    if (initial) fd.append('keepImages', JSON.stringify(kept));
    setBusy(true);
    setProgress(0);
    try {
      const small = await Promise.all(files.map((f) => compressImage(f)));
      if (small.reduce((n, f) => n + f.size, 0) > MAX_TOTAL_UPLOAD) {
        setErrors({ images: 'These photos are too large together. Please pick smaller photos.' });
        return;
      }
      small.forEach((f) => fd.append('images', f));
      await onSubmit(fd, setProgress);
    } catch (err) {
      setErrors(err.errors && Object.keys(err.errors).length ? err.errors : { form: err.message });
      setTimeout(() => document.querySelector('.has-error, .formerror')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
    } finally {
      setBusy(false);
    }
  };

  const toggleFeature = (f) => set('features', v.features.includes(f) ? v.features.filter((x) => x !== f) : [...v.features, f]);

  return (
    <form onSubmit={submit} noValidate className="foodform">
      {errors.form && <div className="formerror" role="alert">{errors.form}</div>}

      <fieldset>
        <legend>The basics</legend>
        <Field label="Restaurant / food name" required error={errors.name} htmlFor="ff-name">
          <input id="ff-name" value={v.name} maxLength={100} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Auntie's Fish Amok" />
        </Field>
        <div className="formgrid">
          <Field label="Category" required error={errors.category} htmlFor="ff-cat">
            <select id="ff-cat" value={v.category} onChange={(e) => set('category', e.target.value)}>
              {categories.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Price range" hint="Optional" error={errors.priceRange} htmlFor="ff-price">
            <select id="ff-price" value={v.priceRange} onChange={(e) => set('priceRange', e.target.value)}>
              <option value="">Not sure</option>
              <option value="$">$ — Budget</option>
              <option value="$$">$$ — Moderate</option>
              <option value="$$$">$$$ — Special occasion</option>
            </select>
          </Field>
        </div>
        <Field label="Description" required error={errors.description} hint={`${v.description.length}/1000 — what is it known for? Prices, tips, best dishes…`} htmlFor="ff-desc">
          <textarea id="ff-desc" value={v.description} maxLength={1000} rows={4} onChange={(e) => set('description', e.target.value)} placeholder="What should visitors know?" />
        </Field>
      </fieldset>

      <fieldset>
        <legend>Where &amp; how to reach them</legend>
        <Field label="Address" required error={errors.address} htmlFor="ff-addr">
          <input id="ff-addr" value={v.address} maxLength={200} onChange={(e) => set('address', e.target.value)} placeholder="e.g. Russian Market, Street 450" />
        </Field>
        <div className="formgrid">
          <Field label="City / province" required error={errors.city} htmlFor="ff-city">
            <select id="ff-city" value={v.city} onChange={(e) => set('city', e.target.value)}>
              {areas.map((a) => <option key={a[0]}>{a[0]}</option>)}
            </select>
          </Field>
          <Field label="Phone number" required={!initial?.isDemo} error={errors.phone} htmlFor="ff-phone">
            <input id="ff-phone" type="tel" value={v.phone} maxLength={30} onChange={(e) => set('phone', e.target.value)} placeholder="+855 12 345 678" />
          </Field>
          <Field label="Telegram" hint="Optional — @username or phone" error={errors.telegram} htmlFor="ff-tg">
            <input id="ff-tg" value={v.telegram} maxLength={64} onChange={(e) => set('telegram', e.target.value)} placeholder="@username" />
          </Field>
        </div>
        <div className="loc-row">
          <button type="button" className="btn secondary" onClick={useMyLocation} disabled={status === 'loading'}>
            {status === 'loading' ? <Loader2 size={16} className="spin" /> : <LocateFixed size={16} />} Use my current location
          </button>
          <span className="sub">Standing at the place? One tap fills in the coordinates.</span>
        </div>
        {(status === 'denied' || status === 'unavailable' || status === 'insecure') && <div className="sub" style={{ color: 'var(--secondary-ink)' }}>Location is not available. You can type the coordinates below instead (right-click the place in Google Maps to copy them).</div>}
        <div className="formgrid">
          <Field label="Latitude" required error={errors.latitude} htmlFor="ff-lat">
            <input id="ff-lat" inputMode="decimal" value={v.latitude} onChange={(e) => set('latitude', e.target.value)} placeholder="11.5564" />
          </Field>
          <Field label="Longitude" required error={errors.longitude} htmlFor="ff-lng">
            <input id="ff-lng" inputMode="decimal" value={v.longitude} onChange={(e) => set('longitude', e.target.value)} placeholder="104.9282" />
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend>Business hours</legend>
        <HoursEditor value={v.businessHours} onChange={(h) => set('businessHours', h)} error={errors.businessHours} />
      </fieldset>

      <fieldset>
        <legend>Extra details</legend>
        <div className="featurelist">
          {FEATURES.map((f) => (
            <label key={f} className={`chip ${v.features.includes(f) ? 'active' : ''}`}>
              <input type="checkbox" className="sr-only" checked={v.features.includes(f)} onChange={() => toggleFeature(f)} /> {f}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Photos (2 or 3)</legend>
        <div className="previewrow">
          {kept.map((src) => (
            <div className="thumb" key={src}>
              <img src={src} alt="Current photo" />
              <button type="button" aria-label="Remove photo" onClick={() => setKept(kept.filter((k) => k !== src))}><X size={14} /></button>
            </div>
          ))}
          {previews.map((src, i) => (
            <div className="thumb" key={src}>
              <img src={src} alt={`New photo ${i + 1}`} />
              <button type="button" aria-label="Remove photo" onClick={() => setFiles(files.filter((_, k) => k !== i))}><X size={14} /></button>
            </div>
          ))}
          {total < 3 && (
            <label className="thumb add">
              <ImagePlus size={26} aria-hidden="true" />
              <span>Add photo</span>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => addFiles(e.target.files)} />
            </label>
          )}
        </div>
        <div className="sub">{total} of 3 photos · JPG, PNG or WebP · we shrink them for you</div>
        {errors.images && <div className="fielderr" role="alert">{errors.images}</div>}
      </fieldset>

      <button className="btn big" disabled={busy}>
        {busy ? <><Loader2 size={18} className="spin" /> {files.length && progress < 100 ? `Uploading photos… ${progress}%` : 'Saving…'}</> : submitLabel}
      </button>
      {busy && files.length > 0 && <div className="progress" aria-hidden="true"><i style={{ width: `${progress}%` }} /></div>}
      {note && <p className="sub">{note}</p>}
    </form>
  );
}
