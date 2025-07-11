# Database Schema

Call Retriever uses SQLite as its primary database to store call detail records (CDR) and system metadata. This document outlines the database structure and relationships.

## Database Overview

- **Engine**: SQLite 3.35+
- **File Location**: `backend/cdr_data.db`
- **Total Records**: 75,645 call records
- **Unique Calls**: 23,206 (grouped by correlation_id)
- **Locations**: 304 clinic locations

## Table Structure

### cdr_records

The primary table storing all call detail records.

```sql
CREATE TABLE cdr_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  correlation_id TEXT NOT NULL,
  leg_id TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT,
  duration INTEGER DEFAULT 0,
  location TEXT,
  department TEXT,
  call_type TEXT CHECK(call_type IN ('Inbound', 'Outbound')),
  direction TEXT CHECK(direction IN ('Inbound', 'Outbound', 'TERMINATING', 'ORIGINATING')),
  leg_type TEXT CHECK(leg_type IN ('Initial', 'Transfer', 'Hold', 'Conference')),
  status TEXT CHECK(status IN ('Answered', 'NoAnswer', 'Busy', 'Failed')),
  caller_number TEXT,
  called_number TEXT,
  answer_time TEXT,
  end_reason TEXT,
  raw_data TEXT,
  import_date TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Additional fields from import
  calling_number TEXT,
  user_name TEXT,
  answered INTEGER DEFAULT 0,
  call_outcome TEXT,
  release_time TEXT
);
```

#### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `id` | INTEGER | Primary key, auto-increment |
| `correlation_id` | TEXT | Groups related call legs into unique calls |
| `leg_id` | TEXT | Unique identifier for individual call leg |
| `start_time` | TEXT | ISO timestamp when call started |
| `end_time` | TEXT | ISO timestamp when call ended |
| `duration` | INTEGER | Call duration in seconds |
| `location` | TEXT | Clinic/office location name |
| `department` | TEXT | Department or user group |
| `call_type` | TEXT | 'Inbound' or 'Outbound' |
| `direction` | TEXT | Call direction (TERMINATING/ORIGINATING) |
| `leg_type` | TEXT | Type of call leg (Initial/Transfer/Hold/Conference) |
| `status` | TEXT | Call status (Answered/NoAnswer/Busy/Failed) |
| `caller_number` | TEXT | Originating phone number |
| `called_number` | TEXT | Destination phone number |
| `answer_time` | TEXT | ISO timestamp when call was answered |
| `end_reason` | TEXT | Reason call ended |
| `user_name` | TEXT | User or extension name |
| `answered` | INTEGER | 1 if answered, 0 if not |
| `call_outcome` | TEXT | Final call disposition |
| `release_time` | TEXT | When call was released |

### import_logs

Tracks CDR data import operations for auditing.

```sql
CREATE TABLE import_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  import_date TEXT NOT NULL,
  records_imported INTEGER NOT NULL,
  calls_created INTEGER NOT NULL,
  file_path TEXT,
  bearer_token_last4 TEXT,
  status TEXT NOT NULL CHECK(status IN ('success', 'failed', 'partial')),
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `id` | INTEGER | Primary key |
| `import_date` | TEXT | Date of import operation |
| `records_imported` | INTEGER | Number of records successfully imported |
| `calls_created` | INTEGER | Number of unique calls created |
| `file_path` | TEXT | Source file path (if file import) |
| `bearer_token_last4` | TEXT | Last 4 characters of API token used |
| `status` | TEXT | Import result (success/failed/partial) |
| `error_message` | TEXT | Error details if import failed |

## Indexes

Performance indexes for common query patterns:

```sql
CREATE INDEX idx_correlation_id ON cdr_records(correlation_id);
CREATE INDEX idx_start_time ON cdr_records(start_time);
CREATE INDEX idx_location ON cdr_records(location);
CREATE INDEX idx_answered ON cdr_records(answered);
CREATE INDEX idx_location_time ON cdr_records(location, start_time);
```

## Key Relationships

### Correlation ID Grouping

The `correlation_id` field is crucial for understanding call relationships:

```sql
-- Example: Get all legs for a specific call
SELECT * FROM cdr_records 
WHERE correlation_id = 'abc123def456'
ORDER BY start_time;

-- Result might show:
-- Leg 1: Initial call (leg_type = 'Initial')
-- Leg 2: Transfer (leg_type = 'Transfer') 
-- Leg 3: Conference (leg_type = 'Conference')
```

### Call Aggregation Logic

Unique calls are determined by grouping call legs:

```sql
-- Count unique calls vs total legs
SELECT 
  COUNT(*) as total_legs,
  COUNT(DISTINCT correlation_id) as unique_calls
FROM cdr_records 
WHERE correlation_id IS NOT NULL;
```

## Common Queries

### Clinic Summary Data
```sql
WITH unique_calls AS (
  SELECT 
    correlation_id,
    location,
    SUM(duration) as total_duration,
    MAX(CASE WHEN answered = 1 THEN 1 ELSE 0 END) as was_answered,
    COUNT(*) as leg_count
  FROM cdr_records
  WHERE correlation_id IS NOT NULL AND correlation_id != ''
  GROUP BY correlation_id, location
)
SELECT 
  location as clinic,
  COUNT(*) as callCount,
  SUM(leg_count) as rawCallCount,
  ROUND(AVG(total_duration), 0) as avgDuration,
  SUM(was_answered) as answeredCalls
FROM unique_calls
GROUP BY location
ORDER BY callCount DESC;
```

### Date Range Filtering
```sql
-- Get calls for specific date range
SELECT * FROM cdr_records 
WHERE DATE(start_time) >= DATE('2025-06-24')
  AND DATE(start_time) <= DATE('2025-06-24')
  AND location = 'Franklin TN Support Office';
```

### Call Type Analysis
```sql
-- Analyze call types by location
SELECT 
  location,
  leg_type,
  COUNT(*) as count,
  AVG(duration) as avg_duration
FROM cdr_records 
WHERE leg_type IS NOT NULL
GROUP BY location, leg_type
ORDER BY location, count DESC;
```

## Data Integrity

### Constraints
- `correlation_id` cannot be NULL for valid call records
- `start_time` is required for all records
- Enum constraints on `call_type`, `direction`, `leg_type`, `status`
- Foreign key relationships maintained through application logic

### Data Validation
- Phone numbers stored as text to handle international formats
- Timestamps stored in ISO format for consistency
- Duration always stored in seconds (integer)
- Boolean values stored as INTEGER (0/1)

## Backup and Maintenance

### Regular Maintenance
```sql
-- Analyze table statistics
ANALYZE cdr_records;

-- Vacuum database (reclaim space)
VACUUM;

-- Check integrity
PRAGMA integrity_check;
```

### Backup Strategy
```bash
# Create backup
sqlite3 cdr_data.db ".backup backup_$(date +%Y%m%d).db"

# Restore from backup
sqlite3 cdr_data.db ".restore backup_20250711.db"
```

## Performance Considerations

### Query Optimization
- Use indexes for WHERE clauses on `correlation_id`, `start_time`, `location`
- DATE() function calls can be expensive; consider date range columns for high-volume queries
- LIMIT clauses for pagination in large result sets

### Storage
- Current database size: ~500MB for 75K records
- Estimated growth: ~6MB per 1K new records
- Consider archiving old records for long-term storage

---

Next: Learn about [Data Import](Data-Import) procedures and formats.