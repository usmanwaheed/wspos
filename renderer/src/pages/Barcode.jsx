import { useMemo, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { formatCurrency } from '../utils/format.js';
import { useEffect, useRef } from 'react';

const BarcodeSticker = ({ variation }) => {
  const svgRef = useRef(null);
  useEffect(() => {
    if (svgRef.current) {
      JsBarcode(svgRef.current, variation.barcode || variation.sku, {
        format: 'CODE128',
        width: 1.4,
        height: 40,
        displayValue: false,
        margin: 0
      });
    }
  }, [variation]);

  return (
    <div className="barcode-sticker relative flex h-[120px] w-[160px] flex-col justify-between rounded-lg border border-slate-800 bg-white p-2 text-slate-900 shadow-sm print:h-[120px] print:w-[160px]">
      <div>
        <p className="text-xs font-semibold leading-tight">{variation.productName}</p>
        <p className="text-[10px] leading-tight">
          {variation.color} / {variation.size}
        </p>
      </div>
      <svg ref={svgRef} className="h-10 w-full" />
      <div className="flex items-center justify-between text-[10px]">
        <span>{variation.sku}</span>
        <span className="font-semibold">{formatCurrency(variation.price)}</span>
      </div>
    </div>
  );
};

const BarcodePage = ({ products }) => {
  const [search, setSearch] = useState('');
  const variations = useMemo(
    () =>
      products.flatMap((product) =>
        product.variations.map((variation) => ({
          ...variation,
          productName: product.name,
          category: product.category
        }))
      ),
    [products]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return variations;
    return variations.filter((item) =>
      [item.productName, item.color, item.size, item.sku, item.barcode]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [variations, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Barcode Stickers</h2>
          <p className="text-xs text-slate-400">
            Printable CODE128 stickers designed for 40×30mm Zebra labels. Use browser print to produce sheets.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="rounded border border-emerald-400/40 px-4 py-2 text-sm text-emerald-200 hover:bg-emerald-500/10"
        >
          Print Stickers
        </button>
      </div>
      <div>
        <label className="text-xs text-slate-400">Search</label>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          placeholder="Product, SKU or barcode"
        />
      </div>
      <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4 md:grid-cols-4 xl:grid-cols-5">
        {filtered.map((variation) => (
          <BarcodeSticker key={variation.id} variation={variation} />
        ))}
        {!filtered.length && (
          <div className="col-span-full rounded border border-dashed border-slate-800 p-6 text-center text-xs text-slate-400">
            No stickers match the filter.
          </div>
        )}
      </div>
    </div>
  );
};

export default BarcodePage;
