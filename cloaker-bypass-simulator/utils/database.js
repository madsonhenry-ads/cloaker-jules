const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'logs', 'capture_history.sqlite');
let db = null;

// Initialize the database and create table if it doesn't exist
function initDb() {
  return new Promise((resolve, reject) => {
    if (db) {
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
      )`, (err) => {
        if (err) {
          console.error('Error creating table', err.message);
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
      const sql = `INSERT INTO captured_pages (timestamp, url, status, proxy_used, error_message, html_content_path, screenshot_path)
                   VALUES (?, ?, ?, ?, ?, ?, ?)`;
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

module.exports = { initDb, insertCaptureRecord };
