PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS stock_movements;
DROP TABLE IF EXISTS product_variations;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;

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

INSERT INTO products (name, category, brand, base_price) VALUES
 ('Classic Oxford Shirt', 'Shirts', 'UrbanTailor', 35),
 ('Slim Fit Jeans', 'Jeans', 'DenimWorks', 55),
 ('Comfort Chino Trousers', 'Trousers', 'UrbanTailor', 45);

-- Shirts variations
WITH base AS (
  SELECT id, name FROM products WHERE name = 'Classic Oxford Shirt'
)
INSERT INTO product_variations (product_id, color, size, sku, barcode, price, stock)
SELECT base.id,
       color.value,
       size.value,
       printf('%s-%s-%s', upper(replace(base.name, ' ', '-')), upper(color.value), upper(size.value)),
       printf('%s-%s-%s', upper(replace(base.name, ' ', '-')), upper(color.value), upper(size.value)),
       35,
       20
FROM base,
     (SELECT 'White' AS value UNION ALL SELECT 'Blue' UNION ALL SELECT 'Black') AS color,
     (SELECT 'S' AS value UNION ALL SELECT 'M' UNION ALL SELECT 'L' UNION ALL SELECT 'XL') AS size;

-- Jeans variations
WITH base AS (
  SELECT id, name FROM products WHERE name = 'Slim Fit Jeans'
)
INSERT INTO product_variations (product_id, color, size, sku, barcode, price, stock)
SELECT base.id,
       color.value,
       size.value,
       printf('%s-%s-%s', upper(replace(base.name, ' ', '-')), upper(color.value), upper(size.value)),
       printf('%s-%s-%s', upper(replace(base.name, ' ', '-')), upper(color.value), upper(size.value)),
       55,
       15
FROM base,
     (SELECT 'Indigo' AS value UNION ALL SELECT 'Black') AS color,
     (SELECT '30' AS value UNION ALL SELECT '32' UNION ALL SELECT '34' UNION ALL SELECT '36') AS size;

-- Chino variations
WITH base AS (
  SELECT id, name FROM products WHERE name = 'Comfort Chino Trousers'
)
INSERT INTO product_variations (product_id, color, size, sku, barcode, price, stock)
SELECT base.id,
       color.value,
       size.value,
       printf('%s-%s-%s', upper(replace(base.name, ' ', '-')), upper(color.value), upper(size.value)),
       printf('%s-%s-%s', upper(replace(base.name, ' ', '-')), upper(color.value), upper(size.value)),
       45,
       12
FROM base,
     (SELECT 'Khaki' AS value UNION ALL SELECT 'Navy') AS color,
     (SELECT 'S' AS value UNION ALL SELECT 'M' UNION ALL SELECT 'L' UNION ALL SELECT 'XL') AS size;

INSERT INTO users (username, password, role) VALUES
 ('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Admin'),
 ('cashier', '6b1b36cbb04b41490bfc0ab2bfa26f86cd1ded9f2a1d407af509a2a7fdb2d5d7', 'Cashier');

INSERT INTO orders (order_number, subtotal, discount, tax, total, payment_method, created_at)
VALUES ('INV-1001', 180, 10, 9, 179, 'Cash', datetime('now', '-1 day'));

INSERT INTO order_items (order_id, product_id, variation_id, quantity, unit_price, discount, line_total)
SELECT 1, pv.product_id, pv.id, 2, pv.price, 0, pv.price * 2
FROM product_variations pv
WHERE pv.id IN (SELECT id FROM product_variations LIMIT 3);

UPDATE product_variations SET stock = stock - 2 WHERE id IN (SELECT id FROM product_variations LIMIT 3);

INSERT INTO stock_movements (variation_id, change, reason)
SELECT id, -2, 'Demo sale INV-1001'
FROM product_variations
WHERE id IN (SELECT id FROM product_variations LIMIT 3);
