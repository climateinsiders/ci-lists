# Climate Insiders Investor Lists

lists.climateinsiders.com. Ten investor lists, $90 each, then a $250 add-on for every list the buyer does not own yet, delivered by email as CSV (plus an Airtable view when one is set).

Zero dependencies. Static pages are generated at build time from Supabase; serverless functions handle checkout (including the upsell), the Stripe webhook, the post-purchase session lookup and the free sample (no longer linked from the page).

## Funnel

1. LinkedIn post advertises one list with a keyword (for example `EU500`).
2. Comment keyword -> reply with `https://lists.climateinsiders.com/europe-500?utm_source=linkedin&utm_campaign=eu500`.
3. The page is one offer: that list's value bullets, $90 buy button and top 10 masked rows. The other nine lists are a single quiet line of chips, not clickable.
4. Stripe Checkout -> webhook -> CSV emailed from yoann@climateinsiders.com -> row in `list_purchases`.
5. `/thanks?session_id=...` offers every list the buyer lacks for $250 (`POST /api/checkout {upsell:true, session_id}`). The delivery email links back to the same page.

## Layout

```
api/checkout.js         POST {slug}, {bundle:true} or {upsell:true, session_id} -> Stripe Checkout URL
api/session.js          GET ?session_id -> lists the buyer does not own yet
api/stripe-webhook.js   checkout.session.completed -> record + deliver CSVs
api/sample.js           POST {email, slug} -> top-10 Excel by email, lead recorded (per-IP + per-email throttle; SAMPLE_ENABLED=0 turns it off)
api/_lib.js             Supabase REST, Resend, Stripe REST, CSV
api/_deliver.js         Delivery and sample email copy
scripts/build.mjs       Builds dist/ (home, 10 list pages, thanks, sitemap)
scripts/render.mjs      Templates
scripts/icons.mjs       Hand-drawn SVG icons
public/                 style.css, app.js, favicon, og.png
```

## Data (Supabase, VC Boom project)

- `paid_lists`: one row per list (slug, keyword, name, tagline, price, airtable_url, csv_filename).
- `paid_list_entries`: the rows. `is_sample = true` marks the ten rows shown on the page and emailed for free.
- `list_purchases`: every Stripe purchase, with `delivered_at` and `delivery_error`.
- `list_sample_requests`: every free-sample email.
- `paid_list_stats(slug)`: SQL function used by the build for counts.

To change copy or prices: edit `paid_lists` and redeploy (Vercel -> Redeploy, or push any commit).
To fix a row: edit `paid_list_entries` and redeploy. Buyers get the CSV at purchase time, so fixes apply to future buyers; resend manually if needed.

## Environment variables (Vercel project settings)

See `.env.example`. All are required in Production. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are also needed at build time.

## Stripe

- Checkout uses inline `price_data`, so no products need to exist in Stripe. Promotion codes are allowed at checkout.
- Webhook endpoint: `https://lists.climateinsiders.com/api/stripe-webhook`, event `checkout.session.completed`. Put the signing secret in `STRIPE_WEBHOOK_SECRET`.
- A failed delivery returns 500 so Stripe retries. Check `list_purchases.delivery_error` if a buyer says nothing arrived.

## Local preview

```
node scripts/build.mjs --local   # uses scripts/fixture.json
npx serve dist
```

## Deploy

Push to `main`. Vercel runs `node scripts/build.mjs` and publishes `dist/`.
