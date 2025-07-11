# Troubleshooting Guide

This guide helps resolve common issues encountered when using Call Retriever.

## Common Issues

### Frontend Issues

#### Dashboard Won't Load / Blank Screen

**Symptoms:**
- White/blank screen when accessing http://localhost:3000
- Browser console shows errors
- React components not rendering

**Solutions:**

1. **Check if frontend server is running:**
   ```bash
   # In project root
   npm run dev
   ```

2. **Verify Node.js version:**
   ```bash
   node --version  # Should be 18.0.0 or higher
   ```

3. **Clear browser cache:**
   - Hard refresh: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
   - Clear browser cache and cookies
   - Try incognito/private browsing mode

4. **Check browser console for errors:**
   - Open Developer Tools (F12)
   - Look for JavaScript errors in Console tab
   - Check Network tab for failed API requests

#### No Data Showing in Dashboard

**Symptoms:**
- Dashboard loads but shows empty data
- Loading spinners that never complete
- "0" values in stats cards

**Solutions:**

1. **Verify backend is running:**
   ```bash
   # Check if backend is responding
   curl http://localhost:3001/api/health
   ```

2. **Check API connectivity:**
   ```bash
   # Test stats endpoint
   curl http://localhost:3001/api/stats
   
   # Test clinic summaries
   curl http://localhost:3001/api/calls/clinic-summaries
   ```

3. **Check browser network requests:**
   - Open Developer Tools → Network tab
   - Look for failed API requests (red entries)
   - Check if requests are going to correct URLs

4. **Verify database has data:**
   ```bash
   cd backend
   # If sqlite3 is available
   sqlite3 cdr_data.db "SELECT COUNT(*) FROM cdr_records;"
   ```

### Backend Issues

#### Backend Server Won't Start

**Symptoms:**
- `npm run dev` fails in backend directory
- Port 3001 connection refused
- Module import/export errors

**Solutions:**

1. **Check port availability:**
   ```bash
   # Check if port 3001 is in use
   lsof -i :3001
   # Or for Windows
   netstat -ano | findstr :3001
   ```

2. **Install dependencies:**
   ```bash
   cd backend
   rm -rf node_modules
   npm install
   ```

3. **Check Node.js module type:**
   - Ensure `backend/package.json` has `"type": "module"`
   - Verify all imports use `.js` extensions

4. **Database permissions:**
   ```bash
   # Check database file exists and is readable
   ls -la backend/cdr_data.db
   ```

#### Database Connection Errors

**Symptoms:**
- SQLite errors in console
- "Database locked" messages
- Query timeout errors

**Solutions:**

1. **Check database file:**
   ```bash
   # Verify database exists
   ls -la backend/cdr_data.db
   
   # Check file permissions
   chmod 664 backend/cdr_data.db
   ```

2. **Database integrity check:**
   ```bash
   cd backend
   sqlite3 cdr_data.db "PRAGMA integrity_check;"
   ```

3. **Close other database connections:**
   - Ensure no other processes are accessing the database
   - Restart backend server

### Data Issues

#### Date Filtering Not Working

**Symptoms:**
- Selecting dates shows no results
- All dates show same data
- Date picker values not reflected in results

**Solutions:**

1. **Check date format:**
   - Ensure dates are in YYYY-MM-DD format
   - Verify timezone handling

2. **Inspect API requests:**
   ```bash
   # Test date filtering manually
   curl "http://localhost:3001/api/calls/clinic-summaries?startDate=2025-06-24&endDate=2025-06-24"
   ```

3. **Database date format verification:**
   ```bash
   # Check date format in database
   sqlite3 cdr_data.db "SELECT start_time FROM cdr_records LIMIT 5;"
   ```

#### Correlation ID Aggregation Issues

**Symptoms:**
- Unique call counts seem wrong
- Call legs not properly grouped
- Missing call data

**Solutions:**

1. **Verify correlation IDs exist:**
   ```bash
   sqlite3 cdr_data.db "SELECT COUNT(*) FROM cdr_records WHERE correlation_id IS NULL OR correlation_id = '';"
   ```

2. **Check aggregation logic:**
   ```bash
   # Compare total records vs unique calls
   sqlite3 cdr_data.db "
   SELECT 
     COUNT(*) as total_records,
     COUNT(DISTINCT correlation_id) as unique_calls
   FROM cdr_records 
   WHERE correlation_id IS NOT NULL AND correlation_id != '';
   "
   ```

### Performance Issues

#### Slow Dashboard Loading

**Symptoms:**
- Dashboard takes long time to load
- API requests timeout
- High CPU/memory usage

**Solutions:**

1. **Check database size:**
   ```bash
   ls -lh backend/cdr_data.db
   ```

2. **Optimize database:**
   ```bash
   sqlite3 cdr_data.db "VACUUM; ANALYZE;"
   ```

3. **Add pagination:**
   - Use limit/offset parameters in API calls
   - Implement infinite scrolling for large datasets

4. **Monitor memory usage:**
   ```bash
   # Check Node.js process memory
   ps aux | grep node
   ```

### Installation Issues

#### npm install Failures

**Symptoms:**
- Package installation errors
- Dependency conflicts
- Permission denied errors

**Solutions:**

1. **Clear npm cache:**
   ```bash
   npm cache clean --force
   ```

2. **Update npm:**
   ```bash
   npm install -g npm@latest
   ```

3. **Remove and reinstall:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Check Node.js version compatibility:**
   ```bash
   node --version
   npm --version
   ```

#### Port Conflicts

**Symptoms:**
- "Port already in use" errors
- Cannot start frontend/backend servers
- Connection refused errors

**Solutions:**

1. **Find and kill processes:**
   ```bash
   # Find process using port 3000
   lsof -ti:3000 | xargs kill
   
   # Find process using port 3001
   lsof -ti:3001 | xargs kill
   ```

2. **Use different ports:**
   ```bash
   # Start frontend on different port
   PORT=3002 npm run dev
   
   # Start backend on different port
   PORT=3003 npm run dev
   ```

## Debugging Steps

### Enable Verbose Logging

1. **Frontend debugging:**
   ```javascript
   // Add to browser console
   localStorage.setItem('debug', 'true');
   ```

2. **Backend debugging:**
   ```bash
   # Set environment variable
   DEBUG=* npm run dev
   ```

### Check System Resources

1. **Memory usage:**
   ```bash
   free -h  # Linux
   # Check if system has adequate RAM
   ```

2. **Disk space:**
   ```bash
   df -h
   # Ensure adequate disk space for database
   ```

### Network Connectivity

1. **Test API endpoints:**
   ```bash
   # Health check
   curl -v http://localhost:3001/api/health
   
   # Stats
   curl -v http://localhost:3001/api/stats
   
   # Locations
   curl -v http://localhost:3001/api/locations
   ```

2. **Check CORS settings:**
   - Verify backend allows frontend origin
   - Check browser network tab for CORS errors

## Getting Help

### Log Collection

When reporting issues, please include:

1. **Browser console logs:**
   - Open Developer Tools
   - Copy any error messages from Console tab

2. **Backend logs:**
   ```bash
   cd backend
   npm run dev 2>&1 | tee backend.log
   ```

3. **System information:**
   ```bash
   node --version
   npm --version
   uname -a  # Linux/Mac
   ```

### Creating Issues

When creating GitHub issues, include:

1. **Environment details:**
   - Operating system
   - Node.js version
   - Browser type/version

2. **Steps to reproduce:**
   - Exact steps taken
   - Expected vs actual behavior

3. **Error messages:**
   - Console logs
   - Server logs
   - Screenshots if applicable

### Quick Fixes Checklist

Before reporting issues, try these quick fixes:

- [ ] Restart frontend and backend servers
- [ ] Clear browser cache and cookies
- [ ] Check if all dependencies are installed
- [ ] Verify database file exists and has data
- [ ] Test API endpoints directly with curl
- [ ] Check browser console for JavaScript errors
- [ ] Ensure ports 3000 and 3001 are available
- [ ] Try accessing from different browser/incognito mode

---

Still having issues? Create an issue in the GitHub repository with detailed logs and system information.