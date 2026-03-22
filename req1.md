# Requirement Document: Ride Matching & Driver Acceptance Flow (Zippy)

## 1. Project Overview

**Project Name:** Zippy (Ride-Sharing Application)  
**Core Functionality:** To facilitate a real-time connection between a passenger requesting a ride and a nearby online driver. This module is the engine of the application, ensuring ride requests are dispatched, accepted, and tracked through completion.

---

## 2. Business Requirements (BR)

### BR-1: Matching Logic

- The system shall identify "Online" and "Available" drivers within a specific radius (e.g., 5-10km) of the passenger’s pickup location.
- Prioritization should be based on proximity (closest driver first) to reduce wait times.

### BR-2: Driver Response Window

- Drivers must receive a notification and have a limited time (e.g., 30 seconds) to **Accept** or **Decline** the request before it is passed to the next available driver.

### BR-3: Real-Time Transparency

- Both passengers and drivers must see real-time status updates (Requesting -> Driver Found -> En Route -> Arrived).

### BR-4: Reliability & Consistency

- The system must prevent "Double Booking" (ensure a driver cannot accept two rides simultaneously).

---

## 3. Technical Requirements (TR)

### TR-1: Tech Stack & Services

- **Frontend:** React Native (Expo)
- **Database:** Firebase Firestore (Real-time listeners)
- **Cloud Messaging:** Firebase Cloud Messaging (FCM) for push notifications.
- **Maps:** Google Maps Platform (Distance Matrix API for ETA/Distance calculation).
- **Backend:** Node.js/Express (running on Cloud Functions or a dedicated server) to handle heavy matching logic.

### TR-2: Ride State Machine (Status Flow)

The ride document in Firestore must transition through these exact states:

1. `PENDING`: Created by passenger, looking for driver.
2. `SEARCHING`: Backend is actively pinging nearby drivers.
3. `ACCEPTED`: Driver clicked accept; ride is locked.
4. `ARRIVED`: Driver reached pickup point.
5. `IN_PROGRESS`: Trip has started.
6. `COMPLETED`: Trip finished and paid.
7. `CANCELLED`: Either party cancelled before start.

### TR-3: Backend Ride Matching Logic

- **Trigger:** Firestore `onCreate` trigger on the `rides` collection.
- **Geo-querying:** Use Geohashes or Firestore's `geo-query` capabilities to filter drivers by `currentLocation` (lat/lng).
- **Dispatch Queue:** A background worker to manage sending notifications sequentially or in batches to avoid overwhelming the system.

### TR-4: Push Notifications

- Implement high-priority FCM data messages to wake up the driver app even if it's in the background.
- The notification payload must include: `rideId`, `pickupLocation`, `destination`, and `estimatedEarning`.

---

## 4. Files to Build / Modify

| File / Module                            | Responsibility                                                                      |
| :--------------------------------------- | :---------------------------------------------------------------------------------- |
| `backend/functions/matchingEngine.js`    | Logic to query Firestore for nearby drivers and trigger FCM.                        |
| `backend/models/rideSchema.js`           | Definition of the ride object (PassengerID, DriverID, Status, Route).               |
| `driver-app/screens/RideRequestModal.js` | The UI that pops up when a driver receives a notification (Accept/Decline buttons). |
| `passenger-app/hooks/useRideStatus.js`   | Real-time listener to update the passenger's UI as the driver accepts.              |
| `shared/utils/statusConstants.js`        | A central file to manage the Ride Status State Machine constants.                   |

---

## 5. Success Metrics

- **Matching Latency:** The time from "Request" to "Driver Notified" should be < 3 seconds.
- **Success Rate:** Percentage of ride requests that result in an `ACCEPTED` status.
