# Sector lists

20 lists by sector (AI, fintech, climate tech, real estate, defense, ...). Landing pages are built from `data/sectors.json`
(copy, stats, 10 public sample rows; no emails). Hub page: `/sectors`. They are separate from the 10 geographic lists:
never part of the $690 bundle, the upsell or the upgrade credit (`api/_lib.js` `isSectorSlug`, `getBundleLists`).

## Method
Source: `catalog.investors` (VC Boom, Supabase). Per sector: investors whose `verticals` or `firm_core_tags` match the sector,
type Seed VC / Tier 1 / Micro / Corporate VC (family offices only for real estate), email present and not risky/invalid,
max 2 contacts per fund (3 for defense), minimum fit score 8. Score = core-tag fit + vertical matches + focus (non-generalist)
+ email quality (verified first) + LinkedIn + portfolio size + recent deals. Sizes: sectors with more than 500 qualifying investors show the top 500 ("Top 500 of 2,106"); smaller ones (Defense 95, Space 374, Insurtech 363) list every qualifying investor. `pool` in `data/sectors.json` is the real total.

## Preview
`npm run dev:api` shows every sector page locally. In production a sector page is built only when its slug is an active row
in `paid_lists`.

## Publish a sector (needs approval, writes to production)
1. Insert the list into `paid_lists` (slug, name, short_name, tagline, region_note, icon, price_cents 13000, csv_filename, value_points, active true).
2. Insert its entries into `paid_list_entries` with `extra` = `{stage, check, kind}` and email, linkedin_url, photo_url, logo_url.
3. Redeploy. The page, `/sectors` and the sitemap pick it up; checkout and delivery work per slug.

## Navigation and bundles
- `/` two doors (by region, by sector), `/regions` (world map + tiles), `/sectors` (tiles), `/bundles`, `/all` (10 region lists, $690), `/all-sectors` (all sector lists, $1,490).
- Sector bundle: checkout `{ sectorBundle: true }`, Stripe metadata `kind=sector-bundle`, delivered by the same webhook (one Excel per list). Price and unique-investor count live in `data/sectors.json` `bundle` and `SECTOR_BUNDLE_PRICE_CENTS` in `api/_lib.js`.
- The region map comes from `data/world-map.json` (generated once from the world-atlas topojson).
