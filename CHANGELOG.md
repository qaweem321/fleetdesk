# Changelog

Notable changes for buyers of Fleetdesk. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

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
