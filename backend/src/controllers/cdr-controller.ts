import { Request, Response } from 'express'
import { webexCDRService } from '../services/webex-service.js'
import { db } from '../models/database.js'
import { format } from 'date-fns'
import path from 'path'
import fs from 'fs'

export class CDRController {
  /**
   * Test Webex API connectivity and discover available endpoints
   */
  async testWebexAPI(req: Request, res: Response) {
    try {
      const { bearerToken } = req.body

      if (!bearerToken) {
        return res.status(400).json({
          success: false,
          error: 'Bearer token is required'
        })
      }

      // Test Webex API endpoints that actually exist
      const testEndpoints = [
        'https://webexapis.com/v1/people/me',
        'https://webexapis.com/v1/reports'
      ]

      const results = []

      for (const endpoint of testEndpoints) {
        try {
          const response = await fetch(endpoint, {
            headers: {
              'Authorization': `Bearer ${bearerToken}`,
              'Content-Type': 'application/json'
            }
          })

          results.push({
            endpoint,
            status: response.status,
            statusText: response.statusText,
            available: response.status < 400
          })
        } catch (error) {
          results.push({
            endpoint,
            status: 'ERROR',
            statusText: error instanceof Error ? error.message : 'Unknown error',
            available: false
          })
        }
      }

      res.json({
        success: true,
        data: {
          tokenValid: results.some(r => r.status === 200),
          availableEndpoints: results.filter(r => r.available),
          allResults: results
        }
      })

    } catch (error) {
      console.error('Webex API test failed:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }

  /**
   * Import CDR data from existing CSV file
   */
  async importFromFile(req: Request, res: Response) {
    try {
      const { filename } = req.body
      
      if (!filename) {
        return res.status(400).json({
          success: false,
          error: 'Filename is required'
        })
      }

      const filePath = path.join(process.cwd(), 'data', 'cdr_imports', filename)
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          error: `File not found: ${filename}`
        })
      }

      console.log(`Importing CDR data from file: ${filePath}`)

      // Read and parse CSV
      const csvData = fs.readFileSync(filePath, 'utf-8')
      const lines = csvData.split('\n').filter(line => line.trim())
      
      // Parse CSV using webex service
      const webexItems = webexCDRService.parseCSVToWebexItems(csvData)
      const cdrRecords = webexCDRService.transformWebexToCDR(webexItems)

      console.log(`Processing ${cdrRecords.length} CDR records from file...`)

      // Insert into database
      const { inserted, duplicates } = db.insertCDRRecords(cdrRecords)

      // Count unique calls
      const uniqueCorrelationIds = new Set(cdrRecords.map(r => r.correlation_id))
      const callsCreated = uniqueCorrelationIds.size

      // Log the import
      db.logImport({
        import_date: format(new Date(), 'yyyy-MM-dd'),
        records_imported: inserted,
        calls_created: callsCreated,
        file_path: filePath,
        bearer_token_last4: 'FILE',
        status: inserted > 0 ? 'success' : 'partial'
      })

      console.log(`Manual file import completed: ${inserted} records inserted, ${duplicates} duplicates`)

      res.json({
        success: true,
        data: {
          totalItemsFromFile: lines.length - 1, // exclude header
          recordsProcessed: cdrRecords.length,
          recordsInserted: inserted,
          duplicatesSkipped: duplicates,
          callsCreated: callsCreated,
          filePath,
          importDate: new Date().toISOString()
        }
      })

    } catch (error) {
      console.error('Manual file import failed:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }

  /**
   * Import CDR data from Webex API
   */
  async importCDR(req: Request, res: Response) {
    try {
      const { bearerToken, hoursBack = 48 } = req.body

      if (!bearerToken) {
        return res.status(400).json({
          success: false,
          error: 'Bearer token is required'
        })
      }

      console.log('Starting CDR import...')

      // Import data from Webex
      const { records, filePath, totalItems } = await webexCDRService.importCDRData(
        bearerToken,
        hoursBack
      )

      console.log(`Processing ${records.length} CDR records...`)

      // Insert into database
      const { inserted, duplicates } = db.insertCDRRecords(records)

      // Count unique calls (by correlation ID)
      const uniqueCorrelationIds = new Set(records.map(r => r.correlation_id))
      const callsCreated = uniqueCorrelationIds.size

      // Log the import
      const tokenLast4 = bearerToken.slice(-4)
      db.logImport({
        import_date: format(new Date(), 'yyyy-MM-dd'),
        records_imported: inserted,
        calls_created: callsCreated,
        file_path: filePath,
        bearer_token_last4: tokenLast4,
        status: inserted > 0 ? 'success' : 'partial'
      })

      console.log(`CDR import completed: ${inserted} records inserted, ${duplicates} duplicates`)

      res.json({
        success: true,
        data: {
          totalItemsFromAPI: totalItems,
          recordsProcessed: records.length,
          recordsInserted: inserted,
          duplicatesSkipped: duplicates,
          callsCreated: callsCreated,
          filePath,
          importDate: new Date().toISOString()
        }
      })

    } catch (error) {
      console.error('CDR import failed:', error)

      // Log the failed import
      try {
        const { bearerToken } = req.body
        if (bearerToken) {
          db.logImport({
            import_date: format(new Date(), 'yyyy-MM-dd'),
            records_imported: 0,
            calls_created: 0,
            bearer_token_last4: bearerToken.slice(-4),
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      } catch (logError) {
        console.error('Failed to log import error:', logError)
      }

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }

  /**
   * Get locations for dropdown
   */
  async getLocations(req: Request, res: Response) {
    try {
      const locations = db.getLocations()
      
      res.json({
        success: true,
        data: locations
      })
    } catch (error) {
      console.error('Failed to get locations:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve locations'
      })
    }
  }

  /**
   * Get call summary with grouping by correlation ID
   */
  async getCallSummary(req: Request, res: Response) {
    try {
      const { startDate, endDate, location, department } = req.query

      const filters = {
        startDate: startDate as string,
        endDate: endDate as string,
        location: location as string,
        department: department as string
      }

      const calls = db.getCallSummary(filters)
      
      res.json({
        success: true,
        data: calls
      })
    } catch (error) {
      console.error('Failed to get call summary:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve call summary'
      })
    }
  }

  /**
   * Get clinic-level summaries for frontend
   */
  async getClinicSummaries(req: Request, res: Response) {
    try {
      const { startDate, endDate, location } = req.query

      const filters = {
        startDate: startDate as string,
        endDate: endDate as string,
        location: location as string
      }

      const summaries = db.getClinicSummaries(filters)
      
      res.json({
        success: true,
        data: summaries
      })
    } catch (error) {
      console.error('Failed to get clinic summaries:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve clinic summaries'
      })
    }
  }

  /**
   * Get dashboard metrics
   */
  async getMetrics(req: Request, res: Response) {
    try {
      const { startDate, endDate, location } = req.query

      const filters = {
        startDate: startDate as string,
        endDate: endDate as string,
        location: location as string
      }

      const metrics = db.getMetrics(filters)
      
      res.json({
        success: true,
        data: metrics
      })
    } catch (error) {
      console.error('Failed to get metrics:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve metrics'
      })
    }
  }

  /**
   * Get import logs
   */
  async getImportLogs(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 10
      const logs = db.getImportLogs(limit)
      
      res.json({
        success: true,
        data: logs
      })
    } catch (error) {
      console.error('Failed to get import logs:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve import logs'
      })
    }
  }

  /**
   * Get database statistics
   */
  async getStats(req: Request, res: Response) {
    try {
      const stats = db.getStats()
      const importHistory = await webexCDRService.getImportHistory()
      
      res.json({
        success: true,
        data: {
          ...stats,
          recentImports: importHistory.slice(0, 5)
        }
      })
    } catch (error) {
      console.error('Failed to get stats:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve statistics'
      })
    }
  }

  /**
   * Get CDR data for frontend display
   */
  async getCDRData(req: Request, res: Response) {
    try {
      const { startDate, endDate, location, phoneNumber, limit = 100, offset = 0 } = req.query

      const filters = {
        startDate: startDate as string,
        endDate: endDate as string,
        location: location as string,
        phoneNumber: phoneNumber as string,
        limit: parseInt(limit as string) || 100,
        offset: parseInt(offset as string) || 0
      }

      const data = db.getCDRData(filters)
      
      res.json({
        success: true,
        data: data,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          hasMore: data.length === filters.limit
        }
      })
    } catch (error) {
      console.error('Failed to get CDR data:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve CDR data'
      })
    }
  }

  /**
   * Export data as CSV
   */
  async exportCSV(req: Request, res: Response) {
    try {
      const { startDate, endDate, location, department, phoneNumber, format: exportFormat = 'grouped' } = req.query

      const filters = {
        startDate: startDate as string,
        endDate: endDate as string,
        location: location as string,
        department: department as string,
        phoneNumber: phoneNumber as string
      }

      let csvData: string
      let filename: string

      if (exportFormat === 'grouped') {
        // Export grouped calls
        const calls = db.getCallSummary(filters)
        const headers = [
          'Correlation ID', 'Start Time', 'End Time', 'Total Duration (s)',
          'Location', 'Department', 'Leg Count', 'Was Answered',
          'Transfer Count', 'Hold Count'
        ]
        
        const rows = calls.map(call => [
          call.correlation_id,
          call.start_time,
          call.end_time,
          call.total_duration,
          call.location,
          call.department,
          call.leg_count,
          call.was_answered ? 'Yes' : 'No',
          call.transfer_count,
          call.hold_count
        ])

        csvData = [headers, ...rows].map(row => row.join(',')).join('\n')
        filename = `call_summary_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.csv`
      } else {
        // Export detailed call records
        const callRecords = db.getCDRData({
          startDate: filters.startDate,
          endDate: filters.endDate,
          location: filters.location,
          phoneNumber: filters.phoneNumber
        })
        
        const headers = [
          'Start Time', 'Answer Time', 'Duration (s)', 'Calling Number', 'Called Number',
          'User Name', 'Location', 'Direction', 'Call Type', 'Answered', 'Call Outcome',
          'Release Time', 'Correlation ID', 'Leg Type'
        ]

        const rows = callRecords.map(record => [
          record.start_time,
          record.answer_time || '',
          record.duration.toString(),
          record.calling_number,
          record.called_number,
          record.user_name,
          record.location,
          record.direction,
          record.call_type,
          record.answered ? 'Yes' : 'No',
          record.call_outcome,
          record.release_time || '',
          record.correlation_id,
          record.leg_type || 'Initial'
        ])

        csvData = [headers, ...rows].map(row => row.join(',')).join('\n')
        filename = `call_details_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.csv`
      }

      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.send(csvData)

    } catch (error) {
      console.error('Failed to export CSV:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to export data'
      })
    }
  }
}

export const cdrController = new CDRController()