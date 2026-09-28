# Attendance

## Face sign-in

Install the pinned browser recognition dependency with `npm ci`, then serve the project over localhost or HTTPS so the browser can access the camera. On the Scanner page, the front camera starts automatically and matches live face descriptors against consented employee profiles.

To enroll an employee, open the employee form, confirm consent, start the camera, and capture three samples. The app stores the averaged descriptor and enrollment photo in browser localStorage. This demo has no liveness detection and localStorage is not a secure biometric store; do not use it for production identity verification or sensitive workforce data without a secured backend and reviewed biometric/privacy controls.

## Device fingerprint sign-in

In the employee form, set up a device fingerprint to register a discoverable WebAuthn platform credential, then save the employee. On Scanner, press Fingerprint without entering an employee ID; the device prompt identifies the employee and toggles check-in/check-out. Credentials are device-specific. Re-enroll credentials created by older non-discoverable versions. This static demo stores public credential data in localStorage and verifies assertions in the client; production use requires server-issued challenges, server-side verification, account authorization, and recovery/revocation handling.