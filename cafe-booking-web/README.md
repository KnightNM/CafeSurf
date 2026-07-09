# CafeSurf Web

React/Vite web client for the existing cafe booking API.

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

The server expects Postgres to be available at `postgres://postgres:postgres@localhost:5432/cafe_booking`, unless `DATABASE_URL` is set. After Postgres is running:

```sh
npm run db:reset
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

Then initialize the Supabase database and start the API:

```sh
npm run db:reset
npm run dev
```

To switch back to local Postgres later, replace `DATABASE_URL` with the local connection string and set `DATABASE_SSL=false`.

To point the web app at a different backend:

```sh
VITE_API_BASE_URL=http://localhost:3000 npm run dev
```
