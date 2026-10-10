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
