# Changelog

Notable changes for buyers of Fleetdesk. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.0.0] - 2026-10-10

First public version.

### Foundation
- Setup wizard: the first account becomes the owner and names the business (currency, time
  zone, contact email).
- Staff roles (owner, manager, agent) with email invitations; everyone else is a customer.
- Settings: business details, logo, brand color (buttons and highlights everywhere).
- Photo uploads made smaller in the browser, stored in the database, on disk or in any
  S3-compatible bucket. Private files (licenses, inspection photos) only reach staff and their
  owner.
- Accounts: sign up, email verification, log in, password reset, delete account.

### Fleet
- Locations (branches) with address and phone; deactivate instead of delete.
- Car models (what customers book): class, transmission, fuel, seats, doors, bags,
  description and photos; hide from the website when needed.
- Vehicles with number plate, VIN, year, color, mileage and status (available, in
  maintenance, retired). Plates are unique, even typed with different spaces or dashes.
- Blocked dates per vehicle (planned service, private use).
- "Get started" checklist on the admin overview.

### Pricing
- Daily and weekly price per car model (7+ days use the weekly price), deposit, included
  distance per day and price per extra km or mile.
- Seasons: raise or lower all prices on certain dates (+20% summer, -15% low season).
- Extras charged per day or once (child seat, GPS, additional driver, insurance...).
- Drop-off fee per location for one-way rentals.
- Coupons: percentage or fixed amount, valid dates, minimum days, maximum uses.
- Tax rate and name, grace period for late returns, booking notice and longest rental.
- Price calculator on the Pricing page to check any quote.

### Shipping
- Docker setup with Postgres, migrations, a photo volume and the daily job; Caddy example;
  `vercel.json` for Vercel.
- Demo mode with protected sample logins, sample rentals in every state, and
  `npm run db:reset-demo`.
- Terms and Privacy pages written for car rental; sitemap with every car page.

### Booking website
- Home page with a search form (pickup and return location, dates and times), the car list
  with the total price for the chosen dates, and a page per car with photos and specs.
- Booking with extras, coupon, phone number and a note; the price updates live. Customers pay
  at pickup.
- No double bookings, guaranteed by the database, even when two people book the last car at
  the same second. Cleaning time between rentals.
- My bookings: every booking with its details and price; online cancellation until the free
  cancellation deadline (Settings).
- Emails: booking confirmed (customer), new booking (business), booking cancelled.
- Bookings in the admin area (upcoming, out now, completed, cancelled) with staff
  cancellation and an optional email to the customer.

### Online payments
- Optional Stripe payments: customers pay when booking (or choose to pay at pickup, per
  Settings). The car is held while they pay and let go if they don't finish.
- The card is saved at checkout for the deposit and charges after the return.
- Free cancellation refunds online payments automatically; staff can refund in full when
  cancelling, or give any refund later.
- Payment records per booking: online payments, payments taken at the counter (cash, card
  terminal, transfer) and refunds, with what's still to pay.
- Every message about money ("You pay at pickup", "Paid online", "Refunded") follows the real
  payment records.

### Renter verification
- Driver details in the customer's account: date of birth, license number, country, expiry,
  photos of the license (front and back) and an optional ID.
- Staff check them under Customers: accept, or ask to fix with a reason (emailed).
- Minimum driver age, checked when booking (date of birth asked if unknown) and at pickup.
- Optional automatic ID check with Stripe Identity (license + selfie).

### At the counter
- Pickup: driver check (or check the license in person), swap to another free car of the same
  model, mileage, fuel, photos and notes, deposit (held on the saved card or taken at the
  counter), and the rental agreement signed on screen.
- Return: mileage, fuel, photos, return location; suggested charges for extra distance, missing
  fuel and late return, plus damage or other charges; part of the deposit kept, the rest
  released; the car moves to the return location (or to maintenance).
- Printable signed agreement and receipt, for staff and the customer. Emails with the agreement
  at pickup and the receipt at return.
- Rental terms and fuel charge under Settings.

### Fleet care and reports
- Maintenance per vehicle: due on a date and/or at a mileage, repeating; overdue and due-soon
  services on the Maintenance page and the dashboard.
- Dashboard: cars out, free and in maintenance, income, late returns, licenses to check, and
  today's pickups and returns.
- Reports: income, bookings, booking value and utilization per car model, for the last 30 days,
  this month or last month.
- Daily job: pickup and return reminder emails (sent once), a morning summary for the
  business, and cleanup of photos that were uploaded but never used.
