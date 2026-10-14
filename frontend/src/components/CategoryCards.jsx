import React from 'react';
import { Link } from 'react-router-dom';
import { categories } from '../data.js';

export default function CategoryCards({ counts }) {
  return (
    <div className="catgrid">
      {categories.map((c) => {
        const count = counts?.[c.slug];
        return (
          <Link key={c.slug} to={`/category/${c.slug}`} className="catcard" style={{ '--tint': c.tint }}>
            <span className="catemoji" aria-hidden="true">
              {c.emoji}
            </span>
            <span className="catname">{c.label}</span>
            {count != null && (
              <span className="catcount">
                {count} place{count === 1 ? '' : 's'}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
