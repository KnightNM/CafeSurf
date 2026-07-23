# CafeSurf setup and run instructions

CafeSurf is a web-only application consisting of:

- `cafe-booking-web` — React/Vite browser application
- `cafe-booking-server` — Express API connected to Supabase PostgreSQL and Auth

There is no iOS build or release process.

## 1. Prerequisites

- Node.js and npm
- An active Supabase project
- Supabase database connection and migration connection strings
- Supabase project URL, publishable key, and server-only service-role key
- A Resend account and verified sending domain for production authentication email
- A Google Cloud project with billing and Places API (New) enabled

## 2. Create local environment files

From the repository root:

```sh
cp cafe-booking-server/.env.example cafe-booking-server/.env
cp cafe-booking-web/.env.example cafe-booking-web/.env
```

The templates contain placeholders only. Never commit either `.env` file.

## 3. Configure Supabase Auth

In the Supabase dashboard:

1. Open **Authentication → Sign In / Providers → Email**.
2. Enable email/password authentication and require email confirmation.
3. Set the minimum password length to at least 8 characters.
4. Open **Authentication → URL Configuration**.
5. For local development, set the Site URL to `http://localhost:5173`.
6. Add these redirect URLs:

   ```text
   http://localhost:5173
   http://localhost:5173/auth/recovery
   ```

Replace them with the deployed HTTPS web origin in production.

## 4. Configure Resend SMTP

1. Verify an authentication sending domain in Resend.
2. Configure its SPF and DKIM records, and add DMARC before launch.
3. Create a restricted Resend API key.
4. Open **Supabase Authentication → SMTP Settings** and enable custom SMTP.
5. Enter:

   ```text
   Host: smtp.resend.com
   Port: 465
   Username: resend
   Password: <Resend API key>
   Sender email: no-reply@<verified-domain>
   Sender name: CafeSurf
   ```

6. Customize and test confirmation, invitation, and password-recovery templates.

Port `587` with STARTTLS can be used instead of `465`.

## 5. Configure the backend

Set these values in `cafe-booking-server/.env`:

```env
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@REGION.pooler.supabase.com:5432/postgres
DATABASE_MIGRATION_URL=postgresql://postgres.PROJECT_REF:PASSWORD@REGION.pooler.supabase.com:5432/postgres
DATABASE_SSL=true

SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
AUTH_INVITE_REDIRECT_URL=http://localhost:5173
GOOGLE_MAPS_API_KEY=your_server_side_places_api_key

PORT=3000
HOST=0.0.0.0
```

Important:

- Never expose `SUPABASE_SERVICE_ROLE_KEY` through a `VITE_` variable.
- The service-role key is used only by guarded maintenance commands.
- Use a direct/session connection suitable for migrations in `DATABASE_MIGRATION_URL`.

Install dependencies and apply migrations:

```sh
cd /Users/knightnm/CAFE_Booking_Main/cafe-booking-server
npm install
npm run db:migrate
```

The migration runner records applied migrations and is safe to rerun. If the
database is current, it reports `Database is up to date.`

Migration `002` refuses to run while legacy users, cafés, or bookings remain.
`auth:reset-demo-data` is destructive and requires the explicit
`--confirm-reset-demo-data` flag. Do not run it on data you need to preserve.

Migration `003` is additive. It:

- Backfills and enforces `bookings.team_size`, defaulting existing rows to one seat.
- Adds the optional `cafes.cover_image_path`.
- Creates the public-read `cafe-covers` Storage bucket with a 5 MB limit for
  JPEG, PNG, and WebP files.

The bucket intentionally has no anonymous write policy. Owners upload directly
with short-lived signed credentials issued by Express after an ownership check.

Migration `004` adds an optional, uniquely indexed `cafes.google_place_id`.
Existing cafés remain valid and can be linked later from the café edit screen.

## 6. Configure Google Places

In Google Cloud Console:

1. Create or select a billing-enabled project.
2. Enable **Places API (New)**.
3. Create a separate API key for the Express server.
4. Restrict the key to **Places API (New)**.
5. If the production API has a stable outbound IP, add an IP application
   restriction. Otherwise enforce strict API quotas and monitor usage.
6. Put the key only in `cafe-booking-server/.env` as
   `GOOGLE_MAPS_API_KEY`. Never expose it through a `VITE_` variable.

The browser never calls Google directly. Express:

- Requires an owner/admin session for Sri Lanka–restricted autocomplete.
- Uses a UUID session token across autocomplete and the selected Place Details call.
- Verifies the selected Place ID and obtains authoritative name, address, and
  coordinates when the café is saved.
- Lets authenticated users request live details only for a Place ID already
  attached to a CafeSurf café.

CafeSurf stores only the stable Google Place ID. Other Google details are fetched
when displayed rather than persisted. Keep the Google Maps attribution visible,
maintain public privacy/terms pages, and periodically refresh Place IDs older
than 12 months.

## 7. Register the first administrator

Configure SMTP first, then run this once with a real email address:

```sh
cd /Users/knightnm/CAFE_Booking_Main/cafe-booking-server
npm run auth:bootstrap-admin -- --email=admin@example.com --name="Admin Name"
```

Supabase sends an invitation email. Follow it to set the password, then use the
normal web login. The command refuses to run after an administrator exists.

Normal web registration always creates a customer, even if role metadata is
supplied to Supabase Auth.

## 8. Configure the frontend

Set these values in `cafe-booking-web/.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:3000
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

Only the Supabase publishable key belongs in the frontend.

## 9. Run locally

Start the backend:

```sh
cd /Users/knightnm/CAFE_Booking_Main/cafe-booking-server
npm run dev
```

Start the frontend in another terminal:

```sh
cd /Users/knightnm/CAFE_Booking_Main/cafe-booking-web
npm install
npm run dev
```

Open `http://localhost:5173` and check the API with:

```sh
curl http://127.0.0.1:3000/api/health
```

Main browser routes:

```text
/
/spaces/:id
/bookings
/owner/apply
/owner/cafes
/owner/cafes/new
/owner/cafes/:id/edit
/owner/cafes/:id/bookings
/admin/owner-applications
/auth/recovery
```

## 10. How authentication and roles work

- Supabase stores and automatically refreshes the browser session.
- The web app sends the access token in `Authorization: Bearer <token>`.
- Express validates the token with Supabase and loads `public.users` by Auth UUID.
- Express trusts the database role, never browser-supplied role metadata.
- Roles are `customer`, `cafe_owner`, and `admin`.
- Booking ownership is derived from the authenticated user, not body/query `user_id`.
- Booking availability is measured in seats. Active overlapping bookings sum
  `team_size`, and booking creation rejects any hour that would exceed capacity.
- Booking totals use `hourly_rate × hours × team_size`.
- Application tables have RLS enabled with no browser policies because data access goes through Express.

Customers can submit one pending owner application. An administrator may approve
or reject it. Approval transactionally changes the customer role to `cafe_owner`;
rejection leaves it unchanged. Café owners can manage only their cafés, while
administrators retain global access.

## 11. Verify the complete flow

1. Register a customer with a real email address and confirm it.
2. Verify login, logout, refresh persistence, forgot-password, and reset-password.
3. Create a multi-seat booking, verify the per-seat total, and cancel it.
4. Submit an owner application.
5. Sign in as the bootstrapped administrator and approve it.
6. Refresh the applicant view and confirm café-management navigation appears.
7. Create a café, upload/replace/remove its cover, and manage its bookings as
   the approved owner.
8. Confirm customers cannot access owner/admin routes.
9. Confirm an owner cannot manage another owner's café.
10. Confirm a public visitor can browse spaces and availability but is asked to
    sign in before the final booking confirmation.
11. As an owner/admin, type a café name, select the correct Google suggestion,
    and verify that its name, address, and coordinates are populated on save.
12. As a customer, open that workspace, verify current Google details, and use
    the Google Maps redirect.

## 12. Test and build

Backend:

```sh
cd /Users/knightnm/CAFE_Booking_Main/cafe-booking-server
npm test
npm run build
npm start
```

Frontend:

```sh
cd /Users/knightnm/CAFE_Booking_Main/cafe-booking-web
npm test
npm run build
npm run preview
```

The generated frontend is written to `cafe-booking-web/dist`.

## 13. Production deployment

Backend hosting requires:

```text
DATABASE_URL
DATABASE_MIGRATION_URL
DATABASE_SSL=true
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
AUTH_INVITE_REDIRECT_URL
GOOGLE_MAPS_API_KEY
PORT
HOST
```

Frontend hosting requires:

```text
VITE_API_BASE_URL
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Before launch:

1. Set `VITE_API_BASE_URL` to the deployed Express API origin before building.
2. Update the Supabase Site URL, invitation redirect, and allow
   `https://YOUR_WEB_ORIGIN/auth/recovery`.
3. Restrict the API CORS origin to the deployed web origin.
4. Run `npm run db:migrate` as a controlled release step.
5. Test production confirmation, invitation, and recovery emails.
6. Configure the frontend host to rewrite SPA routes to `index.html`
   (`cafe-booking-web/vercel.json` already handles this on Vercel).
7. Repeat the complete-flow verification above against production.
8. Set Google Places quotas/budget alerts and verify the server key restrictions.

## Troubleshooting

### Backend reports missing Supabase environment variables

Create `cafe-booking-server/.env` from its example, fill in `SUPABASE_URL` and
`SUPABASE_PUBLISHABLE_KEY`, and restart the API.

### Frontend reports missing Supabase environment variables

Create `cafe-booking-web/.env`, fill in both `VITE_SUPABASE_*` values, and restart Vite.

### Confirmation, invitation, or reset email does not arrive

Check the Resend domain records, Supabase SMTP settings and Auth logs, verified
sender address, email templates, and redirect allowlist.

### API returns `Authenticated user profile not found`

Confirm migration `002_supabase_auth_and_owner_applications.sql` was applied and
the `on_auth_user_created` trigger exists. Remove the incomplete test Auth user
and register again only after repairing the trigger.

### API returns `Invalid or expired token`

Sign out and in again. Confirm the frontend and backend point to the same Supabase
project, then restart both after changing environment values.

### Admin bootstrap reports that an administrator already exists

The bootstrap is intentionally one-time. Sign in with the existing administrator
or change roles through a deliberate database administration process.

### Git push says no remote is configured

Run Git commands from the repository root:

```sh
cd /Users/knightnm/CAFE_Booking_Main
git remote -v
git push -u origin master
```

The expected remote is `https://github.com/KnightNM/CafeSurf.git`.
