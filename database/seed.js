const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

const dbDir = path.join(__dirname, 'seed');
const dbPath = path.join(dbDir, 'pos.db');

const hashPassword = (password) =>
  crypto.createHash('sha256').update(password).digest('hex');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const db = new sqlite3.Database(dbPath);

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });

const exec = (sql) =>
  new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

const seed = async () => {
  await exec('PRAGMA foreign_keys = ON;');

  await exec(`
    CREATE TABLE products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      brand TEXT NOT NULL,
      base_price REAL NOT NULL,
      image TEXT
    );

    CREATE TABLE product_variations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      color TEXT NOT NULL,
      size TEXT NOT NULL,
      sku TEXT NOT NULL UNIQUE,
      barcode TEXT NOT NULL UNIQUE,
      price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      subtotal REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0,
      tax REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      payment_method TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      variation_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0,
      line_total REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (variation_id) REFERENCES product_variations(id) ON DELETE CASCADE
    );

    CREATE TABLE stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      variation_id INTEGER NOT NULL,
      change INTEGER NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (variation_id) REFERENCES product_variations(id) ON DELETE CASCADE
    );

    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL
    );
  `);

  const garments = [
    {
      name: 'Classic Oxford Shirt',
      category: 'Shirts',
      brand: 'UrbanTailor',
      base_price: 35,
      colors: ['White', 'Blue', 'Black'],
      sizes: ['S', 'M', 'L', 'XL'],
      stock: 20
    },
    {
      name: 'Slim Fit Jeans',
      category: 'Jeans',
      brand: 'DenimWorks',
      base_price: 55,
      colors: ['Indigo', 'Black'],
      sizes: ['30', '32', '34', '36'],
      stock: 15
    },
    {
      name: 'Comfort Chino Trousers',
      category: 'Trousers',
      brand: 'UrbanTailor',
      base_price: 45,
      colors: ['Khaki', 'Navy'],
      sizes: ['S', 'M', 'L', 'XL'],
      stock: 12
    }
  ];

  const slug = (text) =>
    text
      .toString()
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-');

  for (const garment of garments) {
    const productResult = await run(
      `INSERT INTO products (name, category, brand, base_price) VALUES (?, ?, ?, ?);`,
      [garment.name, garment.category, garment.brand, garment.base_price]
    );
    const productId = productResult.id;

    for (const color of garment.colors) {
      for (const size of garment.sizes) {
        const sku = `${slug(garment.name)}-${slug(color)}-${slug(size)}`;
        const barcode = sku;
        await run(
          `INSERT INTO product_variations (product_id, color, size, sku, barcode, price, stock)
           VALUES (?, ?, ?, ?, ?, ?, ?);`,
          [
            productId,
            color,
            size,
            sku,
            barcode,
            garment.base_price,
            garment.stock
          ]
        );
      }
    }
  }

  const adminPassword = hashPassword('admin123');
  const cashierPassword = hashPassword('cashier123');

  await run(
    `INSERT INTO users (username, password, role) VALUES (?, ?, ?), (?, ?, ?);`,
    ['admin', adminPassword, 'Admin', 'cashier', cashierPassword, 'Cashier']
  );

  // Create a demo order for reporting visuals
  const order = await run(
    `INSERT INTO orders (order_number, subtotal, discount, tax, total, payment_method, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-1 day'));`,
    ['INV-1001', 180, 10, 9, 179, 'Cash']
  );

  const variations = await new Promise((resolve, reject) => {
    db.all(
      `SELECT pv.id, pv.price, pv.product_id FROM product_variations pv LIMIT 3;`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });

  for (const variation of variations) {
    await run(
      `INSERT INTO order_items (order_id, product_id, variation_id, quantity, unit_price, discount, line_total)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [order.id, variation.product_id, variation.id, 2, variation.price, 0, variation.price * 2]
    );

    await run(
      `UPDATE product_variations SET stock = stock - 2 WHERE id = ?;`,
      [variation.id]
    );

    await run(
      `INSERT INTO stock_movements (variation_id, change, reason) VALUES (?, ?, ?);`,
      [variation.id, -2, 'Demo sale INV-1001']
    );
  }

  console.log('Seeded database at', dbPath);
  db.close();
};

seed().catch((err) => {
  console.error(err);
  db.close();
});
