// Generates the 5 default promotion images (no text in the image: the website
// overlays the title and description, so they stay crisp and translatable).
// Run:  node scripts/generate-promo-art.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../seed/promos');
fs.mkdirSync(out, { recursive: true });
const W = 1600, H = 700;

const frame = (defs, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>${defs}<filter id="blur"><feGaussianBlur stdDeviation="40"/></filter></defs>${body}</svg>`;

const dots = (color, op = 0.12) =>
  Array.from({ length: 70 }, (_, i) => {
    const x = (i * 197) % W, y = (i * 113) % H, r = 4 + ((i * 7) % 14);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="${op}"/>`;
  }).join('');

const steam = (x, y, color) =>
  [0, 38, 76].map((dx, i) => `<path d="M${x + dx} ${y} q-22 -40 0 -80 q22 -40 0 -80" fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round" opacity="${0.55 - i * 0.1}"/>`).join('');

const slides = {
  // 1 — Khmer food: a bowl of curry and rice
  'promo-1-khmer.webp': frame(
    `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c2d12"/><stop offset="0.55" stop-color="#c2410c"/><stop offset="1" stop-color="#f59e0b"/></linearGradient>
     <linearGradient id="bowl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff7ed"/><stop offset="1" stop-color="#fdba74"/></linearGradient>`,
    `<rect width="${W}" height="${H}" fill="url(#bg)"/>${dots('#fff')}
     <circle cx="1230" cy="360" r="280" fill="#fde68a" opacity="0.22" filter="url(#blur)"/>
     ${steam(1130, 330, '#ffedd5')}
     <ellipse cx="1230" cy="470" rx="290" ry="40" fill="#431407" opacity="0.35"/>
     <path d="M930 380 h600 a300 250 0 0 1 -600 0z" fill="url(#bowl)"/>
     <ellipse cx="1230" cy="380" rx="300" ry="46" fill="#ea580c"/>
     <ellipse cx="1230" cy="376" rx="270" ry="34" fill="#f97316"/>
     <circle cx="1130" cy="372" r="16" fill="#fde047"/><circle cx="1190" cy="384" r="12" fill="#86efac"/><circle cx="1290" cy="370" r="18" fill="#fde047"/><circle cx="1350" cy="382" r="13" fill="#86efac"/>
     <path d="M1000 470 q230 80 460 0" fill="none" stroke="#c2410c" stroke-width="10" stroke-linecap="round" opacity="0.5"/>`
  ),
  // 2 — Street food: skewers over flames
  'promo-2-street.webp': frame(
    `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1c1917"/><stop offset="0.6" stop-color="#7c2d12"/><stop offset="1" stop-color="#ea580c"/></linearGradient>`,
    `<rect width="${W}" height="${H}" fill="url(#bg)"/>${dots('#fdba74', 0.1)}
     <circle cx="1200" cy="560" r="300" fill="#f97316" opacity="0.35" filter="url(#blur)"/>
     ${[0, 1, 2, 3].map((i) => {
       const y = 190 + i * 80;
       return `<line x1="900" y1="${y + 60}" x2="1540" y2="${y - 40}" stroke="#d6b88c" stroke-width="9" stroke-linecap="round"/>
       ${[0, 1, 2, 3].map((j) => `<ellipse cx="${1010 + j * 120}" cy="${y + 42 - j * 17}" rx="42" ry="34" transform="rotate(-9 ${1010 + j * 120} ${y + 42 - j * 17})" fill="${['#9a3412', '#b45309', '#7f1d1d', '#a16207'][(i + j) % 4]}"/>`).join('')}`;
     }).join('')}
     <path d="M880 640 q40 -120 80 -20 q40 -150 90 -10 q40 -110 80 0 q50 -140 100 0 q40 -100 80 10 q50 -130 100 10 q40 -90 90 20 v90 h-620z" fill="#fb923c" opacity="0.9"/>
     <path d="M950 650 q40 -80 80 -10 q40 -90 80 0 q40 -70 80 10 q40 -60 80 0 q40 -70 90 10 v60 h-490z" fill="#fde047" opacity="0.9"/>`
  ),
  // 3 — Seafood: fish, bubbles and waves
  'promo-3-seafood.webp': frame(
    `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0c4a6e"/><stop offset="0.6" stop-color="#0e7490"/><stop offset="1" stop-color="#2dd4bf"/></linearGradient>`,
    `<rect width="${W}" height="${H}" fill="url(#bg)"/>${dots('#ecfeff', 0.13)}
     <circle cx="1180" cy="330" r="300" fill="#a5f3fc" opacity="0.25" filter="url(#blur)"/>
     <g transform="translate(1180 340) rotate(-8)">
       <ellipse cx="0" cy="0" rx="230" ry="120" fill="#fb7185"/>
       <path d="M200 0 L340 -110 L340 110z" fill="#f43f5e"/>
       <path d="M-60 -110 q90 -80 190 -20 q-60 20 -110 30z" fill="#e11d48"/>
       <path d="M-40 112 q60 70 150 20 q-60 -10 -110 -40z" fill="#e11d48"/>
       <path d="M-80 -90 q-40 90 0 180" fill="none" stroke="#fda4af" stroke-width="10" stroke-linecap="round"/>
       <circle cx="-140" cy="-25" r="22" fill="#fff"/><circle cx="-146" cy="-25" r="10" fill="#0f172a"/>
       ${[0, 1, 2, 3, 4].map((i) => `<path d="M${10 + i * 38} -62 q22 30 0 62 q-22 32 0 62" fill="none" stroke="#fda4af" stroke-width="6" opacity="0.7"/>`).join('')}
     </g>
     ${[[930, 200, 26], [880, 270, 14], [960, 120, 18], [1500, 220, 22], [1450, 140, 12], [1520, 330, 16]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#ecfeff" stroke-width="5" opacity="0.7"/>`).join('')}
     <path d="M0 590 q100 -50 200 0 t200 0 t200 0 t200 0 t200 0 t200 0 t200 0 t200 0 V700 H0z" fill="#083344" opacity="0.45"/>
     <path d="M0 640 q100 -40 200 0 t200 0 t200 0 t200 0 t200 0 t200 0 t200 0 t200 0 V700 H0z" fill="#083344" opacity="0.6"/>`
  ),
  // 4 — Café & drinks: coffee cup and iced drink
  'promo-4-cafe.webp': frame(
    `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b2314"/><stop offset="0.6" stop-color="#78350f"/><stop offset="1" stop-color="#d97706"/></linearGradient>
     <linearGradient id="cup" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbeb"/><stop offset="1" stop-color="#fde68a"/></linearGradient>`,
    `<rect width="${W}" height="${H}" fill="url(#bg)"/>${dots('#fde68a', 0.1)}
     <circle cx="1150" cy="350" r="290" fill="#fbbf24" opacity="0.22" filter="url(#blur)"/>
     ${steam(1020, 290, '#fef3c7')}
     <ellipse cx="1090" cy="520" rx="260" ry="40" fill="#fef3c7" opacity="0.9"/>
     <ellipse cx="1090" cy="505" rx="230" ry="30" fill="#fde68a"/>
     <path d="M900 330 h380 v110 a190 120 0 0 1 -380 0z" fill="url(#cup)"/>
     <path d="M1280 360 q110 0 110 70 q0 70 -120 70" fill="none" stroke="#fde68a" stroke-width="26" stroke-linecap="round"/>
     <ellipse cx="1090" cy="332" rx="190" ry="26" fill="#5b3a1e"/><ellipse cx="1090" cy="330" rx="150" ry="14" fill="#92572a"/>
     <g transform="translate(1440 250)">
       <path d="M0 0 h130 l-18 300 h-94z" fill="#fff7ed" opacity="0.35" stroke="#fed7aa" stroke-width="6"/>
       <path d="M12 80 h106 l-12 214 h-82z" fill="#a16207" opacity="0.9"/>
       <rect x="22" y="110" width="46" height="46" rx="8" fill="#fff" opacity="0.55" transform="rotate(12 45 133)"/><rect x="66" y="170" width="42" height="42" rx="8" fill="#fff" opacity="0.5" transform="rotate(-10 87 191)"/>
       <line x1="85" y1="-70" x2="70" y2="150" stroke="#16a34a" stroke-width="12" stroke-linecap="round"/>
     </g>`
  ),
  // 5 — Discover new spots: map pin with ripples
  'promo-5-discover.webp': frame(
    `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#14532d"/><stop offset="0.6" stop-color="#15803d"/><stop offset="1" stop-color="#a3e635"/></linearGradient>`,
    `<rect width="${W}" height="${H}" fill="url(#bg)"/>${dots('#ecfccb', 0.12)}
     ${[300, 230, 160].map((r, i) => `<ellipse cx="1180" cy="520" rx="${r}" ry="${r * 0.28}" fill="none" stroke="#ecfccb" stroke-width="5" opacity="${0.35 + i * 0.15}"/>`).join('')}
     <path d="M0 520 L260 470 L520 540 L800 450 L1040 520" fill="none" stroke="#ecfccb" stroke-width="6" stroke-dasharray="4 18" stroke-linecap="round" opacity="0.5"/>
     <g transform="translate(1180 160)">
       <path d="M0 0 a150 150 0 0 1 150 150 c0 110 -150 230 -150 230 s-150 -120 -150 -230 a150 150 0 0 1 150 -150z" fill="#f97316"/>
       <circle cx="0" cy="150" r="96" fill="#fff7ed"/>
       <circle cx="0" cy="150" r="70" fill="none" stroke="#fdba74" stroke-width="8"/>
       <path d="M-30 110 v80 M-45 110 v36 q0 14 15 14 M-15 110 v36 q0 14 -15 14" fill="none" stroke="#c2410c" stroke-width="9" stroke-linecap="round"/>
       <path d="M36 110 q-20 20 -6 60 v22" fill="none" stroke="#c2410c" stroke-width="9" stroke-linecap="round"/>
     </g>
     <path d="M1380 120 l12 28 28 12 -28 12 -12 28 -12 -28 -28 -12 28 -12z" fill="#fef9c3"/><path d="M900 260 l8 18 18 8 -18 8 -8 18 -8 -18 -18 -8 18 -8z" fill="#fef9c3" opacity="0.8"/>`
  ),
};

for (const [name, svg] of Object.entries(slides)) {
  const file = path.join(out, name);
  await sharp(Buffer.from(svg)).webp({ quality: 78 }).toFile(file);
  console.log(name, Math.round(fs.statSync(file).size / 1024) + ' KB');
}
