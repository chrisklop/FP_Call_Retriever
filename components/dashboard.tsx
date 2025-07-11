'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Settings, 
  Columns, 
  Phone, 
  PhoneCall, 
  Clock, 
  TrendingUp, 
  Building2,
  MapPin,
  Download,
  Filter
} from 'lucide-react'
import { MetricCard } from '@/components/metric-card'
import { LocationSelector } from '@/components/location-selector'
import { DateRangePicker } from '@/components/date-range-picker'
import { CallVolumeChart } from '@/components/call-volume-chart'
import { TopLocationsChart } from '@/components/top-locations-chart'
import { RecentCallsTable } from '@/components/recent-calls-table'
import { CallDataTable } from '@/components/call-data-table'
import { generateMockData } from '@/lib/mock-data'

interface DashboardProps {
  onConfigClick: () => void
  onFieldSelectorClick: () => void
}

export function Dashboard({ onConfigClick, onFieldSelectorClick }: DashboardProps) {
  const [selectedLocation, setSelectedLocation] = useState<string>('all')
  const [dateRange, setDateRange] = useState<{start: Date, end: Date}>({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: new Date()
  })

  const mockData = useMemo(() => generateMockData(), [])
  
  // Filter data based on selections
  const filteredData = useMemo(() => {
    return mockData.calls.filter(call => {
      const callDate = new Date(call.startTime)
      const isInDateRange = callDate >= dateRange.start && callDate <= dateRange.end
      const isInLocation = selectedLocation === 'all' || call.location === selectedLocation
      return isInDateRange && isInLocation
    })
  }, [mockData.calls, selectedLocation, dateRange])

  // Calculate metrics from filtered data
  const metrics = useMemo(() => {
    const groupedCalls = new Map()
    
    // Group by correlation ID to get actual calls (not legs)
    filteredData.forEach(call => {
      if (!groupedCalls.has(call.correlationId)) {
        groupedCalls.set(call.correlationId, {
          correlationId: call.correlationId,
          totalDuration: 0,
          startTime: call.startTime,
          location: call.location,
          department: call.department,
          wasAnswered: false,
          legCount: 0
        })
      }
      
      const grouped = groupedCalls.get(call.correlationId)
      grouped.totalDuration += call.duration
      grouped.legCount += 1
      if (call.status === 'Answered') {
        grouped.wasAnswered = true
      }
    })

    const uniqueCalls = Array.from(groupedCalls.values())
    const totalCalls = uniqueCalls.length
    const answeredCalls = uniqueCalls.filter(call => call.wasAnswered).length
    const answerRate = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0
    const avgDuration = totalCalls > 0 ? Math.round(uniqueCalls.reduce((sum, call) => sum + call.totalDuration, 0) / totalCalls) : 0
    const missedCalls = totalCalls - answeredCalls

    return { totalCalls, answeredCalls, answerRate, avgDuration, missedCalls }
  }, [filteredData])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-8 w-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Healthcare CDR Analytics</h1>
                <p className="text-sm text-gray-600">Enterprise Call Reporting Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={onFieldSelectorClick}
                className="flex items-center space-x-2"
              >
                <Columns className="h-4 w-4" />
                <span>Fields</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={onConfigClick}
                className="flex items-center space-x-2"
              >
                <Settings className="h-4 w-4" />
                <span>Config</span>
              </Button>
              
              <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600">CK</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Filters */}
        <div className="mb-8 flex flex-wrap items-center gap-4">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
          />
          
          <LocationSelector
            value={selectedLocation}
            onChange={setSelectedLocation}
            locations={mockData.locations}
          />
          
          <Button variant="outline" size="sm" className="flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <span>More Filters</span>
          </Button>
          
          <Button variant="outline" size="sm" className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Metric Cards */}
          <MetricCard
            title="Total Calls"
            value={metrics.totalCalls.toLocaleString()}
            change={12}
            trend="up"
            icon={Phone}
            className="lg:col-span-1"
          />
          
          <MetricCard
            title="Answer Rate"
            value={`${metrics.answerRate}%`}
            change={5}
            trend="up"
            icon={PhoneCall}
            className="lg:col-span-1"
          />
          
          <MetricCard
            title="Avg Duration"
            value={`${Math.floor(metrics.avgDuration / 60)}m ${metrics.avgDuration % 60}s`}
            change={-3}
            trend="down"
            icon={Clock}
            className="lg:col-span-1"
          />
          
          <MetricCard
            title="Missed Calls"
            value={metrics.missedCalls.toLocaleString()}
            change={-8}
            trend="down"
            icon={TrendingUp}
            className="lg:col-span-1"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Call Volume Trends</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CallVolumeChart data={filteredData} />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Top Performing Locations</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TopLocationsChart data={filteredData} />
            </CardContent>
          </Card>
        </div>

        {/* Data Tables */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Phone className="h-5 w-5" />
                  <span>Call Detail Records</span>
                </div>
                <Badge variant="secondary">{filteredData.length} legs</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CallDataTable data={filteredData} />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Recent Activity</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RecentCallsTable data={filteredData.slice(0, 10)} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}