"use client"

import { useState, useRef, useEffect } from "react"
import { LatLng } from "leaflet"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { AddressAutocomplete } from "@/components/ui/address-autocomplete"
import "leaflet/dist/leaflet.css"

// Import Leaflet dynamically to avoid SSR issues
import L from "leaflet"

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
})

interface LocationPickerProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void
  initialAddress?: string
  initialLat?: number
  initialLng?: number
}

export default function LocationPicker({ 
  onLocationSelect, 
  initialAddress = "", 
  initialLat, 
  initialLng 
}: LocationPickerProps) {
  const [selectedPosition, setSelectedPosition] = useState<LatLng | null>(
    initialLat && initialLng ? new LatLng(initialLat, initialLng) : null
  )
  const [address, setAddress] = useState(initialAddress)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [mapKey] = useState(() => `map-${Date.now()}-${Math.random()}`) // Unique key for this map instance
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  // Default to Mumbai, India
  const defaultCenter: [number, number] = [19.0760, 72.8777]

  // Update position when initial coordinates change
  useEffect(() => {
    if (initialLat && initialLng) {
      setSelectedPosition(new LatLng(initialLat, initialLng))
    }
  }, [initialLat, initialLng])

  // Update address when initial address changes
  useEffect(() => {
    setAddress(initialAddress)
  }, [initialAddress])

  // Cleanup any existing map instances when component unmounts
  useEffect(() => {
    // Delay mounting to ensure clean state
    const timer = setTimeout(() => setMounted(true), 50)
    
    return () => {
      clearTimeout(timer)
      setMounted(false)
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
      if (mapContainerRef.current) {
        mapContainerRef.current.innerHTML = ''
      }
    }
  }, [])

  // Initialize Leaflet map when mounted
  useEffect(() => {
    if (mounted && mapContainerRef.current && !mapInstanceRef.current) {
      const center = selectedPosition ? [selectedPosition.lat, selectedPosition.lng] as [number, number] : defaultCenter
      
      // Create map instance
      mapInstanceRef.current = L.map(mapContainerRef.current).setView(center, selectedPosition ? 16 : 13)
      
      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapInstanceRef.current)
      
      // Add click handler
      mapInstanceRef.current.on('click', (e: L.LeafletMouseEvent) => {
        handleMapClick(new LatLng(e.latlng.lat, e.latlng.lng))
      })
      
      // Add initial marker if position exists
      if (selectedPosition) {
        markerRef.current = L.marker([selectedPosition.lat, selectedPosition.lng]).addTo(mapInstanceRef.current)
      }
    }
  }, [mounted, selectedPosition])

  // Update marker when position changes
  useEffect(() => {
    if (mapInstanceRef.current && selectedPosition) {
      // Remove old marker
      if (markerRef.current) {
        mapInstanceRef.current.removeLayer(markerRef.current)
      }
      
      // Add new marker
      markerRef.current = L.marker([selectedPosition.lat, selectedPosition.lng]).addTo(mapInstanceRef.current)
      mapInstanceRef.current.setView([selectedPosition.lat, selectedPosition.lng], 16)
    }
  }, [selectedPosition])

  const handleMapClick = async (latlng: LatLng) => {
    setSelectedPosition(latlng)
    setIsGeocoding(true)

    try {
      // Reverse geocoding using Nominatim (free OpenStreetMap service)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&zoom=18&addressdetails=1`,
      )
      const data = await response.json()

      if (data.display_name) {
        setAddress(data.display_name)
      }
    } catch (error) {
      console.error("Geocoding error:", error)
      setAddress(`${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`)
    } finally {
      setIsGeocoding(false)
    }
  }

  const handleAddressSelect = (lat: number, lng: number, selectedAddress: string) => {
    const latlng = new LatLng(lat, lng)
    setSelectedPosition(latlng)
    setAddress(selectedAddress)
  }

  const handleConfirmLocation = () => {
    if (selectedPosition && address) {
      onLocationSelect(selectedPosition.lat, selectedPosition.lng, address)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Address Input */}
      <div className="p-4 border-b bg-gray-50" style={{ overflow: 'visible', position: 'relative', zIndex: 10 }}>
        <div className="space-y-2">
          <Label htmlFor="address-search">Search Address</Label>
          <div style={{ position: 'relative', zIndex: 10 }}>
            <AddressAutocomplete
              value={address}
              onChange={setAddress}
              onSelect={handleAddressSelect}
              placeholder="Start typing an address in Mumbai..."
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <div key={mapKey} className="h-full w-full">
          {mounted ? (
            <div 
              ref={mapContainerRef} 
              className="h-full w-full"
              style={{ height: "100%", width: "100%" }}
            />
          ) : (
            <div className="h-full bg-gray-100 flex items-center justify-center">
              <div className="text-gray-500">Loading map...</div>
            </div>
          )}
        </div>

        {/* Instructions overlay */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-[1000]">
          <p className="text-sm text-gray-700">Click on the map or search for an address to select a location</p>
        </div>
      </div>

      {/* Confirm Button */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selectedPosition ? (
              <span>
                Selected: {selectedPosition.lat.toFixed(6)}, {selectedPosition.lng.toFixed(6)}
              </span>
            ) : (
              <span>No location selected</span>
            )}
          </div>
          <Button
            onClick={handleConfirmLocation}
            disabled={!selectedPosition || !address}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Confirm Location
          </Button>
        </div>
      </div>
    </div>
  )
}
