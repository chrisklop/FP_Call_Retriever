import express from 'express'
import cors from 'cors'
import apiRoutes from './routes/api.js'
import { db } from './models/database.js'

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:5173'],
  credentials: true
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
  next()
})

// API routes
app.use('/api', apiRoutes)

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'CDR Analytics Backend',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      'POST /api/import-cdr': 'Import CDR data from Webex API',
      'GET /api/locations': 'Get all locations',
      'GET /api/calls/summary': 'Get call summary grouped by correlation ID',
      'GET /api/metrics': 'Get dashboard metrics',
      'GET /api/import-logs': 'Get import history',
      'GET /api/stats': 'Get database statistics',
      'GET /api/export/csv': 'Export data as CSV',
      'GET /api/health': 'Health check'
    }
  })
})

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error)
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  })
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\\nShutting down gracefully...')
  db.close()
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\\nShutting down gracefully...')
  db.close()
  process.exit(0)
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 CDR Analytics Backend running on port ${PORT}`)
  console.log(`📊 Database statistics:`, db.getStats())
  console.log(`🌐 CORS enabled for: http://localhost:3000, http://localhost:5173`)
  console.log(`📡 API endpoints available at: http://localhost:${PORT}/api`)
})