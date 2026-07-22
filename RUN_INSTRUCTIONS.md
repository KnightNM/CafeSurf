# CafeSurf Run Instructions

This repository contains:

- `cafe-booking-server` — Express API connected to Supabase PostgreSQL and Supabase Auth.
- `cafe-booking-web` — React/Vite browser application.

## 1. Prerequisites

- Node.js and npm
- An active Supabase project
- The Supabase PostgreSQL connection string
- The Supabase project URL, publishable key, and service-role key
- A Resend account and verified sending domain for production authentication email

## 2. Configure Supabase Auth

In the Supabase dashboard:

1. Open **Authentication → Sign In / Providers → Email**.
2. Enable email/password authentication.
3. Require email confirmation.
4. Set the minimum password length to at least 8 characters.
5. Open **Authentication → URL Configuration**.
6. For local development, set the Site URL to:

   ```text
   http://localhost:5173
   ```

7. Add these redirect URLs:

   ```text
   http://localhost:5173
   http://localhost:5173/?auth=recovery
   ```

Replace these URLs with the deployed web origin in production.

## 3. Configure Resend SMTP

1. Verify an authentication sending domain in Resend.
2. Configure the provided SPF and DKIM records, and add DMARC before launch.
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

6. Customize and test the confirmation, invitation, and password-recovery templates.

Port `587` with STARTTLS can be used instead of port `465`.

## 4. Configure the backend

From the project root:

```sh
cd cafe-booking-server
npm install
cp .env.example .env
```

Set the following in `cafe-booking-server/.env`:

```env
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@REGION.pooler.supabase.com:5432/postgres
DATABASE_MIGRATION_URL=postgresql://postgres.PROJECT_REF:PASSWORD@REGION.pooler.supabase.com:5432/postgres
DATABASE_SSL=true

SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
AUTH_INVITE_REDIRECT_URL=http://localhost:5173

PORT=3000
HOST=0.0.0.0
```

Important:

- Never commit `.env`.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.
- The service-role key is used by the guarded administrator bootstrap command, not normal browser requests.

## 5. Apply database migrations

```sh
cd /Users/knightnm/CAFE_Booking_Main/cafe-booking-server
npm run db:migrate
```

The migrations are versioned and safe to rerun. The current Supabase database has already received migrations `001` and `002`, so it should report:

```text
Database is up to date.
```

Do not run `auth:reset-demo-data`; the authorized demo-data reset has already been completed.

## 6. Bootstrap the first administrator

Run this once, using a real email address:

```sh
cd /Users/knightnm/CAFE_Booking_Main/cafe-booking-server
npm run auth:bootstrap-admin -- --email=admin@example.com --name="Admin Name"
```

Expected behavior:

1. Supabase sends an invitation email.
2. The invited user follows the link and sets a password.
3. The associated application profile receives the `admin` role.
4. The command refuses to create another bootstrap administrator after one exists.

## 7. Configure the frontend

In a second terminal:

```sh
cd /Users/knightnm/CAFE_Booking_Main/cafe-booking-web
npm install
cp .env.example .env
```

Set the following in `cafe-booking-web/.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:3000
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

Only the Supabase publishable key belongs in the frontend.

## 8. Run locally

Start the backend:

```sh
cd /Users/knightnm/CAFE_Booking_Main/cafe-booking-server
npm run dev
```

Start the frontend in another terminal:

```sh
cd /Users/knightnm/CAFE_Booking_Main/cafe-booking-web
npm run dev
```

Open:

```text
http://localhost:5173
```

Check the API health endpoint:

```sh
curl http://127.0.0.1:3000/api/health
```

## 9. Verify authentication and roles

1. Register a new customer with a real email address.
2. Open the confirmation email and verify the account.
3. Sign in and confirm the **Explore**, **My bookings**, and **Become an owner** views appear.
4. Submit an owner application.
5. Sign in as the bootstrapped administrator.
6. Open **Owner applications** and approve the request.
7. Refresh the approved customer's application view.
8. Confirm the customer becomes a café owner and receives the **My cafes** dashboard.
9. Test forgot-password, reset-password, logout, and session restoration after refreshing the browser.

## 10. Run tests and production builds

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

## 11. Production environment

Backend hosting must receive:

```text
DATABASE_URL
DATABASE_MIGRATION_URL
DATABASE_SSL=true
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
AUTH_INVITE_REDIRECT_URL
PORT
HOST
```

Frontend hosting must receive:

```text
VITE_API_BASE_URL
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Update Supabase's Site URL, redirect allowlist, and invitation redirect to the production HTTPS web address before deployment.

## Troubleshooting

### `SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required`

The backend `.env` is missing one or both Supabase Auth values. Add them and restart the backend.

### Frontend opens with a missing Supabase environment error

Create `cafe-booking-web/.env`, add both `VITE_SUPABASE_*` values, and restart Vite.

### Confirmation or reset email is not delivered

Verify Resend's domain records, Supabase custom SMTP settings, Auth logs, sender address, and redirect allowlist.

### API returns `Authenticated user profile not found`

Confirm migration `002_supabase_auth_and_owner_applications.sql` was applied and the `on_auth_user_created` trigger exists. Delete the incomplete Auth test user and register again after fixing the trigger.

### API returns `Invalid or expired token`

Sign out, sign in again, confirm the frontend and backend use the same Supabase project, and restart both processes after changing environment variables.
