import React, { useState } from 'react';
import { ArrowUp, ArrowDown, Pencil, Trash2, Plus, Eye, EyeOff, Loader2 } from 'lucide-react';
import { adminApi } from '../api/client.js';
import useAdminAsync from './useAdminAsync.js';
import { useToast } from '../context/ToastContext.jsx';
import { StatusChip } from '../components/ui/Badges.jsx';
import { Skeleton, ErrorState, EmptyState } from '../components/ui/States.jsx';
import { ConfirmDialog, Modal } from '../components/ui/Modal.jsx';
import { Field } from '../components/ui/Field.jsx';
import { compressImage } from '../utils/compressImage.js';

function PromoForm({ initial, onDone }) {
  const toast = useToast();
  const [v, setV] = useState({ title: initial?.title || '', description: initial?.description || '', link: initial?.link || '/', status: initial?.status || 'active' });
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const preview = file ? URL.createObjectURL(file) : initial?.image;

  const pick = (f) => {
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) return setErrors({ image: 'Use a JPG, PNG or WebP image.' });
    if (f.size > 15 * 1024 * 1024) return setErrors({ image: 'Image must be 15 MB or smaller.' });
    setErrors({});
    setFile(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (v.title.trim().length < 2) er.title = 'Please enter a title';
    if (!initial && !file) er.image = 'Please choose an image';
    setErrors(er);
    if (Object.keys(er).length) return;
    const fd = new FormData();
    Object.entries(v).forEach(([k, val]) => fd.append(k, String(val).trim()));
    setBusy(true);
    try {
      if (file) fd.append('image', await compressImage(file, { maxSide: 1800 }));
      const d = await adminApi.savePromotion(initial?.id, fd, setProgress);
      toast.success(d.message);
      onDone();
    } catch (err) {
      setErrors(err.errors && Object.keys(err.errors).length ? err.errors : { form: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      {errors.form && <div className="formerror" role="alert">{errors.form}</div>}
      <Field label="Title" required error={errors.title} htmlFor="pr-t"><input id="pr-t" maxLength={80} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} /></Field>
      <Field label="Short text" error={errors.description} htmlFor="pr-d"><input id="pr-d" maxLength={200} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} /></Field>
      <Field label="Opens page" error={errors.link} hint="A page on this site, like /category/seafood, /nearby or /add-food." htmlFor="pr-l"><input id="pr-l" value={v.link} onChange={(e) => setV({ ...v, link: e.target.value })} /></Field>
      <Field label="Image" required={!initial} error={errors.image} hint="Wide pictures look best (about 1600 × 700). JPG, PNG or WebP. Large pictures are shrunk automatically." htmlFor="pr-i">
        {preview && <img className="promopreview" src={preview} alt="Promotion preview" />}
        <input id="pr-i" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => pick(e.target.files[0])} />
      </Field>
      <label className="check"><input type="checkbox" checked={v.status === 'active'} onChange={(e) => setV({ ...v, status: e.target.checked ? 'active' : 'inactive' })} /> Show in the home page carousel</label>
      <div className="modalfoot"><button className="btn" disabled={busy}>{busy ? <><Loader2 size={16} className="spin" /> {file && progress < 100 ? `Uploading ${progress}%` : 'Saving…'}</> : 'Save promotion'}</button></div>
    </form>
  );
}

export default function AdminPromotions() {
  const toast = useToast();
  const { data, loading, error, reload } = useAdminAsync(() => adminApi.promotions(), []);
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const items = data?.items || [];
  const activeCount = items.filter((p) => p.status === 'active').length;

  const run = async (fn) => {
    setBusy(true);
    try { const d = await fn(); toast.success(d.message); reload(); return true; }
    catch (e) { toast.error(e.message); return false; }
    finally { setBusy(false); }
  };
  const move = (i, d) => {
    const ids = items.map((p) => p.id);
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    run(() => adminApi.reorderPromotions(ids));
  };
  const toggle = (p) => {
    const fd = new FormData();
    fd.append('status', p.status === 'active' ? 'inactive' : 'active');
    return run(() => adminApi.savePromotion(p.id, fd));
  };

  return (
    <>
      <div className="sechead">
        <div><h1 className="pagetitle">Promotions</h1><p className="sub">These slides play in the home page carousel, in this order. {activeCount} active.</p></div>
        <button className="btn" onClick={() => setEdit('new')}><Plus size={18} aria-hidden="true" /> Add promotion</button>
      </div>
      {error ? <ErrorState title="Unable to load promotions." message="Please try again." onRetry={reload} /> : loading ? <Skeleton h={90} r={14} /> : items.length === 0 ? <EmptyState title="No promotions yet" text="Add your first promotion to show it on the home page." /> : (
        <ul className="adminlist">
          {items.map((p, i) => (
            <li key={p.id} className="adminrow">
              <img className="promothumb" src={p.image} alt="" loading="lazy" />
              <div className="rowmain">
                <b>{p.title}</b>
                <span className="sub">{p.description}</span>
                <span className="sub">Opens: {p.link}</span>
                <div className="rowtags"><StatusChip status={p.status} /></div>
              </div>
              <div className="actions">
                <button className="iconbtn" aria-label="Move up" disabled={i === 0 || busy} onClick={() => move(i, -1)}><ArrowUp size={17} /></button>
                <button className="iconbtn" aria-label="Move down" disabled={i === items.length - 1 || busy} onClick={() => move(i, 1)}><ArrowDown size={17} /></button>
                <button className="mutedbtn small" disabled={busy} onClick={() => toggle(p)}>{p.status === 'active' ? <><EyeOff size={15} aria-hidden="true" /> Disable</> : <><Eye size={15} aria-hidden="true" /> Enable</>}</button>
                <button className="mutedbtn small" onClick={() => setEdit(p)}><Pencil size={15} aria-hidden="true" /> Edit</button>
                <button className="iconbtn danger" aria-label={`Delete ${p.title}`} onClick={() => setDel(p)}><Trash2 size={17} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {edit && <Modal title={edit === 'new' ? 'Add promotion' : 'Edit promotion'} onClose={() => setEdit(null)} width={560}><PromoForm initial={edit === 'new' ? undefined : edit} onDone={() => { setEdit(null); reload(); }} /></Modal>}
      {del && <ConfirmDialog title="Delete this promotion?" danger confirmLabel="Delete" busy={busy} message={`"${del.title}" and its image will be removed.`} onCancel={() => setDel(null)} onConfirm={async () => { if (await run(() => adminApi.deletePromotion(del.id))) setDel(null); }} />}
    </>
  );
}
