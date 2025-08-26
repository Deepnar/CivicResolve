"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { cn } from "@/lib/utils"
import { ISSUE_CATEGORIES, ISSUE_STATUS, DEFAULT_MAP_CENTER, MAP_ZOOM_LEVELS } from "@/lib/constants"
import type { Issue } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Navigation, ZoomIn, ZoomOut } from "lucide-react"

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
})

interface IssueMapProps {
  issues: Issue[]
  selectedIssue?: Issue | null
  onIssueSelect?: (issue: Issue) => void
  onLocationSelect?: (lat: number, lng: number, address: string) => void
  center?: { lat: number; lng: number }
  zoom?: number
  height?: string
  className?: string
  showControls?: boolean
  clustered?: boolean
}

export function IssueMap({
  issues,
  selectedIssue,
  onIssueSelect,
  onLocationSelect,
  center = DEFAULT_MAP_CENTER,
  zoom = MAP_ZOOM_LEVELS.CITY,
  height = "400px",
  className,
  showControls = true,
  clustered = true,
}: IssueMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.LayerGroup>(new L.LayerGroup())
  const [isLoading, setIsLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

  // Create custom icons for different issue types
  const createIssueIcon = (issue: Issue) => {
    const categoryConfig = ISSUE_CATEGORIES[issue.category]
    const statusConfig = ISSUE_STATUS[issue.status]

    return L.divIcon({
      html: `
        <div class="relative">
          <div class="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold" 
               style="background-color: ${categoryConfig.color}">
            ${issue.category.charAt(0)}
          </div>
          <div class="absolute -top-1 -right-1 w-3 h-3 rounded-full border border-white" 
               style="background-color: ${statusConfig.color}"></div>
        </div>
      `,
      className: "custom-issue-marker",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    })
  }

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const map = L.map(mapRef.current, {
      center: [center.lat, center.lng],
      zoom,
      zoomControl: false,
    })

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

    // Add markers layer
    markersRef.current.addTo(map)

    mapInstanceRef.current = map
    setIsLoading(false)

    // Handle map clicks for location selection
    if (onLocationSelect) {
      map.on("click", async (e) => {
        const { lat, lng } = e.latlng
        // In a real app, you'd reverse geocode to get the address
        const address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`
        onLocationSelect(lat, lng, address)
      })
    }

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [center.lat, center.lng, zoom, onLocationSelect])

  // Update markers when issues change
  useEffect(() => {
    if (!mapInstanceRef.current) return

    // Clear existing markers
    markersRef.current.clearLayers()

    // Add issue markers
    issues.forEach((issue) => {
      const marker = L.marker([issue.latitude, issue.longitude], {
        icon: createIssueIcon(issue),
      })

      // Create popup content
      const popupContent = `
        <div class="p-2 min-w-64">
          <h3 class="font-semibold text-gray-900 mb-2 line-clamp-2">${issue.title}</h3>
          <p class="text-sm text-gray-600 mb-3 line-clamp-2">${issue.description}</p>
          <div class="flex items-center gap-2 mb-2">
            <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium" 
                  style="color: ${ISSUE_CATEGORIES[issue.category].color}; background-color: ${ISSUE_CATEGORIES[issue.category].color}20;">
              ${ISSUE_CATEGORIES[issue.category].label}
            </span>
            <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium"
                  style="color: ${ISSUE_STATUS[issue.status].color}; background-color: ${ISSUE_STATUS[issue.status].bgColor};">
              ${ISSUE_STATUS[issue.status].label}
            </span>
          </div>
          <div class="flex items-center justify-between text-xs text-gray-500">
            <span>👍 ${issue.votes?.length || 0} votes</span>
            <span>💬 ${issue.comments?.length || 0} comments</span>
          </div>
        </div>
      `

      marker.bindPopup(popupContent, {
        maxWidth: 300,
        className: "custom-popup",
      })

      // Handle marker click
      marker.on("click", () => {
        if (onIssueSelect) {
          onIssueSelect(issue)
        }
      })

      markersRef.current.addLayer(marker)
    })

    // Fit bounds to show all markers if there are issues
    if (issues.length > 0) {
      const group = new L.FeatureGroup(markersRef.current.getLayers())
      mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1))
    }
  }, [issues, onIssueSelect])

  // Highlight selected issue
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedIssue) return

    // Pan to selected issue
    mapInstanceRef.current.setView([selectedIssue.latitude, selectedIssue.longitude], MAP_ZOOM_LEVELS.STREET, {
      animate: true,
    })
  }, [selectedIssue])

  // Get user location
  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setUserLocation({ lat: latitude, lng: longitude })

          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([latitude, longitude], MAP_ZOOM_LEVELS.NEIGHBORHOOD, {
              animate: true,
            })

            // Add user location marker
            const userMarker = L.marker([latitude, longitude], {
              icon: L.divIcon({
                html: `
                  <div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
                `,
                className: "user-location-marker",
                iconSize: [16, 16],
                iconAnchor: [8, 8],
              }),
            })

            userMarker.addTo(mapInstanceRef.current).bindPopup("Your Location")
          }
        },
        (error) => {
          console.error("Error getting location:", error)
        },
      )
    }
  }

  const zoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn()
    }
  }

  const zoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut()
    }
  }

  return (
    <motion.div
      className={cn("relative rounded-lg overflow-hidden border border-gray-200/50 shadow-sm", className)}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      style={{ height }}
    >
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

      {/* Map controls */}
      {showControls && (
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <motion.div
            className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200/50 p-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Button variant="ghost" size="sm" onClick={zoomIn} className="h-8 w-8 p-0">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={zoomOut} className="h-8 w-8 p-0">
              <ZoomOut className="h-4 w-4" />
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={getUserLocation}
              className="bg-white/90 backdrop-blur-sm border-gray-200/50 gap-2"
            >
              <Navigation className="h-4 w-4" />
              My Location
            </Button>
          </motion.div>
        </div>
      )}

      {/* Legend */}
      <motion.div
        className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200/50 p-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <h4 className="text-sm font-medium text-gray-900 mb-2">Issue Types</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {Object.entries(ISSUE_CATEGORIES)
            .slice(0, 4)
            .map(([key, config]) => (
              <div key={key} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full border border-white shadow-sm"
                  style={{ backgroundColor: config.color }}
                />
                <span className="text-gray-700">{config.label.split(" ")[0]}</span>
              </div>
            ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
