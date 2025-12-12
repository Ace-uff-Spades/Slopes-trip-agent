import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mountain, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useApp();

  // Don't show header on home page if desired, but original code showed it always.
  // Actually original code showed it always.

  return (
    <div className="min-h-screen font-sans text-[#1F2937] bg-[#F8FAFC]">
      <header className="bg-white/70 backdrop-blur-lg shadow-md sticky top-0 z-10">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <Mountain className="w-6 h-6 text-[#F97316]" />
            <span className="text-2xl font-extrabold text-[#1F2937]">SlopeSync</span>
          </div>
          <div className="space-x-4">
            {user.planId && (
              <button
                onClick={() => navigate('/plan')}
                className="text-[#0EA5E9] hover:text-[#F97316] transition"
              >
                Plan: {user.planId}
              </button>
            )}
            <button
              onClick={() => navigate('/account')}
              className="text-gray-500 hover:text-[#1F2937] transition"
            >
              <Users className="w-5 h-5 inline mr-1" /> Account
            </button>
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
};
