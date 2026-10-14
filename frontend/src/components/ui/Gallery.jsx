import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Gallery({ images, alt }) {
  const [i, setI] = useState(0);
  const n = images.length;
  const go = (d) => setI((x) => (x + d + n) % n);
  return (
    <div className="gallery">
      <div className="gallery-main">
        <img src={images[i]} alt={`${alt} — photo ${i + 1} of ${n}`} />
        {n > 1 && (
          <>
            <button className="gal-btn prev" onClick={() => go(-1)} aria-label="Previous photo">
              <ChevronLeft size={22} />
            </button>
            <button className="gal-btn next" onClick={() => go(1)} aria-label="Next photo">
              <ChevronRight size={22} />
            </button>
            <span className="gal-count">
              {i + 1} / {n}
            </span>
          </>
        )}
      </div>
      {n > 1 && (
        <div className="gallery-thumbs">
          {images.map((src, k) => (
            <button key={src + k} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={`Show photo ${k + 1}`}>
              <img src={src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
