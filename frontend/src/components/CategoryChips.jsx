import React from 'react';
import { categories } from '../data.js';

/** Horizontal pill filter. `value` is a category slug or "" for All. */
export default function CategoryChips({ value, onPick }) {
  return (
    <div className="chips" role="group" aria-label="Filter by category">
      <button className={`chip ${!value ? 'active' : ''}`} onClick={() => onPick('')} aria-pressed={!value}>
        All
      </button>
      {categories.map((c) => (
        <button key={c.slug} className={`chip ${value === c.slug ? 'active' : ''}`} onClick={() => onPick(c.slug)} aria-pressed={value === c.slug}>
          <span aria-hidden="true">{c.emoji}</span> {c.label}
        </button>
      ))}
    </div>
  );
}
