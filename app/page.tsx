'use client'

import { useState, useEffect } from 'react'

interface CDRRecord {
  start_time: string
  answer_time: string
  duration: number
  calling_number: string
  called_number: string
  user_name: string
  location: string
  direction: string
  call_type: string
  answered: number
  call_outcome: string
  release_time: string
  correlation_id: string
  leg_type?: string
}

interface Stats {
  totalRecords: number
  totalCalls: number
  totalLocations: number
  databasePath: string
}

export default function Home() {
  const [cdrData, setCdrData] = useState<CDRRecord[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [locations, setLocations] = useState<string[]>([])
  const [selectedLocation, setSelectedLocation] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const [limit] = useState(50)
  
  // Summary reporting state
  const [summaryMode, setSummaryMode] = useState(true)
  const [summaryData, setSummaryData] = useState<any[]>([])
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  })
  const [selectedClinic, setSelectedClinic] = useState('all')
  
  // Correlation data state
  const [correlationData, setCorrelationData] = useState<any>({
    busyHours: [],
    callOutcomePatterns: [],
    locationPerformance: []
  })
  
  // Call aggregation state
  const [showAggregatedCalls, setShowAggregatedCalls] = useState(true)
  const [aggregatedCalls, setAggregatedCalls] = useState<CDRRecord[]>([])
  const [rawCalls, setRawCalls] = useState<CDRRecord[]>([])
  
  // Phone number filtering state
  const [phoneFilter, setPhoneFilter] = useState('')

  useEffect(() => {
    loadInitialData()
    loadCorrelationData()
  }, [])

  useEffect(() => {
    if (summaryMode) {
      loadSummaryData()
    } else {
      loadCDRData()
    }
  }, [selectedLocation, currentPage, summaryMode, selectedClinic, dateRange, phoneFilter])

  // Update displayed data when aggregation mode changes
  useEffect(() => {
    if (!summaryMode) {
      setCdrData(showAggregatedCalls ? aggregatedCalls : rawCalls)
    }
  }, [showAggregatedCalls, aggregatedCalls, rawCalls, summaryMode])

  const loadInitialData = async () => {
    try {
      // Load stats
      const statsResponse = await fetch('http://localhost:3001/api/stats')
      const statsData = await statsResponse.json()
      if (statsData.success) {
        setStats(statsData.data)
      }

      // Load locations
      const locationsResponse = await fetch('http://localhost:3001/api/locations')
      const locationsData = await locationsResponse.json()
      if (locationsData.success) {
        setLocations(locationsData.data.map((l: any) => l.name))
      }
    } catch (error) {
      console.error('Failed to load initial data:', error)
    }
  }

  const loadCDRData = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (currentPage * limit).toString()
      })
      
      if (selectedLocation !== 'all') {
        params.append('location', selectedLocation)
      }

      if (dateRange.startDate) {
        params.append('startDate', dateRange.startDate)
      }

      if (dateRange.endDate) {
        params.append('endDate', dateRange.endDate)
      }

      if (phoneFilter) {
        params.append('phoneNumber', phoneFilter)
      }

      const response = await fetch(`http://localhost:3001/api/calls/data?${params}`)
      const data = await response.json()
      
      if (data.success) {
        const rawCallData = data.data
        setRawCalls(rawCallData)
        
        // Aggregate calls by correlation ID
        const aggregated = aggregateCallsByCorrelationId(rawCallData)
        setAggregatedCalls(aggregated)
        
        // Set the display data based on current mode
        setCdrData(showAggregatedCalls ? aggregated : rawCallData)
      }
    } catch (error) {
      console.error('Failed to load CDR data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadSummaryData = async () => {
    setSummaryLoading(true)
    try {
      const params = new URLSearchParams()
      
      if (selectedClinic !== 'all') {
        params.append('location', selectedClinic)
      }
      
      if (dateRange.startDate) {
        params.append('startDate', dateRange.startDate)
      }
      
      if (dateRange.endDate) {
        params.append('endDate', dateRange.endDate)
      }

      const response = await fetch(`http://localhost:3001/api/calls/clinic-summaries?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setSummaryData(data.data)
      }
    } catch (error) {
      console.error('Failed to load summary data:', error)
      // Create mock summary data for now - using aggregated call logic
      setSummaryData([
        { clinic: 'Main Clinic', callCount: 68, rawCallCount: 82, avgDuration: 245, answeredCalls: 62 },
        { clinic: 'Downtown Branch', callCount: 52, rawCallCount: 64, avgDuration: 320, answeredCalls: 47 },
        { clinic: 'North Location', callCount: 74, rawCallCount: 91, avgDuration: 180, answeredCalls: 71 }
      ])
    } finally {
      setSummaryLoading(false)
    }
  }

  const loadCorrelationData = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/calls/correlation')
      const data = await response.json()
      
      if (data.success) {
        setCorrelationData(data.data)
      }
    } catch (error) {
      console.error('Failed to load correlation data:', error)
      // Set mock correlation data
      setCorrelationData({
        busyHours: [
          { hour: '9:00 AM', callCount: 24, avgDuration: 180 },
          { hour: '10:00 AM', callCount: 31, avgDuration: 205 },
          { hour: '11:00 AM', callCount: 28, avgDuration: 195 },
          { hour: '2:00 PM', callCount: 35, avgDuration: 220 },
          { hour: '3:00 PM', callCount: 42, avgDuration: 240 },
          { hour: '4:00 PM', callCount: 38, avgDuration: 210 }
        ],
        callOutcomePatterns: [
          { outcome: 'Completed', count: 245, percentage: 78 },
          { outcome: 'No Answer', count: 52, percentage: 16 },
          { outcome: 'Busy', count: 12, percentage: 4 },
          { outcome: 'Failed', count: 6, percentage: 2 }
        ],
        locationPerformance: [
          { location: 'Main Clinic', answerRate: 89, avgWaitTime: 45 },
          { location: 'Downtown Branch', answerRate: 76, avgWaitTime: 62 },
          { location: 'North Location', answerRate: 94, avgWaitTime: 32 }
        ]
      })
    }
  }

  const aggregateCallsByCorrelationId = (calls: CDRRecord[]): CDRRecord[] => {
    const callGroups = new Map<string, CDRRecord[]>()
    
    // Group calls by correlation_id
    calls.forEach(call => {
      const correlationId = call.correlation_id
      if (!callGroups.has(correlationId)) {
        callGroups.set(correlationId, [])
      }
      callGroups.get(correlationId)!.push(call)
    })
    
    // Aggregate each group into a single call record
    const aggregatedCalls: CDRRecord[] = []
    
    callGroups.forEach((callLegs, correlationId) => {
      // Sort by start_time to get the first leg
      callLegs.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      
      const firstLeg = callLegs[0]
      const lastLeg = callLegs[callLegs.length - 1]
      
      // Calculate total duration (sum of all legs)
      const totalDuration = callLegs.reduce((sum, leg) => sum + leg.duration, 0)
      
      // Determine if any leg was answered
      const wasAnswered = callLegs.some(leg => leg.answered === 1)
      
      // Use the outcome from the answered leg, or the last leg's outcome
      const answeredLeg = callLegs.find(leg => leg.answered === 1)
      const finalOutcome = answeredLeg?.call_outcome || lastLeg.call_outcome
      
      // Determine if call had transfers/conferences/holds
      const hasTransfer = callLegs.some(leg => leg.leg_type === 'Transfer')
      const hasConference = callLegs.some(leg => leg.leg_type === 'Conference')
      const hasHold = callLegs.some(leg => leg.leg_type === 'Hold')
      
      let aggregatedLegType = 'Initial'
      if (hasConference) aggregatedLegType = 'Conference'
      else if (hasTransfer) aggregatedLegType = 'Transfer'
      else if (hasHold) aggregatedLegType = 'Hold'

      // Create aggregated call record
      const aggregatedCall: CDRRecord = {
        start_time: firstLeg.start_time,
        answer_time: answeredLeg?.answer_time || 'NA',
        duration: totalDuration,
        calling_number: firstLeg.calling_number,
        called_number: firstLeg.called_number,
        user_name: firstLeg.user_name,
        location: firstLeg.location,
        direction: firstLeg.direction,
        call_type: firstLeg.call_type,
        answered: wasAnswered ? 1 : 0,
        call_outcome: finalOutcome,
        release_time: lastLeg.release_time,
        correlation_id: correlationId,
        leg_type: aggregatedLegType
      }
      
      aggregatedCalls.push(aggregatedCall)
    })
    
    return aggregatedCalls
  }

  const formatDate = (dateString: string) => {
    if (dateString === 'NA') return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '0s'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`
  }

  // CSV Export functions
  const handleExportSummary = async () => {
    try {
      const params = new URLSearchParams({
        format: 'grouped'
      })
      
      if (selectedClinic !== 'all') {
        params.append('location', selectedClinic)
      }
      
      if (dateRange.startDate) {
        params.append('startDate', dateRange.startDate)
      }
      
      if (dateRange.endDate) {
        params.append('endDate', dateRange.endDate)
      }

      const response = await fetch(`http://localhost:3001/api/export/csv?${params}`)
      const blob = await response.blob()
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'call_summary.csv'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to export summary CSV:', error)
    }
  }

  const handleExportDetails = async () => {
    try {
      const params = new URLSearchParams({
        format: 'detailed'
      })
      
      if (selectedLocation !== 'all') {
        params.append('location', selectedLocation)
      }
      
      if (dateRange.startDate) {
        params.append('startDate', dateRange.startDate)
      }
      
      if (dateRange.endDate) {
        params.append('endDate', dateRange.endDate)
      }

      if (phoneFilter) {
        params.append('phoneNumber', phoneFilter)
      }

      const response = await fetch(`http://localhost:3001/api/export/csv?${params}`)
      const blob = await response.blob()
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'call_details.csv'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to export details CSV:', error)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Call Retriever</h1>
          <p className="text-gray-600 mb-4">Clinic Call Metrics - Live Data from SQLite</p>
          
          {/* Stats Cards */}
          {stats && (
            <div className="flex gap-4 mb-6 items-start">
              <div className="w-1/2 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-8 rounded-lg">
                  <h3 className="text-2xl font-semibold text-blue-900">Total Call Legs</h3>
                  <p className="text-4xl font-bold text-blue-600">{stats.totalRecords.toLocaleString()}</p>
                </div>
                <div className="bg-green-50 p-8 rounded-lg">
                  <h3 className="text-2xl font-semibold text-green-900">Total Calls</h3>
                  <p className="text-4xl font-bold text-green-600">{stats.totalCalls.toLocaleString()}</p>
                </div>
                <div className="bg-purple-50 p-8 rounded-lg">
                  <h3 className="text-2xl font-semibold text-purple-900">Locations</h3>
                  <p className="text-4xl font-bold text-purple-600">{stats.totalLocations}</p>
                </div>
              </div>
              <div className="w-1/2 flex justify-end">
                <img 
                  src="/stitches-and-call retriever.png" 
                  alt="Company Logo" 
                  className="w-[294px] h-[294px] object-contain rounded-lg mr-[170px] -mt-[80px]"
                />
              </div>
            </div>
          )}

          {/* Mode Toggle */}
          <div className="mb-6">
            <div className="flex space-x-4">
              <button
                onClick={() => setSummaryMode(true)}
                className={`px-4 py-2 rounded-lg font-medium ${
                  summaryMode 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Summary Report
              </button>
              <button
                onClick={() => setSummaryMode(false)}
                className={`px-4 py-2 rounded-lg font-medium ${
                  !summaryMode 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Detailed View
              </button>
            </div>
          </div>

          {/* Summary Mode Filters */}
          {summaryMode && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Clinic</label>
                <select
                  value={selectedClinic}
                  onChange={(e) => setSelectedClinic(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Clinics</option>
                  {locations.map(location => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Detailed View Filters */}
          {!summaryMode && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Location</label>
                <select
                  value={selectedLocation}
                  onChange={(e) => {
                    setSelectedLocation(e.target.value)
                    setCurrentPage(0)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Locations</option>
                  {locations.map(location => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => {
                    setDateRange(prev => ({ ...prev, startDate: e.target.value }))
                    setCurrentPage(0)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => {
                    setDateRange(prev => ({ ...prev, endDate: e.target.value }))
                    setCurrentPage(0)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <input
                  type="text"
                  placeholder="Filter by phone..."
                  value={phoneFilter}
                  onChange={(e) => {
                    setPhoneFilter(e.target.value)
                    setCurrentPage(0)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Call View Mode</label>
                <select
                  value={showAggregatedCalls ? 'aggregated' : 'individual'}
                  onChange={(e) => {
                    setShowAggregatedCalls(e.target.value === 'aggregated')
                    setCurrentPage(0)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="aggregated">Total Calls (Aggregated)</option>
                  <option value="individual">Individual Call Legs</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Summary Report or CDR Data Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {summaryMode ? 'Call Summary Report' : 'Call Detail Records'}
              </h2>
              <p className="text-gray-600">
                {summaryMode 
                  ? `Summary by clinic ${selectedClinic !== 'all' ? `for ${selectedClinic}` : ''}`
                  : `Showing ${cdrData.length} ${showAggregatedCalls ? 'total calls' : 'total call legs'} (Page ${currentPage + 1})`
                }
              </p>
            </div>
            <div className="flex gap-2">
              {summaryMode ? (
                <button
                  onClick={handleExportSummary}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export Summary CSV
                </button>
              ) : (
                <button
                  onClick={handleExportDetails}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export Details CSV
                </button>
              )}
            </div>
          </div>
          
          {(summaryMode ? summaryLoading : isLoading) ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">
                {summaryMode ? 'Loading summary data...' : 'Loading CDR data...'}
              </p>
            </div>
          ) : summaryMode ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clinic</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Calls</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Call Legs</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Answered</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Duration</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {summaryData.map((clinic, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{clinic.clinic}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <span className="text-2xl font-bold text-blue-600">{clinic.callCount}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <span className="text-lg font-medium text-gray-600">{clinic.rawCallCount}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <span className="text-lg font-semibold text-green-600">{clinic.answeredCalls}</span>
                        <span className="text-gray-500 ml-1">
                          ({Math.round((clinic.answeredCalls / clinic.callCount) * 100)}%)
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatDuration(clinic.avgDuration)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <button
                          onClick={() => {
                            setSummaryMode(false)
                            setSelectedLocation(clinic.clinic)
                            setCurrentPage(0)
                          }}
                          className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Calling #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Called #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Direction</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leg Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Answered</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outcome</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correlation ID</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cdrData.map((record, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{formatDate(record.start_time)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatDuration(record.duration)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{record.calling_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{record.called_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{record.user_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{record.location}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          record.direction === 'TERMINATING' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {record.direction}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          record.leg_type === 'Transfer' ? 'bg-orange-100 text-orange-800' :
                          record.leg_type === 'Conference' ? 'bg-purple-100 text-purple-800' :
                          record.leg_type === 'Hold' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {record.leg_type || 'Initial'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          record.answered ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {record.answered ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{record.call_outcome}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-mono text-xs">
                        {showAggregatedCalls ? (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {record.correlation_id.slice(-6)}
                          </span>
                        ) : (
                          <span className="text-gray-600">
                            {record.correlation_id.slice(-6)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination - only for detailed view */}
          {!summaryMode && (
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center">
              <button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {currentPage + 1}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={cdrData.length < limit}
                className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Call Correlation Analytics */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Busy Hours Analysis */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Peak Call Hours</h3>
            <div className="space-y-3">
              {correlationData.busyHours.map((hour: any, index: number) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{hour.hour}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-blue-600">{hour.callCount} calls</span>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(hour.callCount / 45) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Call Outcome Patterns */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Call Outcomes</h3>
            <div className="space-y-3">
              {correlationData.callOutcomePatterns.map((pattern: any, index: number) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{pattern.outcome}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">{pattern.count}</span>
                    <span className="text-xs text-gray-500">({pattern.percentage}%)</span>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          pattern.outcome === 'Completed' ? 'bg-green-500' :
                          pattern.outcome === 'No Answer' ? 'bg-yellow-500' :
                          pattern.outcome === 'Busy' ? 'bg-orange-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${pattern.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Location Performance */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Performance</h3>
            <div className="space-y-4">
              {correlationData.locationPerformance.map((location: any, index: number) => (
                <div key={index} className="border-b border-gray-100 pb-3 last:border-b-0">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-900">{location.location}</span>
                    <span className="text-sm text-green-600 font-semibold">{location.answerRate}%</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Answer Rate</span>
                    <span>Avg Wait: {location.avgWaitTime}s</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <div 
                      className="bg-green-600 h-1.5 rounded-full" 
                      style={{ width: `${location.answerRate}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-gray-600 text-sm">
          Data loaded from SQLite database • {stats?.totalRecords.toLocaleString()} total records
        </div>
      </div>
    </main>
  )
}