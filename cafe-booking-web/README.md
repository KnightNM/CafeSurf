# CafeSurf Web

React/Vite web client for the existing cafe booking API.

## Supabase Auth

Copy `.env.example` to `.env` and set the project URL and publishable key from
the Supabase Connect/API settings. The service-role key must never be placed in
the web app.

In Supabase Auth URL Configuration, set the development Site URL to
`http://localhost:5173` and add these redirect URLs:

- `http://localhost:5173`
- `http://localhost:5173/?auth=recovery`

For production, replace these with the deployed web origin. Enable email
confirmation and configure Resend under Auth SMTP settings before launch.

## Run the web app

```sh
cd cafe-booking-web
npm install
npm run dev
```

Open `http://localhost:5173`.

## Connect to the API

By default the web app calls `http://127.0.0.1:3000`, matching the existing Express server.

```sh
cd cafe-booking-server
npm install
npm run dev
```

The server uses `DATABASE_URL` for application data and Supabase Auth for identity.
After configuring the server environment, apply migrations with:

```sh
npm run db:migrate
```

### Use Supabase for now

Supabase is managed Postgres, so the API can use it through the same `DATABASE_URL` variable.

```sh
cd cafe-booking-server
cp .env.example .env
```

Set these values in `cafe-booking-server/.env`:

```sh
DATABASE_URL=postgresql://postgres:<password>@<host>:5432/postgres
DATABASE_SSL=true
```

Then apply the versioned, non-destructive migrations and start the API:

```sh
npm run db:migrate
npm run dev
```

To point the web app at a different backend:

```sh
VITE_API_BASE_URL=http://localhost:3000 npm run dev
```
