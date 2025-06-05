const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'logs', 'capture_history.sqlite');
let db = null;

// Initialize the database and create table if it doesn't exist
function initDb() {
  return new Promise((resolve, reject) => {
    if (db && db.open) { // Check if db object exists and is open
      return resolve(db);
    }
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database', err.message);
        return reject(err);
      }
      console.log('Connected to the SQLite database.');
      db.run(`CREATE TABLE IF NOT EXISTS captured_pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        url TEXT NOT NULL,
        status TEXT NOT NULL,
        proxy_used TEXT,
        error_message TEXT,
        html_content_path TEXT,
        screenshot_path TEXT
      )\`, (err) => {
        if (err) {
          console.error('Error creating table', err.message);
          db.close(); // Close db if table creation fails
          return reject(err);
        }
        console.log('Table "captured_pages" is ready.');
        resolve(db);
      });
    });
  });
}

// Insert a capture record into the database
function insertCaptureRecord(record) {
  return new Promise(async (resolve, reject) => {
    try {
      const currentDb = await initDb();
      const { timestamp, url, status, proxy_used, error_message, html_content_path, screenshot_path } = record;
      const sql = \`INSERT INTO captured_pages (timestamp, url, status, proxy_used, error_message, html_content_path, screenshot_path)
                   VALUES (?, ?, ?, ?, ?, ?, ?)\`;
      currentDb.run(sql, [timestamp, url, status, proxy_used, error_message, html_content_path, screenshot_path], function(err) {
        if (err) {
          console.error('Error inserting record into database', err.message);
          return reject(err);
        }
        console.log(`A row has been inserted with rowid ${this.lastID}`);
        resolve(this.lastID);
      });
    } catch (dbInitError) {
      reject(dbInitError);
    }
  });
}

// Get simulations with pagination
function getSimulations(page = 1, limit = 10) {
  return new Promise(async (resolve, reject) => {
    try {
      const currentDb = await initDb();
      const offset = (page - 1) * limit;
      const sql = `SELECT id, timestamp, url, status, proxy_used, error_message
                   FROM captured_pages
                   ORDER BY timestamp DESC
                   LIMIT ? OFFSET ?`;
      currentDb.all(sql, [limit, offset], (err, rows) => {
        if (err) {
          console.error('Error fetching simulations', err.message);
          return reject(err);
        }
        // Also get total count for pagination metadata
        currentDb.get("SELECT COUNT(*) as count FROM captured_pages", (err, totalRow) => {
          if (err) {
            console.error('Error fetching total simulation count', err.message);
            return reject(err);
          }
          resolve({
            data: rows,
            total: totalRow.count,
            page,
            limit,
            totalPages: Math.ceil(totalRow.count / limit)
          });
        });
      });
    } catch (dbInitError) {
      reject(dbInitError);
    }
  });
}

// Get a single simulation by ID (will be needed later)
function getSimulationById(id) {
  return new Promise(async (resolve, reject) => {
    try {
      const currentDb = await initDb();
      const sql = "SELECT * FROM captured_pages WHERE id = ?";
      currentDb.get(sql, [id], (err, row) => {
        if (err) {
          console.error(`Error fetching simulation with id ${id}`, err.message);
          return reject(err);
        }
        resolve(row); // row will be undefined if not found
      });
    } catch (dbInitError) {
      reject(dbInitError);
    }
  });
}


module.exports = { initDb, insertCaptureRecord, getSimulations, getSimulationById };
