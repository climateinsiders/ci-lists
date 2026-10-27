import { getActiveLists, stripe, readJson, json, siteUrl, BUNDLE_PRICE_CENTS, UPSELL_PRICE_CENTS } from './_lib.js';

// POST /api/checkout  { slug: "europe-500" }, { bundle: true } or { upsell: true, session_id } (all lists the buyer lacks)
// Creates a Stripe Checkout session and returns its URL.
export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  try {
    const body = await readJson(req);
    const lists = await getActiveLists();
    const attribution = body.attribution && typeof body.attribution === 'object' ? body.attribution : {};
    let lineItems, slugs, bundle, origin;

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
              name: `The other ${rest.length} investor lists (Climate Insiders)`,
              description: `${rest.map((l) => l.short_name).join(', ')}. CSV + Airtable, delivered by email.`,
            },
          },
        },
      ];
    } else if (body.bundle) {
      bundle = true;
      slugs = lists.map((l) => l.slug);
      origin = '#all';
      lineItems = [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: BUNDLE_PRICE_CENTS,
            product_data: {
              name: 'All 10 investor lists (Climate Insiders)',
              description: `${lists.map((l) => l.short_name).join(', ')}. CSV + Airtable, delivered by email.`,
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
            product_data: { name: list.name, description: `${list.tagline} CSV + Airtable, delivered by email.` },
          },
        },
      ];
    }

    const session = await stripe('checkout/sessions', {
      mode: 'payment',
      line_items: lineItems,
      success_url: `${siteUrl()}/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}${origin}`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      customer_creation: 'always',
      invoice_creation: { enabled: true },
      metadata: {
        slugs: slugs.join(','),
        bundle: bundle ? '1' : '0',
        upsell: body.upsell ? '1' : '0',
        utm_source: String(attribution.utm_source || ''),
        utm_campaign: String(attribution.utm_campaign || ''),
        utm_content: String(attribution.utm_content || ''),
        ref: String(attribution.ref || ''),
      },
    });

    return json(res, 200, { url: session.url });
  } catch (err) {
    console.error(err);
    return json(res, 500, { error: 'Could not start checkout. Email yoann@climateinsiders.com and I will send a payment link.' });
  }
}
