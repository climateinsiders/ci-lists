import { getActiveLists, stripe, readJson, json, siteUrl, upgradeQuote, BUNDLE_PRICE_CENTS, UPSELL_PRICE_CENTS, UNIQUE_INVESTORS } from './_lib.js';

// POST /api/checkout
//   { slug: "europe-500" }               one list, $90
//   { bundle: true }                     all 10 lists, $390
//   { bundle: true, upgrade: "<token>" } all 10, minus what this buyer already paid (within the credit window)
//   { upsell: true, session_id }         grand slam offer shown on /thanks (all lists the buyer lacks)
// Payments go to the VC Boom Stripe account (STRIPE_SECRET_KEY).
export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  try {
    const body = await readJson(req);
    const lists = await getActiveLists();
    const attribution = body.attribution && typeof body.attribution === 'object' ? body.attribution : {};
    let lineItems, slugs, bundle, origin, customerEmail, upgradeToken = '';

    if (body.upsell) {
      const sid = String(body.session_id || '');
      if (!/^cs_[A-Za-z0-9_]+$/.test(sid)) return json(res, 400, { error: 'Missing purchase' });
      const prev = await stripe(`checkout/sessions/${sid}`);
      if (prev.payment_status !== 'paid') return json(res, 400, { error: 'Purchase not found' });
      if (prev.metadata?.upsell === '1') return json(res, 400, { error: 'Already upgraded' });
      const owned = (prev.metadata?.slugs || '').split(',').filter(Boolean);
      const rest = lists.filter((l) => !owned.includes(l.slug));
      if (!rest.length) return json(res, 400, { error: 'You already own every list' });
      bundle = false;
      slugs = rest.map((l) => l.slug);
      origin = `/thanks?session_id=${sid}`;
      lineItems = [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: UPSELL_PRICE_CENTS,
            product_data: {
              name: 'All 47,000 investors (Climate Insiders)',
              description: `${rest.map((l) => l.short_name).join(', ')}. CSV + Airtable, delivered by email.`,
            },
          },
        },
      ];
    } else if (body.bundle) {
      bundle = true;
      slugs = lists.map((l) => l.slug);
      origin = '/all';
      let amount = BUNDLE_PRICE_CENTS;
      let name = `All ${lists.length} investor lists`;
      if (body.upgrade) {
        const q = await upgradeQuote(String(body.upgrade));
        if (q && q.bundleOwned) return json(res, 400, { error: 'You already have all 10 lists. Check your inbox for the Airtable links.' });
        if (q && q.active) {
          amount = q.price;
          name = `All ${lists.length} investor lists (upgrade, your earlier purchase counts)`;
          customerEmail = q.email;
          upgradeToken = String(body.upgrade);
        }
      }
      lineItems = [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: amount,
            product_data: {
              name,
              description: `${UNIQUE_INVESTORS.toLocaleString('en-US')} investors across ${lists.length} lists. Airtable + CSV, delivered by email.`,
            },
          },
        },
      ];
    } else {
      const list = lists.find((l) => l.slug === body.slug);
      if (!list) return json(res, 400, { error: 'Unknown list' });
      bundle = false;
      slugs = [list.slug];
      origin = `/${list.slug}`;
      lineItems = [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: list.price_cents,
            product_data: { name: list.name, description: `${list.tagline} Airtable + CSV, delivered by email.` },
          },
        },
      ];
    }

    const session = await stripe('checkout/sessions', {
      mode: 'payment',
      line_items: lineItems,
      success_url: `${siteUrl()}/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}${origin}`,
      allow_promotion_codes: upgradeToken ? undefined : true,
      customer_email: customerEmail,
      customer_creation: 'always',
      invoice_creation: { enabled: true },
      metadata: {
        product: 'investor-lists',
        slugs: slugs.join(','),
        bundle: bundle ? '1' : '0',
        upsell: body.upsell ? '1' : '0',
        upgrade: upgradeToken,
        utm_source: String(attribution.utm_source || ''),
        utm_campaign: String(attribution.utm_campaign || ''),
        utm_content: String(attribution.utm_content || ''),
        ref: String(attribution.ref || ''),
      },
    });

    return json(res, 200, { url: session.url });
  } catch (err) {
    console.error(err);
    return json(res, 500, { error: 'Checkout did not open. Try again in a minute.' });
  }
}
