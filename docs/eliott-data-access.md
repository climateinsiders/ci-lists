# Investor data access for list research (Eliott)

Read-only access to the core investor database, for choosing and building the next lists. You can't see VC Boom users, decks, emails, payments or tokens. Only what's below.

## Connect

- Login: `eliott_reader` (the password comes from Yoann, privately)
- Host: the Supabase "Session pooler" connection string for the VC Boom project (Supabase → Connect). Swap in user `eliott_reader.qzhstjaakmvcmnmrdvbi` and the password.
- Works from any SQL tool (TablePlus, DBeaver, psql) or from Claude Code with `psql`.
- Queries time out after 60s. Max 5 connections.

## What you can see (schema `catalog`, the default)

| View | What's in it |
|---|---|
| `investors` | 47,874 investors, suppressed ones excluded. Name, firm, type, title, verticals, stages, business models, customer segments, geo focus, cheque min/max/target, thesis, recent deals, location, country, website, LinkedIn, last deal date, fund raised, firm focus tags (`firm_core_tags` like `climate_software_analytics`, `energy_storage_batteries`, `digital_health`; `firm_generalist`). |
| `paid_lists` | The 10 lists on sale today (slug, keyword, name, price). |
| `paid_list_entries` | The 2,830 rows behind those lists. |
| `list_drafts` | Your workspace. You can insert and update here to propose a new list. |

Emails are masked everywhere. You see `has_email`, `email_domain` and `contact_email_status`, never the address itself. Exports with real emails get built from the draft on our side.

Current mix by type: Seed VC 34,041 (23,226 with email), Family Office 7,564 (7,275), Angel 3,924 (669), Tier 1 VC 801, Corporate VC 420, Accelerator 342, Micro VC 65.

## Useful queries

```sql
-- field coverage for a segment
select count(*) n,
       count(*) filter (where has_email) with_email,
       count(*) filter (where linkedin_url is not null) with_linkedin,
       count(*) filter (where last_deal_date > now() - interval '12 months') active_12m
from investors where type = 'Family Office' and 'Europe' = any(geo_focus);

-- top verticals
select v, count(*) from investors, unnest(verticals) v group by 1 order by 2 desc limit 30;

-- countries for a type
select country, count(*) from investors where type = 'Corporate VC' group by 1 order by 2 desc;
```

## Proposing a new list

```sql
insert into list_drafts (slug, name, audience, definition_sql, row_count, notes)
values ('climate-cvc-120', '120 corporate VCs in energy storage', 'climate founders raising seed to A',
        $$select id from investors where type = 'Corporate VC' and 'energy_storage_batteries' = any(firm_core_tags)$$,
        120, 'why this list, keyword idea, post angle');
```

Yoann or Claude reviews the draft, checks it by hand, and publishes it as a paid list.
