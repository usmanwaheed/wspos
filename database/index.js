const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const hashPassword = (password) =>
  crypto.createHash('sha256').update(password).digest('hex');

const slugify = (value) =>
  value
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const wrapTransaction = async (db, fn) => {
  await run(db, 'BEGIN IMMEDIATE TRANSACTION');
  try {
    const result = await fn();
    await run(db, 'COMMIT');
    return result;
  } catch (error) {
    await run(db, 'ROLLBACK');
    throw error;
  }
};

const run = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });

const get = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });

const all = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });

function createDatabase(dbPath) {
  const exists = fs.existsSync(dbPath);
  if (!exists) {
    const sourcePath = path.join(__dirname, 'seed', 'pos.db');
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, dbPath);
    } else {
      throw new Error('Seed database not found at ' + sourcePath);
    }
  }

  const db = new sqlite3.Database(dbPath);

  const buildProductPayload = (rows) => {
    const map = new Map();
    rows.forEach((row) => {
      if (!map.has(row.product_id)) {
        map.set(row.product_id, {
          id: row.product_id,
          name: row.name,
          category: row.category,
          brand: row.brand,
          basePrice: row.base_price,
          image: row.image,
          variations: []
        });
      }
      map.get(row.product_id).variations.push({
        id: row.variation_id,
        color: row.color,
        size: row.size,
        sku: row.sku,
        barcode: row.barcode,
        price: row.price,
        stock: row.stock
      });
    });
    return Array.from(map.values());
  };

  const getProducts = async (filters = {}) => {
    const conditions = [];
    const params = [];
    if (filters.id) {
      conditions.push('p.id = ?');
      params.push(filters.id);
    }
    if (filters.category) {
      conditions.push('p.category = ?');
      params.push(filters.category);
    }
    if (filters.color) {
      conditions.push('pv.color = ?');
      params.push(filters.color);
    }
    if (filters.size) {
      conditions.push('pv.size = ?');
      params.push(filters.size);
    }
    if (filters.search) {
      conditions.push('(p.name LIKE ? OR pv.sku LIKE ? OR pv.barcode LIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await all(
      db,
      `SELECT p.*, pv.id AS variation_id, pv.color, pv.size, pv.sku, pv.barcode, pv.price, pv.stock
       FROM products p
       JOIN product_variations pv ON pv.product_id = p.id
       ${where}
       ORDER BY p.name ASC, pv.color ASC, pv.size ASC`,
      params
    );
    return buildProductPayload(rows);
  };

  const saveProduct = async (payload) =>
    wrapTransaction(db, async () => {
      const { id, name, category, brand, basePrice, image, variations } = payload;
      let productId = id;
      if (productId) {
        await run(
          db,
          `UPDATE products SET name = ?, category = ?, brand = ?, base_price = ?, image = ? WHERE id = ?`,
          [name, category, brand, basePrice, image, productId]
        );
      } else {
        const result = await run(
          db,
          `INSERT INTO products (name, category, brand, base_price, image) VALUES (?, ?, ?, ?, ?)` ,
          [name, category, brand, basePrice, image]
        );
        productId = result.id;
      }

      const existing = await all(
        db,
        `SELECT id FROM product_variations WHERE product_id = ?`,
        [productId]
      );
      const existingIds = new Set(existing.map((row) => row.id));
      const keepIds = new Set();

      for (const variation of variations) {
        const skuBase = slugify(name);
        const sku = variation.sku || `${skuBase}-${slugify(variation.color)}-${slugify(variation.size)}`;
        const barcode = variation.barcode || sku;
        if (variation.id) {
          keepIds.add(variation.id);
          await run(
            db,
            `UPDATE product_variations SET color = ?, size = ?, sku = ?, barcode = ?, price = ?, stock = ? WHERE id = ?`,
            [variation.color, variation.size, sku, barcode, variation.price, variation.stock, variation.id]
          );
        } else {
          const result = await run(
            db,
            `INSERT INTO product_variations (product_id, color, size, sku, barcode, price, stock)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [productId, variation.color, variation.size, sku, barcode, variation.price, variation.stock]
          );
          keepIds.add(result.id);
        }
      }

      for (const id of existingIds) {
        if (!keepIds.has(id)) {
          await run(db, `DELETE FROM product_variations WHERE id = ?`, [id]);
        }
      }

      return { id: productId };
    });

  const deleteProduct = async (productId) => {
    await run(db, `DELETE FROM products WHERE id = ?`, [productId]);
    return true;
  };

  const createOrder = async (order) =>
    wrapTransaction(db, async () => {
      const { items, subtotal, discount, tax, total, paymentMethod } = order;
      const orderNumber = order.orderNumber || `INV-${Date.now()}`;
      const result = await run(
        db,
        `INSERT INTO orders (order_number, subtotal, discount, tax, total, payment_method)
         VALUES (?, ?, ?, ?, ?, ?)` ,
        [orderNumber, subtotal, discount, tax, total, paymentMethod]
      );
      const orderId = result.id;

      for (const item of items) {
        await run(
          db,
          `INSERT INTO order_items (order_id, product_id, variation_id, quantity, unit_price, discount, line_total)
           VALUES (?, ?, ?, ?, ?, ?, ?)` ,
          [
            orderId,
            item.productId,
            item.variationId,
            item.quantity,
            item.unitPrice,
            item.discount || 0,
            item.lineTotal
          ]
        );
        await run(
          db,
          `UPDATE product_variations SET stock = stock - ? WHERE id = ?` ,
          [item.quantity, item.variationId]
        );
        await run(
          db,
          `INSERT INTO stock_movements (variation_id, change, reason) VALUES (?, ?, ?)` ,
          [item.variationId, -item.quantity, `Sale ${orderNumber}`]
        );
      }

      return { id: orderId, orderNumber };
    });

  const getOrders = async (filters = {}) => {
    const params = [];
    const conditions = [];
    if (filters.paymentMethod) {
      conditions.push('o.payment_method = ?');
      params.push(filters.paymentMethod);
    }
    if (filters.startDate) {
      conditions.push('date(o.created_at) >= date(?)');
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      conditions.push('date(o.created_at) <= date(?)');
      params.push(filters.endDate);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const orders = await all(
      db,
      `SELECT o.* FROM orders o ${where} ORDER BY datetime(o.created_at) DESC LIMIT 200`,
      params
    );
    const items = await all(
      db,
      `SELECT oi.*, p.name, pv.color, pv.size
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       JOIN product_variations pv ON pv.id = oi.variation_id
       WHERE oi.order_id IN (${orders.map(() => '?').join(',') || 'NULL'})`,
      orders.map((o) => o.id)
    );
    const map = new Map();
    orders.forEach((order) => {
      map.set(order.id, {
        ...order,
        items: []
      });
    });
    items.forEach((item) => {
      const entry = map.get(item.order_id);
      if (entry) {
        entry.items.push(item);
      }
    });
    return Array.from(map.values());
  };

  const getReports = async () => {
    const daily = await get(
      db,
      `SELECT IFNULL(SUM(total), 0) AS total, COUNT(*) AS orders
       FROM orders WHERE date(created_at) = date('now')`
    );
    const monthly = await get(
      db,
      `SELECT IFNULL(SUM(total), 0) AS total, COUNT(*) AS orders
       FROM orders WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`
    );
    const productSales = await all(
      db,
      `SELECT p.name, SUM(oi.quantity) AS quantity, SUM(oi.line_total) AS revenue
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       GROUP BY p.name
       ORDER BY revenue DESC`
    );
    const lowStock = await getLowStock();
    const recentOrders = await all(
      db,
      `SELECT order_number, total, payment_method, created_at FROM orders
       ORDER BY datetime(created_at) DESC LIMIT 5`
    );
    return { daily, monthly, productSales, lowStock, recentOrders };
  };

  const getLowStock = async (threshold = 5) =>
    all(
      db,
      `SELECT pv.*, p.name AS product_name
       FROM product_variations pv
       JOIN products p ON p.id = pv.product_id
       WHERE pv.stock <= ?
       ORDER BY pv.stock ASC`,
      [threshold]
    );

  const importStock = async (entries) =>
    wrapTransaction(db, async () => {
      for (const entry of entries) {
        const stock = Number(entry.stock);
        const price = entry.price === undefined || entry.price === null ? null : Number(entry.price);
        await run(
          db,
          `UPDATE product_variations SET stock = ?, price = COALESCE(?, price)
           WHERE sku = ? OR barcode = ?`,
          [Number.isNaN(stock) ? 0 : stock, price, entry.sku, entry.barcode || entry.sku]
        );
      }
      return true;
    });

  const exportStock = async () => {
    const rows = await all(
      db,
      `SELECT p.name, pv.color, pv.size, pv.sku, pv.barcode, pv.price, pv.stock
       FROM product_variations pv
       JOIN products p ON p.id = pv.product_id
       ORDER BY p.name`
    );
    const header = 'Product,Color,Size,SKU,Barcode,Price,Stock';
    const lines = rows.map((row) =>
      [row.name, row.color, row.size, row.sku, row.barcode, row.price, row.stock]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(',')
    );
    return [header, ...lines].join('\n');
  };

  const getUsers = async () =>
    all(db, `SELECT id, username, role FROM users ORDER BY username ASC`);

  const createUser = async ({ username, password, role }) => {
    const hashed = hashPassword(password);
    const result = await run(
      db,
      `INSERT INTO users (username, password, role) VALUES (?, ?, ?)` ,
      [username, hashed, role]
    );
    return { id: result.id };
  };

  const login = async ({ username, password }) => {
    const hashed = hashPassword(password);
    const user = await get(
      db,
      `SELECT id, username, role FROM users WHERE username = ? AND password = ?`,
      [username, hashed]
    );
    if (!user) {
      throw new Error('Invalid credentials');
    }
    return user;
  };

  return {
    getProducts,
    saveProduct,
    deleteProduct,
    createOrder,
    getOrders,
    getReports,
    getLowStock,
    importStock,
    exportStock,
    getUsers,
    createUser,
    login,
    close: () => db.close()
  };
}

module.exports = createDatabase;
