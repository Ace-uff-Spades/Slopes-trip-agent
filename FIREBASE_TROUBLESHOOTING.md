# Firebase Troubleshooting

## auth/configuration-not-found

1. Check `.env.local` exists in project root (not `src/` or `app/`)
2. Verify all 6 Firebase vars start with `NEXT_PUBLIC_`
3. Restart dev server after changing `.env.local`
4. Verify config in Firebase Console → Project Settings → Your apps
5. Check browser console for specific missing variables

## Permission Denied

- Check Firestore rules are published
- Verify user is authenticated (`request.auth != null`)
- Wait 1 minute after publishing rules (propagation delay)

## Data Not Persisting

- Check Firestore Console to see if writes succeed
- Verify security rules allow the operation
- Check browser console for errors
