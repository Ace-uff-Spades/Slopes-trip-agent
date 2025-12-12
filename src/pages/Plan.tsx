import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mountain, Users, CheckCircle, Calendar, Wallet, LogIn, Trash2, Crown, UserMinus, Sparkles, Copy } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { AccentButton } from '../components/ui/AccentButton';
import { useApp } from '../context/AppContext';
import { generateRecommendations } from '../services/recommendations';

export const Plan = () => {
  const navigate = useNavigate();
  const { planData, setPlanData, user, isOwner, leavePlan, deletePlan, kickMember, promoteMember } = useApp();
  const [message, setMessage] = useState('');

  if (!planData) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-700">No Active Plan Found</h2>
        <button onClick={() => navigate('/')} className="text-blue-500 underline mt-4">Return Home</button>
      </div>
    );
  }

  const handleVote = (id: number) => {
    setPlanData((prev) => prev ? ({
      ...prev,
      recommendations: prev.recommendations.map((rec) =>
        rec.id === id ? { ...rec, votes: rec.votes + 1 } : rec
      ),
    }) : null);
    const resortName = planData.recommendations.find((r) => r.id === id)?.resort;
    setMessage(`Voted for ${resortName}!`);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleGenerateSuggestions = () => {
    const suggestions = generateRecommendations(planData, user.address);
    setPlanData(prev => prev ? ({
      ...prev,
      recommendations: suggestions,
      status: 'voting'
    }) : null);
    setMessage('Recommendations generated based on group preferences!');
    setTimeout(() => setMessage(''), 3000);
  };

  const copyPlanId = () => {
    navigator.clipboard.writeText(planData.id);
    setMessage('Plan ID copied to clipboard!');
    setTimeout(() => setMessage(''), 3000);
  };

  const getMatchColor = (match: string) => {
    if (match.includes('Excellent')) return 'bg-green-500';
    if (match.includes('Good')) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getMatchIcon = (match: string) => {
    if (match.includes('Excellent')) return '🏆';
    if (match.includes('Good')) return '👍';
    return '⚠️';
  };

  return (
    <div className="max-w-6xl mx-auto py-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-4xl font-extrabold text-[#1F2937] mb-2 flex items-center">
            <Mountain className="w-8 h-8 mr-3 text-[#0EA5E9]" />
            {planData.metadata.tripName || 'Untitled Trip'}
          </h1>
          <div className="flex items-center space-x-4 text-gray-500">
            <span className="flex items-center cursor-pointer hover:text-[#0EA5E9]" onClick={copyPlanId}>
              ID: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded ml-1">{planData.id}</span>
              <Copy className="w-4 h-4 ml-1" />
            </span>
            <span>•</span>
            <span>{planData.metadata.destinationType}</span>
            <span>•</span>
            <span>Target Size: {planData.metadata.targetSize}</span>
          </div>
          {planData.metadata.description && (
            <p className="text-gray-600 mt-2 italic">"{planData.metadata.description}"</p>
          )}
        </div>

        <div className="mt-4 md:mt-0 flex space-x-3">
          {isOwner ? (
             <button 
               onClick={() => { 
                 if(confirm('Are you sure you want to delete this plan? This action cannot be undone.')) {
                   deletePlan();
                   navigate('/');
                 }
               }}
               className="flex items-center px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
             >
               <Trash2 className="w-4 h-4 mr-2" /> Delete Plan
             </button>
          ) : (
            <button 
               onClick={() => { 
                 if(confirm('Leave this plan?')) {
                   leavePlan();
                   navigate('/');
                 }
               }}
               className="flex items-center px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
             >
               <LogOut className="w-4 h-4 mr-2" /> Leave Plan
             </button>
          )}
        </div>
      </div>

      {message && (
        <div className="mb-6 p-3 bg-green-100 text-green-700 rounded-lg flex items-center animate-pulse">
          <CheckCircle className="w-5 h-5 mr-2" /> {message}
        </div>
      )}

      {/* Group Members Section */}
      <GlassCard className="mb-10">
        <h2 className="text-2xl font-bold mb-4 flex items-center text-[#1F2937]">
          <Users className="w-6 h-6 mr-2 text-[#0EA5E9]" />
          Group Members ({planData.members.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {planData.members.map((member) => (
            <div
              key={member.id}
              className="flex justify-between items-center p-3 bg-white/50 rounded-xl border border-gray-100"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-2.5 h-2.5 rounded-full ${member.status === 'Ready' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <div>
                  <p className="font-semibold text-gray-800 flex items-center">
                    {member.name}
                    {member.role === 'owner' && <Crown className="w-3 h-3 text-yellow-500 ml-1" />}
                  </p>
                  <p className="text-xs text-gray-500">{member.skill} • {member.budget}</p>
                </div>
              </div>
              
              {isOwner && member.id !== user.id && (
                <div className="flex space-x-1">
                  <button 
                    onClick={() => promoteMember(member.id)}
                    className="p-1.5 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 rounded"
                    title="Promote to Owner"
                  >
                    <Crown className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => kickMember(member.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                    title="Kick Member"
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Recommendations & Voting Section */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-[#1F2937]">Top Recommendations</h2>
        {isOwner && planData.recommendations.length === 0 && (
          <AccentButton onClick={handleGenerateSuggestions}>
            <Sparkles className="w-5 h-5" />
            <span>Generate Suggestions</span>
          </AccentButton>
        )}
      </div>

      {planData.recommendations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <Mountain className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-lg">No resorts suggested yet.</p>
          {isOwner ? (
            <p className="text-sm text-gray-400">Click "Generate Suggestions" when everyone has joined.</p>
          ) : (
            <p className="text-sm text-gray-400">Waiting for the plan owner to generate options.</p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {[...planData.recommendations]
            .sort((a, b) => b.votes - a.votes)
            .map((rec) => (
              <GlassCard
                key={rec.id}
                className="flex flex-col md:flex-row justify-between items-start md:items-center"
              >
                <div className="flex-1 mb-4 md:mb-0">
                  <div className="flex items-center mb-1">
                    <h3 className="text-2xl font-extrabold text-[#0EA5E9] mr-3">{rec.resort}</h3>
                    <span className="text-sm bg-gray-100 px-2 py-0.5 rounded text-gray-600">{rec.location}</span>
                  </div>
                  
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center text-sm">
                      <span
                        className={`px-2 py-0.5 rounded-full font-semibold mr-2 ${getMatchColor(
                          rec.skillMatch
                        )} text-white`}
                      >
                        {getMatchIcon(rec.skillMatch)} Match
                      </span>
                      <span className="text-[#1F2937]">{rec.skillMatch}</span>
                    </div>
                    <p className="text-sm">
                      <Wallet className="w-4 h-4 inline mr-1 text-green-600" />
                      <span className="font-semibold text-green-600">{rec.passSavings}</span>
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold text-gray-700">{rec.price}</span> Avg. Trip Cost
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <span className="text-3xl font-extrabold text-[#F97316]">{rec.votes}</span>
                    <p className="text-sm text-gray-500">Votes</p>
                  </div>
                  <AccentButton onClick={() => handleVote(rec.id)} className="text-lg">
                    Vote Now
                  </AccentButton>
                </div>
              </GlassCard>
            ))}
        </div>
      )}

      <div className="mt-10 text-center">
        <button
          onClick={() => navigate('/account')}
          className="text-gray-500 hover:text-[#1F2937] transition duration-150"
        >
          <LogIn className="w-5 h-5 inline mr-2" />
          Back to Profile
        </button>
      </div>
    </div>
  );
};

// Helper icon for missing import
const LogOut = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" height="24" viewBox="0 0 24 24" 
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
    className={className}
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);
