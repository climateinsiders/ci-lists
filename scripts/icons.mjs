// Hand-drawn style line icons, one per list. Stroke colour comes from CSS (currentColor).
const wrap = (inner) =>
  `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

export const ICONS = {
  // compass rose
  europe: wrap(`<circle cx="32" cy="32" r="21"/><path d="M32 13l5 15 14 4-14 4-5 15-5-15-14-4 14-4z"/><circle cx="32" cy="32" r="2.5" fill="currentColor"/><path d="M32 7v4M32 53v4M7 32h4M53 32h4"/>`),
  // skyline
  usa: wrap(`<path d="M6 54h52"/><path d="M10 54V30h8v24M22 54V18h10v36M36 54V26h8v28M48 54V36h8v18"/><path d="M27 12v6M25 12h4"/><path d="M13 36h2M13 42h2M26 24h2M26 30h2M26 36h2M26 42h2M39 32h2M39 38h2M51 42h2"/>`),
  // big ben-ish tower
  uk: wrap(`<path d="M24 56V22h16v34"/><path d="M22 22l10-10 10 10"/><path d="M32 6v6"/><circle cx="32" cy="32" r="5"/><path d="M32 29v3l2 2"/><path d="M18 56h28"/><path d="M27 44v12M37 44v12"/>`),
  // mountains
  dach: wrap(`<path d="M4 50L20 22l8 12 6-8 12 18 6-9 8 15H4z"/><path d="M20 22l4 7-4 3-3-4z" fill="currentColor"/><path d="M46 34l3 5-3 2-2-3z" fill="currentColor"/><path d="M12 14l2 3M50 12l-2 3"/>`),
  // pine tree
  nordics: wrap(`<path d="M32 8l12 16h-7l10 13h-8l11 13H14l11-13h-8l10-13h-7z"/><path d="M32 50v8"/><path d="M26 58h12"/>`),
  // eiffel tower
  france: wrap(`<path d="M32 6v8"/><path d="M29 14h6l3 14h-12z"/><path d="M26 28l-2 12h16l-2-12"/><path d="M24 40L14 58M40 40l10 58" /><path d="M24 40l-10 18M40 40l10 18"/><path d="M19 49h26"/><path d="M14 58c6-8 30-8 36 0"/>`),
  // junk sail boat
  apac: wrap(`<path d="M12 44c6 8 34 8 40 0"/><path d="M8 44h48"/><path d="M30 44V10"/><path d="M30 12c10 0 16 6 18 14H30"/><path d="M30 26c10 0 16 6 18 14H30"/><path d="M30 14c-6 2-10 7-10 12h10"/><path d="M30 28c-6 2-10 7-10 12h10"/>`),
  // palm + maple leaf
  latam: wrap(`<path d="M22 58V30"/><path d="M22 30c-8-4-12-2-16 2 6-1 10 0 14 4"/><path d="M22 30c0-8 4-12 10-14-3 4-5 8-5 14"/><path d="M22 30c6-6 12-6 16-4-5 1-9 4-12 8"/><path d="M44 58V44"/><path d="M44 44l-8-4 2-4-4-4 6-1-1-6 5 3 0-6 4 6 5-3-1 6 6 1-4 4 2 4z"/>`),
  // stacked coins + arrow in
  lps: wrap(`<ellipse cx="30" cy="20" rx="14" ry="5"/><path d="M16 20v8c0 3 6 5 14 5s14-2 14-5v-8"/><path d="M16 28v8c0 3 6 5 14 5s14-2 14-5v-8"/><path d="M16 36v8c0 3 6 5 14 5s14-2 14-5v-8"/><path d="M50 12l8 8-8 8M58 20H46"/>`),
  // leaf
  climate: wrap(`<path d="M52 10C30 10 14 24 12 50c26 2 40-14 40-40z"/><path d="M12 50c10-12 20-20 32-30"/><path d="M26 36c4 0 8 0 12-2M20 44c4-1 8-2 12-4"/>`),
  globe: wrap(`<circle cx="32" cy="32" r="22"/><path d="M10 32h44M32 10c-8 8-8 36 0 44M32 10c8 8 8 36 0 44"/><path d="M14 22h36M14 42h36"/>`),
};

export const SMALL_ICONS = {
  arrow: `<svg viewBox="0 0 80 40" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 30c20-18 44-22 70-12"/><path d="M62 10l12 8-10 8"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 13l5 5L20 6"/></svg>`,
  bubble: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6h20v15H14l-6 5v-5H6z"/></svg>`,
  mail: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="8" width="24" height="17" rx="2"/><path d="M4 10l12 8 12-8"/></svg>`,
};
