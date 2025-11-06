const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { app } = require('electron');

const seedDatabase = (targetPath) =>
  new Promise((resolve, reject) => {
    const seedSqlPath = path.join(app.getAppPath(), 'database', 'seed.sql');
    if (!fs.existsSync(seedSqlPath)) {
      reject(new Error('Seed SQL not found at ' + seedSqlPath));
      return;
    }

    const sql = fs.readFileSync(seedSqlPath, 'utf-8');
    const db = new sqlite3.Database(targetPath);
    db.exec(sql, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
      db.close();
    });
  });

async function ensureDatabase() {
  const userData = app.getPath('userData');
  const dbPath = path.join(userData, 'pos.db');
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    await seedDatabase(dbPath);
  }
  return dbPath;
}

module.exports = { ensureDatabase };
