import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Field } from '../components/ui/Field.jsx';
import { Spinner } from '../components/ui/States.jsx';

export function PasswordInput({ id, value, onChange, autoComplete, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="pwwrap">
      <input id={id} type={show ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete} placeholder={placeholder} maxLength={72} />
      <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
    </div>
  );
}

const emailOk = (e) => /^\S+@\S+\.\S+$/.test(e);

function useAfterAuth() {
  const loc = useLocation();
  const nav = useNavigate();
  const from = loc.state?.from && loc.state.from.startsWith('/') ? loc.state.from : '/account';
  return { from, go: () => nav(from, { replace: true }) };
}

export function Login() {
  const { user, loading, login } = useAuth();
  const toast = useToast();
  const { from, go } = useAfterAuth();
  const [f, setF] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  if (loading) return <Spinner label="Loading…" />;
  if (user) return <Navigate to={from} replace />;

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!emailOk(f.email.trim())) er.email = 'Enter a valid email address';
    if (!f.password) er.password = 'Enter your password';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const u = await login({ email: f.email.trim(), password: f.password });
      toast.success(`Welcome back, ${u.name.split(' ')[0]}!`);
      go();
    } catch (err) {
      setErrors(err.errors && Object.keys(err.errors).length ? err.errors : { form: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="authcard">
      <h1>Welcome back</h1>
      <p className="sub">Log in to add food spots and write reviews.</p>
      <form onSubmit={submit} noValidate>
        {errors.form && <div className="formerror" role="alert">{errors.form}</div>}
        <Field label="Email" error={errors.email} htmlFor="li-email"><input id="li-email" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="you@example.com" /></Field>
        <Field label="Password" error={errors.password} htmlFor="li-pw"><PasswordInput id="li-pw" autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
        <button className="btn big" disabled={busy}>{busy ? <><Loader2 size={18} className="spin" /> Logging in…</> : 'Log in'}</button>
      </form>
      <p className="sub center">New here? <Link to="/signup" state={undefined}>Create an account</Link></p>
    </div>
  );
}

export function Signup() {
  const { user, loading, signup } = useAuth();
  const toast = useToast();
  const { from, go } = useAfterAuth();
  const [f, setF] = useState({ name: '', email: '', password: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  if (loading) return <Spinner label="Loading…" />;
  if (user) return <Navigate to={from} replace />;

  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErrors((x) => ({ ...x, [k]: undefined })); };

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (f.name.trim().length < 2) er.name = 'Please enter your name';
    if (!emailOk(f.email.trim())) er.email = 'Enter a valid email address';
    if (f.password.length < 8) er.password = 'Password must be at least 8 characters';
    else if (!/[A-Za-z]/.test(f.password) || !/[0-9]/.test(f.password)) er.password = 'Use at least one letter and one number';
    if (f.phone.trim() && !/^\+?[0-9][0-9\s-]{5,19}$/.test(f.phone.trim())) er.phone = 'Enter a valid phone number';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      await signup({ name: f.name.trim(), email: f.email.trim(), password: f.password, phone: f.phone.trim() });
      toast.success('Account created. Welcome!');
      go();
    } catch (err) {
      setErrors(err.errors && Object.keys(err.errors).length ? err.errors : { form: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="authcard">
      <h1>Create your account</h1>
      <p className="sub">It takes less than a minute.</p>
      <form onSubmit={submit} noValidate>
        {errors.form && <div className="formerror" role="alert">{errors.form}</div>}
        <Field label="Name" required error={errors.name} htmlFor="su-name"><input id="su-name" autoComplete="name" maxLength={80} value={f.name} onChange={set('name')} placeholder="Your name" /></Field>
        <Field label="Email" required error={errors.email} htmlFor="su-email"><input id="su-email" type="email" autoComplete="email" value={f.email} onChange={set('email')} placeholder="you@example.com" /></Field>
        <Field label="Password" required error={errors.password} hint="At least 8 characters, with a letter and a number." htmlFor="su-pw"><PasswordInput id="su-pw" autoComplete="new-password" value={f.password} onChange={set('password')} /></Field>
        <Field label="Phone number" error={errors.phone} hint="Optional" htmlFor="su-phone"><input id="su-phone" type="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} placeholder="+855 12 345 678" /></Field>
        <button className="btn big" disabled={busy}>{busy ? <><Loader2 size={18} className="spin" /> Creating account…</> : 'Sign up'}</button>
      </form>
      <p className="sub center">Already have an account? <Link to="/login" state={undefined}>Log in</Link></p>
    </div>
  );
}
