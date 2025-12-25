'use client'

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle, Clock, Car, Home, Calendar } from 'lucide-react'
import { GlassCard } from './ui/GlassCard'

interface ScheduleLoadingModalProps {
  isOpen: boolean
  currentStage: 'transportation' | 'accommodation' | 'itinerary' | 'complete' | null
  regeneratingSection?: 'transportation' | 'accommodation' | 'itinerary' | null
}

export function ScheduleLoadingModal({ isOpen, currentStage, regeneratingSection }: ScheduleLoadingModalProps) {
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    if (!isOpen) {
      setElapsedTime(0)
      return
    }

    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isOpen])

  useEffect(() => {
    console.log('ScheduleLoadingModal - isOpen:', isOpen, 'currentStage:', currentStage);
  }, [isOpen, currentStage]);

  if (!isOpen) {
    console.log('ScheduleLoadingModal - not rendering because isOpen is false');
    return null;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const allStages = [
    {
      id: 'transportation' as const,
      name: 'Transportation Planning',
      icon: Car,
      description: 'Finding the best travel options for your group'
    },
    {
      id: 'accommodation' as const,
      name: 'Accommodation Search',
      icon: Home,
      description: 'Searching for available lodges and Airbnbs'
    },
    {
      id: 'itinerary' as const,
      name: 'Itinerary Creation',
      icon: Calendar,
      description: 'Creating your day-by-day schedule and slope recommendations'
    }
  ]

  // If regenerating a specific section, only show that stage
  const stages = regeneratingSection 
    ? allStages.filter(stage => stage.id === regeneratingSection)
    : allStages

  const getStageStatus = (stageId: typeof allStages[number]['id']) => {
    if (!currentStage) return 'pending'
    
    // When regenerating a single section, it starts as 'running' and becomes 'complete'
    if (regeneratingSection) {
      if (currentStage === 'complete' && stageId === regeneratingSection) return 'completed'
      if (currentStage === stageId) return 'running'
      return 'pending'
    }
    
    // Original logic for full generation
    const stageIndex = allStages.findIndex(s => s.id === stageId)
    const currentIndex = allStages.findIndex(s => s.id === currentStage)
    
    if (currentStage === 'complete') return 'completed'
    if (stageIndex < currentIndex) return 'completed'
    if (stageIndex === currentIndex) return 'running'
    return 'pending'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <GlassCard className="max-w-2xl w-full p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-[#1F2937] mb-2">
            {regeneratingSection 
              ? `Regenerating ${stages[0]?.name || 'Schedule Section'}` 
              : 'Generating Your Schedule'}
          </h2>
          <p className="text-gray-600">
            {regeneratingSection 
              ? 'Please wait while we update this section...'
              : 'This may take a few minutes. Please don\'t close this window.'}
          </p>
        </div>

        {/* Timer */}
        <div className="flex items-center justify-center mb-8 p-4 bg-blue-50 rounded-lg">
          <Clock className="w-5 h-5 mr-2 text-[#0EA5E9]" />
          <span className="text-2xl font-bold text-[#0EA5E9]">{formatTime(elapsedTime)}</span>
        </div>

        {/* Stages */}
        <div className="space-y-4">
          {stages.map((stage, index) => {
            const status = getStageStatus(stage.id)
            const Icon = stage.icon
            
            return (
              <div
                key={stage.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  status === 'running'
                    ? 'border-[#0EA5E9] bg-blue-50'
                    : status === 'completed'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    <div className={`mr-4 ${
                      status === 'running'
                        ? 'text-[#0EA5E9]'
                        : status === 'completed'
                        ? 'text-green-500'
                        : 'text-gray-400'
                    }`}>
                      {status === 'running' ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : status === 'completed' ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold text-lg ${
                        status === 'running'
                          ? 'text-[#0EA5E9]'
                          : status === 'completed'
                          ? 'text-green-700'
                          : 'text-gray-600'
                      }`}>
                        {stage.name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">{stage.description}</p>
                    </div>
                  </div>
                  <div className="ml-4">
                    {status === 'running' && (
                      <span className="text-sm font-medium text-[#0EA5E9] animate-pulse">
                        Running...
                      </span>
                    )}
                    {status === 'completed' && (
                      <span className="text-sm font-medium text-green-700">
                        Complete
                      </span>
                    )}
                    {status === 'pending' && (
                      <span className="text-sm text-gray-400">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {currentStage === 'complete' && (
          <div className="mt-6 p-4 bg-green-50 border-2 border-green-500 rounded-lg text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-green-700 font-semibold">Schedule generated successfully!</p>
          </div>
        )}
      </GlassCard>
    </div>
  )
}

