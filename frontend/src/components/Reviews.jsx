import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { api } from '../api/client.js';
import useAsync from '../hooks/useAsync.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Stars, StarInput, RatingLine } from './ui/Stars.jsx';
import { Skeleton, ErrorState } from './ui/States.jsx';
import { Field } from './ui/Field.jsx';
import { formatDate } from '../utils/format.js';

export default function Reviews({ foodId, onChanged }) {
  const { user } = useAuth();
  const toast = useToast();
  const loc = useLocation();
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAsync(() => api.reviews(foodId, { page, limit: 8 }), [foodId, page]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!rating) er.rating = 'Please choose a star rating';
    if (comment.trim().length < 3) er.comment = 'Please write a short review';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const d = await api.addReview(foodId, { rating, comment: comment.trim() });
      toast.success(d.message);
      setRating(0);
      setComment('');
      setPage(1);
      reload();
      onChanged?.();
    } catch (err) {
      if (err.errors && Object.keys(err.errors).length) setErrors(err.errors);
      else toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="rev-h" className="reviews">
      <h2 id="rev-h" className="sectiontitle">Reviews &amp; ratings</h2>

      {loading && !data ? (
        <Skeleton h={60} r={14} />
      ) : error ? (
        <ErrorState title="Unable to load reviews." message="Please try again." onRetry={reload} />
      ) : (
        <>
          <div className="ratingsum">
            <div className="bigscore">{data.count ? data.average.toFixed(1) : '–'}</div>
            <div>
              <Stars value={data.average} size={22} />
              <div className="sub">{data.count ? `Based on ${data.count} review${data.count === 1 ? '' : 's'}` : 'No reviews yet'}</div>
            </div>
            <div className="dist">
              {data.distribution.map((d) => (
                <div key={d.star} className="distrow">
                  <span>{d.star}★</span>
                  <i><b style={{ width: data.count ? `${(d.count / data.count) * 100}%` : 0 }} /></i>
                  <span className="sub">{d.count}</span>
                </div>
              ))}
            </div>
          </div>

          {data.items.length === 0 ? (
            <p className="sub">Be the first to leave a review.</p>
          ) : (
            <ul className="reviewlist">
              {data.items.map((r) => (
                <li key={r.id}>
                  <div className="revhead">
                    <span className="avatar" aria-hidden="true">{r.userName.charAt(0).toUpperCase()}</span>
                    <div>
                      <b>{r.userName}</b>
                      <div className="sub"><Stars value={r.rating} size={13} /> · {formatDate(r.createdAt)}</div>
                    </div>
                  </div>
                  <p>{r.comment}</p>
                </li>
              ))}
            </ul>
          )}
          {data.pages > 1 && (
            <div className="pager">
              <button className="mutedbtn" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Newer</button>
              <span className="sub">Page {data.page} of {data.pages}</span>
              <button className="mutedbtn" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Older →</button>
            </div>
          )}
        </>
      )}

      <h3 style={{ marginTop: 26 }}>Write a review</h3>
      {user ? (
        <form onSubmit={submit} noValidate className="reviewform">
          <Field label="Your rating" error={errors.rating}><StarInput value={rating} onChange={(n) => { setRating(n); setErrors((x) => ({ ...x, rating: undefined })); }} /></Field>
          <Field label="Your review" error={errors.comment} hint={`${comment.length}/600 · posting as ${user.name}`} htmlFor="rev-text">
            <textarea id="rev-text" rows={4} maxLength={600} value={comment} onChange={(e) => { setComment(e.target.value); setErrors((x) => ({ ...x, comment: undefined })); }} placeholder="Share your food experience…" />
          </Field>
          <button className="btn" disabled={busy}>{busy ? <><Loader2 size={16} className="spin" /> Posting…</> : 'Post review'}</button>
        </form>
      ) : (
        <div className="status">
          <span>You must log in before writing a review.</span>
          <Link className="btn small" to="/login" state={{ from: loc.pathname }}>Log in</Link>
        </div>
      )}
    </section>
  );
}
