# Supabase Auth rollout

## Required server environment

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
AUTH_INVITE_REDIRECT_URL=http://localhost:5173
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only and is used only by the guarded admin
bootstrap/demo cleanup commands. Never expose it through a `VITE_` variable.

## Supabase dashboard

1. Under Authentication → URL Configuration, set the Site URL to the web app
   origin and allow both the origin and `/?auth=recovery` as redirect URLs.
2. Under Authentication → Sign In / Providers → Email, enable email/password and
   require email confirmation.
3. Under Authentication → Email Templates, customize confirmation, invitation,
   and password recovery messages for CafeSurf.
4. Set a minimum password length of at least 8 characters.

## Resend SMTP

1. Verify the authentication sending domain in Resend, including its SPF and DKIM
   records; add DMARC before production.
2. Create a restricted Resend API key.
3. Under Supabase Authentication → SMTP Settings, enable custom SMTP and set:
   - Host: `smtp.resend.com`
   - Port: `465` (implicit TLS) or `587` (STARTTLS)
   - Username: `resend`
   - Password: the Resend API key
   - Sender: a verified address such as `no-reply@auth.example.com`
   - Sender name: `CafeSurf`
4. Send confirmation, invitation, and recovery test messages before launch.

## First administrator

After the migration and SMTP configuration:

```sh
npm run auth:bootstrap-admin -- --email=admin@example.com --name="Admin Name"
```

The command refuses to run after the first administrator exists. The invited
administrator sets a password through the Supabase invitation email.
