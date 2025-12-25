'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { AccentButton } from '@/components/ui/AccentButton'
import { useApp } from '@/context/AppContext'
import { ScheduleDisplay } from '@/components/ScheduleDisplay'
import { ScheduleLoadingModal } from '@/components/ScheduleLoadingModal'
import { GeneratedSchedule } from '@/lib/types'

export default function Schedule() {
  const router = useRouter()
  const { planData, user, isOwner } = useApp()
  const [generatedSchedule, setGeneratedSchedule] = useState<GeneratedSchedule | null>(null)
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false)
  const [scheduleStage, setScheduleStage] = useState<'transportation' | 'accommodation' | 'itinerary' | 'complete' | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  // Load schedule from Firestore
  useEffect(() => {
    const loadSchedule = async () => {
      if (!planData?.id) {
        setLoading(false)
        return
      }

      try {
        const { getScheduleFromFirestore } = await import('@/lib/firebase/user')
        const schedule = await getScheduleFromFirestore(planData.id)
        if (schedule) {
          setGeneratedSchedule(schedule)
        }
      } catch (error) {
        console.error('Failed to load schedule:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSchedule()
  }, [planData?.id])

  if (loading) {
    return (
      <div className="text-center py-20">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#0EA5E9]" />
        <h2 className="text-2xl font-bold text-gray-700">Loading schedule...</h2>
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

  if (!planData.winningResort) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <GlassCard className="p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">No Schedule Available</h2>
          <p className="text-gray-600 mb-6">A winning resort must be selected before a schedule can be generated.</p>
          <AccentButton onClick={() => router.push('/plan')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Plan
          </AccentButton>
        </GlassCard>
      </div>
    )
  }

  if (!generatedSchedule) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <GlassCard className="p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">No Schedule Generated</h2>
          <p className="text-gray-600 mb-6">Generate a schedule from the plan page to view it here.</p>
          <AccentButton onClick={() => router.push('/plan')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Plan
          </AccentButton>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-12">
      <ScheduleLoadingModal
        isOpen={isGeneratingSchedule}
        currentStage={scheduleStage}
        regeneratingSection={isGeneratingSchedule && scheduleStage && scheduleStage !== 'complete' ? scheduleStage : null}
      />
      
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/plan')}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="Back to Plan"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-[#1F2937]">Trip Schedule</h1>
            <p className="text-gray-600 mt-1">
              {planData.metadata.tripName} • {generatedSchedule.winningResort.name}
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push('/plan')}
          className="text-[#0EA5E9] hover:text-[#0284c7] font-medium"
        >
          View Plan Details
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.includes('error') || message.includes('Failed') 
            ? 'bg-red-50 text-red-700' 
            : 'bg-green-50 text-green-700'
        }`}>
          {message}
        </div>
      )}

      {/* Schedule Display */}
      <ScheduleDisplay 
        schedule={generatedSchedule}
        planData={planData}
        isOwner={isOwner || false}
        onRegenerateSection={async (section: 'transportation' | 'accommodation' | 'itinerary') => {
          if (!planData || !user || !isOwner || !planData.winningResort) return

          setIsGeneratingSchedule(true)
          setScheduleStage(section)
          setMessage('')

          try {
            // Fetch all member addresses from Firestore
            // Note: We can only fetch addresses for users we have permission to read
            // This may fail for other members, so we handle errors gracefully
            const { getUserFromFirestore } = await import('@/lib/firebase/user')
            const membersWithAddresses = await Promise.all(
              planData.members.map(async (member) => {
                let memberUser = null
                try {
                  // Try to fetch member user data - this may fail if we don't have permission
                  memberUser = await getUserFromFirestore(member.id)
                } catch (fetchError) {
                  // If we can't fetch the user data, that's okay - we'll use empty address
                  console.warn(`Could not fetch address for member ${member.id}:`, fetchError)
                }
                return {
                  memberId: member.id,
                  memberName: member.name,
                  address: memberUser?.address || '',
                  coordinates: memberUser?.addressCoordinates,
                  skillLevel: member.skill || 'Intermediate',
                  budget: member.budget || null
                }
              })
            )

            // Calculate trip dates
            const allBestDates = planData.members.flatMap(m => {
              // In production, fetch each member's availability
              return user?.availability || []
            })
            const startDate = allBestDates[0] || new Date().toISOString().split('T')[0]
            const endDate = allBestDates[allBestDates.length - 1] || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            const duration = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) || 3

            const winningResortForAPI = {
              name: planData.winningResort.resort || '',
              location: planData.winningResort.location,
              fullAddress: planData.winningResort.fullAddress,
              coordinates: planData.winningResort.coordinates
            }

            const response = await fetch(`/api/schedule/regenerate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                planId: planData.id,
                section,
                winningResort: winningResortForAPI,
                tripDates: { startDate, endDate, duration },
                members: membersWithAddresses,
                generatedBy: user.id,
                existingSchedule: generatedSchedule
              })
            })

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
              throw new Error(errorData.error || 'Failed to regenerate section')
            }

            const updatedSchedule: GeneratedSchedule = await response.json()

            // Save to Firestore (client-side with authenticated user context)
            try {
              // Verify user is authenticated before saving
              const { getCurrentUser } = await import('@/lib/firebase/auth')
              const currentUser = getCurrentUser()
              if (!currentUser) {
                throw new Error('You must be signed in to save the schedule. Please sign in and try again.')
              }

              const { saveScheduleToFirestore } = await import('@/lib/firebase/user')
              await saveScheduleToFirestore(updatedSchedule)
              console.log('Schedule saved successfully to Firestore')
            } catch (saveError: any) {
              console.error('Error saving schedule to Firestore:', saveError)
              const errorMessage = saveError?.message || 'Unknown error'
              
              // Check if it's a permission error
              if (errorMessage.includes('permission') || errorMessage.includes('Permission')) {
                setMessage(`Permission denied. Please ensure your Firestore rules allow authenticated users to write to 'slopes-generated-schedules'. The schedule was regenerated but not saved.`)
              } else {
                setMessage(`Schedule regenerated, but failed to save: ${errorMessage}. Please try refreshing the page.`)
              }
              
              // Still update the UI with the new schedule (it's in memory)
              // User can manually refresh to see it persisted
            }

            setGeneratedSchedule(updatedSchedule)
            setScheduleStage('complete')
            await new Promise(resolve => setTimeout(resolve, 1000))
            setIsGeneratingSchedule(false)
            setScheduleStage(null)
            setMessage(`${section.charAt(0).toUpperCase() + section.slice(1)} regenerated successfully!`)
            setTimeout(() => setMessage(''), 3000)
          } catch (error) {
            console.error('Failed to regenerate section:', error)
            setIsGeneratingSchedule(false)
            setScheduleStage(null)
            setMessage(error instanceof Error ? error.message : 'Failed to regenerate section. Please try again.')
            setTimeout(() => setMessage(''), 5000)
          }
        }}
      />
    </div>
  )
}

