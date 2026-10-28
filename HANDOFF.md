# Handoff: Climate Insiders Investor Lists

Status Oct 27, 2026, 15:50 Lisbon. Paused here. Read this first, then README.md.

## What this is

lists.climateinsiders.com. 10 investor lists at $90 each, or all 10 for $690. LinkedIn post, people comment a keyword, we reply with the list's link, the page opens on that list's card, they buy via Stripe, the CSV arrives by email.

Brand is Climate Insiders, not VC Boom. Design copies climateinsiders.com/all-star-yoann: cream paper, Fraunces 900, Caveat orange script, orange pill buttons.

## Done

- Data: 10 lists in Supabase (VC Boom project `qzhstjaakmvcmnmrdvbi`), tables `paid_lists`, `paid_list_entries`. 2,830 rows. Each list has 10 hand-picked sample rows (`is_sample`) with photos and logos matched from the `investors` table (`photo_url`, `logo_url`), and 6 value bullets (`paid_lists.value_points`).
- Site: zero-dependency static build + 3 Vercel functions. One template, 10 sub pages. Featured card first, the other nine greyed with a lock. Click a card to open the in-page preview: value bullets, $90 buy button, free 10-row sample by email, top 10 with photos, one testimonial. Rotating testimonials + backed-founder logos under the grid.
- Checkout: `api/checkout.js` (Stripe Checkout, inline prices). Delivery: `api/stripe-webhook.js` emails the CSV through Resend. Records go to `list_purchases`. Free samples: `api/sample.js`, recorded in `list_sample_requests`.
- Resend: domain `climateinsiders.com` added, DNS not set yet (records in README.md / the project doc).
- Airtable: base "Climate Insiders Investor Lists" (`appCWJLApJL2hoFFN`). All 10 tables exist. Filling was stopped partway, so record counts are incomplete. Not needed for launch: CSV delivery works without it.
- LinkedIn posters: prompt pack in `design/linkedin-image-prompts.md`, two Canva tests in `design/`.

## The 10 lists

| List | Keyword | Path |
|---|---|---|
| 500 European family office contacts | EU500 | /europe-500 |
| 500 US family office contacts (494 rows) | US500 | /usa-500 |
| 200 UK family office contacts | UK200 | /uk-200 |
| 150 DACH family office contacts | DACH | /dach-150 |
| 150 Nordic family office contacts | NORDICS | /nordics-150 |
| 150 France and Benelux family office contacts | PARIS | /france-benelux-150 |
| 200 Asia-Pacific family office contacts | APAC | /apac-200 |
| 150 Canada and Latin America family office contacts | LATAM | /latam-canada-150 |
| 366 LPs, funds of funds and allocators | LPS | /lps-366 |
| 470 climate tech VC funds | CLIMATE | /climate-vcs-474 |

Bundle: /#all, keyword ALL10. Comment reply link: `https://lists.climateinsiders.com/<path>?utm_source=linkedin&utm_campaign=<keyword>`.

## Next steps, in order

1. Push this repo to `climateinsiders/ci-lists` (private).
2. Vercel: import the repo into the Climate Insiders team. Framework Other, build `node scripts/build.mjs`, output `dist`, install `echo skip`.
3. Env vars (see `.env.example`): `SITE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`. Without the Supabase vars the build falls back to `scripts/fixture.json`.
4. Stripe webhook: `https://lists.climateinsiders.com/api/stripe-webhook`, event `checkout.session.completed`.
5. DNS: `lists` CNAME `cname.vercel-dns.com`, plus the 4 Resend records. Until Resend verifies, set `EMAIL_FROM` to a vcboom.com address (already verified).
6. Test in Stripe test mode with card 4242 4242 4242 4242. Check `list_purchases.delivered_at` and the inbox. Then switch to live keys.
7. Generate the 10 posters (ChatGPT, prompt pack), host them, put each URL in `paid_lists.image_url`, then redeploy. The card shows the real poster and it becomes the page's OG image.
8. Add `public/og.png` (1200x630) for the home page.

## Open items, not blocking launch

- Canada + LatAm top 10 has no photos and only 3 logos. LPs is 8/10, Climate VCs 4/10. To fix: add `photo_url` or `logo_url` on those `is_sample` rows, or pick other samples.
- US list holds 494, named 500. Rename it or pull 6 more rows from the US Airtable base.
- Airtable fill: finish it, then put a read-only shared view link per list in `paid_lists.airtable_url`. The delivery email adds it automatically.
- Testimonials are Yoann's All-Star quotes (hardcoded in `scripts/render.mjs`, `PROOF`). VC Boom's `social_proof_tweets` rows are unapproved or tests, so none are used.

## Local preview

```
node scripts/build.mjs --local
cd dist && python3 -m http.server 8787
```

Files to know: `scripts/render.mjs` (all markup + copy), `public/style.css`, `public/app.js` (previews, checkout, sample form), `api/_deliver.js` (email copy).
