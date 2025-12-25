'use client'

import { useState } from 'react'
import { Calendar, MapPin, Car, Home, Map as MapIcon, Clock, Users, DollarSign, ExternalLink, Image as ImageIcon, RefreshCw } from 'lucide-react'
import { GeneratedSchedule, TransportationOption, AccommodationOption, DayItinerary, Slope, PlanState } from '@/lib/types'
import { GlassCard } from './ui/GlassCard'
import { AccentButton } from './ui/AccentButton'

interface ScheduleDisplayProps {
  schedule: GeneratedSchedule
  planData?: PlanState
  isOwner?: boolean
  onRegenerateSection?: (section: 'transportation' | 'accommodation' | 'itinerary') => Promise<void>
}

export function ScheduleDisplay({ schedule, planData, isOwner, onRegenerateSection }: ScheduleDisplayProps) {
  const [activeTab, setActiveTab] = useState<'transportation' | 'accommodation' | 'itinerary'>('transportation')

  const tabs = [
    { id: 'transportation' as const, label: 'Transportation', icon: Car },
    { id: 'accommodation' as const, label: 'Accommodation', icon: Home },
    { id: 'itinerary' as const, label: 'Itinerary', icon: Calendar }
  ]

  // Create a map of member IDs to names
  const memberNameMap = new Map<string, string>()
  if (planData?.members) {
    planData.members.forEach(member => {
      memberNameMap.set(member.id, member.name)
    })
  }

  const getMemberName = (memberId: string): string => {
    return memberNameMap.get(memberId) || memberId
  }

  const renderTransportation = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-bold text-[#1F2937]">Transportation Options</h3>
        {isOwner && onRegenerateSection && (
          <AccentButton
            onClick={() => onRegenerateSection('transportation')}
            className="text-sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Regenerate Transportation
          </AccentButton>
        )}
      </div>
      {schedule.transportation.map((option: TransportationOption, index: number) => (
        <GlassCard key={`transportation-${option.id || index}-${option.method}`} className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  option.type === 'group' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {option.type === 'group' ? 'Group Travel' : 'Individual'}
                </span>
                <span className="text-lg font-bold text-[#0EA5E9]">{option.method}</span>
              </div>
              <p className="text-gray-700 mb-3">{option.description}</p>
              {option.route && (
                <p className="text-sm text-gray-600 italic">{option.route}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200">
            <div>
              <div className="flex items-center text-sm text-gray-600 mb-1">
                <DollarSign className="w-4 h-4 mr-1" />
                Total Cost
              </div>
              <p className="text-lg font-bold text-green-600">${option.cost.total.toFixed(2)}</p>
            </div>
            <div>
              <div className="flex items-center text-sm text-gray-600 mb-1">
                <DollarSign className="w-4 h-4 mr-1" />
                Per Person
              </div>
              <p className="text-lg font-bold text-green-600">${option.cost.perPerson.toFixed(2)}</p>
            </div>
            <div>
              <div className="flex items-center text-sm text-gray-600 mb-1">
                <Clock className="w-4 h-4 mr-1" />
                Duration
              </div>
              <p className="text-lg font-bold text-gray-800">{option.duration}</p>
            </div>
            {option.meetingPoint && (
              <div>
                <div className="flex items-center text-sm text-gray-600 mb-1">
                  <MapPin className="w-4 h-4 mr-1" />
                  Meeting Point
                </div>
                <p className="text-sm font-medium text-gray-800">{option.meetingPoint}</p>
              </div>
            )}
          </div>
          {option.members.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-2">Members using this option:</p>
              <div className="flex flex-wrap gap-2">
                {option.members.map((memberId) => (
                  <span key={memberId} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm">
                    {getMemberName(memberId)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </GlassCard>
      ))}
    </div>
  )

  const renderAccommodation = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-bold text-[#1F2937]">Accommodation Options</h3>
        {isOwner && onRegenerateSection && (
          <AccentButton
            onClick={() => onRegenerateSection('accommodation')}
            className="text-sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Regenerate Accommodation
          </AccentButton>
        )}
      </div>
      {schedule.accommodation.map((option: AccommodationOption, index: number) => (
        <GlassCard key={option.id || `accommodation-${index}`} className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {option.photos && option.photos.length > 0 && (
              <div className="md:w-1/3">
                <div className="grid grid-cols-2 gap-2">
                  {option.photos
                    .filter(photo => photo && photo.trim() !== '') // Filter out empty/invalid URLs
                    .slice(0, 4)
                    .map((photo, idx) => (
                    <img
                      key={idx}
                      src={photo}
                      alt={`${option.name} photo ${idx + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                      onError={(e) => {
                        console.warn(`Failed to load photo for ${option.name}:`, photo);
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-xl font-bold text-[#0EA5E9] mb-1">{option.name}</h4>
                  <p className="text-sm text-gray-600 flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    {option.address}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  option.type === 'airbnb' ? 'bg-pink-100 text-pink-700' :
                  option.type === 'lodge' ? 'bg-green-100 text-green-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {option.type.charAt(0).toUpperCase() + option.type.slice(1)}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Price Per Person</div>
                  <p className="text-lg font-bold text-green-600">${option.pricePerPerson.toFixed(2)}</p>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Total Price</div>
                  <p className="text-lg font-bold text-green-600">${option.totalPrice.toFixed(2)}</p>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Proximity to Slopes</div>
                  <p className="text-sm font-medium text-gray-800">{option.proximityToSlopes}</p>
                </div>
              </div>
              {option.amenities && option.amenities.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-2">Amenities</div>
                  <div className="flex flex-wrap gap-2">
                    {option.amenities.map((amenity, idx) => (
                      <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {option.bookingLink && (
                <a
                  href={option.bookingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-[#0EA5E9] text-white rounded-lg hover:bg-[#0284c7] transition"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Book Now
                </a>
              )}
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  )

  const renderItinerary = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-bold text-[#1F2937]">Day-by-Day Itinerary</h3>
        <div className="flex items-center gap-4">
          {isOwner && onRegenerateSection && (
            <AccentButton
              onClick={() => onRegenerateSection('itinerary')}
              className="text-sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate Itinerary
            </AccentButton>
          )}
          {schedule.skiMap && (
            schedule.skiMap.imageUrl && !schedule.skiMap.imageNotFound ? (
              <a
                href={schedule.skiMap.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-[#0EA5E9] hover:underline"
              >
                <MapIcon className="w-5 h-5 mr-2" />
                View Ski Map
              </a>
            ) : (
              <span className="text-sm text-gray-500 flex items-center">
                <ImageIcon className="w-4 h-4 mr-1" />
                Ski map image not available
              </span>
            )
          )}
        </div>
      </div>

      {schedule.skiMap && schedule.skiMap.slopes && schedule.skiMap.slopes.length > 0 && (
        <GlassCard className="p-6 mb-6">
          <h4 className="text-lg font-bold text-[#1F2937] mb-4">Available Slopes</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {schedule.skiMap.slopes.map((slope: Slope, idx: number) => (
              <div key={idx} className="p-3 bg-white/50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-gray-800">{slope.name}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    slope.difficulty === 'Green Circle' ? 'bg-green-100 text-green-700' :
                    slope.difficulty === 'Blue Square' ? 'bg-blue-100 text-blue-700' :
                    slope.difficulty === 'Black Diamond' ? 'bg-gray-800 text-white' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {slope.difficulty}
                  </span>
                </div>
                {slope.conditions && (
                  <p className="text-xs text-gray-600 mt-1">Conditions: {slope.conditions}</p>
                )}
                {slope.length && (
                  <p className="text-xs text-gray-600">Length: {slope.length}</p>
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {schedule.itinerary.map((day: DayItinerary) => (
        <GlassCard key={day.day} className="p-6">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
            <h4 className="text-xl font-bold text-[#0EA5E9]">Day {day.day}: {day.date}</h4>
          </div>

          {/* Morning */}
          <div className="mb-6">
            <div className="flex items-center mb-3">
              <Clock className="w-5 h-5 mr-2 text-[#0EA5E9]" />
              <h5 className="text-lg font-semibold text-[#1F2937]">Morning</h5>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg mb-3">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Meetup:</strong> {day.morning.meetupTime} at {day.morning.meetupLocation}
              </p>
              <p className="text-gray-700">{day.morning.description}</p>
            </div>
            {day.morning.groupSlopes.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Group Slopes:</p>
                <div className="flex flex-wrap gap-2">
                  {day.morning.groupSlopes.map((slope: Slope, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                      {slope.name} ({slope.difficulty})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Lunch */}
          <div className="mb-6">
            <div className="flex items-center mb-3">
              <Clock className="w-5 h-5 mr-2 text-[#F97316]" />
              <h5 className="text-lg font-semibold text-[#1F2937]">Lunch</h5>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700 mb-1">
                <strong>Time:</strong> {day.lunch.time}
              </p>
              <p className="text-sm text-gray-700 mb-1">
                <strong>Location:</strong> {day.lunch.location}
              </p>
              {day.lunch.description && (
                <p className="text-gray-700">{day.lunch.description}</p>
              )}
            </div>
          </div>

          {/* Afternoon */}
          <div className="mb-6">
            <div className="flex items-center mb-3">
              <Clock className="w-5 h-5 mr-2 text-[#0EA5E9]" />
              <h5 className="text-lg font-semibold text-[#1F2937]">Afternoon</h5>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg mb-3">
              <p className="text-gray-700">{day.afternoon.description}</p>
            </div>
            {day.afternoon.groupSlopes && day.afternoon.groupSlopes.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Group Slopes:</p>
                <div className="flex flex-wrap gap-2">
                  {day.afternoon.groupSlopes.map((slope: Slope, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                      {slope.name} ({slope.difficulty})
                    </span>
                  ))}
                </div>
              </div>
            )}
            {Object.keys(day.afternoon.individualSlopes).length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Individual Recommendations:</p>
                <div className="space-y-3">
                  {Object.entries(day.afternoon.individualSlopes).map(([memberId, data]) => (
                    <div key={memberId} className="bg-white p-3 rounded-lg border border-gray-200">
                      <p className="font-semibold text-gray-800 mb-2">
                        {data.memberName} ({data.skillLevel})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {data.recommendedSlopes.map((slope: Slope, idx: number) => (
                          <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                            {slope.name} ({slope.difficulty})
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Apres-Ski */}
          {day.apresSki && (
            <div>
              <div className="flex items-center mb-3">
                <Clock className="w-5 h-5 mr-2 text-[#F97316]" />
                <h5 className="text-lg font-semibold text-[#1F2937]">Apres-Ski</h5>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700 mb-1">
                  <strong>Time:</strong> {day.apresSki.time}
                </p>
                <p className="text-sm text-gray-700 mb-1">
                  <strong>Location:</strong> {day.apresSki.location}
                </p>
                <p className="text-gray-700">{day.apresSki.description}</p>
              </div>
            </div>
          )}
        </GlassCard>
      ))}
    </div>
  )

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-6 py-3 font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'text-[#0EA5E9] border-b-2 border-[#0EA5E9]'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Icon className="w-5 h-5 mr-2" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'transportation' && renderTransportation()}
        {activeTab === 'accommodation' && renderAccommodation()}
        {activeTab === 'itinerary' && renderItinerary()}
      </div>
    </div>
  )
}

const CheckCircle = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
)

