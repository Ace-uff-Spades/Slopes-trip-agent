'use client'

import { useEffect, useRef, useState } from 'react'

interface GooglePlacesAutocompleteProps {
  value: string
  onChange: (address: string, coordinates?: { lat: number; lng: number }) => void
  placeholder?: string
  className?: string
}

declare global {
  interface Window {
    google: any
    initGooglePlaces: () => void
  }
}

export function GooglePlacesAutocomplete({
  value,
  onChange,
  placeholder = 'Enter your address',
  className = ''
}: GooglePlacesAutocompleteProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)

  useEffect(() => {
    // Load Google Places API script
    const loadGooglePlaces = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        setIsLoaded(true)
        return
      }

      const script = document.createElement('script')
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      
      if (!apiKey) {
        console.warn('Google Places API key not found. Address autocomplete will not work.')
        setIsLoaded(true) // Still set to true so input works normally
        return
      }

      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
      script.async = true
      script.defer = true
      script.onload = () => {
        setIsLoaded(true)
      }
      script.onerror = () => {
        console.error('Failed to load Google Places API')
        setIsLoaded(true) // Still allow manual input
      }
      document.head.appendChild(script)
    }

    loadGooglePlaces()
  }, [])

  useEffect(() => {
    if (!isLoaded || !window.google || !inputRef.current) return

    // Initialize autocomplete
    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      fields: ['formatted_address', 'geometry', 'name']
    })

    autocompleteRef.current = autocomplete

    // Handle place selection
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      
      if (place.formatted_address) {
        const coordinates = place.geometry?.location
          ? {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            }
          : undefined

        onChange(place.formatted_address, coordinates)
      }
    })

    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }
    }
  }, [isLoaded, onChange])

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
    />
  )
}

