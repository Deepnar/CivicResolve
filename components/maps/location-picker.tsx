"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { cn } from "@/lib/utils"
import { DEFAULT_MAP_CENTER, MAP_ZOOM_LEVELS } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MapPin, Navigation, Search } from "lucide-react"

interface LocationPickerProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void
  initialLocation?: { lat: number; lng: number }
  height?: string
  className?: string
}

export function LocationPicker({
  onLocationSelect,
  initialLocation,
  height = "300px",
  className,
}: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; address: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const center = initialLocation || DEFAULT_MAP_CENTER
    const map = L.map(mapRef.current, {
      center: [center.lat, center.lng],
      zoom: MAP_ZOOM_LEVELS.NEIGHBORHOOD,
      zoomControl: true,
    })

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

    mapInstanceRef.current = map
    setIsLoading(false)

    // Handle map clicks
    map.on("click", async (e) => {
      const { lat, lng } = e.latlng
      await handleLocationSelect(lat, lng)
    })

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [initialLocation])

  const handleLocationSelect = async (lat: number, lng: number) => {
    if (!mapInstanceRef.current) return

    // Remove existing marker
    if (markerRef.current) {
      mapInstanceRef.current.removeLayer(markerRef.current)
    }

    // Add new marker
    const marker = L.marker([lat, lng], {
      icon: L.divIcon({
        html: `
          <div class="relative">
            <div class="w-8 h-8 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        `,
        className: "location-picker-marker",
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      }),
    })

    marker.addTo(mapInstanceRef.current)
    markerRef.current = marker

    // Reverse geocode to get address (mock implementation)
    const address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`

    const location = { lat, lng, address }
    setSelectedLocation(location)
    onLocationSelect(lat, lng, address)
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([latitude, longitude], MAP_ZOOM_LEVELS.NEIGHBORHOOD, {
              animate: true,
            })
            handleLocationSelect(latitude, longitude)
          }
        },
        (error) => {
          console.error("Error getting location:", error)
        },
      )
    }
  }

  const searchLocation = async () => {
    if (!searchQuery.trim()) return

    // Mock geocoding - in a real app, you'd use a geocoding service
    // For demo purposes, we'll just center on NYC
    const mockResults = [
      { lat: 40.7128, lng: -74.006, address: "New York, NY" },
      { lat: 40.7589, lng: -73.9851, address: "Times Square, NY" },
      { lat: 40.7829, lng: -73.9654, address: "Central Park, NY" },
    ]

    const result = mockResults[0]
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([result.lat, result.lng], MAP_ZOOM_LEVELS.NEIGHBORHOOD, {
        animate: true,
      })
      handleLocationSelect(result.lat, result.lng)
    }
  }

  return (
    <motion.div
      className={cn("space-y-4", className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search for an address or place..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && searchLocation()}
            className="pl-10"
          />
        </div>
        <Button onClick={searchLocation} variant="outline" className="gap-2 bg-transparent">
          <Search className="h-4 w-4" />
          Search
        </Button>
        <Button onClick={getCurrentLocation} variant="outline" className="gap-2 bg-transparent">
          <Navigation className="h-4 w-4" />
          Current
        </Button>
      </div>

      {/* Map */}
      <div className="relative rounded-lg overflow-hidden border border-gray-200/50 shadow-sm" style={{ height }}>
        <div ref={mapRef} className="w-full h-full" />

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
            <div className="flex items-center gap-2 text-gray-600">
              <motion.div
                className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              />
              Loading map...
            </div>
          </div>
        )}

        {/* Instructions overlay */}
        {!selectedLocation && !isLoading && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg text-center">
              <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-700 font-medium">Click on the map to select a location</p>
              <p className="text-xs text-gray-500 mt-1">Or use the search bar above</p>
            </div>
          </div>
        )}
      </div>

      {/* Selected location info */}
      {selectedLocation && (
        <motion.div
          className="bg-green-50 border border-green-200 rounded-lg p-3"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-900">Location Selected</p>
              <p className="text-xs text-green-700">{selectedLocation.address}</p>
              <p className="text-xs text-green-600">
                {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
