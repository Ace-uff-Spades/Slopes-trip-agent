import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, PlusCircle, LogIn, ArrowRight } from 'lucide-react';
import { AccentButton } from '../components/ui/AccentButton';
import { useApp } from '../context/AppContext';

export const Home = () => {
  const navigate = useNavigate();
  const { joinPlan } = useApp();
  const [joinId, setJoinId] = useState('');

  const handleJoinPlan = () => {
    if (joinId.trim()) {
      joinPlan(joinId.trim());
      navigate('/plan');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] text-center">
      <Sun className="w-16 h-16 text-[#0EA5E9] mb-4 animate-pulse" />
      <h1 className="text-5xl font-extrabold text-[#1F2937] mb-2">SlopeSync</h1>
      <p className="text-xl text-gray-500 mb-10 max-w-md">Your effortless path to a flawless Bluebird Day trip.</p>

      <div className="flex flex-col space-y-4 w-full max-w-sm">
        <AccentButton onClick={() => navigate('/onboarding', { state: { createPlan: true } })}>
          <PlusCircle className="w-5 h-5" />
          <span>Create New Plan</span>
        </AccentButton>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-[#F8FAFC] text-gray-500">Or join existing</span>
          </div>
        </div>

        <div className="flex space-x-2">
          <input 
            type="text" 
            placeholder="Enter Plan ID" 
            className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0EA5E9] focus:outline-none"
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
          />
          <button 
            onClick={handleJoinPlan}
            disabled={!joinId}
            className="bg-[#0EA5E9] text-white p-3 rounded-xl hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
