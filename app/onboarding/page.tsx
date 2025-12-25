'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import { AccentButton } from '@/components/ui/AccentButton'
import { GlassCard } from '@/components/ui/GlassCard'
import { useApp } from '@/context/AppContext'
import { DestinationType, PlanMetadata } from '@/lib/types'

export default function Onboarding() {
  const router = useRouter()
  const { createPlan, user } = useApp()

  // Redirect if user doesn't have preferences set
  useEffect(() => {
    if (!user?.skill || !user?.pass || !user?.budget || !user?.availability || user.availability.length === 0) {
      router.push('/preferences')
    }
  }, [user, router])

  const [planMeta, setPlanMeta] = useState<PlanMetadata>({
    tripName: '',
    description: '',
    targetSize: 4,
    notes: '',
    destinationType: 'Domestic'
  })

  const handleMetaUpdate = (field: string, value: any) => {
    setPlanMeta((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!user) {
      router.push('/preferences')
      return
    }
    
    try {
      await createPlan(planMeta, user)
      router.push('/plan')
    } catch (error) {
      console.error('Error creating plan:', error)
    }
  }

  // Use local state for inputs to prevent re-render issues
  const [tripName, setTripName] = useState(planMeta.tripName)
  const [targetSize, setTargetSize] = useState(planMeta.targetSize?.toString() || '4')
  const [notes, setNotes] = useState(planMeta.notes || '')
  const [destinationType, setDestinationType] = useState<DestinationType>(planMeta.destinationType)

  // Sync local state to parent when component mounts or when values change externally
  useEffect(() => {
    setTripName(planMeta.tripName)
    setTargetSize(planMeta.targetSize?.toString() || '4')
    setNotes(planMeta.notes || '')
    setDestinationType(planMeta.destinationType)
  }, [planMeta.tripName, planMeta.targetSize, planMeta.notes, planMeta.destinationType])

  if (!user) {
    return null // Will redirect
  }

  return (
    <div className="max-w-xl mx-auto py-12">
      <GlassCard>
        <h2 className="text-2xl font-bold mb-6 text-[#1F2937]">Create New Plan</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trip Name / Type</label>
            <input 
              type="text" 
              placeholder="e.g. High School Reunion"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0EA5E9] focus:outline-none"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Destination Preference (Required)</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Domestic', 'International', 'Local'] as DestinationType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setDestinationType(type)}
                  className={`
                    p-3 rounded-lg border text-sm font-medium transition-all
                    ${destinationType === type 
                      ? 'bg-[#0EA5E9] text-white border-[#0EA5E9]' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}
                  `}
                >
                  {type}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {destinationType === 'Local' ? 'Within 5-6 hour drive.' : 
               destinationType === 'Domestic' ? 'Anywhere in the country.' : 'Global destinations.'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Group Size</label>
            <input 
              type="number" 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0EA5E9] focus:outline-none"
              value={targetSize}
              onChange={(e) => setTargetSize(e.target.value)}
            />
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
             <textarea 
               className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0EA5E9] focus:outline-none h-20"
               placeholder="Any other details..."
               value={notes}
               onChange={(e) => setNotes(e.target.value)}
             />
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <AccentButton 
            onClick={() => {
              // Sync local state to parent before submitting
              handleMetaUpdate('tripName', tripName)
              handleMetaUpdate('targetSize', parseInt(targetSize) || 4)
              handleMetaUpdate('notes', notes)
              handleMetaUpdate('destinationType', destinationType)
              
              // Small delay to ensure state is updated, then submit
              setTimeout(() => {
                handleSubmit()
              }, 0)
            }} 
            disabled={!tripName || tripName.trim() === ''}
          >
            <CheckCircle className="w-5 h-5" />
            <span>Create Plan</span>
          </AccentButton>
        </div>
      </GlassCard>
    </div>
  )
}
