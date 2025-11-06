# Garment POS (Electron + React + SQLite)

Offline-capable point-of-sale system tailored for garment stores. The app bundles an Electron shell, React + TailwindCSS UI, and a local SQLite database seeded with demo shirts, jeans, and trousers.

## ✨ Highlights

- **Complete product management** – categories, brands, base pricing, per variation stock, and optional product images.
- **POS billing workspace** – search by name, SKU, or barcode, manage cart quantities/discounts, capture payment mode, and print ESC/POS thermal invoices.
- **Inventory control** – low stock alerts, quick stock adjustments, CSV import/export for bulk updates.
- **Barcode stickers** – CODE128 stickers optimised for 40×30 mm Zebra/ESC-POS printers, ready to print offline.
- **Reports** – daily/monthly revenue, product-wise sales, and recent order summaries.
- **User access** – Admin (full access) vs Cashier (POS + reports).
- **Offline-ready** – creates a local `pos.db` SQLite file per user profile on first launch.

## 📁 Project structure

```
.
├── main/                # Electron main & preload processes
├── renderer/            # React + Tailwind UI (Vite build)
├── database/            # SQLite helpers and seed SQL
├── package.json         # Workspace scripts & electron-builder config
└── README.md
```

## 🚀 Getting started

1. **Install dependencies** (run inside the repo):
   ```bash
   npm install
   ```

2. **Development mode** – launches Vite dev server and Electron shell:
   ```bash
   npm run dev
   ```
   The renderer is hot-reloaded, and the Electron window updates instantly. Sign in using the demo credentials (below).

3. **Production build** – generate the React bundle and Windows installer:
   ```bash
   npm run build
   npx electron-builder
   ```
   The distributable `.exe` (NSIS) will be available under `dist_electron/`.

4. **Portable package** – to create a directory build without installer:
   ```bash
   npm run package
   ```

## 👥 Demo users

| Role    | Username | Password   |
|---------|----------|------------|
| Admin   | `admin`  | `admin123` |
| Cashier | `cashier`| `cashier123` |

Passwords are hashed with SHA‑256 inside the SQLite database. Create additional accounts from **Users → Create User**.

## 🗄️ Database

- `database/seed.sql` defines the schema plus demo content used to initialise fresh installs.
- On first launch the Electron main process materialises a SQLite database inside the OS user data folder by executing the seed script—no binary `.db` files live in the repository.
- Tables include products, product_variations, orders, order_items, stock_movements, and users.

## 🖨️ Printing templates

- **Invoices**: ESC/POS-friendly 80 mm layout rendered from the POS screen and printed through Electron.
- **Barcode stickers**: CODE128, ready for 40×30 mm Zebra labels. Use the in-app print button (or `Ctrl + P`).

## 📦 Sample content

The bundled database contains:
- Shirts (S/M/L/XL across White, Blue, Black)
- Jeans (30–36 in Indigo and Black)
- Chino trousers (S–XL in Khaki and Navy)
- A demo order (`INV-1001`) for reporting visuals.

## 🧪 Testing notes

Run the UI through `npm run dev` and sign in with the admin account. Modify products, record POS sales, print invoices, and export/import CSV to verify functionality.

## 🧰 Packaging notes

The project is configured for `electron-builder` with an NSIS Windows target. Use:
```bash
npm run build && npx electron-builder
```
The resulting installer bundles the renderer build, Electron main process, and seed SQL; the database file is generated on first launch inside the user's profile directory.

## 🗃️ Ready-to-share archive

Generate a portable source archive straight from git whenever you need to share the project:

```bash
git archive --format=zip --output garment-pos.zip HEAD
```

Copy the resulting `garment-pos.zip` to your Windows machine or share it with colleagues.

---

Happy selling! 💼
