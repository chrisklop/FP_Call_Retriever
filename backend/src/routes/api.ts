import { Router } from 'express'
import { cdrController } from '../controllers/cdr-controller.js'

const router = Router()

// CDR Import endpoints
router.post('/test-webex-api', cdrController.testWebexAPI.bind(cdrController))
router.post('/import-cdr', cdrController.importCDR.bind(cdrController))
router.post('/import-from-file', cdrController.importFromFile.bind(cdrController))

// Data retrieval endpoints
router.get('/locations', cdrController.getLocations.bind(cdrController))
router.get('/calls/summary', cdrController.getCallSummary.bind(cdrController))
router.get('/calls/clinic-summaries', cdrController.getClinicSummaries.bind(cdrController))
router.get('/calls/data', cdrController.getCDRData.bind(cdrController))
router.get('/metrics', cdrController.getMetrics.bind(cdrController))

// Administrative endpoints
router.get('/import-logs', cdrController.getImportLogs.bind(cdrController))
router.get('/stats', cdrController.getStats.bind(cdrController))

// Export endpoint
router.get('/export/csv', cdrController.exportCSV.bind(cdrController))

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'CDR Analytics Backend'
  })
})

export default router