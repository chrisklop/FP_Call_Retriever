import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs-extra'

export interface CDRRecord {
  id?: number
  correlation_id: string
  leg_id: string
  start_time: string
  end_time?: string
  duration: number
  location: string
  department: string
  call_type: 'Inbound' | 'Outbound'
  direction: 'Inbound' | 'Outbound'
  leg_type: 'Initial' | 'Transfer' | 'Hold' | 'Conference'
  status: 'Answered' | 'NoAnswer' | 'Busy' | 'Failed'
  caller_number: string
  called_number: string
  answer_time?: string
  end_reason: string
  raw_data?: string
  import_date: string
  created_at?: string
}

export interface CallSummary {
  correlation_id: string
  total_duration: number
  start_time: string
  end_time: string
  location: string
  department: string
  leg_count: number
  was_answered: boolean
  transfer_count: number
  hold_count: number
}

class DatabaseManager {
  private db: Database.Database
  private dbPath: string

  constructor() {
    // Use the existing cdr_data.db file we created
    this.dbPath = path.join(process.cwd(), 'cdr_data.db')
    this.db = new Database(this.dbPath)
    
    console.log(`Database initialized at: ${this.dbPath}`)
    this.initializeSchema()
  }

  private initializeSchema() {
    // Create supplementary tables for our existing cdr_records table
    this.db.exec(`
      -- Import logs table
      CREATE TABLE IF NOT EXISTS import_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        import_date TEXT NOT NULL,
        records_imported INTEGER NOT NULL,
        calls_created INTEGER NOT NULL,
        file_path TEXT,
        bearer_token_last4 TEXT,
        status TEXT NOT NULL,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for performance on existing cdr_records table
      CREATE INDEX IF NOT EXISTS idx_correlation_id ON cdr_records(correlation_id);
      CREATE INDEX IF NOT EXISTS idx_start_time ON cdr_records(start_time);
      CREATE INDEX IF NOT EXISTS idx_location ON cdr_records(location);
    `)

    console.log('Database schema initialized')
  }

  // Insert CDR records with duplicate prevention
  insertCDRRecords(records: CDRRecord[]): { inserted: number; duplicates: number } {
    const insertStmt = this.db.prepare(`
      INSERT OR IGNORE INTO cdr_records (
        correlation_id, leg_id, start_time, end_time, duration,
        location, department, call_type, direction, leg_type,
        status, caller_number, called_number, answer_time,
        end_reason, raw_data, import_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const transaction = this.db.transaction((records: CDRRecord[]) => {
      let inserted = 0
      for (const record of records) {
        const result = insertStmt.run(
          record.correlation_id,
          record.leg_id,
          record.start_time,
          record.end_time,
          record.duration,
          record.location,
          record.department,
          record.call_type,
          record.direction,
          record.leg_type,
          record.status,
          record.caller_number,
          record.called_number,
          record.answer_time,
          record.end_reason,
          record.raw_data,
          record.import_date
        )
        if (result.changes > 0) inserted++
      }
      return inserted
    })

    const inserted = transaction(records)
    const duplicates = records.length - inserted

    return { inserted, duplicates }
  }

  // Get unique locations
  getLocations(): Array<{name: string, region?: string, location_type?: string}> {
    const stmt = this.db.prepare(`
      SELECT DISTINCT location as name, 'Unknown' as region, 'Medical Center' as location_type
      FROM cdr_records 
      WHERE location IS NOT NULL AND location != ''
      ORDER BY location
    `)
    return stmt.all() as Array<{name: string, region?: string, location_type?: string}>
  }

  // Get call summary grouped by correlation ID
  getCallSummary(filters: {
    startDate?: string
    endDate?: string
    location?: string
    department?: string
  }): CallSummary[] {
    let query = `
      SELECT 
        correlation_id,
        SUM(duration) as total_duration,
        MIN(start_time) as start_time,
        MAX(COALESCE(release_time, start_time)) as end_time,
        location,
        user_name as department,
        COUNT(*) as leg_count,
        MAX(CASE WHEN answered = 1 THEN 1 ELSE 0 END) as was_answered,
        0 as transfer_count,
        0 as hold_count
      FROM cdr_records
      WHERE correlation_id IS NOT NULL AND correlation_id != ''
    `

    const params: any[] = []

    if (filters.startDate) {
      query += ' AND DATE(start_time) >= DATE(?)'
      params.push(filters.startDate)
    }

    if (filters.endDate) {
      query += ' AND DATE(start_time) <= DATE(?)'
      params.push(filters.endDate)
    }

    if (filters.location && filters.location !== 'all') {
      query += ' AND location = ?'
      params.push(filters.location)
    }

    if (filters.department) {
      query += ' AND user_name LIKE ?'
      params.push(`%${filters.department}%`)
    }

    query += `
      GROUP BY correlation_id, location, user_name
      ORDER BY start_time DESC
    `

    const stmt = this.db.prepare(query)
    return stmt.all(...params) as CallSummary[]
  }

  // Get clinic-level summaries for the frontend
  getClinicSummaries(filters: {
    startDate?: string
    endDate?: string
    location?: string
  }): Array<{
    clinic: string
    callCount: number
    rawCallCount: number
    avgDuration: number
    answeredCalls: number
  }> {
    let query = `
      WITH unique_calls AS (
        SELECT 
          correlation_id,
          location,
          SUM(duration) as total_duration,
          MAX(CASE WHEN answered = 1 THEN 1 ELSE 0 END) as was_answered,
          COUNT(*) as leg_count
        FROM cdr_records
        WHERE correlation_id IS NOT NULL AND correlation_id != ''
    `

    const params: any[] = []

    if (filters.startDate) {
      query += ' AND DATE(start_time) >= DATE(?)'
      params.push(filters.startDate)
    }

    if (filters.endDate) {
      query += ' AND DATE(start_time) <= DATE(?)'
      params.push(filters.endDate)
    }

    if (filters.location && filters.location !== 'all') {
      query += ' AND location = ?'
      params.push(filters.location)
    }

    query += `
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
      ORDER BY callCount DESC
    `

    const stmt = this.db.prepare(query)
    return stmt.all(...params) as Array<{
      clinic: string
      callCount: number
      rawCallCount: number
      avgDuration: number
      answeredCalls: number
    }>
  }

  // Get metrics for dashboard
  getMetrics(filters: {
    startDate?: string
    endDate?: string
    location?: string
  }): {
    totalCalls: number
    totalAnswered: number
    answerRate: number
    avgDuration: number
    missedCalls: number
  } {
    const calls = this.getCallSummary(filters)
    
    const totalCalls = calls.length
    const answeredCalls = calls.filter(call => call.was_answered).length
    const answerRate = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0
    const avgDuration = totalCalls > 0 ? Math.round(calls.reduce((sum, call) => sum + call.total_duration, 0) / totalCalls) : 0
    const missedCalls = totalCalls - answeredCalls

    return {
      totalCalls,
      totalAnswered: answeredCalls,
      answerRate,
      avgDuration,
      missedCalls
    }
  }

  // Log import activity
  logImport(importData: {
    import_date: string
    records_imported: number
    calls_created: number
    file_path?: string
    bearer_token_last4?: string
    status: 'success' | 'failed' | 'partial'
    error_message?: string
  }) {
    const stmt = this.db.prepare(`
      INSERT INTO import_logs (
        import_date, records_imported, calls_created, 
        file_path, bearer_token_last4, status, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    return stmt.run(
      importData.import_date,
      importData.records_imported,
      importData.calls_created,
      importData.file_path,
      importData.bearer_token_last4,
      importData.status,
      importData.error_message
    )
  }

  // Get recent import logs
  getImportLogs(limit: number = 10) {
    const stmt = this.db.prepare(`
      SELECT * FROM import_logs 
      ORDER BY created_at DESC 
      LIMIT ?
    `)
    return stmt.all(limit)
  }

  // Get database stats
  getStats() {
    const recordsStmt = this.db.prepare('SELECT COUNT(*) as count FROM cdr_records')
    const callsStmt = this.db.prepare("SELECT COUNT(DISTINCT correlation_id) as count FROM cdr_records WHERE correlation_id IS NOT NULL AND correlation_id != ''")
    const locationsStmt = this.db.prepare("SELECT COUNT(DISTINCT location) as count FROM cdr_records WHERE location IS NOT NULL AND location != ''")
    
    const totalRecords = recordsStmt.get() as {count: number}
    const totalCalls = callsStmt.get() as {count: number}
    const totalLocations = locationsStmt.get() as {count: number}

    return {
      totalRecords: totalRecords.count,
      totalCalls: totalCalls.count,
      totalLocations: totalLocations.count,
      databasePath: this.dbPath
    }
  }

  // Get CDR data directly for frontend display
  getCDRData(filters: {
    startDate?: string
    endDate?: string
    location?: string
    limit?: number
    offset?: number
  }): any[] {
    let query = `
      SELECT 
        start_time,
        answer_time,
        duration,
        calling_number,
        called_number,
        user_name,
        location,
        direction,
        call_type,
        answered,
        call_outcome,
        release_time,
        correlation_id,
        leg_type
      FROM cdr_records
      WHERE 1=1
    `

    const params: any[] = []

    if (filters.startDate) {
      query += ' AND DATE(start_time) >= DATE(?)'
      params.push(filters.startDate)
    }

    if (filters.endDate) {
      query += ' AND DATE(start_time) <= DATE(?)'
      params.push(filters.endDate)
    }

    if (filters.location && filters.location !== 'all') {
      query += ' AND location = ?'
      params.push(filters.location)
    }

    query += ' ORDER BY start_time DESC'

    if (filters.limit) {
      query += ' LIMIT ?'
      params.push(filters.limit)
      
      if (filters.offset) {
        query += ' OFFSET ?'
        params.push(filters.offset)
      }
    }

    const stmt = this.db.prepare(query)
    return stmt.all(...params)
  }

  close() {
    this.db.close()
  }
}

export const db = new DatabaseManager()
export default db