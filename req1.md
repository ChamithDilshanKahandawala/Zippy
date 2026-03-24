# 📋 Project Zippy: Ride Completion, Payments & Notifications (v1.3)

## 1. Feature Overview

This module completes the ride lifecycle by handling automated fare deduction from the wallet, dual-rating systems, trip documentation, and real-time alert synchronization across all platforms.

---

## 2. Business Requirements

### A. Automated Payment & Wallet Deduction

1. **Fare Calculation:** Upon ride completion, the system must calculate the final fare based on the vehicle category and total distance traveled.
2. **Auto-Deduction:** The final fare must be automatically deducted from the Passenger's `walletBalance`.
3. **Transaction Integrity:** If the wallet balance is insufficient, the system should flag the ride as "Payment Pending" and notify the Passenger to top-up or pay cash.

### B. Rating & Feedback System

1. **Mutual Rating:** Both Passenger and Rider must be able to rate each other (1-5 stars) after the ride ends.
2. **Impact:** Ratings must update the `averageRating` field in the respective user's Firestore profile.

### C. Ride Documentation (Receipts)

1. **Trip History:** A detailed receipt must be generated for both parties showing:
   - Pickup/Drop-off points.
   - Fare breakdown.
   - Date and Duration.

### D. Real-time Notifications (The Glue)

1. **Ride Status Alerts:**
   - **Accepted:** Notify Passenger when a Rider accepts the request.
   - **Arrival:** Notify Passenger when the Rider is at the pickup location.
   - **Start/End:** Notify both parties when the trip officially starts/ends.
2. **Administrative Alerts:** Notify Rider immediately when their account is Approved or Rejected by the Admin.

---

## 3. Technical Requirements

### A. Backend Logic (Firebase Cloud Functions)

1. **`processPayment` Function:** - Triggered when `rides/{rideId}/status` changes to `COMPLETED`.
   - Securely deducts amount from `users/{passengerId}/walletBalance`.
   - Updates `users/{riderId}/earnings`.
2. **`sendPushNotification` Service:** - A reusable service in `notificationService.ts` that uses `expo-server-sdk`.
   - Must be called from the ride state machine logic.

### B. Firestore Schema Updates

**Collection: `rides/{rideId}` (Updated)**

```json
{
  "status": "COMPLETED | CANCELLED",
  "fare": "number",
  "paymentStatus": "PAID | PENDING",
  "ratingByPassenger": "number",
  "ratingByRider": "number",
  "completedAt": "serverTimestamp"
}
```
