import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { Field } from '../components/ui/Field.jsx';
import { PasswordInput } from '../pages/Auth.jsx';
import { Spinner } from '../components/ui/States.jsx';

export default function AdminLogin() {
  const { admin, loading, login } = useAdminAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const from = loc.state?.from?.startsWith('/admin') ? loc.state.from : '/admin';

  if (loading) return <div className="adminloading"><Spinner label="Loading…" /></div>;
  if (admin) return <Navigate to={from} replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (!f.email.trim() || !f.password) return setErr('Enter your email and password.');
    setBusy(true);
    setErr('');
    try {
      await login({ email: f.email.trim(), password: f.password });
      nav(from, { replace: true });
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adminloginpage">
      <div className="authcard">
        <div className="shield"><ShieldCheck size={34} aria-hidden="true" /></div>
        <h1>Administrator login</h1>
        <p className="sub">For site administrators only.</p>
        <form onSubmit={submit} noValidate>
          {err && <div className="formerror" role="alert">{err}</div>}
          <Field label="Email" htmlFor="ad-email"><input id="ad-email" type="email" autoComplete="username" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Password" htmlFor="ad-pw"><PasswordInput id="ad-pw" autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
          <button className="btn big" disabled={busy}>{busy ? <><Loader2 size={18} className="spin" /> Signing in…</> : 'Sign in'}</button>
        </form>
        <p className="sub center"><Link to="/">← Back to the website</Link></p>
      </div>
    </div>
  );
}
