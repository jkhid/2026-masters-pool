# Majors Pool

A Next.js pool app for the four golf majors. Participants join a contest with their name and PIN, pick one golfer from each of six tiers, and picks stay hidden until every active participant has submitted.

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Required environment variables:
supabase bkcEHVex5N3m8CPs
```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSWORD=
# Optional: enables betting-odds chips on the tier picker (free signup at the-odds-api.com)
ODDS_API_KEY=
```

Use `ADMIN_PASSWORD` for the admin screen. Keep the Supabase service role key server-side only.

`ODDS_API_KEY` is optional. When set, the contest picking UI shows outright-winner betting odds (best price + bookmaker comparison) next to each golfer in the tier picker. Sign up for a free key at <https://the-odds-api.com>; the free tier (500 requests/month) is enough with the built-in 30-minute cache.

## Supabase

Run `supabase/schema.sql` in the Supabase SQL editor before using the app. The API routes use the Supabase REST API directly from the server, so no browser database credentials are exposed.

## Tier CSV

Admin imports support normalized rows:

```csv
tier,name,world_rank,seed,notes
1,Scottie Scheffler,1,1,
1,Rory McIlroy,2,2,
2,Collin Morikawa,4,1,
```

They also support printable pick sheets:

```csv
Tier 1 Pick 1,Tier 2 Pick 1,Tier 3 Pick 1,Tier 4 Pick 1,Tier 5 Pick 1,Tier 6 Pick 1
Scottie Scheffler,Justin Thomas,Ben Griffin,Sepp Straka,Jacob Bridgeman,John Parry
Rory McIlroy,Brooks Koepka,Patrick Reed,Sungjae Im,Daniel Berger,Aaron Rai
```

`tier` must be 1 through 6. Participants must select exactly one golfer from each tier.

## Contest Rules

- Six golfer picks per participant
- One golfer per tier
- Best four scores count
- Cut/WD/DQ golfers receive an 80 for unplayed weekend rounds
- Picks reveal automatically when all active participants have submitted
- Participants who have not submitted by `starts_at` are booted from that contest
