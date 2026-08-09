# Restaurant Tracker

The tracker has JWT login with an owner Admin account and optional Staff accounts.

## Initial Setup

1. Use `backend/.env.example` as a reference for `backend/.env`.
2. Keep the existing `MONGODB_URI` in `backend/.env`, then add `JWT_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`.
3. Use a unique `JWT_SECRET` with at least 32 characters. You can generate one with:

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

4. Use a password of at least 8 characters for `ADMIN_PASSWORD`.
5. Start the backend:

```sh
cd backend
npm run dev
```

6. Start the frontend in a second terminal:

```sh
cd restaurant-tracker
npm run dev
```

The first backend startup creates the Admin account only when the database has no users. After that, the `ADMIN_*` values are not used to overwrite an existing account.

## Accounts

- **Admin:** manages all customer data and can add, disable, enable, or reset Staff accounts from the account menu.
- **Staff:** can view, add, edit, renew, and delete customer subscriptions. Staff cannot manage user accounts.

## Deployment

The app is designed to run as a **single server**: Express serves both the API and the built frontend.

### 1. Build the frontend

```sh
cd restaurant-tracker
npm run build
```

The `dist/` folder is served by the backend automatically in production (`FRONTEND_DIST` overrides the path).

### 2. Configure production environment

In `backend/.env` (or the host's env vars):

```sh
NODE_ENV=production
CLIENT_ORIGIN=https://your-domain.com
JWT_SECRET=<unique random value, at least 32 characters>
MONGODB_URI=<your Atlas URI>
ADMIN_EMAIL=<initial admin email>
ADMIN_PASSWORD=<strong password, at least 8 characters>
```

- `NODE_ENV=production` enables secure cookies (`secure` + `sameSite=none`), CORS checks, the `trust proxy` setting for rate limiting behind a reverse proxy, and static serving of the frontend.
- `CLIENT_ORIGIN` must be the exact deployed URL (comma-separate multiple origins if needed).

### 3. Start the server

```sh
cd backend
npm start
```

Use HTTPS in production (Render, Railway, and nginx all provide free TLS certificates). Keep `.env` files private; they are ignored by Git.

### 4. MongoDB Atlas

Enable automated backups for your cluster (Atlas UI → cluster → Backups → Turn on).
