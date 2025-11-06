import { useMemo, useState } from 'react';
import { formatCurrency } from '../utils/format.js';

const InventoryPage = ({ products, lowStock, reloadProducts, reloadLowStock }) => {
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(false);

  const variations = useMemo(
    () =>
      products.flatMap((product) =>
        product.variations.map((variation) => ({
          ...variation,
          productName: product.name,
          category: product.category,
          brand: product.brand
        }))
      ),
    [products]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return variations;
    return variations.filter((item) =>
      [item.productName, item.color, item.size, item.sku, item.barcode, item.brand]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [variations, search]);

  const exportCSV = async () => {
    const csv = await window.api.exportStock();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'garment-stock.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importCSV = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const text = reader.result;
      const rows = text
        .split(/\r?\n/)
        .filter(Boolean)
        .slice(1)
        .map((line) => line.replace(/"/g, ''))
        .map((line) => line.split(','));
      const payload = rows
        .filter((row) => row.length >= 7)
        .map((row) => ({
          sku: row[3],
          barcode: row[4],
          price: Number(row[5]),
          stock: Number(row[6])
        }));
      await window.api.importStock(payload);
      await reloadProducts();
      await reloadLowStock();
      setImporting(false);
    };
    reader.readAsText(file);
  };

  const updateStock = async (variation, value) => {
    await window.api.importStock([
      {
        sku: variation.sku,
        barcode: variation.barcode,
        price: variation.price,
        stock: value
      }
    ]);
    await reloadProducts();
    await reloadLowStock();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
      <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Inventory Overview</h2>
            <p className="text-xs text-slate-400">
              Monitor stock per color-size variation. Export CSV for audits or import to bulk update.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportCSV}
              className="rounded border border-emerald-400/40 px-3 py-2 text-xs text-emerald-200 hover:bg-emerald-500/10"
            >
              Export CSV
            </button>
            <label className="flex cursor-pointer items-center gap-2 rounded border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800">
              <input type="file" accept=".csv" className="hidden" onChange={importCSV} />
              {importing ? 'Importing…' : 'Import CSV'}
            </label>
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-400">Filter</label>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Color, SKU or barcode"
            className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          />
        </div>
        <div className="max-h-[520px] overflow-y-auto rounded-lg border border-slate-800">
          <table className="min-w-full text-left text-sm text-slate-300">
            <thead className="sticky top-0 bg-slate-900/90 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Color/Size</th>
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2">Barcode</th>
                <th className="px-3 py-2">Price</th>
                <th className="px-3 py-2">Stock</th>
                <th className="px-3 py-2">Adjust</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-slate-900/60">
                  <td className="px-3 py-2">
                    <p className="font-semibold text-slate-100">{item.productName}</p>
                    <p className="text-[11px] text-slate-500">{item.brand}</p>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-400">
                    {item.color} / {item.size}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-slate-500">{item.sku}</td>
                  <td className="px-3 py-2 text-[11px] text-slate-500">{item.barcode}</td>
                  <td className="px-3 py-2 text-emerald-200">{formatCurrency(item.price)}</td>
                  <td className="px-3 py-2">{item.stock}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        onClick={() => updateStock(item, Math.max(item.stock - 1, 0))}
                        className="rounded border border-slate-700 px-2 py-1 text-slate-300 hover:bg-slate-800"
                      >
                        -1
                      </button>
                      <button
                        onClick={() => updateStock(item, item.stock + 1)}
                        className="rounded border border-slate-700 px-2 py-1 text-slate-300 hover:bg-slate-800"
                      >
                        +1
                      </button>
                      <input
                        type="number"
                        min={0}
                        defaultValue={item.stock}
                        onBlur={(event) => updateStock(item, Number(event.target.value || 0))}
                        className="w-20 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Low Stock Alerts</h3>
          <p className="text-xs text-slate-400">
            Variations under the safety threshold (≤ 5 units). Restock soon to avoid shortages.
          </p>
        </div>
        <div className="space-y-3">
          {lowStock.map((item) => (
            <div key={item.id} className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
              <p className="font-semibold text-white">{item.product_name}</p>
              <p className="text-xs">
                {item.color} / {item.size} — Stock {item.stock}
              </p>
            </div>
          ))}
          {!lowStock.length && (
            <div className="rounded border border-slate-800 bg-slate-900/70 p-6 text-center text-xs text-slate-400">
              Excellent! No low stock alerts right now.
            </div>
          )}
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4 text-xs text-slate-300">
          <p className="font-semibold text-slate-200">CSV Format</p>
          <p className="mt-2">
            Columns: Product, Color, Size, SKU, Barcode, Price, Stock.
          </p>
          <p className="mt-2 text-slate-400">
            Use the exported file as template. Update stock numbers and re-import to sync quickly.
          </p>
        </div>
      </section>
    </div>
  );
};

export default InventoryPage;
