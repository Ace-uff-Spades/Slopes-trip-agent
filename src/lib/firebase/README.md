# Firebase Integration

Firebase utilities for authentication and Firestore operations.

## Files

- **`config.ts`** - Firebase initialization (App, Auth, Firestore)
- **`auth.ts`** - Google sign-in, sign-out, auth state
- **`user.ts`** - Firestore operations (users, plans, schedules)

## Usage

```typescript
import { signInWithGoogle, signOut } from '@/lib/firebase/auth';
import { getUserFromFirestore, saveUserToFirestore } from '@/lib/firebase/user';

// Auth
await signInWithGoogle();
await signOut();

// Firestore
const user = await getUserFromFirestore(userId);
await saveUserToFirestore(userData);
```

## Environment Variables

All Firebase config uses `NEXT_PUBLIC_` prefix. See `.env.local` template.
