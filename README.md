# 🚖 Zippy — Uber Clone Monorepo

A high-performance ride-hailing app built with:

- **Frontend**: React Native + Expo + TypeScript
- **Backend**: Node.js + Express + TypeScript
- **Database & Auth**: Firebase (Firestore + Firebase Auth)

---

## 📁 Project Structure

```
Zippy/
├── frontend/          # React Native Expo app
│   ├── app/           # Expo Router screens
│   ├── components/    # Reusable UI components
│   ├── hooks/         # Custom React hooks
│   ├── services/      # API & Firebase service calls
│   ├── config/        # Firebase client config
│   └── types/         # Shared TypeScript types
│
├── backend/           # Node.js + Express API
│   ├── src/
│   │   ├── config/    # Firebase Admin SDK init
│   │   ├── routes/    # Express route handlers
│   │   ├── controllers/
│   │   ├── middleware/
│   │   └── types/
│   ├── .env.example
│   └── tsconfig.json
│
└── README.md
```

---

## 🚀 Getting Started

### Backend

```bash
cd backend
npm install
cp .env.example .env   # Fill in your Firebase credentials
npm run dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # Fill in your Firebase client config
npx expo start
```

---

## 🔗 Health Check

Once both servers are running:

- Backend health check: `GET http://localhost:3000/api/health`
- Tap the **"Check Server"** button in the app to verify the connection.
