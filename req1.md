# 📋 Project Zippy: Comprehensive System Requirements (v1.4)

## 1. System Overview

Zippy is a high-performance ride-sharing ecosystem consisting of:

- **Passenger App (Mobile):** For ride requests, tracking, and payments.
- **Rider App (Mobile):** For drivers to accept jobs and broadcast location.
- **Admin Dashboard (Web):** For fleet management, user verification, and financial oversight.

---

## 2. User Roles & Authentication Logic

### A. Passenger (User)

- **Access:** Instant access after email/phone verification.
- **Permissions:** Can search rides, view nearby riders, and manage personal wallet.

### B. Rider (Driver)

- **Status:** Defaults to `isVerified: false` upon registration.
- **Onboarding Requirement:** Must upload NIC, Driving License, and Vehicle Documents.
- **Access Restriction:** Cannot go "Online" or receive rides until **Admin Approval**.

### C. Admin

- **Access:** Restrictive login for specific UIDs with `role: admin`.
- **Authority:** Verifies riders, monitors live traffic, and manages system settings.

---

## 3. Business Requirements & Workflows

### A. Rider Onboarding & Approval

1. Rider registers and uploads documents via the mobile app.
2. Status is set to **Pending**.
3. Admin reviews documents in the Web Dashboard.
4. If Approved: `isVerified` becomes `true`. Rider is notified.
5. If Rejected: Admin adds a `rejectionReason`. Rider is notified to re-upload.

### B. Real-time Fleet Management (The Heartbeat)

1. **Rider Online/Offline:** Riders toggle availability. Only verified riders can go "Online".
2. **Location Broadcasting:** Online riders update their coordinates every 10 meters/seconds.
3. **Nearby Discovery:** Passengers see riders within a 5km radius on their map using Geo-hashing for performance.
4. **Live Monitoring:** Admin sees a global live map of all online riders and their current trip status.

### C. Trip Lifecycle & Payments

1. **Estimation:** System calculates fare based on distance and vehicle category (Tuk, Budget, Luxury).
2. **Acceptance:** Real-time push notification sent to Passenger when a Rider accepts.
3. **Completion:** When the trip ends, the fare is automatically deducted from the Passenger's `walletBalance`.
4. **Ratings:** Mutual 5-star rating system triggered at the end of every trip.

---

## 4. Technical Architecture & Schema

### A. Firestore Schema Highlights

- **`users/{uid}`:** Contains `role`, `isVerified`, `fullName`, `walletBalance`, and `riderDetails` (documents/vehicle info).
- **`active_riders/{uid}`:** Stores real-time `location` (GeoPoint), `geohash`, and `heading`.
- **`rides/{rideId}`:** Stores trip status (`PENDING`, `ACCEPTED`, `STARTED`, `COMPLETED`), fare, and timestamps.
- **`transactions/{id}`:** Records every wallet debit/credit for audit trails.

### B. Cloud Functions & Services

- **`onRideComplete`:** Triggered to handle atomic wallet deduction using Firestore Transactions.
- **`notificationService`:** Uses Firebase Cloud Messaging (FCM) or Expo Push SDK for:
  - Ride Status Updates.
  - Admin Approval Alerts.
  - Chat/Message Notifications.

### C. Web Dashboard Specs

- **Tech Stack:** React (Vite), Tailwind CSS (NativeWind logic), Firebase SDK.
- **Features:** Dark/Light mode, Driver Verification Table, Real-time Map (Leaflet/Google Maps).

---

## 5. Security & Performance Rules

1. **Firestore Security:** Ensure `users` data is only writable by the owner or Admin.
2. **Rate Limiting:** Throttle location updates to prevent excessive Firestore write costs.
3. **Data Integrity:** Use `runTransaction` for any balance-related updates to prevent race conditions.
