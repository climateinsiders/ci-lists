// Which 10 rows are the free sample of a list. One rule, used by the page build and by the emailed Excel,
// so the top 10 on the page is exactly what lands in the inbox.
// Preference: direct email AND LinkedIn first, then a photo/logo (the page shows them), then rows that were
// hand-flagged is_sample, then the list's own order (most complete first). A list short of complete rows is
// topped up with the next best ones, so the sample is always 10.
const has = (v) => v !== null && v !== undefined && String(v).trim() !== '';

export function sampleScore(e) {
  const em = has(e.email), li = has(e.linkedin_url);
  return [em && li ? 2 : em || li ? 1 : 0, has(e.photo_url) || has(e.logo_url) ? 1 : 0, e.is_sample ? 1 : 0];
}

export function pickSample(rows, n = 10) {
  return rows
    .map((e, i) => ({ e, s: sampleScore(e), i }))
    .sort((a, b) => b.s[0] - a.s[0] || b.s[1] - a.s[1] || b.s[2] - a.s[2] || (Number(a.e.sort_order) || a.i) - (Number(b.e.sort_order) || b.i))
    .slice(0, n)
    .map((x) => x.e);
}

export function sampleStats(rows) {
  const picked = pickSample(rows);
  const full = (e) => has(e.email) && has(e.linkedin_url);
  return { complete_rows: rows.filter(full).length, picked: picked.length, picked_complete: picked.filter(full).length };
}
