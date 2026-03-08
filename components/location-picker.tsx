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

// Custom icon for existing issues (red)
const existingIssueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

// Custom icon for new location (blue)
const newLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

interface ExistingIssue {
  id: string
  title: string
  category: string
  status: string
  latitude: number
  longitude: number
  address: string
  createdAt: string
}

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
  const existingIssuesMarkersRef = useRef<L.Marker[]>([])
  const [existingIssues, setExistingIssues] = useState<ExistingIssue[]>([])
  const [isLoadingIssues, setIsLoadingIssues] = useState(false)

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
      // Clean up existing issue markers
      existingIssuesMarkersRef.current.forEach(marker => {
        mapInstanceRef.current?.removeLayer(marker)
      })
      existingIssuesMarkersRef.current = []
      // Clean up selected location marker
      if (markerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(markerRef.current)
      }
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
        markerRef.current = L.marker([selectedPosition.lat, selectedPosition.lng], {
          icon: newLocationIcon
        }).addTo(mapInstanceRef.current)
        markerRef.current.bindPopup("<b>Your selected location</b>")
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
      
      // Add new marker with blue icon
      markerRef.current = L.marker([selectedPosition.lat, selectedPosition.lng], {
        icon: newLocationIcon
      }).addTo(mapInstanceRef.current)
      markerRef.current.bindPopup("<b>Your selected location</b>")
      mapInstanceRef.current.setView([selectedPosition.lat, selectedPosition.lng], 16)
    }
  }, [selectedPosition])

  // Fetch existing issues
  useEffect(() => {
    const fetchExistingIssues = async () => {
      setIsLoadingIssues(true)
      try {
        const response = await fetch('/api/issues?limit=1000')
        if (response.ok) {
          const data = await response.json()
          setExistingIssues(data.issues || [])
        }
      } catch (error) {
        console.error('Error fetching existing issues:', error)
      } finally {
        setIsLoadingIssues(false)
      }
    }

    fetchExistingIssues()
  }, [])

  // Display existing issues on map
  useEffect(() => {
    if (mapInstanceRef.current && existingIssues.length > 0) {
      // Remove old markers
      existingIssuesMarkersRef.current.forEach(marker => {
        mapInstanceRef.current?.removeLayer(marker)
      })
      existingIssuesMarkersRef.current = []

      // Add markers for all existing issues
      existingIssues.forEach(issue => {
        if (issue.latitude && issue.longitude) {
          const marker = L.marker([issue.latitude, issue.longitude], {
            icon: existingIssueIcon
          }).addTo(mapInstanceRef.current!)

          // Create popup content
          const popupContent = `
            <div style="min-width: 200px;">
              <h3 style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">${issue.title}</h3>
              <div style="font-size: 12px; color: #666;">
                <p><strong>Category:</strong> ${issue.category}</p>
                <p><strong>Status:</strong> <span style="color: ${getStatusColor(issue.status)};">${issue.status}</span></p>
                <p><strong>Reported:</strong> ${new Date(issue.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          `
          marker.bindPopup(popupContent)
          existingIssuesMarkersRef.current.push(marker)
        }
      })
    }
  }, [mapInstanceRef.current, existingIssues])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return '#f59e0b'
      case 'IN_PROGRESS': return '#3b82f6'
      case 'RESOLVED': return '#10b981'
      case 'REJECTED': return '#ef4444'
      default: return '#6b7280'
    }
  }

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
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-[1000] max-w-xs">
          <p className="text-sm text-gray-700 mb-2">Click on the map or search for an address to select a location</p>
          <div className="flex items-center gap-2 text-xs text-gray-600 mt-2 pt-2 border-t">
            <div className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 bg-blue-500 rounded-full"></span>
              <span>Your location</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 bg-red-500 rounded-full"></span>
              <span>Existing issues ({existingIssues.length})</span>
            </div>
          </div>
          {isLoadingIssues && (
            <p className="text-xs text-gray-500 mt-1">Loading existing issues...</p>
          )}
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
