# Firestore Security Rules

Copy to Firebase Console → Firestore Database → Rules

## Recommended Rules (Development)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users: own document + authenticated read + server access
    match /slopes-users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null; // For plan owners to read member addresses
      allow write: if request.auth == null; // Server-side API access
    }
    
    // Plans: authenticated users + server access
    match /slopes-plans/{planId} {
      allow read, write: if request.auth != null;
      allow read, write: if request.auth == null; // Server-side API access
    }
    
    // Schedules: authenticated users + server access
    match /slopes-generated-schedules/{planId} {
      allow read, write: if request.auth != null;
      allow read, write: if request.auth == null; // Server-side API access
    }
  }
}
```

**⚠️ Note**: Server-side access (`request.auth == null`) is for development. Use Firebase Admin SDK in production.

## Production

Use Firebase Admin SDK for server-side operations instead of allowing `request.auth == null`.
