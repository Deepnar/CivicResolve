"use client"

import { useState } from "react"
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet"
import { LatLng } from "leaflet"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { AddressAutocomplete } from "@/components/ui/address-autocomplete"
import "leaflet/dist/leaflet.css"

// Fix for default markers in react-leaflet
import L from "leaflet"
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
})

interface LocationPickerProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void
  initialAddress?: string
}

function MapClickHandler({ onLocationSelect }: { onLocationSelect: (latlng: LatLng) => void }) {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng)
    },
  })
  return null
}

export default function LocationPicker({ onLocationSelect, initialAddress = "" }: LocationPickerProps) {
  const [selectedPosition, setSelectedPosition] = useState<LatLng | null>(null)
  const [address, setAddress] = useState(initialAddress)
  const [isGeocoding, setIsGeocoding] = useState(false)

  // Default to Mumbai, India
  const defaultCenter: [number, number] = [19.0760, 72.8777]

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
        <MapContainer
          center={selectedPosition ? [selectedPosition.lat, selectedPosition.lng] : defaultCenter}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapClickHandler onLocationSelect={handleMapClick} />

          {selectedPosition && <Marker position={[selectedPosition.lat, selectedPosition.lng]} />}
        </MapContainer>

        {/* Instructions overlay */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-[1000]">
          <p className="text-sm text-gray-700">Click on the map to select a location</p>
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
