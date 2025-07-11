import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse CSV data
function parseCSV(csvContent) {
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  const records = [];

  for (let i = 2; i < lines.length; i++) { // Skip header and first empty line
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV line with proper quote handling
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim()); // Add last value

    if (values.length >= headers.length) {
      const record = {};
      for (let k = 0; k < headers.length; k++) {
        record[headers[k]] = values[k] || '';
      }
      records.push(record);
    }
  }

  return records;
}

// Convert CDR record to database format
function convertToDatabaseFormat(csvRecord) {
  return {
    start_time: csvRecord['Start time'] || '',
    answer_time: csvRecord['Answer time'] === 'NA' ? null : csvRecord['Answer time'],
    duration: parseInt(csvRecord['Duration']) || 0,
    calling_number: csvRecord['Calling number'] || '',
    called_number: csvRecord['Called number'] || '',
    user_name: csvRecord['User'] || '',
    calling_line_id: csvRecord['Calling line ID'] || '',
    called_line_id: csvRecord['Called line ID'] || '',
    correlation_id: csvRecord['Correlation ID'] || '',
    location: csvRecord['Location'] || '',
    direction: csvRecord['Direction'] || '',
    call_type: csvRecord['Call type'] || '',
    answered: csvRecord['Answered'] === 'true' ? 1 : 0,
    call_outcome: csvRecord['Call outcome'] || '',
    release_time: csvRecord['Release time'] || '',
    site_main_number: csvRecord['Site main number'] || ''
  };
}

// Main import function
function importCSVData() {
  try {
    // Read CSV file
    const csvPath = path.join(__dirname, 'data/cdr_imports/cdr_report_20250624_144631.csv');
    console.log('Reading CSV file:', csvPath);
    
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    console.log('CSV file read successfully');

    // Parse CSV
    const csvRecords = parseCSV(csvContent);
    console.log(`Parsed ${csvRecords.length} records from CSV`);

    // Connect to database
    const dbPath = path.join(__dirname, 'cdr_data.db');
    const db = new Database(dbPath);
    console.log('Connected to database:', dbPath);

    // Clear existing data
    console.log('Clearing existing data...');
    db.exec('DELETE FROM cdr_records');

    // Prepare insert statement
    const insertStmt = db.prepare(`
      INSERT INTO cdr_records (
        start_time, answer_time, duration, calling_number, called_number,
        user_name, calling_line_id, called_line_id, correlation_id, location,
        direction, call_type, answered, call_outcome, release_time, site_main_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Insert records in transaction
    const transaction = db.transaction((records) => {
      let inserted = 0;
      for (const csvRecord of records) {
        const dbRecord = convertToDatabaseFormat(csvRecord);
        
        try {
          insertStmt.run(
            dbRecord.start_time,
            dbRecord.answer_time,
            dbRecord.duration,
            dbRecord.calling_number,
            dbRecord.called_number,
            dbRecord.user_name,
            dbRecord.calling_line_id,
            dbRecord.called_line_id,
            dbRecord.correlation_id,
            dbRecord.location,
            dbRecord.direction,
            dbRecord.call_type,
            dbRecord.answered,
            dbRecord.call_outcome,
            dbRecord.release_time,
            dbRecord.site_main_number
          );
          inserted++;
        } catch (error) {
          console.error('Error inserting record:', error.message);
          console.error('Record data:', dbRecord);
        }
      }
      return inserted;
    });

    const insertedCount = transaction(csvRecords);
    console.log(`Successfully inserted ${insertedCount} records`);

    // Update locations table
    console.log('Updating locations table...');
    db.exec(`
      INSERT OR IGNORE INTO locations (name, region, location_type)
      SELECT DISTINCT location, 'Unknown', 'Medical Center'
      FROM cdr_records 
      WHERE location IS NOT NULL AND location != ''
    `);

    // Log the import
    const logStmt = db.prepare(`
      INSERT INTO import_logs (
        import_date, records_imported, calls_created, 
        file_path, status
      ) VALUES (?, ?, ?, ?, ?)
    `);

    const uniqueCallsCount = db.prepare(`
      SELECT COUNT(DISTINCT correlation_id) as count 
      FROM cdr_records 
      WHERE correlation_id IS NOT NULL AND correlation_id != ''
    `).get().count;

    logStmt.run(
      new Date().toISOString(),
      insertedCount,
      uniqueCallsCount,
      csvPath,
      'success'
    );

    // Show final stats
    const stats = {
      totalRecords: db.prepare('SELECT COUNT(*) as count FROM cdr_records').get().count,
      uniqueCalls: uniqueCallsCount,
      locations: db.prepare('SELECT COUNT(*) as count FROM locations').get().count
    };

    console.log('Import completed successfully!');
    console.log('Final stats:', stats);

    db.close();
    return true;

  } catch (error) {
    console.error('Import failed:', error);
    return false;
  }
}

// Run the import
console.log('Starting CDR CSV import...');
const success = importCSVData();
process.exit(success ? 0 : 1);