# Fleetdesk

A car rental booking website **plus the software behind the counter**. Customers find a car,
book and pay online. Your staff hand cars over and take them back with inspection photos, a
rental agreement signed on screen, deposits and extra charges, and the fleet stays serviced.

Built with Next.js 16, React 19, TypeScript, Tailwind CSS 4, Drizzle ORM on Postgres, Better
Auth, Stripe (optional) and Resend. One install runs one rental business, with any number of
branches.

## Features

**Booking website**
- Search by pickup and return location, date and time; one-way rentals with a drop-off fee.
- Car list with the full price for the dates (tax included), car pages with photos and specs.
- Booking with extras (child seat, GPS, insurance...), coupons, a note, and a live price.
- No double bookings: the database itself refuses two bookings of the same car at the same
  time, even when two people book the last car in the same second.
- Customers pay online (Stripe) or at pickup, cancel online until a deadline you choose (with
  an automatic refund), and see every booking, agreement and receipt in their account.

**Renters**
- Driver details and license photos sent from the customer's account; staff accept them or ask
  for a fix. Minimum driver age checked when booking and at pickup.
- Optional automatic ID check with Stripe Identity (license + selfie).

**At the counter**
- Pickup: driver check, car swap, mileage, fuel, photos, deposit (held on the card used online,
  or taken at the counter) and the rental agreement signed with a finger.
- Return: mileage, fuel, photos and suggested charges for extra distance, missing fuel and late
  return, plus damage; part of the deposit kept, the rest released.
- Printable signed agreement and receipt.

**Running the business**
- Fleet: locations, car models (what customers book) and vehicles (number plates), blocked
  dates, maintenance reminders by date or mileage.
- Prices: daily and weekly rates, seasons (+20% in summer...), extras, coupons, tax, booking
  rules, and a price calculator.
- Dashboard (today's pickups and returns, late cars, things to do), reports (income,
  utilization per model), payment records with counter payments and refunds.
- Staff roles: owner, manager, agent. Emails: confirmations, reminders, a morning summary.
- Your name, logo and brand color everywhere; setup wizard on first start.

## Quick start

You need **Node.js 20.12 or newer** and a Postgres database (a free **Neon** account works:
https://neon.tech).

```bash
npm install
cp .env.example .env        # then fill in .env (see below)
npm run db:migrate          # creates the tables
npm run dev                 # http://localhost:3000
```

Open http://localhost:3000. The **setup wizard** asks you to create the owner account (without a
Resend key, the verification email is printed in the terminal: open the link from there), then
your business name, currency and time zone. The admin area then shows a **Get started**
checklist: add your locations, car models with prices, and vehicles.

To try it with sample data instead, run `npm run db:seed` before opening the site: a business
with a fleet, prices, rentals and these logins (password `fleetdesk-demo`):
`owner@demo.test` (owner), `agent@demo.test` (counter agent), `customer@demo.test` (customer).

## Environment variables

Everything is described in `.env.example`; the app checks them when it starts and lists what's
missing.

| Variable | Needed | What it's for |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string |
| `DATABASE_DRIVER` | no | `neon` or `postgres`; guessed from the URL when empty |
| `BETTER_AUTH_SECRET` | yes | Random string of 32+ characters for login sessions |
| `BETTER_AUTH_URL` | yes | Your site's address, like `https://rentals.example.com` |
| `RESEND_API_KEY` | production | Sends emails (https://resend.com). Printed in the terminal in development |
| `EMAIL_FROM` | no | Sender, on a domain verified in Resend |
| `CRON_SECRET` | production | Protects the daily job (see below) |
| `STORAGE_DRIVER` | no | Where photos go: `database` (default), `local` or `s3` |
| `STORAGE_LOCAL_DIR`, `S3_*` | no | Settings for the `local` and `s3` storage |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | no | Online payments (see below) |

### Online payments with Stripe (optional)

Without Stripe, customers pay at pickup and staff record payments. To take payments online:

1. Create a Stripe account and copy the secret key (Developers > API keys) into
   `STRIPE_SECRET_KEY`. Use the test key (`sk_test_...`) until you go live.
2. Add a webhook (Developers > Webhooks) to `https://<your-domain>/api/webhooks/stripe` with
   the events `checkout.session.completed` and `checkout.session.expired` (and, if you use
   Stripe Identity, `identity.verification_session.verified` and
   `identity.verification_session.requires_input`). Put its signing secret in
   `STRIPE_WEBHOOK_SECRET`.
3. In the app, open **Settings > Payments** and choose: pay online, pay at pickup, or let the
   customer choose. Turn on Stripe Identity there too if you want automatic ID checks.

The card from the online payment is saved, so the deposit can be held on it at pickup. Card
holds expire after about 7 days, so for long rentals take the deposit at the counter instead.

### Photos (storage)

`database` (the default) needs no setup and works everywhere, including Vercel. For a large
fleet, use `s3` with any S3-compatible bucket (Cloudflare R2, AWS S3, Backblaze B2, MinIO), or
`local` on your own server (Docker keeps them in a volume). Old photos stay readable after you
switch.

### The daily job

Once a day the app sends pickup and return reminders, a morning summary to your contact email,
and deletes photos that were uploaded but never used. Call
`GET /api/cron/daily` with the header `Authorization: Bearer <CRON_SECRET>`:
- **Vercel** does it for you (`vercel.json`, every morning).
- **Docker**: the `cron` service in `docker-compose.yml` does it every hour.
- **Elsewhere**: any scheduler, e.g. `curl -H "Authorization: Bearer $CRON_SECRET" https://.../api/cron/daily`.

Each reminder is sent only once and the summary once a day, so running it more often is
safe.

## Deploying

**Vercel + Neon** (easiest): push the code to your own GitHub repository, import it in Vercel,
add the environment variables, and deploy. Run `npm run db:migrate` once with the production
`DATABASE_URL` (and again after each update).

**Finish the setup wizard right after deploying:** until an owner exists, whoever opens `/setup`
first becomes the owner.

**Your own server with Docker**: `cp .env.example .env`, fill it in, then
`docker compose up -d --build`. It starts Postgres, applies migrations, runs the app on port
3000 (reachable from the same machine only) and the daily job. Put a reverse proxy with HTTPS in
front (`deploy/Caddyfile`).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the app for development |
| `npm run check` | Typecheck, lint, tests and production build |
| `npm test` | Unit tests |
| `npm run db:generate` | Create a migration after changing `src/db/schema/` |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:seed` | Add the sample business, logins and rentals (safe to run again; refuses a database that already has real accounts) |

## Customizing

The code is organized by area (`src/lib/bookings`, `src/lib/pricing`, `src/lib/operations`...)
with the business rules in small, tested functions. `AGENTS.md` describes the structure and
conventions, so AI coding tools (Claude Code, Cursor...) can extend it the same way. UI text is
English; every visible string is in the page components.

## Support

Questions and bug reports are welcome as GitHub issues. Read this README and `AGENTS.md`
first; for bugs, include the steps to reproduce and any error message.

## License

MIT; see [LICENSE](LICENSE).
