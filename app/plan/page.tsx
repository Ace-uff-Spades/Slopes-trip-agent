'use client'

import { useState, useEffect } from 'react'
import React from 'react'
import { useRouter } from 'next/navigation'
import { Mountain, Users, CheckCircle, Wallet, LogIn, Trash2, Crown, UserMinus, Sparkles, Copy, Edit2, Save, Calendar, AlertTriangle, Loader2 } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { AccentButton } from '@/components/ui/AccentButton'
import { useApp } from '@/context/AppContext'
import { ScheduleDisplay } from '@/components/ScheduleDisplay'
import { ScheduleLoadingModal } from '@/components/ScheduleLoadingModal'
import { GeneratedSchedule } from '@/lib/types'

export default function Plan() {
  const router = useRouter()
  const { planData, setPlanData, user, isOwner, leavePlan, deletePlan, kickMember, promoteMember, loading } = useApp()
  const [message, setMessage] = useState('')
  const [isEditingPlan, setIsEditingPlan] = useState(false)
  const [editPlanMeta, setEditPlanMeta] = useState(planData?.metadata || null)
  const [generatedSchedule, setGeneratedSchedule] = useState<GeneratedSchedule | null>(null)
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false)
  const [scheduleStage, setScheduleStage] = useState<'transportation' | 'accommodation' | 'itinerary' | 'complete' | null>(null)
  const [tiedOptions, setTiedOptions] = useState<number[]>([]) // IDs of tied recommendations

  // Update editPlanMeta when planData changes - MUST be before any early returns
  React.useEffect(() => {
    if (planData && planData.metadata) {
      setEditPlanMeta(planData.metadata)
    }
  }, [planData])

  // Ensure planData is loaded if we have a user with planId but no planData
  React.useEffect(() => {
    if (user?.planId && !planData && !loading) {
      // Try to load plan from Firestore
      const loadPlan = async () => {
        try {
          const { getPlanFromFirestore } = await import('@/lib/firebase/user');
          const plan = await getPlanFromFirestore(user.planId!);
          if (plan) {
            setPlanData(plan);
          }
        } catch (error) {
          console.error('Failed to load plan:', error);
        }
      };
      loadPlan();
    }
  }, [user?.planId, planData, loading, setPlanData])

  // Load generated schedule from Firestore (only if not already loaded)
  useEffect(() => {
    if (planData?.id && planData.status === 'decided' && !generatedSchedule) {
      const loadSchedule = async () => {
        try {
          const { getScheduleFromFirestore } = await import('@/lib/firebase/user');
          const schedule = await getScheduleFromFirestore(planData.id);
          if (schedule) {
            console.log('Loaded schedule from Firestore:', schedule);
            setGeneratedSchedule(schedule);
          }
        } catch (error) {
          console.error('Failed to load schedule:', error);
        }
      };
      loadSchedule();
    }
  }, [planData?.id, planData?.status, generatedSchedule])

  // Check for ties when recommendations change
  useEffect(() => {
    if (planData?.recommendations && planData.recommendations.length > 0) {
      const sorted = [...planData.recommendations].sort((a, b) => b.votes - a.votes);
      const maxVotes = sorted[0]?.votes || 0;
      const tied = planData.recommendations.filter(rec => rec.votes === maxVotes && maxVotes > 0);
      
      if (tied.length > 1) {
        setTiedOptions(tied.map(rec => rec.id));
      } else {
        setTiedOptions([]);
      }
    } else {
      setTiedOptions([]);
    }
  }, [planData?.recommendations])

  if (loading) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-700">Loading...</h2>
      </div>
    )
  }

  if (!planData) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-700">No Active Plan Found</h2>
        <button onClick={() => router.push('/')} className="text-blue-500 underline mt-4">Return Home</button>
      </div>
    )
  }

  const handleVote = async (id: number) => {
    if (!planData || !user || planData.status !== 'voting') return;
    
    const recommendation = planData.recommendations.find((r) => r.id === id);
    if (!recommendation) return;
    
    const votedBy = recommendation.votedBy || [];
    const hasVoted = votedBy.includes(user.id);
    
    let updated;
    let messageText;
    
    if (hasVoted) {
      // Remove vote
      updated = {
        ...planData,
        recommendations: planData.recommendations.map((rec) =>
          rec.id === id
            ? {
                ...rec,
                votes: Math.max(0, rec.votes - 1),
                votedBy: (rec.votedBy || []).filter((userId) => userId !== user.id),
              }
            : rec
        ),
      };
      messageText = `Removed vote from ${recommendation.resort}`;
    } else {
      // Add vote
      updated = {
        ...planData,
        recommendations: planData.recommendations.map((rec) =>
          rec.id === id
            ? {
                ...rec,
                votes: rec.votes + 1,
                votedBy: [...(rec.votedBy || []), user.id],
              }
            : rec
        ),
      };
      messageText = `Voted for ${recommendation.resort}!`;
    }
    
    setPlanData(updated);
    
    // Save to backend
    try {
      await fetch('/api/plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updated, planId: updated.id }),
      });
    } catch (error) {
      console.error('Failed to save vote:', error);
    }
    
    setMessage(messageText);
    setTimeout(() => setMessage(''), 3000);
  }

  const handleGenerateSuggestions = async () => {
    if (!planData || !user) return;
    
    try {
      // Ensure plan has at least one member
      if (!planData.members || planData.members.length === 0) {
        throw new Error('Plan must have at least one member');
      }
      
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          planId: planData.id, 
          userRegion: user.address || '',
          planData: planData // Send full plan data in case server storage was reset
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || 'Unknown error' };
        }
        throw new Error(errorData.error || 'Failed to generate recommendations');
      }
      
      const suggestions = await response.json();
      
      if (!Array.isArray(suggestions)) {
        throw new Error('Invalid response format');
      }
      
      if (suggestions.length === 0) {
        throw new Error('No recommendations found. Please check your plan settings.');
      }
      
      const updated = {
        ...planData,
        recommendations: suggestions,
        status: 'voting' as const
      };
      
      setPlanData(updated);
      
      // Save to backend
      const saveResponse = await fetch('/api/plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: updated.id, metadata: updated.metadata, recommendations: updated.recommendations, status: updated.status }),
      });
      
      if (!saveResponse.ok) {
        const errorText = await saveResponse.text();
        throw new Error(`Failed to save recommendations: ${errorText}`);
      }
      
      setMessage('Recommendations generated based on group preferences!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate recommendations. Please try again.';
      setMessage(errorMessage)
      setTimeout(() => setMessage(''), 5000)
    }
  }

  const copyPlanId = () => {
    navigator.clipboard.writeText(planData.id)
    setMessage('Plan ID copied to clipboard!')
    setTimeout(() => setMessage(''), 3000)
  }

  const getMatchColor = (match: string) => {
    if (match.includes('Excellent')) return 'bg-green-500'
    if (match.includes('Good')) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getMatchIcon = (match: string) => {
    if (match.includes('Excellent')) return '🏆'
    if (match.includes('Good')) return '👍'
    return '⚠️'
  }

  const handleSavePlanEdits = async () => {
    if (!planData || !editPlanMeta) return
    
    const updated = {
      ...planData,
      metadata: editPlanMeta
    }
    
    try {
      const response = await fetch('/api/plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: planData.id, metadata: editPlanMeta }),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to update plan');
      }
      
      const updatedPlan = await response.json();
      
      // Update local state with the response from server
      setPlanData(updatedPlan);
      setIsEditingPlan(false);
      setMessage('Plan details updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to update plan:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update plan. Please try again.';
      setMessage(errorMessage);
      setTimeout(() => setMessage(''), 5000);
    }
  }

  const handleEndVoting = async () => {
    if (!planData || !isOwner) return;

    // Check for ties
    const sorted = [...planData.recommendations].sort((a, b) => b.votes - a.votes);
    const maxVotes = sorted[0]?.votes || 0;
    const tied = planData.recommendations.filter(rec => rec.votes === maxVotes && maxVotes > 0);

    if (tied.length > 1) {
      // There's a tie - show warning and set tied options
      setTiedOptions(tied.map(rec => rec.id));
      setMessage(`There is an even amount of votes between ${tied.length} options. Please choose one to break the tie.`);
      setTimeout(() => setMessage(''), 5000);
      return;
    }

    // No tie - end voting and set winning resort
    const winningResort = sorted[0];
    if (!winningResort) {
      setMessage('No resort has been selected. Please vote first.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    // Get full address and coordinates for winning resort using Google Places API
    let fullAddress = winningResort.fullAddress || `${winningResort.resort}, ${winningResort.location}`;
    let coordinates = winningResort.coordinates;

    // Try to get coordinates if not available
    if (!coordinates && typeof window !== 'undefined' && window.google && window.google.maps) {
      try {
        const geocoder = new window.google.maps.Geocoder();
        const result = await new Promise<any>((resolve, reject) => {
          geocoder.geocode({ address: fullAddress }, (results: any, status: any) => {
            if (status === 'OK' && results[0]) {
              resolve(results[0]);
            } else {
              reject(new Error('Geocoding failed'));
            }
          });
        });
        coordinates = {
          lat: result.geometry.location.lat(),
          lng: result.geometry.location.lng()
        };
        fullAddress = result.formatted_address;
      } catch (error) {
        console.warn('Failed to geocode resort address:', error);
      }
    }

    const updated = {
      ...planData,
      status: 'decided' as const,
      winningResort: {
        ...winningResort,
        fullAddress,
        coordinates
      }
    };

    setPlanData(updated);

    // Save to backend
    try {
      await fetch('/api/plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          planId: updated.id, 
          status: updated.status,
          winningResort: updated.winningResort
        }),
      });
      setMessage(`Voting ended! ${winningResort.resort} is the winning resort.`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to end voting:', error);
      setMessage('Failed to end voting. Please try again.');
      setTimeout(() => setMessage(''), 5000);
    }
  }

  const handleBreakTie = async (winningId: number) => {
    if (!planData || !isOwner) return;

    const winningResort = planData.recommendations.find(rec => rec.id === winningId);
    if (!winningResort) return;

    // Get full address and coordinates
    let fullAddress = winningResort.fullAddress || `${winningResort.resort}, ${winningResort.location}`;
    let coordinates = winningResort.coordinates;

    if (!coordinates && typeof window !== 'undefined' && window.google && window.google.maps) {
      try {
        const geocoder = new window.google.maps.Geocoder();
        const result = await new Promise<any>((resolve, reject) => {
          geocoder.geocode({ address: fullAddress }, (results: any, status: any) => {
            if (status === 'OK' && results[0]) {
              resolve(results[0]);
            } else {
              reject(new Error('Geocoding failed'));
            }
          });
        });
        coordinates = {
          lat: result.geometry.location.lat(),
          lng: result.geometry.location.lng()
        };
        fullAddress = result.formatted_address;
      } catch (error) {
        console.warn('Failed to geocode resort address:', error);
      }
    }

    const updated = {
      ...planData,
      status: 'decided' as const,
      winningResort: {
        ...winningResort,
        fullAddress,
        coordinates
      }
    };

    setPlanData(updated);
    setTiedOptions([]);

    // Save to backend
    try {
      await fetch('/api/plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          planId: updated.id, 
          status: updated.status,
          winningResort: updated.winningResort
        }),
      });
      setMessage(`Tie broken! ${winningResort.resort} is the winning resort.`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to break tie:', error);
      setMessage('Failed to break tie. Please try again.');
      setTimeout(() => setMessage(''), 5000);
    }
  }

  const handleGenerateSchedule = async () => {
    if (!planData || !user || !isOwner || !planData.winningResort) return;

    console.log('Starting schedule generation...');
    setIsGeneratingSchedule(true);
    setScheduleStage('transportation');
    setMessage('');
    
    // Store timeout refs so we can clear them in catch block
    let accommodationTimeout: NodeJS.Timeout;
    let itineraryTimeout: NodeJS.Timeout;

    try {
      // Calculate trip dates from member availability
      const allBestDates = planData.members.flatMap(m => {
        const memberUser = user; // In a real app, you'd fetch each member's user data
        return memberUser?.availability || [];
      });
      
      // For now, use a simple approach - use the first available date range
      // In production, you'd find the best overlapping dates
      const startDate = allBestDates[0] || new Date().toISOString().split('T')[0];
      const endDate = allBestDates[allBestDates.length - 1] || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const duration = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) || 3;

      // Get member addresses with coordinates - fetch each member's user data from Firestore
      const { getUserFromFirestore } = await import('@/lib/firebase/user');
      const membersWithAddresses = await Promise.all(
        planData.members.map(async (member) => {
          const memberUser = await getUserFromFirestore(member.id);
          return {
            memberId: member.id,
            memberName: member.name,
            address: memberUser?.address || '',
            coordinates: memberUser?.addressCoordinates,
            skillLevel: member.skill || 'Intermediate',
            budget: member.budget || null
          };
        })
      );

      // Map winningResort to the format expected by the API (resort -> name)
      const winningResortForAPI = planData.winningResort ? {
        name: planData.winningResort.resort || planData.winningResort.name,
        location: planData.winningResort.location,
        fullAddress: planData.winningResort.fullAddress,
        coordinates: planData.winningResort.coordinates
      } : null;

      if (!winningResortForAPI || !winningResortForAPI.name || !winningResortForAPI.location) {
        throw new Error('Winning resort is missing required information. Please end voting again.');
      }

      // Simulate progress updates (since API is synchronous, we'll estimate based on time)
      // In a production app, you'd use Server-Sent Events or WebSockets for real-time updates
      
      // Progress to accommodation after ~20 seconds
      accommodationTimeout = setTimeout(() => {
        console.log('Progressing to accommodation stage');
        setScheduleStage('accommodation')
      }, 20000)
      
      // Progress to itinerary after ~40 seconds
      itineraryTimeout = setTimeout(() => {
        console.log('Progressing to itinerary stage');
        setScheduleStage('itinerary')
      }, 40000)

      const response = await fetch('/api/schedule/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: planData.id,
          winningResort: winningResortForAPI,
          tripDates: {
            startDate,
            endDate,
            duration
          },
          members: membersWithAddresses,
          generatedBy: user.id
        })
      });

      // Clear progress timeouts
      if (accommodationTimeout) clearTimeout(accommodationTimeout)
      if (itineraryTimeout) clearTimeout(itineraryTimeout)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to generate schedule');
      }

      const schedule: GeneratedSchedule = await response.json();
      
      console.log('Schedule received from API:', schedule);

      // Save schedule to Firestore
      const { saveScheduleToFirestore } = await import('@/lib/firebase/user');
      await saveScheduleToFirestore(schedule);
      console.log('Schedule saved to Firestore');

      setScheduleStage('complete');
      // Wait a moment to show completion state
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Set the schedule state
      console.log('Setting generated schedule state:', schedule);
      setGeneratedSchedule(schedule);
      setIsGeneratingSchedule(false);
      setScheduleStage(null);
      setMessage('Schedule generated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to generate schedule:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate schedule. Please try again.';
      
      // Clear any pending timeouts
      try {
        if (typeof accommodationTimeout !== 'undefined') clearTimeout(accommodationTimeout);
        if (typeof itineraryTimeout !== 'undefined') clearTimeout(itineraryTimeout);
      } catch (e) {
        // Ignore timeout clearing errors
      }
      
      setIsGeneratingSchedule(false);
      setScheduleStage(null);
      setMessage(errorMessage);
      setTimeout(() => setMessage(''), 5000);
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-12">
      <ScheduleLoadingModal 
        isOpen={isGeneratingSchedule} 
        currentStage={scheduleStage}
      />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div className="flex-1">
          {isEditingPlan && isOwner ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trip Name</label>
                <input
                  type="text"
                  value={editPlanMeta?.tripName || ''}
                  onChange={(e) => setEditPlanMeta({ ...editPlanMeta!, tripName: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0EA5E9] focus:outline-none"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destination Type</label>
                  <select
                    value={editPlanMeta?.destinationType || 'Domestic'}
                    onChange={(e) => setEditPlanMeta({ ...editPlanMeta!, destinationType: e.target.value as any })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0EA5E9] focus:outline-none"
                  >
                    <option value="Domestic">Domestic</option>
                    <option value="International">International</option>
                    <option value="Local">Local</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Size</label>
                  <input
                    type="number"
                    value={editPlanMeta?.targetSize || 4}
                    onChange={(e) => setEditPlanMeta({ ...editPlanMeta!, targetSize: parseInt(e.target.value) || 4 })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0EA5E9] focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSavePlanEdits}
                  className="flex items-center px-4 py-2 bg-[#0EA5E9] text-white rounded-lg hover:bg-[#0284c7] transition"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setIsEditingPlan(false)
                    setEditPlanMeta(planData.metadata)
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-4xl font-extrabold text-[#1F2937] flex items-center">
                  <Mountain className="w-8 h-8 mr-3 text-[#0EA5E9]" />
                  {planData.metadata.tripName || 'Untitled Trip'}
                </h1>
                {isOwner && (
                  <button
                    onClick={() => setIsEditingPlan(true)}
                    className="flex items-center text-gray-500 hover:text-[#0EA5E9] transition"
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </button>
                )}
              </div>
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
            </>
          )}
        </div>

        <div className="mt-4 md:mt-0 flex space-x-3">
          {isOwner ? (
             <button 
               onClick={() => { 
                 if(confirm('Are you sure you want to delete this plan? This action cannot be undone.')) {
                   deletePlan()
                   router.push('/')
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
                   leavePlan()
                   router.push('/')
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
        <div className={`mb-6 p-3 rounded-lg flex items-center ${
          message.includes('error') || message.includes('Failed') || message.includes('tie')
            ? 'bg-yellow-100 text-yellow-700'
            : 'bg-green-100 text-green-700'
        }`}>
          {message.includes('tie') ? (
            <AlertTriangle className="w-5 h-5 mr-2" />
          ) : (
            <CheckCircle className="w-5 h-5 mr-2" />
          )}
          {message}
        </div>
      )}

      {/* Tie Warning */}
      {tiedOptions.length > 1 && isOwner && planData.status === 'voting' && (
        <GlassCard className="mb-6 p-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-start">
            <AlertTriangle className="w-6 h-6 text-yellow-600 mr-3 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-yellow-800 mb-2">
                There is an even amount of votes between {tiedOptions.length} options. Please choose one.
              </h3>
              <div className="flex flex-wrap gap-3 mt-4">
                {planData.recommendations
                  .filter(rec => tiedOptions.includes(rec.id))
                  .map(rec => (
                    <button
                      key={rec.id}
                      onClick={() => handleBreakTie(rec.id)}
                      className="px-4 py-2 bg-[#0EA5E9] text-white rounded-lg hover:bg-[#0284c7] transition font-semibold"
                    >
                      {rec.resort} ({rec.votes} votes)
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </GlassCard>
      )}

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

      {/* Generate Schedule Section */}
      {planData.status === 'decided' && planData.winningResort && (
        <div className="mb-10">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[#1F2937] mb-2">
                  Trip Schedule
                </h2>
                <p className="text-gray-600">
                  Winning Resort: <span className="font-semibold text-[#0EA5E9]">{planData.winningResort.resort}</span>
                </p>
              </div>
              {isOwner && !generatedSchedule && (
                <AccentButton 
                  onClick={handleGenerateSchedule} 
                  disabled={isGeneratingSchedule}
                >
                  {isGeneratingSchedule ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Calendar className="w-5 h-5" />
                      <span>Generate Schedule</span>
                    </>
                  )}
                </AccentButton>
              )}
            </div>

            {generatedSchedule ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <p className="text-sm text-gray-600">Schedule has been generated</p>
                    <p className="text-xs text-gray-500 mt-1">View the full schedule with transportation, accommodation, and itinerary details</p>
                  </div>
                  <AccentButton onClick={() => router.push('/schedule')}>
                    View Full Schedule
                  </AccentButton>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-lg">
                  {isOwner 
                    ? 'Click "Generate Schedule" to create transportation, accommodation, and itinerary plans.'
                    : 'Waiting for the plan owner to generate the schedule.'}
                </p>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-[#1F2937]">Top Recommendations</h2>
        <div className="flex gap-3">
          {isOwner && planData.recommendations.length === 0 && (
            <AccentButton onClick={handleGenerateSuggestions}>
              <Sparkles className="w-5 h-5" />
              <span>Generate Suggestions</span>
            </AccentButton>
          )}
          {isOwner && planData.status === 'voting' && planData.recommendations.length > 0 && (
            <AccentButton onClick={handleEndVoting} disabled={tiedOptions.length > 1}>
              <CheckCircle className="w-5 h-5" />
              <span>End Voting</span>
            </AccentButton>
          )}
        </div>
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
                className={`flex flex-col md:flex-row justify-between items-start md:items-center ${
                  user && (rec.votedBy || []).includes(user.id)
                    ? 'ring-2 ring-green-500 bg-green-50/30'
                    : ''
                }`}
              >
                <div className="flex-1 mb-4 md:mb-0">
                  <div className="flex items-center mb-1">
                    {user && (rec.votedBy || []).includes(user.id) && (
                      <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    )}
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
                  {planData.status === 'voting' ? (
                    user && (rec.votedBy || []).includes(user.id) ? (
                      <AccentButton
                        onClick={() => handleVote(rec.id)}
                        className="text-lg bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-5 h-5 inline mr-2" />
                        Voted
                      </AccentButton>
                    ) : (
                      <AccentButton onClick={() => handleVote(rec.id)} className="text-lg">
                        Vote Now
                      </AccentButton>
                    )
                  ) : (
                    <div className="text-sm text-gray-500 italic">Voting ended</div>
                  )}
                </div>
              </GlassCard>
            ))}
        </div>
      )}

      <div className="mt-10 text-center">
        <button
          onClick={() => router.push('/account')}
          className="text-gray-500 hover:text-[#1F2937] transition duration-150"
        >
          <LogIn className="w-5 h-5 inline mr-2" />
          Back to Profile
        </button>
      </div>
    </div>
  )
}

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
)

