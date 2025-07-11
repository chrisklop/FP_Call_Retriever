# Installation Guide

This guide will help you set up Call Retriever on your local development environment or production server.

## Prerequisites

### System Requirements
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher
- **SQLite**: Version 3.35.0 or higher
- **Git**: For version control

### Hardware Requirements
- **RAM**: Minimum 4GB (8GB recommended)
- **Storage**: 2GB free space (more for large CDR datasets)
- **CPU**: Multi-core processor recommended

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/chrisklop/FP_Call_Retriever.git
cd FP_Call_Retriever
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Install Backend Dependencies

```bash
cd backend
npm install
cd ..
```

### 4. Database Setup

The application uses SQLite with an existing CDR database. The database file should be located at:
```
backend/cdr_data.db
```

If you need to import new CDR data, see the [Data Import Guide](Data-Import).

### 5. Environment Configuration

Create environment files for both frontend and backend:

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Backend (.env):**
```env
PORT=3001
DATABASE_PATH=./cdr_data.db
NODE_ENV=development
```

### 6. Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### 7. Access the Application

Open your browser and navigate to:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api/health

## Verification

### Test the Installation

1. **Health Check**: Visit http://localhost:3001/api/health
2. **Dashboard**: Visit http://localhost:3000
3. **Data Loading**: Verify that clinic stats appear in the dashboard
4. **API Response**: Check browser developer tools for successful API calls

### Expected Results

- Dashboard loads with clinic statistics
- Summary report shows clinic data
- Detailed view displays call records
- Date filtering works correctly

## Production Deployment

For production deployment, see the [Production Setup Guide](Production-Setup).

## Troubleshooting

If you encounter issues during installation:

1. **Node.js Version**: Ensure you're using Node.js 18+
2. **Port Conflicts**: Check if ports 3000 or 3001 are already in use
3. **Database Permissions**: Verify SQLite file permissions
4. **Dependencies**: Clear node_modules and reinstall if needed

```bash
rm -rf node_modules backend/node_modules
npm install
cd backend && npm install
```

## Next Steps

After successful installation:
1. Review the [Dashboard Overview](Dashboard-Overview)
2. Learn about [Summary Reports](Summary-Reports)
3. Explore [Detailed Call Analysis](Detailed-Analysis)
4. Configure [Data Import](Data-Import) if needed

---

Need help? Check the [Troubleshooting Guide](Troubleshooting) or create an issue.