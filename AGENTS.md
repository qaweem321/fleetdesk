# AGENTS.md

Instructions for AI coding agents (Claude Code, Cursor, Codex, ...) working on this project.
Humans: start with README.md.

## The project

Fleetdesk: a car rental booking website plus the counter operations behind it (pickups,
returns, inspections, agreements, deposits). One install runs **one rental business** with
any number of locations. Next.js 16 App Router, React 19, TypeScript (strict), Tailwind 4,
Drizzle ORM on Postgres, Better Auth, Stripe (optional), Resend emails, Biome.

Keep the code small, readable and easy to change: when adding a feature, follow the existing
patterns below rather than adding new layers of abstraction.

## Next.js 16 is newer than your training data

Read the docs that ship with the package before using a Next.js API:
`node_modules/next/dist/docs/`. For example: `middleware` is now `proxy` (`src/proxy.ts`),
`next lint` is gone (we use Biome), `params` and `headers()` are async.

## Commands

- `npm run check`: typecheck + lint + tests + production build. **Must pass before every commit.**
- `npm run format`: fix formatting and import order (Biome).
- `npm test`: unit tests (`node:test` via tsx, files named `*.test.ts` next to the code).
- After changing `src/db/schema/`: `npm run db:generate`, then `npm run db:migrate`.
- `npm run db:seed`: sample business, logins and data (see `src/lib/demo.ts`).

## Where things live

- `src/app/admin/`: the staff area. `src/app/account/`: a customer's own area. `src/app/setup/`:
  the one-time setup wizard. Everything else in `src/app/` is the public website.
- `src/db/schema/`: tables, one file per area. `src/db/seed/`: sample data, one file per area.
- `src/lib/session.ts`: `requireUser()`, `requireStaff(permission?)`, `getOptionalUser()`.
- `src/lib/permissions.ts`: the only place roles and permissions are defined (`can(role, perm)`).
  Roles: `customer` (everyone who signs up), `agent`, `manager`, `owner`.
- `src/lib/settings.ts`: `getSettings()` / `requireSettings()` (cached; call `settingsChanged()`
  after writing `business_settings`).
- `src/lib/storage/`: uploads. `saveImage()`, `deleteFiles()`, `fileUrl()`; files are served by
  `src/app/files/[id]/route.ts`, which checks who may see private files.
- `src/lib/money.ts`: amounts are integers in the currency's smallest unit (`formatMoney`,
  `parseMoney`). `src/lib/format.ts` and `src/lib/time-zone.ts`: dates in the business's zone.
- `src/lib/env.ts`: environment checks at startup (`src/instrumentation.ts`).
- `src/lib/demo.ts`: `isDemoMode()` (`DEMO_MODE="true"`): no emails, no verification, banner.
  Anything new that sends email needs a demo-mode path (see staff invitations).
- `src/components/ui/`: `Button`/`ButtonLink`, `Input`/`Select`/`Textarea`, `Field`,
  `FormMessage`, `SubmitButton`, `Skeleton`. Shared pieces: `PhotoUpload`, `PublicPage`,
  `SidebarNav`, `Tabs`, `Logo`, `UserMenu`.

## Rules

**Security and data**
- Every admin page and staff action starts with `requireStaff()` (with a permission when only
  some roles may do it). Customer pages and actions start with `requireUser()` and only touch
  the user's own rows. Never trust IDs or roles sent by the browser.
- IDs from the browser: check the shape with `isUuid()` first (a clean 404 instead of a
  database error).
- Validate and trim all input on the server. Compare emails in lowercase and check them with
  `isValidEmail()` (`src/lib/email-address.ts`). Avoid regexes that can backtrack heavily.
- Redirects to user-supplied paths go through `safeNextPath()`.
- Anything that sends email or can be repeated cheaply gets a limit: `rateLimit(key, max,
  windowSeconds)` from `src/lib/rate-limit.ts`.
- Several writes that must all happen or none: `atomic()` from `src/db/atomic.ts`.
- Uploads go through `saveImage()` (checks the real file type and size). Licenses, inspection
  photos and signatures are `private`, with `ownerId` set to the customer.
- New environment variables: add them to `.env.example` and to `checkEnv()` in `src/lib/env.ts`.

**Speed**
- The database is a network call away. Run independent queries with `Promise.all`, never query
  inside a loop (group or join instead), and avoid extra round trips. Use a cookie check
  (`getSessionCookie`) instead of a database session lookup where that's enough.

**Money and time**
- Never use floats for money: integers in the smallest unit, `parseMoney()` for form input,
  `formatMoney()` for display.
- Store times as UTC `timestamptz`. Show them with `formatDate`/`formatDateTime` and the
  business's `timeZone`; read `datetime-local` inputs with `fromLocalInput()`.

**UI**
- Use the semantic color tokens (`bg-background`, `text-muted-foreground`, `border-border`,
  `bg-primary`, `text-danger`, ...) so dark mode and the brand color work. Don't use raw
  `gray-*` or `blue-*` colors.
- Reuse `src/components/ui` instead of styling new buttons and inputs; label fields with `Field`.
- Submit buttons: `SubmitButton` (disabled while sending), with `confirm` for destructive actions.
- Form actions return user mistakes as state for `useActionState` (`{ error }`), shown with
  `FormMessage`. Only `throw` for things the UI never allows (tampered requests).
- Dates: `formatDate()` ("Oct 11, 2026"). A sentence ending in a name someone typed:
  `endSentence(name)`.
- Give icon-only buttons an `aria-label`, mark decorative SVGs `aria-hidden="true"`.
- After logging in or out, use a full page load (`window.location.replace`), not the router.

**Code style**
- Small, single-purpose files. Shared logic goes in `src/lib`, shared UI in `src/components`.
- Short comments that explain *why*, in plain English.
- Add or update unit tests for logic in `src/lib`.

## Keep the docs in sync (every change)

In the **same commit** as a code change, update whatever it affects:
- `CHANGELOG.md`: add a line under `## [Unreleased]` for anything a buyer would notice.
- `README.md`: features list, setup steps, environment variables, scripts.
- `AGENTS.md`: new conventions, folders or rules.
- `.env.example`: new or changed variables.
- `src/app/privacy/page.tsx`: if the app starts storing new personal data.
