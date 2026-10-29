// Line icons and colour washes for the sector lists (data/sectors.json). Same 64x64 hand-drawn style as icons.mjs.
const wrap = (inner) =>
  `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

export const SECTOR_ICONS = {
  // chip with a spark
  ai: wrap(`<rect x="16" y="16" width="32" height="32" rx="5"/><path d="M26 6v10M38 6v10M26 48v10M38 48v10M6 26h10M6 38h10M48 26h10M48 38h10"/><path d="M32 24l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z"/>`),
  // coin + rising arrow
  fintech: wrap(`<circle cx="26" cy="38" r="16"/><path d="M26 30v16M31 33c-1-2-9-3-9 1 0 4 10 2 10 6 0 4-8 4-10 1"/><path d="M38 20l10-10M40 10h8v8"/>`),
  // house
  proptech: wrap(`<path d="M8 30L32 8l24 22"/><path d="M14 26v28h36V26"/><path d="M26 54V38h12v16"/><path d="M44 14v8"/>`),
  // shield
  defense: wrap(`<path d="M32 6l20 7v16c0 14-9 23-20 29C21 52 12 43 12 29V13z"/><path d="M32 18v22M22 28h20"/>`),
  // heart + pulse
  health: wrap(`<path d="M32 54C14 42 8 33 8 24a12 12 0 0 1 24-4 12 12 0 0 1 24 4c0 9-6 18-24 30z"/><path d="M14 30h10l4-8 6 14 4-6h10"/>`),
  // flask
  biotech: wrap(`<path d="M26 6h12M28 6v18L12 50c-2 5 1 8 5 8h30c4 0 7-3 5-8L36 24V6"/><path d="M19 42h26"/><circle cx="27" cy="49" r="1.6" fill="currentColor"/><circle cx="37" cy="46" r="1.6" fill="currentColor"/>`),
  // padlock
  cyber: wrap(`<rect x="12" y="28" width="40" height="28" rx="5"/><path d="M20 28V20a12 12 0 0 1 24 0v8"/><circle cx="32" cy="42" r="4"/><path d="M32 46v5"/>`),
  // linked cubes
  web3: wrap(`<path d="M20 8l12 6v12l-12 6-12-6V14z"/><path d="M44 30l12 6v12l-12 6-12-6V36z"/><path d="M8 14l12 6 12-6M32 36l12 6 12-6"/><path d="M28 28l8 8"/>`),
  // layered windows
  saas: wrap(`<rect x="8" y="10" width="42" height="30" rx="4"/><path d="M8 18h42"/><path d="M14 46h40a2 2 0 0 0 2-2V24"/><path d="M20 52h36a2 2 0 0 0 2-2V30"/><circle cx="14" cy="14" r="1.2" fill="currentColor"/><circle cx="19" cy="14" r="1.2" fill="currentColor"/>`),
  // lightning bolt
  energy: wrap(`<path d="M36 6L14 36h14l-4 22 26-32H36z"/>`),
  // rocket
  space: wrap(`<path d="M32 6c9 6 13 16 12 28H20C19 22 23 12 32 6z"/><circle cx="32" cy="24" r="4"/><path d="M20 34l-8 8 2 8 8-6M44 34l8 8-2 8-8-6"/><path d="M28 40l-2 12M36 40l2 12M32 40v16"/>`),
  // robot head
  robotics: wrap(`<rect x="12" y="20" width="40" height="30" rx="6"/><path d="M32 20v-8"/><circle cx="32" cy="9" r="3"/><circle cx="24" cy="34" r="4"/><circle cx="40" cy="34" r="4"/><path d="M24 44h16"/><path d="M6 30v10M58 30v10"/>`),
  // atom
  deeptech: wrap(`<circle cx="32" cy="32" r="3.5" fill="currentColor"/><ellipse cx="32" cy="32" rx="24" ry="9"/><ellipse cx="32" cy="32" rx="24" ry="9" transform="rotate(60 32 32)"/><ellipse cx="32" cy="32" rx="24" ry="9" transform="rotate(120 32 32)"/>`),
  // car
  mobility: wrap(`<path d="M8 40v-8l6-12h28l8 12h6v8z"/><path d="M14 32h38"/><circle cx="19" cy="42" r="6" fill="var(--tone, transparent)"/><circle cx="45" cy="42" r="6" fill="var(--tone, transparent)"/><path d="M26 20v12M36 20v12"/>`),
  // wheat / sprout
  agrifood: wrap(`<path d="M32 58V24"/><path d="M32 24c-8 0-12-6-12-14 8 0 12 6 12 14z"/><path d="M32 24c8 0 12-6 12-14-8 0-12 6-12 14z"/><path d="M32 40c-8 0-12-5-12-12 8 0 12 5 12 12z"/><path d="M32 40c8 0 12-5 12-12-8 0-12 5-12 12z"/>`),
  // shopping bag
  consumer: wrap(`<path d="M12 20h40l-3 36H15z"/><path d="M22 28v-8a10 10 0 0 1 20 0v8"/>`),
  // umbrella
  insurtech: wrap(`<path d="M6 32C8 18 18 8 32 8s24 10 26 24z"/><path d="M32 32v20a5 5 0 0 1-10 0"/><path d="M19 32c0-8 5-18 13-24M45 32c0-8-5-18-13-24"/>`),
  // graduation cap
  edtech: wrap(`<path d="M4 24L32 10l28 14-28 14z"/><path d="M16 31v14c0 4 7 8 16 8s16-4 16-8V31"/><path d="M56 26v16"/>`),
  // gamepad
  gaming: wrap(`<path d="M14 22h36a8 8 0 0 1 8 8l2 14a6 6 0 0 1-10 5l-6-7H20l-6 7a6 6 0 0 1-10-5l2-14a8 8 0 0 1 8-8z"/><path d="M20 30v8M16 34h8"/><circle cx="42" cy="32" r="1.8" fill="currentColor"/><circle cx="48" cy="36" r="1.8" fill="currentColor"/>`),
};

// [wash, ink]
export const SECTOR_TONES = {
  'ai-500': ['#e6e0f2', '#4c3a8a'],
  'fintech-500': ['#dbe8f5', '#1f5a9c'],
  'climate-500': ['#d8efe0', '#1b7a4a'],
  'proptech-500': ['#ffe3cc', '#b4500c'],
  'defense-95': ['#e2e5e8', '#33414d'],
  'health-500': ['#ffe0e6', '#b3263f'],
  'biotech-500': ['#dcebe9', '#1f6f66'],
  'cyber-500': ['#dfe3f4', '#2f3f9a'],
  'web3-500': ['#efe0f5', '#7a2e96'],
  'saas-500': ['#d9e6f2', '#2f5da8'],
  'energy-500': ['#fff1c2', '#9a6b00'],
  'space-374': ['#e0e1f0', '#33378a'],
  'robotics-500': ['#e8e6e0', '#4a463d'],
  'deeptech-500': ['#d9eef2', '#1c6f82'],
  'mobility-500': ['#ffe9cf', '#a8550b'],
  'agrifood-500': ['#e3f0d8', '#3b7d1a'],
  'consumer-500': ['#fde2ee', '#a3265f'],
  'insurtech-363': ['#e6eadb', '#4d6420'],
  'edtech-500': ['#f3e6d3', '#7a4b14'],
  'gaming-500': ['#e3dcf7', '#5a35b0'],
};
