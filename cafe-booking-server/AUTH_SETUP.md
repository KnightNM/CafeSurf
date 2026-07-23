# Supabase Auth and authorization setup

CafeSurf uses Supabase Auth for email/password identity and Express for all
application authorization. The browser sends a short-lived Supabase access token
to Express. Express validates it with Supabase, then loads the user's current role
from `public.users` on every request.

## Required server environment

```env
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@REGION.pooler.supabase.com:5432/postgres
DATABASE_MIGRATION_URL=postgresql://postgres.PROJECT_REF:PASSWORD@REGION.pooler.supabase.com:5432/postgres
DATABASE_SSL=true

SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
AUTH_INVITE_REDIRECT_URL=http://localhost:5173
```

Copy `.env.example` to `.env` and replace every placeholder. The service-role key
is server-only and is used by guarded admin/bootstrap maintenance commands. Never
expose it through a `VITE_` variable or commit it to Git.

## Supabase dashboard

1. Under **Authentication → URL Configuration**, set the Site URL to the web-app
   origin and allow both the origin and `/auth/recovery` as redirect URLs.
2. Under **Authentication → Sign In / Providers → Email**, enable email/password,
   require email confirmation, and use a minimum password length of at least 8.
3. Under **Authentication → Email Templates**, customize confirmation,
   invitation, and password-recovery messages for CafeSurf.

## Resend SMTP

1. Verify the sending domain in Resend, including SPF and DKIM; add DMARC before production.
2. Create a restricted Resend API key.
3. Under **Supabase Authentication → SMTP Settings**, enable custom SMTP and set:
   - Host: `smtp.resend.com`
   - Port: `465` (implicit TLS) or `587` (STARTTLS)
   - Username: `resend`
   - Password: the Resend API key
   - Sender: a verified address such as `no-reply@auth.example.com`
   - Sender name: `CafeSurf`
4. Send confirmation, invitation, and recovery test messages before launch.

## Database migration

```sh
npm run db:migrate
```

Migration `002_supabase_auth_and_owner_applications.sql` removes legacy password
hashes, connects profiles to `auth.users`, installs the customer-only signup
trigger, changes booking ownership to Auth UUIDs, creates owner applications, and
enables RLS on application tables.

The migration refuses to run while legacy demo data remains. The reset command is
destructive and must only be run after reviewing its target database:

```sh
npm run auth:reset-demo-data -- --confirm-reset-demo-data
```

Migration `003_team_bookings_and_cafe_covers.sql` is additive. It adds
seat-based `team_size` bookings, optional café cover paths, and the public-read
`cafe-covers` Storage bucket. The bucket accepts JPEG, PNG, and WebP objects up
to 5 MB and has no anonymous write policy.

## First administrator

After the migration and SMTP configuration:

```sh
npm run auth:bootstrap-admin -- --email=admin@example.com --name="Admin Name"
```

The command refuses to run after the first administrator exists. Supabase emails
an invitation, and the administrator follows it to set a password. Public signup
always creates a `customer`; role metadata from signup is ignored.

## Request authorization

- Missing, invalid, expired, or revoked Supabase tokens are rejected.
- A valid Auth identity without a corresponding `public.users` profile is rejected.
- Customers cannot call owner or admin routes.
- Café owners can manage only cafés assigned to their profile.
- Booking ownership comes from the authenticated profile, not body/query `user_id`.
- Booking creation locks availability transactionally, sums seats across active
  overlapping bookings, and refuses requests that exceed café capacity.
- Role changes take effect without issuing a custom application JWT.

## Café cover uploads

Authenticated owners and administrators use:

- `POST /api/cafes/management/:id/cover-image/upload-url`
- `PUT /api/cafes/management/:id/cover-image`
- `DELETE /api/cafes/management/:id/cover-image`

Express checks café ownership, validates file type and size, issues the signed
upload credentials, and verifies the stored object before attaching it. Replaced
and deleted covers are removed from Storage.

## Owner applications

Customer endpoints:

- `POST /api/owner-applications`
- `GET /api/owner-applications/me`

Admin endpoints:

- `GET /api/admin/owner-applications?status=pending|approved|rejected`
- `PATCH /api/admin/owner-applications/:id`

Approval locks and updates the pending application in one transaction and promotes
the customer to `cafe_owner`. Rejection leaves the customer role unchanged, and a
completed application cannot be reviewed twice.
