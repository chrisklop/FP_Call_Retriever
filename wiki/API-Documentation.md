# API Documentation

Call Retriever's backend API provides RESTful endpoints for accessing call detail records, metrics, and administrative functions.

## Base URL

```
http://localhost:3001/api
```

## Authentication

Currently, the API operates without authentication for development. For production deployment, implement appropriate authentication mechanisms.

## Endpoints Overview

### Health & Status
- `GET /health` - System health check
- `GET /stats` - Database statistics

### Data Retrieval
- `GET /locations` - Available clinic locations
- `GET /calls/clinic-summaries` - Clinic-level aggregated data
- `GET /calls/data` - Individual call detail records
- `GET /calls/summary` - Call summaries grouped by correlation ID

### Administrative
- `GET /import-logs` - Import history logs
- `POST /import-cdr` - Import CDR data from API
- `POST /import-from-file` - Import CDR data from file

## Detailed Endpoint Documentation

### GET /health

**Description**: System health check endpoint

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-07-11T01:09:06.585Z",
  "service": "CDR Analytics Backend"
}
```

### GET /stats

**Description**: Retrieve database statistics

**Response**:
```json
{
  "success": true,
  "data": {
    "totalRecords": 75645,
    "totalCalls": 23206,
    "totalLocations": 304,
    "databasePath": "/path/to/cdr_data.db",
    "recentImports": []
  }
}
```

### GET /locations

**Description**: Get list of all clinic locations

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "name": "Franklin TN Support Office",
      "region": "Unknown",
      "location_type": "Medical Center"
    },
    {
      "name": "CFM Trenton",
      "region": "Unknown", 
      "location_type": "Medical Center"
    }
  ]
}
```

### GET /calls/clinic-summaries

**Description**: Get aggregated call data by clinic

**Query Parameters**:
- `startDate` (optional): Filter start date (YYYY-MM-DD)
- `endDate` (optional): Filter end date (YYYY-MM-DD)
- `location` (optional): Specific clinic location

**Example Request**:
```
GET /calls/clinic-summaries?startDate=2025-06-24&endDate=2025-06-24&location=Franklin TN Support Office
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "clinic": "Franklin TN Support Office",
      "callCount": 5679,
      "rawCallCount": 13125,
      "avgDuration": 464,
      "answeredCalls": 5317
    }
  ]
}
```

### GET /calls/data

**Description**: Get individual call detail records

**Query Parameters**:
- `startDate` (optional): Filter start date (YYYY-MM-DD)
- `endDate` (optional): Filter end date (YYYY-MM-DD)
- `location` (optional): Clinic location filter
- `limit` (optional): Number of records to return (default: 100)
- `offset` (optional): Pagination offset (default: 0)

**Example Request**:
```
GET /calls/data?location=Franklin TN Support Office&limit=50&offset=0
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "start_time": "2025-06-24T08:30:15Z",
      "answer_time": "2025-06-24T08:30:18Z",
      "duration": 245,
      "calling_number": "+1234567890",
      "called_number": "+0987654321",
      "user_name": "John Smith",
      "location": "Franklin TN Support Office",
      "direction": "TERMINATING",
      "call_type": "Inbound",
      "answered": 1,
      "call_outcome": "Completed",
      "release_time": "2025-06-24T08:34:20Z",
      "correlation_id": "abc123def456",
      "leg_type": "Initial"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

### GET /calls/summary

**Description**: Get call summaries grouped by correlation ID

**Query Parameters**:
- `startDate` (optional): Filter start date
- `endDate` (optional): Filter end date
- `location` (optional): Location filter
- `department` (optional): Department filter

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "correlation_id": "abc123def456",
      "total_duration": 245,
      "start_time": "2025-06-24T08:30:15Z",
      "end_time": "2025-06-24T08:34:20Z",
      "location": "Franklin TN Support Office",
      "department": "Reception",
      "leg_count": 3,
      "was_answered": true,
      "transfer_count": 1,
      "hold_count": 0
    }
  ]
}
```

## Data Models

### CDR Record
```typescript
interface CDRRecord {
  start_time: string          // ISO timestamp
  answer_time: string         // ISO timestamp or 'NA'
  duration: number           // Seconds
  calling_number: string     // Phone number
  called_number: string      // Phone number
  user_name: string          // User/extension name
  location: string           // Clinic location
  direction: string          // 'TERMINATING' | 'ORIGINATING'
  call_type: string          // 'Inbound' | 'Outbound'
  answered: number           // 1 = answered, 0 = not answered
  call_outcome: string       // Call disposition
  release_time: string       // ISO timestamp
  correlation_id: string     // Unique call identifier
  leg_type?: string          // 'Initial' | 'Transfer' | 'Hold' | 'Conference'
}
```

### Clinic Summary
```typescript
interface ClinicSummary {
  clinic: string             // Clinic name
  callCount: number          // Unique calls (by correlation_id)
  rawCallCount: number       // Total call legs
  avgDuration: number        // Average duration in seconds
  answeredCalls: number      // Number of answered calls
}
```

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE"
}
```

### Common HTTP Status Codes
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

Currently no rate limiting is implemented. For production, consider implementing:
- Request rate limiting per IP
- API key-based quotas
- Concurrent connection limits

## Development Testing

### Using curl
```bash
# Health check
curl http://localhost:3001/api/health

# Get stats
curl http://localhost:3001/api/stats

# Get clinic summaries with date filter
curl "http://localhost:3001/api/calls/clinic-summaries?startDate=2025-06-24&endDate=2025-06-24"
```

### Using JavaScript fetch
```javascript
// Get clinic summaries
const response = await fetch('http://localhost:3001/api/calls/clinic-summaries');
const data = await response.json();

if (data.success) {
  console.log(data.data);
} else {
  console.error(data.error);
}
```

---

Next: Learn about the [Database Schema](Database-Schema) for understanding data structure.