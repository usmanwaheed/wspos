const fs = require('fs');
const path = require('path');
const { app } = require('electron');

function ensureDatabase() {
  const userData = app.getPath('userData');
  const dbPath = path.join(userData, 'pos.db');
  if (!fs.existsSync(dbPath)) {
    const seedPath = path.join(app.getAppPath(), 'database', 'seed', 'pos.db');
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    if (fs.existsSync(seedPath)) {
      fs.copyFileSync(seedPath, dbPath);
    } else {
      throw new Error('Seed database not found at ' + seedPath);
    }
  }
  return dbPath;
}

module.exports = { ensureDatabase };
