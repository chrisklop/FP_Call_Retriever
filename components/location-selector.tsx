'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MapPin } from 'lucide-react'
import type { Location } from '@/lib/mock-data'

interface LocationSelectorProps {
  value: string
  onChange: (value: string) => void
  locations: Location[]
}

export function LocationSelector({ value, onChange, locations }: LocationSelectorProps) {
  return (
    <div className="flex items-center space-x-2">
      <MapPin className="h-4 w-4 text-gray-500" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Select location" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Locations</SelectItem>
          {locations.map((location) => (
            <SelectItem key={location.id} value={location.name}>
              {location.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}