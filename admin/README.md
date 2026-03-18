# Zippy Admin Dashboard (Web)

React + Vite + Tailwind CSS admin dashboard for managing Zippy riders, drivers, and live rides.

## Getting Started

```bash
cd admin
npm install
npm run dev
```

Create a `.env` file in `admin` with your Firebase + Maps config:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_GOOGLE_MAPS_API_KEY=...
```

Only Firestore users with `role: 'admin'` can access `/admin` – access is enforced in `src/modules/auth/AdminPrivateRoute.tsx`.

Realtime data is powered by Firestore `onSnapshot` for:

- Online drivers
- Active rides
- Riders and drivers lists

The live map uses `@react-google-maps/api` to render all active rides.
