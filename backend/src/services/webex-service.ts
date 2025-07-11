import axios from 'axios'
import fs from 'fs-extra'
import path from 'path'
import { format } from 'date-fns'
import { spawn } from 'child_process'
import type { CDRRecord } from '../models/database.js'

const WEBEX_API_URL = 'https://analytics.webexapis.com/v1'

interface WebexCDRResponse {
  items: WebexCDRItem[]
  link?: string
}

interface WebexCDRItem {
  callId: string
  correlationId: string
  startTime: string
  endTime?: string
  duration: number
  direction: 'inbound' | 'outbound'
  localCallId: string
  remoteCallId?: string
  callingPartyNumber: string
  calledPartyNumber: string
  originalCalledPartyNumber?: string
  redirectingPartyNumber?: string
  finalCalledPartyNumber?: string
  answerTime?: string
  releaseTime?: string
  releaseCause: string
  site: string
  department?: string
  userType: string
  userId?: string
  clientType: string
  deviceType: string
  model?: string
  location?: string
  // Additional fields from real Webex CDR
  [key: string]: any
}

export class WebexCDRService {
  private dataDir: string

  constructor() {
    this.dataDir = path.join(process.cwd(), 'data', 'cdr_imports')
    fs.ensureDirSync(this.dataDir)
  }

  /**
   * Import CDR data using Python script
   */
  async importCDRData(bearerToken: string, hoursBack: number = 48): Promise<{
    records: CDRRecord[]
    filePath: string
    totalItems: number
  }> {
    console.log(`Starting CDR import for last ${hoursBack} hours using Python script...`)

    // Convert hours to days (round up)
    const days = Math.ceil(hoursBack / 24)
    console.log(`Converting ${hoursBack} hours to ${days} days for Python script`)

    try {
      // Execute Python script
      const result = await this.executePythonScript(bearerToken, days)
      console.log(`Python script completed successfully: ${result.filename}`)

      // Parse CSV file
      const csvData = await fs.readFile(result.file_path, 'utf-8')
      const webexItems = this.parseCSVToWebexItems(csvData)
      console.log(`Parsed ${webexItems.length} items from CSV`)

      // Transform to our CDR format
      const cdrRecords = this.transformWebexToCDR(webexItems)

      return {
        records: cdrRecords,
        filePath: result.file_path,
        totalItems: webexItems.length
      }
    } catch (error) {
      console.error('CDR import failed:', error)
      throw new Error(`Failed to import CDR data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Execute Python script to fetch CDR data
   */
  private async executePythonScript(bearerToken: string, days: number): Promise<{
    success: boolean
    file_path: string
    filename: string
    total_lines: number
    report_title: string
    days_requested: number
  }> {
    const scriptPath = path.join(process.cwd(), 'scripts', 'get_cdr.py')
    
    console.log(`Executing Python script: ${scriptPath}`)
    
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [scriptPath, bearerToken, days.toString()], {
        stdio: 'pipe'
      })

      let stdout = ''
      let stderr = ''

      pythonProcess.stdout.on('data', (data) => {
        const output = data.toString()
        stdout += output
        // Log Python output in real-time (except JSON result)
        const lines = output.split('\n').filter(line => line.trim() && !line.includes('JSON_RESULT:'))
        lines.forEach(line => console.log(`[Python] ${line}`))
      })

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      pythonProcess.on('close', (code) => {
        // Always try to extract JSON result first, even on non-zero exit codes
        const jsonMatch = stdout.match(/JSON_RESULT: (.+)$/m)
        if (jsonMatch) {
          try {
            const result = JSON.parse(jsonMatch[1])
            if (!result.success) {
              console.error(`Python script error: ${result.error}`)
              reject(new Error(`Python script error: ${result.error}`))
              return
            }
            resolve(result)
            return
          } catch (parseError) {
            console.error(`Failed to parse JSON result: ${parseError}`)
          }
        }

        // Fallback error handling if no JSON result
        if (code !== 0) {
          console.error(`Python script failed with code ${code}`)
          console.error(`stderr: ${stderr}`)
          console.error(`stdout: ${stdout}`)
          reject(new Error(`Python script failed with code ${code}: ${stderr || 'Unknown error'}`))
          return
        }

        reject(new Error('No JSON result found in Python script output'))
      })

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start Python script: ${error.message}`))
      })
    })
  }

  /**
   * Fetch CDR data using Webex Reports API
   */
  private async fetchPaginatedCDR(
    bearerToken: string,
    startTime: Date,
    endTime: Date
  ): Promise<WebexCDRItem[]> {
    const allItems: WebexCDRItem[] = []
    
    console.log('Using Webex Reports API to generate CDR report...')
    
    try {
      // Step 1: Generate CDR report
      const reportRequest = {
        templateId: 'cdr',
        days: Math.ceil((Date.now() - startTime.getTime()) / (24 * 60 * 60 * 1000))
      }
      
      console.log(`Generating CDR report for ${reportRequest.days} days...`)
      console.log('Request payload:', JSON.stringify(reportRequest, null, 2))
      
      const generateResponse = await axios.post('https://webexapis.com/v1/reports', reportRequest, {
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000
      })
      
      console.log('Generate response status:', generateResponse.status)
      console.log('Generate response data:', JSON.stringify(generateResponse.data, null, 2))

      const reportId = generateResponse.data.id
      console.log(`Report generation started with ID: ${reportId}`)

      // Step 2: Poll for report completion
      let reportStatus = 'pending'
      let pollAttempts = 0
      const maxPollAttempts = 60 // 5 minutes max wait
      
      while (reportStatus !== 'complete' && pollAttempts < maxPollAttempts) {
        console.log(`Polling report status... (attempt ${pollAttempts + 1}/${maxPollAttempts})`)
        
        await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
        
        const statusResponse = await axios.get(`https://webexapis.com/v1/reports/${reportId}`, {
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000
        })

        reportStatus = statusResponse.data.status
        console.log(`Report status: ${reportStatus}`)
        
        if (reportStatus === 'complete') {
          const downloadUrl = statusResponse.data.downloadUrl
          console.log(`Report ready! Download URL: ${downloadUrl}`)
          
          // Step 3: Download and parse CSV
          const csvResponse = await axios.get(downloadUrl, {
            headers: {
              'Authorization': `Bearer ${bearerToken}`,
            },
            timeout: 60000 // 1 minute for download
          })

          const csvData = csvResponse.data
          console.log(`Downloaded CSV data (${csvData.length} characters)`)
          
          // Parse CSV to JSON
          const parsedItems = this.parseCSVToWebexItems(csvData)
          console.log(`Parsed ${parsedItems.length} CDR items from CSV`)
          
          return parsedItems
        }
        
        if (reportStatus === 'failed') {
          throw new Error('Report generation failed')
        }
        
        pollAttempts++
      }

      if (pollAttempts >= maxPollAttempts) {
        throw new Error('Report generation timed out after 5 minutes')
      }

    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.log('Error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers
        })
        
        if (error.response?.status === 401) {
          throw new Error('Invalid or expired bearer token')
        }
        if (error.response?.status === 403) {
          throw new Error('Bearer token does not have access to CDR reports. Please check your Webex permissions.')
        }
        if (error.response?.status === 429) {
          throw new Error('Rate limited. Please wait and try again.')
        }
        
        const errorMsg = `API request failed: ${error.response?.status} ${error.response?.statusText}${error.response?.data ? ' - ' + JSON.stringify(error.response.data) : ''}`
        console.log(`❌ ${errorMsg}`)
        throw new Error(errorMsg)
      }
      throw error
    }

    return allItems
  }

  /**
   * Parse CSV data to WebexCDRItem format
   */
  parseCSVToWebexItems(csvData: string): WebexCDRItem[] {
    const lines = csvData.split('\n').filter(line => line.trim())
    if (lines.length === 0) return []

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const items: WebexCDRItem[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i])
      if (values.length === 0) continue

      const item: any = {}
      
      // Map CSV headers to our expected format
      headers.forEach((header, index) => {
        const value = values[index]?.replace(/"/g, '') || ''
        
        // Map common CDR CSV fields to our interface
        switch (header.toLowerCase()) {
          case 'call id':
          case 'callid':
            item.callId = value
            break
          case 'correlation id':
          case 'correlationid':
            item.correlationId = value
            break
          case 'start time':
          case 'starttime':
            item.startTime = value
            break
          case 'end time':
          case 'endtime':
            item.endTime = value
            break
          case 'duration':
            item.duration = parseInt(value) || 0
            break
          case 'direction':
            item.direction = value.toLowerCase() === 'inbound' ? 'inbound' : 'outbound'
            break
          case 'calling party number':
          case 'callingpartynumber':
            item.callingPartyNumber = value
            break
          case 'called party number':
          case 'calledpartynumber':
            item.calledPartyNumber = value
            break
          case 'site':
          case 'location':
            item.site = value
            item.location = value
            break
          case 'department':
            item.department = value
            break
          case 'release cause':
          case 'releasecause':
            item.releaseCause = value
            break
          case 'answer time':
          case 'answertime':
            item.answerTime = value
            break
          case 'release time':
          case 'releasetime':
            item.releaseTime = value
            break
          case 'user type':
          case 'usertype':
            item.userType = value
            break
          case 'client type':
          case 'clienttype':
            item.clientType = value
            break
          case 'device type':
          case 'devicetype':
            item.deviceType = value
            break
          default:
            // Store any other fields as-is
            item[header] = value
        }
      })

      // Generate required fields if missing
      if (!item.callId) {
        item.callId = `CALL_${Date.now()}_${i}`
      }
      if (!item.correlationId) {
        item.correlationId = item.callId
      }
      if (!item.localCallId) {
        item.localCallId = item.callId
      }
      if (!item.userType) {
        item.userType = 'Unknown'
      }
      if (!item.clientType) {
        item.clientType = 'Unknown'
      }
      if (!item.deviceType) {
        item.deviceType = 'Unknown'
      }
      if (!item.releaseCause) {
        item.releaseCause = 'Unknown'
      }

      items.push(item as WebexCDRItem)
    }

    return items
  }

  /**
   * Parse a single CSV line handling quoted values
   */
  private parseCSVLine(line: string): string[] {
    const values: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    values.push(current.trim())
    return values
  }

  /**
   * Transform Webex CDR items to our database format
   */
  transformWebexToCDR(webexItems: WebexCDRItem[]): CDRRecord[] {
    const importDate = format(new Date(), 'yyyy-MM-dd')

    return webexItems.map((item, index) => {
      // Determine leg type based on call flow
      let legType: 'Initial' | 'Transfer' | 'Hold' | 'Conference' = 'Initial'
      if (item.redirectingPartyNumber) {
        legType = 'Transfer'
      } else if (item.originalCalledPartyNumber && item.originalCalledPartyNumber !== item.calledPartyNumber) {
        legType = 'Transfer'
      }

      // Map status
      let status: 'Answered' | 'NoAnswer' | 'Busy' | 'Failed' = 'Failed'
      if (item.answerTime) {
        status = 'Answered'
      } else if (item.releaseCause?.toLowerCase().includes('no answer')) {
        status = 'NoAnswer'
      } else if (item.releaseCause?.toLowerCase().includes('busy')) {
        status = 'Busy'
      }

      // Clean location and department
      const location = this.cleanLocationName(item.site || item.location || 'Unknown Location')
      const department = item.department || this.inferDepartmentFromCall(item) || 'General'

      const record: CDRRecord = {
        correlation_id: item.correlationId || `MANUAL_${item.callId}`,
        leg_id: `LEG_${index + 1}_${item.localCallId}`,
        start_time: item.startTime,
        end_time: item.endTime || item.releaseTime,
        duration: Math.max(0, item.duration || 0),
        location,
        department,
        call_type: item.direction === 'inbound' ? 'Inbound' : 'Outbound',
        direction: item.direction === 'inbound' ? 'Inbound' : 'Outbound',
        leg_type: legType,
        status,
        caller_number: this.formatPhoneNumber(item.callingPartyNumber),
        called_number: this.formatPhoneNumber(item.calledPartyNumber),
        answer_time: item.answerTime,
        end_reason: item.releaseCause || 'Unknown',
        raw_data: JSON.stringify(item),
        import_date: importDate
      }

      return record
    })
  }

  /**
   * Clean and standardize location names
   */
  private cleanLocationName(location: string): string {
    return location
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  /**
   * Infer department from call data
   */
  private inferDepartmentFromCall(item: WebexCDRItem): string | null {
    const number = item.calledPartyNumber || ''
    
    // Simple department inference based on called number patterns
    if (number.includes('911') || number.includes('emergency')) return 'Emergency'
    if (number.includes('reception') || number.includes('front')) return 'Reception'
    if (number.includes('billing') || number.includes('accounts')) return 'Billing'
    if (number.includes('cardio')) return 'Cardiology'
    if (number.includes('pediatric') || number.includes('peds')) return 'Pediatrics'
    if (number.includes('ortho')) return 'Orthopedics'
    
    return null
  }

  /**
   * Format phone numbers consistently
   */
  private formatPhoneNumber(number: string): string {
    if (!number) return 'Unknown'
    
    // Remove non-digits
    const digits = number.replace(/\D/g, '')
    
    // Format as +1XXXXXXXXXX for US numbers
    if (digits.length === 10) {
      return `+1${digits}`
    } else if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`
    }
    
    return number // Return original if we can't format it
  }

  /**
   * Save raw CDR data to file
   */
  private async saveRawData(items: WebexCDRItem[], startTime: Date): Promise<string> {
    const fileName = `cdr_${format(startTime, 'yyyy-MM-dd_HH-mm-ss')}.json`
    const filePath = path.join(this.dataDir, fileName)

    await fs.writeJSON(filePath, {
      importTime: new Date().toISOString(),
      dateRange: {
        start: startTime.toISOString(),
        end: new Date().toISOString()
      },
      totalItems: items.length,
      items
    }, { spaces: 2 })

    console.log(`Raw CDR data saved to: ${filePath}`)
    return filePath
  }

  /**
   * Get import history
   */
  async getImportHistory(): Promise<Array<{
    fileName: string
    filePath: string
    importTime: string
    itemCount: number
    fileSize: number
  }>> {
    try {
      const files = await fs.readdir(this.dataDir)
      const cdrFiles = files.filter(file => file.startsWith('cdr_') && file.endsWith('.json'))

      const history = await Promise.all(
        cdrFiles.map(async (fileName) => {
          const filePath = path.join(this.dataDir, fileName)
          const stats = await fs.stat(filePath)
          
          try {
            const data = await fs.readJSON(filePath)
            return {
              fileName,
              filePath,
              importTime: data.importTime || stats.mtime.toISOString(),
              itemCount: data.totalItems || 0,
              fileSize: stats.size
            }
          } catch {
            return {
              fileName,
              filePath,
              importTime: stats.mtime.toISOString(),
              itemCount: 0,
              fileSize: stats.size
            }
          }
        })
      )

      return history.sort((a, b) => new Date(b.importTime).getTime() - new Date(a.importTime).getTime())
    } catch (error) {
      console.error('Failed to get import history:', error)
      return []
    }
  }
}

export const webexCDRService = new WebexCDRService()
export default webexCDRService