# Firebase Setup

## Quick Setup

1. Create Firebase project at [console.firebase.google.com](https://console.firebase.google.com/)
2. Enable Authentication → Google sign-in
3. Create Firestore database (test mode for dev)
4. Register web app → Copy config
5. Add to `.env.local`:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   ```
6. Set Firestore rules (see `FIRESTORE_RULES.md`)
7. Restart dev server: `npm run dev`

## Firestore Collections

- `slopes-users/{userId}` - User profiles
- `slopes-plans/{planId}` - Trip plans
- `slopes-generated-schedules/{planId}` - Generated schedules

## Troubleshooting

- **auth/configuration-not-found**: Check `.env.local` exists in root, all vars have `NEXT_PUBLIC_` prefix, restart server
- **Permission denied**: Check Firestore rules, verify user is authenticated
- See `FIREBASE_TROUBLESHOOTING.md` for more
