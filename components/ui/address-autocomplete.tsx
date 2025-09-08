"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Search, MapPin, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface AddressSuggestion {
  display_name: string
  lat: number
  lon: number
  place_id: string
}

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect: (lat: number, lng: number, address: string) => void
  placeholder?: string
  className?: string
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Enter an address...",
  className,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Calculate dropdown position
  const calculatePosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      })
    }
  }

  // Update position when showing suggestions
  useEffect(() => {
    if (showSuggestions) {
      calculatePosition()
      const handleResize = () => calculatePosition()
      const handleScroll = () => calculatePosition()
      
      window.addEventListener('resize', handleResize)
      window.addEventListener('scroll', handleScroll, true)
      
      return () => {
        window.removeEventListener('resize', handleResize)
        window.removeEventListener('scroll', handleScroll, true)
      }
    }
  }, [showSuggestions])

  // Debounced search function
  const searchAddresses = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setIsLoading(true)
    try {
      // Focus search on Mumbai and surrounding areas for better results
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=5&addressdetails=1&countrycodes=in&bounded=1&viewbox=72.7,19.3,73.1,18.8`
      )
      
      const data = await response.json()
      setSuggestions(data)
      setShowSuggestions(true)
      setSelectedIndex(-1)
    } catch (error) {
      console.error("Address search error:", error)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }

  // Debounce search requests
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      searchAddresses(value)
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [value])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
        break
      case "Enter":
        e.preventDefault()
        if (selectedIndex >= 0) {
          handleSelectSuggestion(suggestions[selectedIndex])
        }
        break
      case "Escape":
        setShowSuggestions(false)
        setSelectedIndex(-1)
        break
    }
  }

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: AddressSuggestion) => {
    onChange(suggestion.display_name)
    onSelect(Number(suggestion.lat), Number(suggestion.lon), suggestion.display_name)
    setShowSuggestions(false)
    setSelectedIndex(-1)
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        showSuggestions &&
        inputRef.current &&
        !inputRef.current.contains(target) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(target)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showSuggestions])

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn("pl-10", className)}
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isLoading ? (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          ) : (
            <Search className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

            {/* Suggestions dropdown - rendered as portal */}
      {typeof window !== 'undefined' && showSuggestions && suggestions.length > 0 && createPortal(
        <div
          ref={suggestionsRef}
          className="fixed max-h-60 overflow-auto bg-white border border-gray-300 rounded-md shadow-2xl"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            zIndex: 999999,
            backgroundColor: '#ffffff',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          }}
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.place_id}
              className="px-4 py-3 cursor-pointer flex items-start gap-3 border-b border-gray-100 last:border-b-0"
              onClick={() => handleSelectSuggestion(suggestion)}
              style={{
                backgroundColor: selectedIndex === index ? '#eff6ff' : '#ffffff',
                color: '#111827',
                borderBottom: index === suggestions.length - 1 ? 'none' : '1px solid #f3f4f6'
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              onMouseDown={(e) => e.preventDefault()} // Prevent input blur on click
            >
              <MapPin className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#6b7280' }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: '#111827' }}>
                  {suggestion.display_name.split(",")[0]}
                </div>
                <div className="text-xs truncate" style={{ color: '#6b7280' }}>
                  {suggestion.display_name.split(",").slice(1).join(",").trim()}
                </div>
              </div>
            </div>
          ))}
        </div>,
        document.body
      )}

      {/* No results message - rendered as portal */}
      {typeof window !== 'undefined' && showSuggestions && value.length >= 3 && suggestions.length === 0 && !isLoading && createPortal(
        <div 
          className="fixed bg-white border border-gray-300 rounded-md shadow-2xl"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            zIndex: 999999,
            backgroundColor: '#ffffff',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          }}
        >
          <div className="px-4 py-3 text-sm text-center" style={{ color: '#6b7280' }}>
            No addresses found. Try a different search term.
          </div>
        </div>,
        document.body
      )}

      {/* No results message */}
      {showSuggestions && value.length >= 3 && suggestions.length === 0 && !isLoading && (
        <div 
          className="absolute z-[9999] w-full mt-1"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 9999
          }}
        >
          <div className="px-4 py-3 text-sm text-center" style={{ color: '#6b7280' }}>
            No addresses found. Try a different search term.
          </div>
        </div>
      )}
    </div>
  )
}
