# 📋 Project Zippy: User & Rider Onboarding Requirements (v1.2)

## 1. Role Definitions & Access Control

- **User (Passenger):** The entity requesting transportation. Access is immediate upon email/phone verification.
- **Rider (Driver):** The entity providing transportation. Access is RESTRICTED until manual Admin approval.
- **Admin:** The internal entity responsible for verifying Rider credentials via the Web Dashboard.

---

## 2. Business Requirements (The Logic)

### A. Rider Registration Flow (Pending State)

1.  **Submission:** Prospective Rider signs up via the Mobile App.
2.  **Documentation:** Rider must upload:
    - National Identity Card (NIC) / Passport.
    - Driving License.
    - Vehicle Registration Document (V5).
    - Vehicle Insurance.
3.  **Status Locking:** Upon submission, the Rider's `isVerified` status is set to `false`.
4.  **Restriction:** The Rider **cannot** "Go Online" or receive ride requests until the status is changed to `true`.

### B. Admin Review Process (Web Dashboard)

1.  **Notification:** Admin receives a notification/alert of a "New Rider Pending Review."
2.  **Verification:** Admin reviews the uploaded documents for authenticity.
3.  **Approval/Rejection:**
    - **Approve:** Admin toggles `isVerified` to `true`. Rider receives a Push Notification: "Your account is approved! You can now start earning."
    - **Reject:** Admin provides a reason (e.g., "Blurry License Image"). Rider receives a notification to re-upload documents.

---

## 3. Technical Requirements (The Code Architecture)

### A. Firestore Data Schema

**Collection: `users`**

```json
{
  "uid": "string",
  "fullName": "string",
  "email": "string",
  "phoneNumber": "string",
  "role": "user | rider",
  "isVerified": "boolean", // Default 'true' for users, 'false' for riders
  "createdAt": "timestamp",
  "profilePicUrl": "string",
  "riderDetails": {
    // Only exists if role == 'rider'
    "vehicleModel": "string",
    "vehiclePlate": "string",
    "vehicleType": "tuk | budget | luxury",
    "documents": {
      "nicUrl": "string",
      "licenseUrl": "string",
      "insuranceUrl": "string"
    },
    "rejectionReason": "string"
  }
}
```
