'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User as FirebaseUser } from 'firebase/auth'
import { onAuthStateChange } from '@/lib/firebase/auth'
import { signInWithGoogle } from '@/lib/firebase/auth'
import { Loader2 } from 'lucide-react'
import { AccentButton } from '@/components/ui/AccentButton'
import { GlassCard } from '@/components/ui/GlassCard'

interface AuthGuardProps {
  children: React.ReactNode
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingIn, setSigningIn] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Initialize Firebase
    let unsubscribe: (() => void) | null = null;
    
    try {
      const { initializeFirebase } = require('@/lib/firebase/config');
      initializeFirebase();
      console.log('Firebase initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      setLoading(false);
      return;
    }

    // Listen to auth state changes
    try {
      unsubscribe = onAuthStateChange((firebaseUser) => {
        setUser(firebaseUser);
        setLoading(false);
      });
    } catch (error) {
      console.error('Failed to set up auth state listener:', error);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [])

  const handleSignIn = async () => {
    setSigningIn(true)
    try {
      // Ensure Firebase is initialized before signing in
      try {
        require('@/lib/firebase/config').initializeFirebase();
      } catch (initError) {
        console.error('Firebase initialization error:', initError);
        alert('Firebase is not properly configured. Please check your environment variables in .env.local');
        setSigningIn(false);
        return;
      }
      
      await signInWithGoogle()
      // Auth state change will be handled by the listener
    } catch (error: any) {
      console.error('Sign in error:', error)
      const errorMessage = error?.message || 'Failed to sign in. Please try again.';
      
      // Provide more helpful error messages
      if (errorMessage.includes('configuration-not-found') || errorMessage.includes('Firebase is not properly configured')) {
        alert('Firebase configuration error. Please ensure all NEXT_PUBLIC_FIREBASE_* variables are set in your .env.local file and restart the dev server.');
      } else if (errorMessage.includes('popup-closed-by-user')) {
        // User closed the popup, don't show an error
        console.log('Sign in cancelled by user');
      } else {
        alert(`Sign in failed: ${errorMessage}`);
      }
    } finally {
      setSigningIn(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-[#0EA5E9] animate-spin mb-4" />
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFC]">
        <GlassCard className="max-w-md w-full mx-4">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-[#1F2937] mb-2">SlopeSync</h1>
            <p className="text-xl text-gray-500 mb-8">Your effortless path to a flawless Bluebird Day trip.</p>
            
            <div className="space-y-4">
              <p className="text-gray-600 mb-6">
                Sign in with your Google account to get started
              </p>
              
              <AccentButton
                onClick={handleSignIn}
                disabled={signingIn}
                className="w-full"
              >
                {signingIn ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Sign in with Google
                  </>
                )}
              </AccentButton>
            </div>
          </div>
        </GlassCard>
      </div>
    )
  }

  // User is authenticated, render children
  return <>{children}</>
}

