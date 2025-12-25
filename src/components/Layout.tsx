'use client'

import React from 'react';
import { useRouter } from 'next/navigation';
import { Mountain, Users, LogOut } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { signOut } from '@/lib/firebase/auth';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { user } = useApp();

  return (
    <div className="min-h-screen font-sans text-[#1F2937] bg-[#F8FAFC]">
      <header className="bg-white/70 backdrop-blur-lg shadow-md sticky top-0 z-10">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => router.push('/')}
          >
            <Mountain className="w-6 h-6 text-[#F97316]" />
            <span className="text-2xl font-extrabold text-[#1F2937]">SlopeSync</span>
          </div>
          <div className="space-x-4">
            <button
              onClick={() => router.push('/')}
              className="text-gray-500 hover:text-[#1F2937] transition"
            >
              Dashboard
            </button>
            {user?.planId && (
              <button
                onClick={() => router.push('/plan')}
                className="text-[#0EA5E9] hover:text-[#F97316] transition"
              >
                Plan: {user.planId}
              </button>
            )}
            <button
              onClick={() => router.push('/account')}
              className="text-gray-500 hover:text-[#1F2937] transition"
            >
              <Users className="w-5 h-5 inline mr-1" /> Account
            </button>
            <button
              onClick={async () => {
                try {
                  await signOut();
                  router.push('/');
                } catch (error) {
                  console.error('Error signing out:', error);
                }
              }}
              className="text-gray-500 hover:text-[#1F2937] transition"
            >
              <LogOut className="w-5 h-5 inline mr-1" /> Sign Out
            </button>
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
};
