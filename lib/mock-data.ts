export interface CDRRecord {
  id: string
  correlationId: string
  legId: string
  startTime: string
  endTime: string
  duration: number // seconds
  location: string
  department: string
  callType: 'Inbound' | 'Outbound'
  direction: 'Inbound' | 'Outbound'
  legType: 'Initial' | 'Transfer' | 'Hold' | 'Conference'
  status: 'Answered' | 'NoAnswer' | 'Busy' | 'Failed'
  callerNumber: string
  calledNumber: string
  answerTime?: string
  endReason: string
}

export interface Location {
  id: string
  name: string
  region: string
  type: 'Medical Center' | 'Urgent Care' | 'Specialty Clinic' | 'Corporate Office'
}

const locations: Location[] = [
  { id: 'loc001', name: 'Downtown Medical Center', region: 'Central', type: 'Medical Center' },
  { id: 'loc002', name: 'Riverside Urgent Care', region: 'North', type: 'Urgent Care' },
  { id: 'loc003', name: 'Bay Area Wellness', region: 'West', type: 'Medical Center' },
  { id: 'loc004', name: 'Mountain View Clinic', region: 'East', type: 'Specialty Clinic' },
  { id: 'loc005', name: 'Corporate Headquarters', region: 'Central', type: 'Corporate Office' },
  { id: 'loc006', name: 'Southside Family Practice', region: 'South', type: 'Medical Center' },
  { id: 'loc007', name: 'Emergency Care Center', region: 'Central', type: 'Urgent Care' },
  { id: 'loc008', name: 'Pediatric Specialists', region: 'North', type: 'Specialty Clinic' },
]

const departments = [
  'Emergency', 'General Practice', 'Cardiology', 'Pediatrics', 
  'Orthopedics', 'Reception', 'Billing', 'Administration'
]

const phoneNumbers = [
  '+1234567890', '+1987654321', '+1555123456', '+1444987654',
  '+1333555777', '+1222444666', '+1777888999', '+1666333111'
]

function generateCorrelationId(): string {
  return `CALL_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
}

function generatePhoneNumber(): string {
  return phoneNumbers[Math.floor(Math.random() * phoneNumbers.length)]
}

function generateCallLegs(correlationId: string, location: Location): CDRRecord[] {
  const legs: CDRRecord[] = []
  const baseTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
  const legCount = Math.random() < 0.7 ? 1 : Math.random() < 0.9 ? 2 : 3 // Most calls are single leg
  
  const department = departments[Math.floor(Math.random() * departments.length)]
  const callType = Math.random() < 0.8 ? 'Inbound' : 'Outbound'
  const wasAnswered = Math.random() < 0.85 // 85% answer rate
  
  for (let i = 0; i < legCount; i++) {
    const startTime = new Date(baseTime.getTime() + (i * 30000)) // 30 second gaps between legs
    const duration = Math.floor(Math.random() * 600) + 30 // 30 seconds to 10 minutes
    const endTime = new Date(startTime.getTime() + duration * 1000)
    
    const leg: CDRRecord = {
      id: `${correlationId}_LEG_${i + 1}`,
      correlationId,
      legId: `LEG_${i + 1}`,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration,
      location: location.name,
      department,
      callType,
      direction: callType,
      legType: i === 0 ? 'Initial' : Math.random() < 0.5 ? 'Transfer' : 'Hold',
      status: wasAnswered && i === 0 ? 'Answered' : wasAnswered && Math.random() < 0.7 ? 'Answered' : 'NoAnswer',
      callerNumber: generatePhoneNumber(),
      calledNumber: generatePhoneNumber(),
      answerTime: wasAnswered ? new Date(startTime.getTime() + Math.random() * 10000).toISOString() : undefined,
      endReason: wasAnswered ? 'Normal' : 'NoAnswer'
    }
    
    legs.push(leg)
  }
  
  return legs
}

export function generateMockData() {
  const calls: CDRRecord[] = []
  const callCount = 500 // Generate 500 calls which may have multiple legs
  
  for (let i = 0; i < callCount; i++) {
    const correlationId = generateCorrelationId()
    const location = locations[Math.floor(Math.random() * locations.length)]
    const callLegs = generateCallLegs(correlationId, location)
    calls.push(...callLegs)
  }
  
  return {
    calls: calls.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()),
    locations
  }
}