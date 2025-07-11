# Call Retriever

A comprehensive call detail record (CDR) analytics dashboard designed for healthcare organizations. Provides real-time insights into call patterns, clinic performance, and operational metrics to optimize communication workflows.

![Dashboard Preview](https://via.placeholder.com/800x400/4F46E5/FFFFFF?text=Call+Retriever+Dashboard)

## Features

- **📊 Summary Reporting** - Clinic-level call analytics with customizable date ranges
- **🔍 Detailed Call Analysis** - Individual call leg inspection with correlation ID grouping  
- **📞 Call Type Identification** - Automatic detection of transfers, conferences, holds, and initial calls
- **📈 Real-time Metrics** - Live dashboard with total calls, call legs, and location statistics
- **🎯 Date Filtering** - Precise date range selection for historical analysis
- **🏥 Multi-Location Support** - Scalable architecture supporting hundreds of locations

## Tech Stack

- **Frontend**: Next.js 14.2.0, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, SQLite
- **Database**: SQLite with optimized indexes for large datasets
- **UI**: Responsive design with modern component architecture

## Quick Start

### Prerequisites

- Node.js 18.0.0 or higher
- npm 8.0.0 or higher
- 4GB RAM minimum (8GB recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd call-retriever
   ```

2. **Install dependencies**
   ```bash
   # Frontend dependencies
   npm install
   
   # Backend dependencies
   cd backend
   npm install
   cd ..
   ```

3. **Start the application**
   
   **Terminal 1 - Backend:**
   ```bash
   cd backend
   npm run dev
   ```
   
   **Terminal 2 - Frontend:**
   ```bash
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│  (Next.js)      │◄──►│   (Express)     │◄──►│   (SQLite)      │
│  Port: 3000     │    │  Port: 3001     │    │   cdr_data.db   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Components

- **Dashboard Interface** - React-based UI with real-time data visualization
- **REST API** - Express server providing CDR data endpoints
- **Data Aggregation** - Correlation ID-based call grouping logic
- **SQLite Database** - Optimized storage for large-scale call records

## Data Model

### Call Records
Individual call detail records with comprehensive metadata:
- Start/end timestamps
- Duration and outcome tracking
- Location and user information
- Call type classification (Initial, Transfer, Conference, Hold)

### Correlation Logic
Calls are grouped by `correlation_id` to represent complete call journeys:
- Multiple call legs → Single unique call
- Transfer and conference call tracking
- Comprehensive duration calculations

## API Endpoints

### Core Data Access
- `GET /api/stats` - Database statistics and metrics
- `GET /api/locations` - Available clinic locations
- `GET /api/calls/clinic-summaries` - Aggregated clinic-level data
- `GET /api/calls/data` - Individual call detail records

### Filtering Support
All endpoints support query parameters:
- `startDate` / `endDate` - Date range filtering
- `location` - Clinic-specific filtering
- `limit` / `offset` - Pagination support

## Development

### Project Structure
```
├── app/                    # Next.js frontend application
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # App layout component
│   └── page.tsx           # Main dashboard page
├── backend/               # Express backend server
│   ├── src/
│   │   ├── controllers/   # API endpoint handlers
│   │   ├── models/        # Database models and queries
│   │   ├── routes/        # API route definitions
│   │   └── services/      # Business logic services
│   └── cdr_data.db       # SQLite database file
├── public/               # Static assets
└── wiki/                 # Documentation files
```

### Development Scripts

**Frontend:**
```bash
npm run dev      # Start development server
npm run build    # Create production build
npm run start    # Start production server
```

**Backend:**
```bash
npm run dev      # Start development server with auto-reload
npm run build    # Compile TypeScript
npm run start    # Start production server
```

## Performance

### Current Scale
- **75,645** individual call records
- **23,206** unique calls (correlation ID grouped)
- **304** clinic locations
- **<2 second** dashboard load times

### Optimization Features
- Database indexing on key fields (`correlation_id`, `start_time`, `location`)
- Pagination for large datasets
- Efficient SQL aggregation queries
- Frontend caching and memoization

## Data Privacy

- No personally identifiable information (PII) is stored in plaintext
- Phone numbers are stored for operational purposes only
- All data access is logged for audit purposes
- Configurable data retention policies

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -m 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Maintain responsive design principles
- Write comprehensive tests for new features
- Update documentation for API changes

## Deployment

### Production Considerations
- Use environment variables for sensitive configuration
- Implement proper authentication/authorization
- Set up database backups and monitoring
- Configure HTTPS and security headers
- Implement rate limiting for API endpoints

### Environment Variables
```env
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3001

# Backend (.env)
PORT=3001
DATABASE_PATH=./cdr_data.db
NODE_ENV=production
```

## Troubleshooting

### Common Issues
- **Port conflicts**: Ensure ports 3000 and 3001 are available
- **Database access**: Verify SQLite file permissions
- **API connectivity**: Check backend server status at `/api/health`
- **Performance**: Monitor database size and consider archiving old records

### Debug Commands
```bash
# Health check
curl http://localhost:3001/api/health

# Test database connection
curl http://localhost:3001/api/stats

# Verify data endpoints
curl http://localhost:3001/api/calls/clinic-summaries
```

## License

This project is proprietary software. All rights reserved.

## Support

- Create an issue for bug reports or feature requests
- Check the [wiki](./wiki/) for detailed documentation
- Review API documentation for integration guidance

---

**Version**: 1.0.0  
**Last Updated**: July 2025