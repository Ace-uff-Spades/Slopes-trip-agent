'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Snowflake, Wallet, CheckCircle, Loader2, User } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { format, parse } from 'date-fns'
import 'react-day-picker/style.css'
import { AccentButton } from '@/components/ui/AccentButton'
import { GlassCard } from '@/components/ui/GlassCard'
import { useApp } from '@/context/AppContext'
import { INITIAL_USER_STATE } from '@/lib/constants'
import { GooglePlacesAutocomplete } from '@/components/GooglePlacesAutocomplete'

export default function Preferences() {
  const router = useRouter()
  const { setUser, user } = useApp()

  const [step, setStep] = useState(0)
  const [profile, setProfile] = useState({
    ...INITIAL_USER_STATE,
    id: user?.id || '', // Preserve user ID if available
    name: user?.name || '',
    impossibleDates: INITIAL_USER_STATE.impossibleDates || []
  })
  const [loadingAgent, setLoadingAgent] = useState(false)
  const [agentProgress, setAgentProgress] = useState<{
    step: number;
    totalSteps: number;
    message: string;
  } | null>(null)

  const handleUpdate = (field: string, value: any) => {
    setProfile((prev) => ({ ...prev, [field]: value }))
  }

  const nextStep = () => setStep(step + 1)
  const prevStep = () => setStep(step - 1)

  const handleSubmit = async () => {
    try {
      setLoadingAgent(true)
      setAgentProgress({
        step: 1,
        totalSteps: 2,
        message: 'Analyzing your skill level and preferences...'
      })

      // Prepare preferences as JSON for the agent
      const preferences = {
        skill: profile.skill,
        pass: profile.pass,
        budget: profile.budget,
        address: profile.address,
        availability: profile.availability,
        impossibleDates: profile.impossibleDates
      }

      // Call the slopes-agent API
      let agentResults = null
      try {
        const response = await fetch('/api/agents/slopes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preferences }),
        })

        if (response.ok) {
          setAgentProgress({
            step: 2,
            totalSteps: 2,
            message: 'Finalizing your personalized recommendations...'
          })
          
          // Small delay to show final step before completing
          await new Promise(resolve => setTimeout(resolve, 500))
          
          agentResults = await response.json()
        } else {
          console.error('Agent API error:', await response.text())
        }
      } catch (error) {
        console.error('Error calling slopes-agent:', error)
        // Continue even if agent fails
      }

      // Update profile with agent results
      const profileWithResults = {
        ...profile,
        agentResults: agentResults || null
      }

      // Ensure user ID is preserved from current user or get from Firebase Auth
      if (!user || !user.id || user.id.trim() === '') {
        // Try to get current Firebase Auth user
        const { getCurrentUser } = await import('@/lib/firebase/auth')
        const firebaseUser = getCurrentUser()
        if (firebaseUser && firebaseUser.uid) {
          profileWithResults.id = firebaseUser.uid
        } else {
          console.error('Cannot save preferences: User ID is missing and cannot be retrieved from Firebase Auth')
          alert('User ID is missing. Please sign in again.')
          setLoadingAgent(false)
          setAgentProgress(null)
          return
        }
      } else {
        profileWithResults.id = user.id // Preserve existing user ID
      }
      
      // Save user profile with agent results
      const { StorageService } = await import('@/services/storage')
      const savedUser = await StorageService.saveUser(profileWithResults)
      setUser(savedUser)
      router.push('/')
    } catch (error) {
      console.error('Error in handleSubmit:', error)
      // Still navigate even if there's an error
      router.push('/')
    } finally {
      setLoadingAgent(false)
      setAgentProgress(null)
    }
  }

  const StepIndicator = ({ current, total }: { current: number; total: number }) => (
    <div className="flex justify-center space-x-2 mb-8">
      {[...Array(total)].map((_, i) => (
        <div
          key={i}
          className={`w-3 h-3 rounded-full transition-colors ${
            i + 1 === current ? 'bg-[#F97316]' : 'bg-gray-300'
          }`}
        />
      ))}
    </div>
  )

  const Step0Name = () => {
    const [name, setName] = useState(profile.name)

    return (
      <>
        <h2 className="text-2xl font-bold mb-6 text-[#1F2937]">1/7: What's your name?</h2>
        <p className="text-gray-600 mb-8">Let's personalize your experience.</p>
        <div>
          <input
            type="text"
            placeholder="Enter your name"
            className="w-full p-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0EA5E9] focus:border-[#0EA5E9] focus:outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => handleUpdate('name', name)}
          />
        </div>
        <div className="mt-8 flex justify-end">
          <AccentButton 
            onClick={() => {
              handleUpdate('name', name)
              nextStep()
            }} 
            disabled={!name || name.trim() === ''}
          >
            Next
          </AccentButton>
        </div>
      </>
    )
  }

  const Step1Skill = () => (
    <>
      <h2 className="text-2xl font-bold mb-6 text-[#1F2937]">2/7: What's your skill level?</h2>
      <p className="text-gray-600 mb-8">Choose the terrain you ride most comfortably.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['Green Circle', 'Blue Square', 'Black Diamond'].map((level) => (
          <button
            key={level}
            onClick={() => handleUpdate('skill', level)}
            className={`
              p-6 rounded-xl border-2 transition-all duration-200
              ${
                profile.skill === level
                  ? 'border-[#0EA5E9] bg-[#0EA5E9]/10 shadow-lg'
                  : 'border-gray-200 hover:border-gray-300'
              }
            `}
          >
            <Snowflake className="w-8 h-8 mx-auto mb-2 text-[#0EA5E9]" />
            <span
              className={`font-semibold ${
                profile.skill === level ? 'text-[#0EA5E9]' : 'text-[#1F2937]'
              }`}
            >
              {level}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-8 flex justify-between">
        <button onClick={prevStep} className="text-gray-500 hover:text-[#1F2937]">
          Back
        </button>
        <AccentButton onClick={nextStep} disabled={!profile.skill}>
          Next
        </AccentButton>
      </div>
    </>
  )

  const Step2Pass = () => (
    <>
      <h2 className="text-2xl font-bold mb-6 text-[#1F2937]">3/7: What passes do you have?</h2>
      <div className="space-y-4">
        {['Epic Pass', 'Ikon Pass', 'None'].map((pass) => (
          <label
            key={pass}
            className="flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:border-gray-300"
          >
            <input
              type="radio"
              name="pass"
              value={pass}
              checked={profile.pass === pass}
              onChange={() => handleUpdate('pass', pass)}
              className="w-5 h-5 accent-[#0EA5E9]"
            />
            <span className="ml-4 text-lg font-medium">{pass}</span>
            {pass !== 'None' && (
              <span className="ml-auto text-sm text-gray-500">Save up to $250/day</span>
            )}
          </label>
        ))}
      </div>
      <div className="mt-8 flex justify-between">
        <button onClick={prevStep} className="text-gray-500 hover:text-[#1F2937]">
          Back
        </button>
        <AccentButton onClick={nextStep} disabled={!profile.pass}>
          Next
        </AccentButton>
      </div>
    </>
  )

  const Step3Budget = () => (
    <>
      <h2 className="text-2xl font-bold mb-6 text-[#1F2937]">4/7: Trip Budget Preference</h2>
      <p className="text-gray-600 mb-8">This helps us find the right accommodation and resort tier.</p>
      <div className="flex justify-around">
        {['$', '$$', '$$$'].map((b) => (
          <button
            key={b}
            onClick={() => handleUpdate('budget', b)}
            className={`
              p-6 rounded-xl border-2 transition-all duration-200 w-28 text-center
              ${
                profile.budget === b
                  ? 'border-[#F97316] bg-[#F97316]/10 shadow-lg'
                  : 'border-gray-200 hover:border-gray-300'
              }
            `}
          >
            <Wallet className="w-8 h-8 mx-auto mb-2 text-[#F97316]" />
            <span className="text-xl font-bold">{b}</span>
          </button>
        ))}
      </div>
      <div className="mt-8 flex justify-between">
        <button onClick={prevStep} className="text-gray-500 hover:text-[#1F2937]">
          Back
        </button>
        <AccentButton onClick={nextStep} disabled={!profile.budget}>
          Next
        </AccentButton>
      </div>
    </>
  )

  const Step4Address = () => {
    const [address, setAddress] = useState(profile.address)
    const [coordinates, setCoordinates] = useState(profile.addressCoordinates)

    const handleAddressChange = (newAddress: string, newCoordinates?: { lat: number; lng: number }) => {
      setAddress(newAddress)
      if (newCoordinates) {
        setCoordinates(newCoordinates)
      }
    }

    return (
      <>
        <h2 className="text-2xl font-bold mb-6 text-[#1F2937]">5/7: Your Home Address</h2>
        <p className="text-gray-600 mb-8">Enter your home address. This helps us plan transportation and find nearby resorts.</p>
        <div>
          <GooglePlacesAutocomplete
            value={address}
            onChange={handleAddressChange}
            placeholder="Enter your full address"
            className="w-full p-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0EA5E9] focus:border-[#0EA5E9] focus:outline-none"
          />
        </div>
        <div className="mt-8 flex justify-between">
          <button onClick={prevStep} className="text-gray-500 hover:text-[#1F2937]">
            Back
          </button>
          <AccentButton
            onClick={() => {
              handleUpdate('address', address)
              if (coordinates) {
                handleUpdate('addressCoordinates', coordinates)
              }
              nextStep()
            }}
            disabled={!address || address.trim() === ''}
          >
            Next
          </AccentButton>
        </div>
      </>
    )
  }

  const Step5Availability = () => {
    const [dateMode, setDateMode] = useState<'best' | 'impossible'>('best')
    const dateModeRef = useRef<'best' | 'impossible'>('best')
    const isUpdatingRef = useRef(false)
    const hasInitializedRef = useRef(false)
    
    const parsedBestDates = useMemo(() => {
      return profile.availability
        .map((d) => {
          try {
            const parsed = parse(d, 'MMM d', new Date())
            return parsed
          } catch (e) {
            return null
          }
        })
        .filter((d): d is Date => d !== null && !isNaN(d.getTime()))
    }, [profile.availability])

    const parsedImpossibleDates = useMemo(() => {
      return (profile.impossibleDates || [])
        .map((d) => {
          try {
            const parsed = parse(d, 'MMM d', new Date())
            return parsed
          } catch (e) {
            return null
          }
        })
        .filter((d): d is Date => d !== null && !isNaN(d.getTime()))
    }, [profile.impossibleDates])

    const [selectedBestDates, setSelectedBestDates] = useState<Date[] | undefined>(parsedBestDates)
    const [selectedImpossibleDates, setSelectedImpossibleDates] = useState<Date[] | undefined>(parsedImpossibleDates)

    useEffect(() => {
      if (!hasInitializedRef.current) {
        setSelectedBestDates(parsedBestDates)
        setSelectedImpossibleDates(parsedImpossibleDates)
        hasInitializedRef.current = true
      }
    }, [])

    useEffect(() => {
      dateModeRef.current = dateMode
    }, [dateMode])

    const handleModeChange = useCallback((mode: 'best' | 'impossible') => {
      if (isUpdatingRef.current) {
        return
      }
      dateModeRef.current = mode
      setDateMode(mode)
    }, [])

    const isSameDay = (date1: Date, date2: Date) => {
      return date1.getFullYear() === date2.getFullYear() &&
             date1.getMonth() === date2.getMonth() &&
             date1.getDate() === date2.getDate()
    }

    const handleBestDatesSelect = useCallback((dates: Date[] | undefined) => {
      const lockedMode = dateModeRef.current
      if (lockedMode !== 'best') {
        return
      }

      isUpdatingRef.current = true

      if (!dates) {
        setSelectedBestDates([])
        setTimeout(() => {
          isUpdatingRef.current = false
        }, 100)
        return
      }

      setSelectedImpossibleDates(prev => {
        if (!prev) return undefined
        const newImpossibleDates = prev.filter(impossibleDate =>
          !dates.some(bestDate => isSameDay(bestDate, impossibleDate))
        )
        return newImpossibleDates.length > 0 ? newImpossibleDates : undefined
      })

      setSelectedBestDates(dates)
      
      setTimeout(() => {
        isUpdatingRef.current = false
      }, 50)
    }, [])

    const handleImpossibleDatesSelect = useCallback((dates: Date[] | undefined) => {
      const lockedMode = dateModeRef.current
      if (lockedMode !== 'impossible') {
        return
      }

      isUpdatingRef.current = true

      if (!dates) {
        setSelectedImpossibleDates([])
        setTimeout(() => {
          isUpdatingRef.current = false
        }, 100)
        return
      }

      setSelectedBestDates(prev => {
        if (!prev) return undefined
        const newBestDates = prev.filter(bestDate =>
          !dates.some(impossibleDate => isSameDay(bestDate, impossibleDate))
        )
        return newBestDates.length > 0 ? newBestDates : undefined
      })

      setSelectedImpossibleDates(dates)
      
      setTimeout(() => {
        isUpdatingRef.current = false
      }, 50)
    }, [])

    return (
      <>
        <h2 className="text-2xl font-bold mb-6 text-[#1F2937]">6/7: Your Availability</h2>
        <p className="text-gray-600 mb-4">Select your best dates and dates that don't work for you.</p>
        
        <div className="flex justify-center mb-6">
          <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
            <button
              onClick={() => handleModeChange('best')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                dateMode === 'best'
                  ? 'bg-[#0EA5E9] text-white shadow-sm'
                  : 'text-gray-700 hover:text-[#0EA5E9]'
              }`}
            >
              Best Dates
            </button>
            <button
              onClick={() => handleModeChange('impossible')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                dateMode === 'impossible'
                  ? 'bg-red-500 text-white shadow-sm'
                  : 'text-gray-700 hover:text-red-500'
              }`}
            >
              Impossible Dates
            </button>
          </div>
        </div>
        
        <div className="flex justify-center mb-6">
          <style>{`
            .rdp {
              --rdp-cell-size: 40px;
              --rdp-accent-color: #0EA5E9;
              --rdp-background-color: #e0f2fe;
              margin: 0;
            }
            .rdp-day_selected:not([disabled]) { 
              background-color: ${dateMode === 'best' ? '#0EA5E9' : '#ef4444'} !important; 
              color: white;
            }
            .rdp-day_impossible:not(.rdp-day_selected) {
              background-color: #fee2e2 !important;
              color: #991b1b !important;
              border: 2px solid #ef4444 !important;
            }
            .rdp-day_best:not(.rdp-day_selected) {
              background-color: #e0f2fe !important;
              color: #0EA5E9 !important;
              border: 2px solid #0EA5E9 !important;
            }
            .rdp-button:hover:not([disabled]):not(.rdp-day_selected) {
              background-color: ${dateMode === 'best' ? '#e0f2fe' : '#fee2e2'};
              color: ${dateMode === 'best' ? '#0EA5E9' : '#ef4444'};
            }
          `}</style>
          <div className="p-4 bg-white/50 rounded-xl border border-white/60 shadow-sm">
            <DayPicker
              mode="multiple"
              selected={(() => {
                const mode = dateModeRef.current
                return mode === 'best' ? selectedBestDates : selectedImpossibleDates
              })()}
              onSelect={(dates) => {
                const lockedMode = dateModeRef.current
                
                if (isUpdatingRef.current) {
                  return
                }
                
                if (lockedMode === 'best') {
                  handleBestDatesSelect(dates)
                } else if (lockedMode === 'impossible') {
                  handleImpossibleDatesSelect(dates)
                }
              }}
              modifiers={{
                impossible: selectedImpossibleDates || [],
                best: selectedBestDates || []
              }}
              modifiersClassNames={{
                impossible: 'rdp-day_impossible',
                best: 'rdp-day_best'
              }}
            />
          </div>
        </div>

        <div className="mt-8 flex justify-between">
          <button onClick={prevStep} className="text-gray-500 hover:text-[#1F2937]">
            Back
          </button>
          <AccentButton 
            onClick={() => {
              if (selectedBestDates) {
                const sorted = [...selectedBestDates].sort((a, b) => a.getTime() - b.getTime())
                const formatted = sorted.map((d) => format(d, 'MMM d'))
                handleUpdate('availability', formatted)
              }
              if (selectedImpossibleDates) {
                const sorted = [...selectedImpossibleDates].sort((a, b) => a.getTime() - b.getTime())
                const formatted = sorted.map((d) => format(d, 'MMM d'))
                handleUpdate('impossibleDates', formatted)
              }
              nextStep()
            }} 
            disabled={!selectedBestDates || selectedBestDates.length === 0 || loadingAgent}
          >
            Next
          </AccentButton>
        </div>
      </>
    )
  }

  const Step6Review = () => (
    <>
      <h2 className="text-2xl font-bold mb-6 text-[#1F2937]">7/7: Review & Complete</h2>
      <p className="text-gray-600 mb-8">Review your preferences before we generate your personalized recommendations.</p>
      
      <div className="space-y-4 mb-8">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">Name</p>
          <p className="font-semibold text-lg">{profile.name}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">Skill Level</p>
          <p className="font-semibold text-lg">{profile.skill}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">Pass</p>
          <p className="font-semibold text-lg">{profile.pass}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">Budget</p>
          <p className="font-semibold text-lg">{profile.budget}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">Home Region</p>
          <p className="font-semibold text-lg">{profile.address || 'Not set'}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">Best Dates</p>
          {profile.availability && profile.availability.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-2">
              {profile.availability.map((date, index) => (
                <span key={index} className="px-3 py-1 bg-[#0EA5E9]/10 text-[#0EA5E9] rounded-full text-sm font-medium">
                  {date}
                </span>
              ))}
            </div>
          ) : (
            <p className="font-semibold text-lg text-gray-400">No dates selected</p>
          )}
        </div>
        {profile.impossibleDates && profile.impossibleDates.length > 0 && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Impossible Dates</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {profile.impossibleDates.map((date, index) => (
                <span key={index} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                  {date}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-between">
        <button onClick={prevStep} className="text-gray-500 hover:text-[#1F2937]">
          Back
        </button>
        <AccentButton 
          onClick={handleSubmit} 
          disabled={loadingAgent}
        >
          {loadingAgent ? 'Processing...' : <><CheckCircle className="w-5 h-5 mr-2" /> Complete Setup</>}
        </AccentButton>
      </div>
    </>
  )

  const renderStep = () => {
    switch (step) {
      case 0: return <Step0Name />
      case 1: return <Step1Skill />
      case 2: return <Step2Pass />
      case 3: return <Step3Budget />
      case 4: return <Step4Address />
      case 5: return <Step5Availability />
      case 6: return <Step6Review />
      default: return <Step0Name />
    }
  }

  const totalSteps = 7

  return (
    <>
      {/* Loading Modal */}
      {loadingAgent && agentProgress && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <GlassCard className="max-w-md w-full">
            <div className="text-center">
              <div className="mb-6">
                <Loader2 className="w-12 h-12 mx-auto text-[#0EA5E9] animate-spin" />
              </div>
              <h3 className="text-2xl font-bold text-[#1F2937] mb-4">
                AI Agent Processing
              </h3>
              <p className="text-gray-600 mb-6">
                {agentProgress.message}
              </p>
              
              {/* Progress Steps */}
              <div className="space-y-3 mb-6">
                {[1, 2].map((stepNum) => (
                  <div
                    key={stepNum}
                    className={`flex items-center p-3 rounded-lg transition-all ${
                      stepNum < agentProgress.step
                        ? 'bg-green-50 border border-green-200'
                        : stepNum === agentProgress.step
                        ? 'bg-[#0EA5E9]/10 border-2 border-[#0EA5E9]'
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3">
                      {stepNum < agentProgress.step ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : stepNum === agentProgress.step ? (
                        <Loader2 className="w-5 h-5 text-[#0EA5E9] animate-spin" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`font-medium ${
                        stepNum <= agentProgress.step ? 'text-[#1F2937]' : 'text-gray-400'
                      }`}>
                        {stepNum === 1 && 'Analyzing your skill level'}
                        {stepNum === 2 && 'Finalizing recommendations'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div
                  className="bg-[#0EA5E9] h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${(agentProgress.step / agentProgress.totalSteps) * 100}%`
                  }}
                />
              </div>
              <p className="text-sm text-gray-500">
                Step {agentProgress.step} of {agentProgress.totalSteps}
              </p>
            </div>
          </GlassCard>
        </div>
      )}

      <div className="max-w-xl mx-auto py-12">
        <GlassCard>
          <StepIndicator current={step + 1} total={totalSteps} />
          {renderStep()}
        </GlassCard>
      </div>
    </>
  )
}

