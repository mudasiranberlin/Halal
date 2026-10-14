import React from 'react';

/** Label + input wrapper with a consistent error / hint style. */
export function Field({ label, error, hint, required, full, htmlFor, children }) {
  return (
    <div className={`field ${error ? 'has-error' : ''} ${full ? 'full' : ''}`}>
      {label && (
        <label htmlFor={htmlFor}>
          {label}
          {required && <span className="req"> *</span>}
        </label>
      )}
      {children}
      {error ? (
        <div className="fielderr" role="alert">
          {error}
        </div>
      ) : (
        hint && <div className="sub">{hint}</div>
      )}
    </div>
  );
}
