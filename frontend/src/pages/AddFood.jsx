import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, LogIn } from 'lucide-react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import FoodForm from '../components/FoodForm.jsx';
import { Spinner, EmptyState } from '../components/ui/States.jsx';

export default function AddFood() {
  const { user, loading } = useAuth();
  const toast = useToast();
  const [done, setDone] = useState(null);

  if (loading) return <Spinner label="Checking your login…" />;
  if (!user) {
    return (
      <EmptyState
        icon={LogIn}
        title="Log in to add a food spot"
        text="You need a free account so we can keep submissions tidy and let you track their approval."
        action={
          <div className="row">
            <Link className="btn" to="/login" state={{ from: '/add-food' }}>Log in</Link>
            <Link className="btn secondary" to="/signup" state={{ from: '/add-food' }}>Create account</Link>
          </div>
        }
      />
    );
  }

  if (done) {
    return (
      <div className="empty success">
        <Clock size={40} strokeWidth={1.5} aria-hidden="true" />
        <h2>Thank you!</h2>
        <p>Your food submission has been received and is waiting for approval.</p>
        <p className="sub">You can follow its status in your account. It will appear publicly with a Verified badge once an administrator approves it.</p>
        <div className="row">
          <Link className="btn" to="/account">See my submissions</Link>
          <button className="btn secondary" onClick={() => setDone(null)}>Add another</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <h1 className="pagetitle">Add a food spot</h1>
      <p className="sub">Share a restaurant, stall or café. Our team checks every submission before it goes live.</p>
      <FoodForm
        submitLabel="Send for approval"
        note="Your own account details are never shown on the listing. Only the business phone and Telegram you enter here appear on the details page after approval."
        onSubmit={async (fd, onProgress) => {
          const d = await api.submitFood(fd, onProgress);
          toast.success('Submitted! Waiting for approval.');
          setDone(d.food);
        }}
      />
    </>
  );
}
