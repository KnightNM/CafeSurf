# CafeSurf

CafeSurf is a web application for discovering reservable team workspaces,
booking seats by the hour, managing workspace inventory, and approving
café-owner registrations.

## Current architecture

- **Web:** React 19 and Vite in `cafe-booking-web`
- **API:** Express and TypeScript in `cafe-booking-server`
- **Database:** Supabase PostgreSQL, accessed only through Express
- **Authentication:** Supabase Auth email/password sessions
- **Authorization:** `customer`, `cafe_owner`, and `admin` roles stored in
  `public.users` and loaded by Express for every authenticated request
- **Auth email:** Supabase Auth using Resend SMTP in production
- **Cover images:** Public-read Supabase Storage bucket, with authenticated
  owner uploads signed and verified by Express
- **Design:** Self-hosted Bricolage Grotesque and DM Sans, responsive routed
  React pages, and lightweight CSS/SVG motion with reduced-motion support

The browser never receives the service-role key and does not query application
tables directly. It sends the current Supabase access token to Express as a
Bearer token.

## User flows

- New public registrations always create a `customer` profile.
- Public visitors can browse spaces and live seat availability without signing in.
- Customers can book 1–capacity seats and submit one pending owner application.
- Admins approve or reject owner applications.
- Approval transactionally changes the applicant's role to `cafe_owner`.
- Café owners manage only their cafés, cover photos, and their cafés' bookings.
- Admins have global café, booking, and owner-application access.

Rates are shown per seat/hour. A booking total is:

```text
hourly_rate × hours × team_size
```

When a café has no uploaded cover, the web app creates a deterministic abstract
cover from the café's name, area, capacity, Wi-Fi, and power details.

## Start here

Follow [RUN_INSTRUCTIONS.md](RUN_INSTRUCTIONS.md) for Supabase configuration,
environment variables, migrations, administrator registration, local startup,
testing, and production deployment.

Authentication-specific notes are in
[cafe-booking-server/AUTH_SETUP.md](cafe-booking-server/AUTH_SETUP.md).

## Repository

```text
https://github.com/KnightNM/CafeSurf.git
```

The web and server directories are normal folders in this single repository;
the server is not a separate submodule.
