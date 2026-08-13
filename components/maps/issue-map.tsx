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

  // Calculate engagement score for prioritization
  const calculateEngagementScore = (issue: Issue) => {
    const votesCount = issue.votes_count || issue.votes?.length || 0
    const commentsCount = issue.comments_count || issue.comments?.length || 0
    
    // Weight votes and comments (comments are weighted higher as they require more engagement)
    return (votesCount * 1) + (commentsCount * 2)
  }

  // Get priority color based on engagement score
  const getPriorityColor = (engagementScore: number, maxScore: number, issueStatus: string) => {
    // If issue is resolved, always show green regardless of engagement
    if (issueStatus?.toUpperCase() === 'RESOLVED') {
      return '#10b981' // Green for resolved issues
    }
    
    if (maxScore === 0) return '#ffffff' // White for no engagement
    
    const ratio = Math.min(engagementScore / maxScore, 1)
    
    if (ratio === 0) return '#ffffff' // White
    if (ratio <= 0.33) {
      // White to Yellow gradient (low engagement)
      const intensity = Math.floor(255 * (ratio / 0.33))
      return `rgb(255, 255, ${255 - intensity})`
    } else if (ratio <= 0.66) {
      // Yellow to Orange gradient (medium engagement)
      const intensity = Math.floor(255 * ((ratio - 0.33) / 0.33))
      return `rgb(255, ${255 - intensity}, 0)`
    } else {
      // Orange to Red gradient (high engagement)
      const intensity = Math.floor(255 * ((ratio - 0.66) / 0.34))
      return `rgb(255, ${Math.max(0, 165 - intensity)}, 0)`
    }
  }

  // Sort issues by engagement score (highest first)
  const sortedIssues = [...issues].sort((a, b) => {
    const scoreA = calculateEngagementScore(a)
    const scoreB = calculateEngagementScore(b)
    return scoreB - scoreA
  })

  // Get maximum engagement score for color scaling
  const maxEngagementScore = Math.max(...sortedIssues.map(calculateEngagementScore), 1)

  // Create custom icons for different issue types
  const createIssueIcon = (issue: Issue) => {
    // Safe category lookup with fallback
    const categoryKey = issue.category?.toUpperCase() as keyof typeof ISSUE_CATEGORIES
    const statusKey = issue.status?.toUpperCase() as keyof typeof ISSUE_STATUS
    const categoryConfig = ISSUE_CATEGORIES[categoryKey] || ISSUE_CATEGORIES.OTHER
    const statusConfig = ISSUE_STATUS[statusKey] || ISSUE_STATUS.PENDING
    
    const engagementScore = calculateEngagementScore(issue)
    const isHighPriority = engagementScore > maxEngagementScore * 0.6 && issue.status?.toUpperCase() !== 'RESOLVED'
    
    // Modern color scheme with better contrast
    let bgColor, textColor, borderColor;
    
    if (issue.status?.toUpperCase() === 'RESOLVED') {
      bgColor = '#10b981' // Emerald green
      textColor = '#ffffff'
      borderColor = '#059669'
    } else {
      // Use engagement-based modern colors
      if (engagementScore === 0) {
        bgColor = '#f1f5f9' // Light slate
        textColor = '#475569' // Slate 600
        borderColor = '#cbd5e1'
      } else if (engagementScore <= maxEngagementScore * 0.33) {
        bgColor = '#dbeafe' // Light blue
        textColor = '#1e40af' // Blue 800
        borderColor = '#3b82f6'
      } else if (engagementScore <= maxEngagementScore * 0.66) {
        bgColor = '#fed7aa' // Light orange
        textColor = '#ea580c' // Orange 600
        borderColor = '#f97316'
      } else {
        bgColor = '#fecaca' // Light red
        textColor = '#dc2626' // Red 600
        borderColor = '#ef4444'
      }
    }

    // Create engagement badge HTML with modern styling
    const engagementBadge = engagementScore > 0 ? 
      `<div class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white text-xs flex items-center justify-center font-bold shadow-lg border-2 border-white">${engagementScore}</div>` : ''

    const categoryInitial = issue.category?.charAt(0) || '?'

    return L.divIcon({
      html: `
        <div class="relative">
          <div class="w-10 h-10 rounded-full shadow-lg flex items-center justify-center text-sm font-bold transition-all duration-200 hover:scale-110" 
               style="background: ${bgColor}; color: ${textColor}; border: 2px solid ${borderColor};">
            ${categoryInitial}
          </div>
          <div class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm" 
               style="background-color: ${statusConfig.color}"></div>
          ${engagementBadge}
          ${isHighPriority ? '<div class="absolute inset-0 w-10 h-10 rounded-full border-2 border-red-400 animate-pulse"></div>' : ''}
        </div>
      `,
      className: `custom-issue-marker ${isHighPriority ? 'high-priority' : ''}`,
      iconSize: [isHighPriority ? 44 : 40, isHighPriority ? 44 : 40],
      iconAnchor: [isHighPriority ? 22 : 20, isHighPriority ? 22 : 20],
      popupAnchor: [0, isHighPriority ? -22 : -20],
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

    // Add issue markers using sorted issues for proper z-index
    sortedIssues.forEach((issue) => {
      // Skip issues without a real pin (0,0 / null) — they'd render in the ocean
      if (!issue.latitude || !issue.longitude) return

      const marker = L.marker([issue.latitude, issue.longitude], {
        icon: createIssueIcon(issue),
      })
      // Create popup content with engagement info
      const engagementScore = calculateEngagementScore(issue)
      const categoryKey = issue.category?.toUpperCase() as keyof typeof ISSUE_CATEGORIES
      const statusKey = issue.status?.toUpperCase() as keyof typeof ISSUE_STATUS
      const categoryConfig = ISSUE_CATEGORIES[categoryKey] || ISSUE_CATEGORIES.OTHER
      const statusConfig = ISSUE_STATUS[statusKey] || ISSUE_STATUS.PENDING
      
      const popupContent = `
        <div class="p-4 min-w-72 bg-white/95 backdrop-blur-sm">
          <h3 class="font-semibold text-gray-900 mb-2 line-clamp-2 text-lg">${issue.title || 'Untitled Issue'}</h3>
          <p class="text-sm text-gray-600 mb-3 line-clamp-3">${issue.description || 'No description available'}</p>
          <div class="flex items-center gap-2 mb-3">
            <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white shadow-sm" 
                  style="background: linear-gradient(135deg, ${categoryConfig.color}, ${categoryConfig.color}dd);">
              ${categoryConfig.label}
            </span>
            <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white shadow-sm"
                  style="background: linear-gradient(135deg, ${statusConfig.color}, ${statusConfig.color}dd);">
              ${statusConfig.label}
            </span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <div class="flex items-center gap-3 text-gray-600">
              <span class="flex items-center gap-1">
                <span class="text-blue-500">👍</span>
                <span class="font-medium">${issue.votes_count || issue.votes?.length || 0}</span>
              </span>
              <span class="flex items-center gap-1">
                <span class="text-green-500">💬</span>
                <span class="font-medium">${issue.comments_count || issue.comments?.length || 0}</span>
              </span>
            </div>
            ${engagementScore > 0 ? `
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r from-red-500 to-red-600 shadow-sm">
                🔥 ${engagementScore}
              </span>
            ` : ''}
          </div>
          <div class="mt-3 pt-3 border-t border-gray-200">
            <p class="text-xs text-gray-500">📍 ${issue.address || 'Location not specified'}</p>
          </div>
        </div>
      `

      marker.bindPopup(popupContent, {
        maxWidth: 300,
        className: "custom-popup",
      })

      // Handle marker click
      if (onIssueSelect) {
        marker.on("click", () => {
          onIssueSelect(issue)
        })
      }

      markersRef.current.addLayer(marker)
    })

    // Highlight selected issue
    if (selectedIssue) {
      const bounds = L.latLngBounds([
        [selectedIssue.latitude, selectedIssue.longitude]
      ])
      mapInstanceRef.current.fitBounds(bounds, {
        maxZoom: MAP_ZOOM_LEVELS.STREET,
        padding: [20, 20]
      })
    } else if (!onLocationSelect && sortedIssues.length > 0) {
      // Fit view to ALL issue markers so nothing is stranded off-screen
      const coords = sortedIssues
        .filter(i => i.latitude && i.longitude)
        .map(i => [i.latitude, i.longitude] as [number, number])
      if (coords.length > 1) {
        mapInstanceRef.current.fitBounds(L.latLngBounds(coords), {
          maxZoom: MAP_ZOOM_LEVELS.CITY,
          padding: [40, 40],
        })
      }
    }
  }, [sortedIssues, selectedIssue, onIssueSelect, maxEngagementScore])

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setUserLocation({ lat: latitude, lng: longitude })

          // Add user location marker
          if (mapInstanceRef.current) {
            const userIcon = L.divIcon({
              html: `
                <div class="relative">
                  <div class="w-5 h-5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
                  <div class="absolute -inset-2 bg-blue-400 rounded-full opacity-30 animate-ping"></div>
                  <div class="absolute -inset-1 bg-blue-500 rounded-full opacity-20"></div>
                </div>
              `,
              className: "user-location-marker",
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            })

            L.marker([latitude, longitude], { icon: userIcon })
              .addTo(mapInstanceRef.current)
              .bindPopup("Your Location", { className: "user-popup" })
          }
        },
        (error) => {
          console.warn("Geolocation error:", error)
        }
      )
    }
  }, [])

  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn()
    }
  }

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut()
    }
  }

  const handleCenterOnUser = () => {
    if (mapInstanceRef.current && userLocation) {
      mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], MAP_ZOOM_LEVELS.STREET)
    }
  }

  return (
    <div className={cn("relative overflow-hidden rounded-lg border bg-background", className)}>
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </motion.div>
        </div>
      )}

      {/* Map container */}
      <div
        ref={mapRef}
        className="w-full"
        style={{ height }}
      />

      {/* Map controls */}
      {showControls && (
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={handleZoomIn}
            className="h-8 w-8 shadow-md"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={handleZoomOut}
            className="h-8 w-8 shadow-md"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          {userLocation && (
            <Button
              variant="secondary"
              size="icon"
              onClick={handleCenterOnUser}
              className="h-8 w-8 shadow-md"
              title="Center on your location"
            >
              <Navigation className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-20 rounded-lg bg-background/90 p-3 shadow-md backdrop-blur-sm">
        <h4 className="mb-2 text-xs font-semibold text-foreground">Priority Level</h4>
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full bg-white border border-gray-300"></div>
            <span>Low</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full bg-red-500"></div>
            <span>High</span>
          </div>
        </div>
      </div>
    </div>
  )
}