# Fleetdesk

Car rental booking website plus the counter software behind it: customers book online, staff
hand cars over and take them back with inspections, signed agreements and deposits.

> Fleetdesk is being built in phases. This README grows with each phase; the full setup and
> deployment guide comes with version 1.0.

## Quick start

You need **Node.js 20.12 or newer** and a Postgres database (a free **Neon** account works:
https://neon.tech).

```bash
npm install
cp .env.example .env        # then fill in .env
npm run db:migrate          # creates the tables
npm run db:seed             # optional: a sample business with logins
npm run dev                 # http://localhost:3000
```

Open http://localhost:3000. Without sample data you're taken to the **setup wizard**: create
the owner account (without a Resend key the verification email is printed in the terminal),
then enter your business name, currency and time zone.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the app for development |
| `npm run check` | Typecheck, lint, tests and production build |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:seed` | Add the sample business and logins (safe to run again) |
