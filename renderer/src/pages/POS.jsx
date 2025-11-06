import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { formatCurrency, sum, toEscPos } from '../utils/format.js';

const paymentMethods = ['Cash', 'Card', 'Credit'];

const POSPage = ({ products, reloadProducts, onOrderCreated, user }) => {
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(5);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [processing, setProcessing] = useState(false);
  const [notes, setNotes] = useState('');
  const [lastInvoice, setLastInvoice] = useState(null);

  const variations = useMemo(
    () =>
      products.flatMap((product) =>
        product.variations.map((variation) => ({
          ...variation,
          productId: product.id,
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
    return variations.filter((item) => {
      return [
        item.productName,
        item.color,
        item.size,
        item.sku,
        item.barcode,
        item.brand
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [variations, search]);

  const addToCart = (variation) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.variationId === variation.id);
      if (existing) {
        return prev.map((item) =>
          item.variationId === variation.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          variationId: variation.id,
          productId: variation.productId,
          productName: variation.productName,
          color: variation.color,
          size: variation.size,
          sku: variation.sku,
          barcode: variation.barcode,
          unitPrice: Number(variation.price),
          quantity: 1,
          discount: 0
        }
      ];
    });
  };

  const updateCartItem = (variationId, updates) => {
    setCart((prev) =>
      prev.map((item) =>
        item.variationId === variationId
          ? { ...item, ...updates }
          : item
      )
    );
  };

  const removeFromCart = (variationId) => {
    setCart((prev) => prev.filter((item) => item.variationId !== variationId));
  };

  const subtotal = useMemo(
    () => sum(cart.map((item) => item.unitPrice * item.quantity)),
    [cart]
  );
  const itemDiscountTotal = useMemo(
    () => sum(cart.map((item) => Number(item.discount || 0))),
    [cart]
  );
  const grossDiscount = itemDiscountTotal + Number(orderDiscount || 0);
  const taxable = Math.max(subtotal - grossDiscount, 0);
  const tax = taxable * (Number(taxRate) / 100);
  const total = taxable + tax;

  const clearSale = () => {
    setCart([]);
    setOrderDiscount(0);
    setNotes('');
  };

  const generateInvoice = (orderNumber) => {
    const line = (text = '') => text + '\n';
    const now = format(new Date(), 'dd MMM yyyy HH:mm');
    let body = '';
    body += line('        GARMENT POS INVOICE');
    body += line('  UrbanTailor Garments & Accessories');
    body += line('  221B Baker Street, Offline City');
    body += line('  Phone: +91 98765 43210');
    body += line('------------------------------------------');
    body += line(`Invoice: ${orderNumber}`);
    body += line(`Cashier: ${user.username}`);
    body += line(`Date: ${now}`);
    body += line('------------------------------------------');
    body += line('Item                Qty  Price   Total');
    body += line('------------------------------------------');
    cart.forEach((item) => {
      const totalLine = item.unitPrice * item.quantity - Number(item.discount || 0);
      const title = `${item.productName} ${item.color}/${item.size}`;
      body += line(title.slice(0, 32));
      body += line(
        `${String(item.quantity).padStart(2, ' ')} x ${item.unitPrice
          .toFixed(2)
          .padStart(7, ' ')}  ${(totalLine).toFixed(2).padStart(8, ' ')}`
      );
      if (item.discount) {
        body += line(`   Discount: -${item.discount.toFixed(2)}`);
      }
    });
    body += line('------------------------------------------');
    body += line(`Subtotal:         ${subtotal.toFixed(2).padStart(10, ' ')}`);
    body += line(`Discount:        -${grossDiscount.toFixed(2).padStart(10, ' ')}`);
    body += line(`Tax (${taxRate}%):     ${tax.toFixed(2).padStart(10, ' ')}`);
    body += line(`Total:            ${total.toFixed(2).padStart(10, ' ')}`);
    body += line(`Payment: ${paymentMethod}`);
    if (notes) {
      body += line('------------------------------------------');
      body += line(`Notes: ${notes}`);
    }
    body += line('------------------------------------------');
    body += line('Thank you for shopping with us!');
    body += line('Return within 7 days with receipt.');
    body += line('\n\n\n');

    return `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>
      body { font-family: 'Courier New', monospace; font-size: 12px; }
      pre { white-space: pre-wrap; }
    </style></head><body><pre>${toEscPos(body)}</pre></body></html>`;
  };

  const completeSale = async () => {
    if (!cart.length) return;
    setProcessing(true);
    try {
      const orderPayload = {
        items: cart.map((item) => ({
          productId: item.productId,
          variationId: item.variationId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: Number(item.discount || 0),
          lineTotal: item.unitPrice * item.quantity - Number(item.discount || 0)
        })),
        subtotal,
        discount: grossDiscount,
        tax,
        total,
        paymentMethod,
        notes
      };
      const response = await window.api.createOrder(orderPayload);
      const invoiceHtml = generateInvoice(response.orderNumber);
      setLastInvoice(invoiceHtml);
      await window.api.printInvoice(invoiceHtml).catch(() => null);
      await reloadProducts();
      await onOrderCreated();
      clearSale();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-3">
      <section className="lg:col-span-2 space-y-4">
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <label className="block text-sm text-slate-400">Search products</label>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Scan barcode, SKU or type to search"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100 focus:border-emerald-400 focus:outline-none"
              />
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-2 text-sm text-slate-300">
              Variations in view: <span className="font-semibold text-emerald-200">{filtered.length}</span>
            </div>
          </div>
          <div className="mt-4 grid max-h-[420px] grid-cols-1 gap-3 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-left transition hover:border-emerald-400/60 hover:bg-emerald-500/10"
              >
                <p className="font-semibold text-slate-100">{item.productName}</p>
                <p className="text-xs text-slate-400">
                  {item.color} • {item.size}
                </p>
                <p className="mt-2 text-sm text-emerald-200">{formatCurrency(item.price)}</p>
                <p className="mt-1 text-[11px] text-slate-500">SKU: {item.sku}</p>
                <p className="text-[11px] text-slate-500">Stock: {item.stock}</p>
              </button>
            ))}
            {!filtered.length && (
              <div className="col-span-full rounded-lg border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
                No products found for "{search}".
              </div>
            )}
          </div>
        </div>
      </section>
      <section className="space-y-4">
        <div className="rounded-xl border border-slate-800 bg-slate-950/60">
          <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold text-slate-200">Current Sale</p>
            <button
              onClick={clearSale}
              className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
            >
              Clear
            </button>
          </header>
          <div className="max-h-80 space-y-3 overflow-y-auto p-4 pr-2">
            {cart.map((item) => (
              <div
                key={item.variationId}
                className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-100">{item.productName}</p>
                    <p className="text-xs text-slate-400">
                      {item.color} / {item.size}
                    </p>
                    <p className="text-[11px] text-slate-500">{item.sku}</p>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.variationId)}
                    className="text-xs text-rose-300 hover:text-rose-200"
                  >
                    Remove
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <label className="space-y-1">
                    <span className="text-slate-400">Quantity</span>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(event) =>
                        updateCartItem(item.variationId, {
                          quantity: Number(event.target.value || 1)
                        })
                      }
                      className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-slate-400">Discount</span>
                    <input
                      type="number"
                      min={0}
                      value={item.discount}
                      onChange={(event) =>
                        updateCartItem(item.variationId, {
                          discount: Number(event.target.value || 0)
                        })
                      }
                      className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
                    />
                  </label>
                </div>
                <p className="mt-2 text-xs text-emerald-200">
                  Line Total: {formatCurrency(item.unitPrice * item.quantity - Number(item.discount || 0))}
                </p>
              </div>
            ))}
            {!cart.length && (
              <div className="rounded-lg border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
                Cart is empty. Scan or tap products to add them here.
              </div>
            )}
          </div>
          <div className="space-y-3 border-t border-slate-800 px-4 py-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="space-y-1">
                <span className="text-slate-400">Bill Discount</span>
                <input
                  type="number"
                  min={0}
                  value={orderDiscount}
                  onChange={(event) => setOrderDiscount(Number(event.target.value || 0))}
                  className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
                />
              </label>
              <label className="space-y-1">
                <span className="text-slate-400">Tax %</span>
                <input
                  type="number"
                  min={0}
                  value={taxRate}
                  onChange={(event) => setTaxRate(Number(event.target.value || 0))}
                  className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
                />
              </label>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Item Discount</span>
              <span>-{formatCurrency(itemDiscountTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Bill Discount</span>
              <span>-{formatCurrency(orderDiscount)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Tax</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-base font-semibold text-emerald-300">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <div>
              <label className="block text-xs text-slate-400">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-2 text-sm text-slate-100"
              >
                {paymentMethods.map((method) => (
                  <option key={method}>{method}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400">Notes / Customer</label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={2}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100"
                placeholder="Optional information for receipt"
              />
            </div>
            <button
              disabled={!cart.length || processing}
              onClick={completeSale}
              className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-400 disabled:opacity-40"
            >
              {processing ? 'Processing…' : 'Complete Sale & Print'}
            </button>
          </div>
        </div>
        {lastInvoice && (
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-xs text-slate-300">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-200">Last Invoice Preview</p>
              <button
                className="text-emerald-300 hover:text-emerald-200"
                onClick={() => window.api.printInvoice(lastInvoice)}
              >
                Print Again
              </button>
            </div>
            <iframe
              title="Invoice preview"
              srcDoc={lastInvoice}
              className="mt-3 h-48 w-full rounded border border-slate-800"
            />
          </div>
        )}
      </section>
    </div>
  );
};

export default POSPage;
