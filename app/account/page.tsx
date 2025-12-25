'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogIn, MapPin, Edit2, Save, ExternalLink, Sparkles, Loader2 } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { AccentButton } from '@/components/ui/AccentButton'
import { useApp } from '@/context/AppContext'
import { getPlanFromFirestore } from '@/lib/firebase/user'
import { UserState } from '@/lib/types'
import { GooglePlacesAutocomplete } from '@/components/GooglePlacesAutocomplete'

// Helper component to format agent text into lists with emojis
const FormattedText = ({ text }: { text: string }) => {
  if (!text) return null;

  // Split by newlines, bullet points, or numbered lists
  const lines = text.split(/\n|\r/).filter(line => line.trim() !== '');
  
  // Check if text already contains bullet points or emojis (formatted by agent)
  const hasBullets = text.includes('•') || text.includes('-') || text.includes('*');
  const hasEmojis = /[\u{1F300}-\u{1F9FF}]/u.test(text);
  
  if (hasBullets || hasEmojis) {
    // Text is already formatted, render as-is with proper line breaks
    return (
      <div className="text-[#1F2937]">
        {lines.map((line, index) => {
          const trimmed = line.trim();
          // If line starts with bullet or emoji, render as list item
          if (trimmed.match(/^[•\-\*]|^[\u{1F300}-\u{1F9FF}]/u)) {
            return (
              <div key={index} className="flex items-start mb-2">
                <span className="mr-2 flex-shrink-0">{trimmed.match(/^[\u{1F300}-\u{1F9FF}]/u) ? '' : '•'}</span>
                <span className="flex-1">{trimmed.replace(/^[•\-\*]\s*/, '')}</span>
              </div>
            );
          }
          return <div key={index} className="mb-2">{trimmed}</div>;
        })}
      </div>
    );
  }
  
  // If text is a paragraph, try to split into sentences and format as list
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  if (sentences.length > 1) {
    return (
      <ul className="list-none space-y-2 text-[#1F2937]">
        {sentences.map((sentence, index) => (
          <li key={index} className="flex items-start">
            <span className="mr-2 flex-shrink-0">•</span>
            <span className="flex-1">{sentence.trim()}{sentence.trim().endsWith('.') ? '' : '.'}</span>
          </li>
        ))}
      </ul>
    );
  }
  
  // Fallback: render as paragraph
  return <p className="text-[#1F2937] whitespace-pre-line">{text}</p>;
};

export default function Account() {
  const router = useRouter()
  const { user, setUser, joinPlan, loading } = useApp()
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<UserState | null>(user)
  const [joinedPlansData, setJoinedPlansData] = useState<Array<{ id: string; name: string; status: string }>>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [regenerating, setRegenerating] = useState(false)

  // Load joined plans
  React.useEffect(() => {
    if (user?.joinedPlans && user.joinedPlans.length > 0) {
      Promise.all(
        user.joinedPlans.map(id => getPlanFromFirestore(id))
      ).then(plans => {
        setJoinedPlansData(
          plans
            .filter((plan): plan is NonNullable<typeof plan> => plan !== null)
            .map(plan => ({ id: plan.id, name: plan.metadata.tripName, status: plan.status }))
        )
        setLoadingPlans(false)
      }).catch(() => setLoadingPlans(false))
    } else {
      setLoadingPlans(false)
    }
  }, [user?.joinedPlans])

  React.useEffect(() => {
    if (user) {
      setEditForm(user)
    }
  }, [user])

  const handleSignOut = async () => {
    const { signOut } = await import('@/lib/firebase/auth')
    try {
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleSave = async () => {
    if (user && editForm) {
      // Ensure user ID is preserved
      if (!user.id || user.id.trim() === '') {
        alert('User ID is missing. Please sign in again.');
        return;
      }
      const userToSave = { ...editForm, id: user.id }; // Preserve ID
      const { saveUserToFirestore } = await import('@/lib/firebase/user')
      await saveUserToFirestore(userToSave)
      setUser(userToSave)
      setIsEditing(false)
    }
  }

  const handleJoinPlan = async (id: string) => {
    await joinPlan(id)
    router.push('/plan')
  }

  const handleRegenerateRecommendations = async () => {
    if (!user) return
    
    setRegenerating(true)
    try {
      // Prepare preferences as JSON for the agent
      const preferences = {
        skill: user.skill,
        pass: user.pass,
        budget: user.budget,
        address: user.address,
        availability: user.availability,
        impossibleDates: user.impossibleDates
      }

      const response = await fetch('/api/agents/slopes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences }),
      })

      if (response.ok) {
        const agentResults = await response.json()
        // Ensure user ID is preserved
        if (!user.id || user.id.trim() === '') {
          alert('User ID is missing. Please sign in again.');
          setRegenerating(false);
          return;
        }
        const updatedUser = {
          ...user,
          agentResults: agentResults.slopesInstructor ? agentResults : null,
          id: user.id // Explicitly preserve ID
        }
        const { saveUserToFirestore } = await import('@/lib/firebase/user')
        await saveUserToFirestore(updatedUser)
        setUser(updatedUser)
      } else {
        console.error('Failed to regenerate recommendations:', await response.text())
        alert('Failed to regenerate recommendations. Please try again.')
      }
    } catch (error) {
      console.error('Error regenerating recommendations:', error)
      alert('Failed to regenerate recommendations. Please try again.')
    } finally {
      setRegenerating(false)
    }
  }

  const getStatusStyle = (skill: string | null) => {
    if (skill === 'Black Diamond') return 'bg-black text-white'
    if (skill === 'Blue Square') return 'bg-[#0EA5E9]/80 text-white'
    if (skill === 'Green Circle') return 'bg-green-600 text-white'
    return 'bg-gray-200 text-gray-700'
  }

  if (loading || !user) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-700">Loading...</h2>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-12">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-extrabold text-[#1F2937]">Your Profile</h1>
        <button 
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          className="flex items-center text-[#0EA5E9] font-semibold hover:text-[#0284c7]"
        >
          {isEditing ? <Save className="w-5 h-5 mr-1" /> : <Edit2 className="w-5 h-5 mr-1" />}
          {isEditing ? 'Save Changes' : 'Edit Profile'}
        </button>
      </div>

      <GlassCard className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
          <h2 className="text-2xl font-bold mb-4 border-b pb-2 border-gray-200">Personal Details</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Name</label>
              {isEditing ? (
                <input 
                  className="w-full p-2 border rounded"
                  value={editForm?.name || ''}
                  onChange={e => setEditForm({...editForm, name: e.target.value} as typeof user)}
                />
              ) : (
                <p className="text-lg font-medium">{user?.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500">Home Address</label>
              {isEditing ? (
                <GooglePlacesAutocomplete
                  value={editForm?.address || ''}
                  onChange={(address, coordinates) => {
                    setEditForm({
                      ...editForm,
                      address,
                      addressCoordinates: coordinates
                    } as typeof user)
                  }}
                  placeholder="Enter your full address"
                  className="w-full p-2 border rounded"
                />
              ) : (
                <p className="text-lg font-medium flex items-center">
                  <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                  {user?.address || 'Not set'}
                </p>
              )}
            </div>
          </div>

          {user?.planId && (
            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-sm text-blue-600 font-semibold mb-1">Active Session</p>
              <div className="flex justify-between items-center">
                <span className="font-mono text-lg">{user?.planId}</span>
                <AccentButton onClick={() => router.push('/plan')} className="py-2 px-4 text-sm">
                  Go to Plan
                </AccentButton>
              </div>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4 border-b pb-2 border-gray-200">Ski Preferences</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Skill Level:</span>
              {isEditing ? (
                 <select 
                   className="p-1 border rounded"
                   value={editForm?.skill || ''}
                   onChange={e => setEditForm({...editForm, skill: e.target.value} as typeof user)}
                 >
                   <option>Green Circle</option>
                   <option>Blue Square</option>
                   <option>Black Diamond</option>
                 </select>
              ) : (
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${getStatusStyle(user?.skill || null)}`}>
                  {user?.skill}
                </span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold">Pass Status:</span>
              {isEditing ? (
                 <select 
                   className="p-1 border rounded"
                   value={editForm?.pass || ''}
                   onChange={e => setEditForm({...editForm, pass: e.target.value} as typeof user)}
                 >
                   <option>None</option>
                   <option>Epic Pass</option>
                   <option>Ikon Pass</option>
                 </select>
              ) : (
                <span className="font-medium text-[#1F2937]">{user?.pass}</span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold">Budget:</span>
              {isEditing ? (
                 <select 
                   className="p-1 border rounded"
                   value={editForm?.budget || ''}
                   onChange={e => setEditForm({...editForm, budget: e.target.value} as typeof user)}
                 >
                   <option>$</option>
                   <option>$$</option>
                   <option>$$$</option>
                 </select>
              ) : (
                <span className="font-medium text-[#1F2937]">{user?.budget}</span>
              )}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Agent Results Section */}
      <GlassCard className="mb-8">
        <div className="flex justify-between items-center mb-6 border-b pb-2 border-gray-200">
          <h2 className="text-2xl font-bold text-[#1F2937]">
            AI Recommendations
          </h2>
          <button
            onClick={handleRegenerateRecommendations}
            disabled={regenerating}
            className="flex items-center px-4 py-2 bg-[#0EA5E9] text-white rounded-lg hover:bg-[#0284c7] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {regenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Regenerating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Regenerate Recommendations
              </>
            )}
          </button>
        </div>
        
        {user?.agentResults && (
          <>
          {/* Slopes Instructor Results */}
          {user.agentResults.slopesInstructor?.output_parsed && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4 text-[#0EA5E9]">Skill Assessment & Improvement Plan</h3>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-sm font-medium text-gray-600 mb-2">🎯 Skill Level</p>
                  <p className="text-lg font-semibold text-[#1F2937]">
                    {user.agentResults.slopesInstructor.output_parsed["Skill Level"]}
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                  <p className="text-sm font-medium text-gray-600 mb-2">📈 Improvement Steps</p>
                  <FormattedText text={user.agentResults.slopesInstructor.output_parsed["Improvement Steps"]} />
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <p className="text-sm font-medium text-gray-600 mb-2">🎿 Recommended Equipment</p>
                  <FormattedText text={user.agentResults.slopesInstructor.output_parsed.Equipment} />
                </div>
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                  <p className="text-sm font-medium text-gray-600 mb-2">💡 Additional Notes</p>
                  <FormattedText text={user.agentResults.slopesInstructor.output_parsed.Notes} />
                </div>
              </div>
            </div>
          )}
          </>
        )}
        
        {!user?.agentResults && (
          <div className="text-center py-8 text-gray-500">
            <p>No recommendations yet. Click "Regenerate Recommendations" to generate your personalized AI recommendations.</p>
          </div>
        )}
        </GlassCard>

      <h2 className="text-2xl font-bold mb-4 text-[#1F2937]">My Plans</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {loadingPlans ? (
          <p className="text-gray-500">Loading plans...</p>
        ) : joinedPlansData.length > 0 ? joinedPlansData.map((plan) => (
          <div key={plan.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center hover:shadow-md transition">
            <div>
              <h3 className="font-bold text-lg">{plan.name}</h3>
              <p className="text-xs text-gray-500 font-mono">{plan.id}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${plan.status === 'decided' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {plan.status}
              </span>
            </div>
            <button 
              onClick={() => handleJoinPlan(plan.id)}
              className="p-2 text-gray-400 hover:text-[#0EA5E9]"
            >
              <ExternalLink className="w-5 h-5" />
            </button>
          </div>
        )) : (
          <p className="text-gray-500 italic">You haven't joined any plans yet.</p>
        )}
      </div>

      <div className="mt-10 text-center">
        <button
          onClick={() => router.push('/')}
          className="text-[#0EA5E9] hover:text-[#0284c7] transition duration-150"
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  )
}

