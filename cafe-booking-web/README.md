# CafeSurf web app

React/Vite browser client for the CafeSurf Express API and Supabase Auth.

## Current features

- Editorial public homepage with responsive workspace discovery and filters
- Proper URL routes for public, customer, owner, admin, and recovery views
- Email/password signup with email confirmation
- Login, automatic session refresh, logout, forgot-password, and password reset
- Accessible auth modal with focus trapping and preserved booking intent
- Public café discovery and seat-based availability
- Team-size booking with per-seat/hour pricing and final confirmation
- Deterministic abstract café covers plus optional owner-uploaded photography
- Customer owner-application form and status
- Admin owner-application review
- Café-owner café, cover image, and booking management
- Self-hosted Bricolage Grotesque and DM Sans fonts
- CSS/SVG motion with `prefers-reduced-motion` support; no Three.js runtime

## Environment

Copy `.env.example` to `.env` and set the API URL, Supabase project URL, and
publishable key. The service-role key must never be placed in the web app.

```env
VITE_API_BASE_URL=http://127.0.0.1:3000
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

In Supabase Auth URL Configuration, set the development Site URL to
`http://localhost:5173` and add these redirect URLs:

- `http://localhost:5173`
- `http://localhost:5173/auth/recovery`

For production, replace them with the deployed HTTPS web origin. Enable email
confirmation and configure Resend under Auth SMTP settings before launch.

## Run the web app

```sh
cd cafe-booking-web
npm install
npm run dev
```

Open `http://localhost:5173`.

The app's public and authenticated pages use browser history routes. Vercel
deployments use the included `vercel.json` rewrite; configure an equivalent
SPA fallback to `index.html` on other static hosts.

The Express API must also be running:

```sh
cd cafe-booking-server
npm install
npm run db:migrate
npm run dev
```

## Data and authorization boundary

The browser uses Supabase only for authentication sessions. It does not read or
write `public.users`, cafés, bookings, or owner applications directly. All
application requests go through Express with the current Supabase access token.

To point the web app at a different backend, update `.env` or run:

```sh
VITE_API_BASE_URL=http://localhost:3000 npm run dev
```

## Test and build

```sh
npm test
npm run build
npm run preview
```

For the complete setup, administrator registration, and deployment checklist,
see [`../RUN_INSTRUCTIONS.md`](../RUN_INSTRUCTIONS.md).
