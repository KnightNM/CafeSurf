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

Migration `005_cafe_profiles_and_revisions.sql` adds versioned full café profiles,
weekly CafeSurf booking hours, publication state, cancellation reasons, the
owner/admin approval workflow, and the private `cafe-revision-covers` bucket.
Existing cafés become published version `1` with 24-hour schedules.

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

Administrators use the immediate-publication cover endpoints:

- `POST /api/cafes/management/:id/cover-image/upload-url`
- `PUT /api/cafes/management/:id/cover-image`
- `DELETE /api/cafes/management/:id/cover-image`

Owners use revision-scoped equivalents:

- `POST /api/cafe-revisions/:id/cover-image/upload-url`
- `PUT /api/cafe-revisions/:id/cover-image`
- `DELETE /api/cafe-revisions/:id/cover-image`

Draft images remain private. Approval promotes the selected image; rejection and
withdrawal clean it up. Admin cover changes publish immediately and create audit rows.

## Café profile approval

Owner endpoints:

- `POST /api/cafe-revisions`
- `GET /api/cafe-revisions/mine`
- `GET /api/cafe-revisions/:id`
- `PUT /api/cafe-revisions/:id`
- `POST /api/cafe-revisions/:id/submit`
- `POST /api/cafe-revisions/:id/withdraw`

Admin endpoints:

- `GET /api/admin/cafe-revisions?status=pending|approved|rejected`
- `PATCH /api/admin/cafe-revisions/:id`

Approval locks the revision and café, checks the base version, publishes the full
snapshot, increments the live version, and records the reviewer. Stale drafts
return `409`. Archive approval unpublishes the café and cancels future active
bookings with a reason while preserving every booking row.

## Administrator permanent-delete veto

The separate admin-only endpoint is:

- `DELETE /api/cafes/management/:id/permanent`

Its body must contain `{ "confirmation": "<exact café name>" }`; the web UI also
shows a final irreversible-action warning. Migration `006` makes associated
bookings and revisions cascade from the café deletion. Express then removes
associated public and private cover objects. Normal removal should use Archive.

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
