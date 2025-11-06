import { useMemo, useState } from 'react';
import { formatCurrency } from '../utils/format.js';

const createDefaultProduct = () => ({
  name: '',
  category: 'Shirts',
  brand: 'UrbanTailor',
  basePrice: 0,
  image: '',
  variations: []
});

const categories = ['Shirts', 'Jeans', 'Trousers', 'Accessories'];

const ProductsPage = ({ products, reload, loading }) => {
  const [showForm, setShowForm] = useState(false);
  const [productForm, setProductForm] = useState(createDefaultProduct());
  const [editingId, setEditingId] = useState(null);
  const [filters, setFilters] = useState({ category: '', color: '', size: '', search: '' });
  const [submitting, setSubmitting] = useState(false);

  const filteredProducts = useMemo(() => {
    return products
      .filter((product) =>
        filters.category ? product.category === filters.category : true
      )
      .map((product) => ({
        ...product,
        variations: product.variations.filter((variation) => {
          if (filters.color && variation.color !== filters.color) return false;
          if (filters.size && variation.size !== filters.size) return false;
          if (filters.search) {
            const q = filters.search.toLowerCase();
            const haystack = [
              product.name,
              product.brand,
              variation.color,
              variation.size,
              variation.sku,
              variation.barcode
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase();
            if (!haystack.includes(q)) return false;
          }
          return true;
        })
      }))
      .filter((product) => product.variations.length);
  }, [products, filters]);

  const resetForm = () => {
    setProductForm(createDefaultProduct());
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (product) => {
    setProductForm({
      id: product.id,
      name: product.name,
      category: product.category,
      brand: product.brand,
      basePrice: product.basePrice,
      image: product.image,
      variations: product.variations.map((variation) => ({ ...variation }))
    });
    setEditingId(product.id);
    setShowForm(true);
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setProductForm((prev) => ({ ...prev, image: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const updateVariation = (index, updates) => {
    setProductForm((prev) => {
      const variations = [...prev.variations];
      variations[index] = { ...variations[index], ...updates };
      return { ...prev, variations };
    });
  };

  const addVariation = () => {
    setProductForm((prev) => ({
      ...prev,
      variations: [
        ...prev.variations,
        {
          color: 'Black',
          size: 'M',
          stock: 10,
          price: prev.basePrice || 0,
          sku: '',
          barcode: ''
        }
      ]
    }));
  };

  const removeVariation = (index) => {
    setProductForm((prev) => ({
      ...prev,
      variations: prev.variations.filter((_, idx) => idx !== index)
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...productForm,
        basePrice: Number(productForm.basePrice),
        variations: productForm.variations.map((variation) => ({
          ...variation,
          price: Number(variation.price),
          stock: Number(variation.stock)
        }))
      };
      await window.api.saveProduct(payload);
      await reload();
      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  const deleteProduct = async (id) => {
    if (!confirm('Delete this product and all variations?')) return;
    await window.api.deleteProduct(id);
    await reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Manage Garment Catalog</h2>
          <p className="text-sm text-slate-400">
            Add garments with color-size variations. Barcodes and SKUs are auto-generated but can be overridden.
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setProductForm(createDefaultProduct());
          }}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-400"
        >
          Add New Product
        </button>
      </div>

      <div className="grid gap-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4 md:grid-cols-4">
        <div>
          <label className="text-xs text-slate-400">Category</label>
          <select
            value={filters.category}
            onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">All</option>
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400">Color</label>
          <input
            value={filters.color}
            onChange={(e) => setFilters((prev) => ({ ...prev, color: e.target.value }))}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            placeholder="Any"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400">Size</label>
          <input
            value={filters.size}
            onChange={(e) => setFilters((prev) => ({ ...prev, size: e.target.value }))}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            placeholder="Any"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400">Search</label>
          <input
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            placeholder="Name, SKU or barcode"
          />
        </div>
      </div>

      <div className="space-y-3">
        {filteredProducts.map((product) => (
          <div key={product.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-16 w-16 rounded-lg border border-slate-800 object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-xs text-slate-400">
                    No image
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold text-white">{product.name}</h3>
                  <p className="text-xs text-slate-400">
                    {product.category} • {product.brand}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(product)}
                  className="rounded border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteProduct(product.id)}
                  className="rounded border border-rose-500/40 px-3 py-2 text-xs text-rose-200 hover:bg-rose-500/10"
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-300">
                <thead>
                  <tr className="border-y border-slate-800 text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-2 py-2">Color</th>
                    <th className="px-2 py-2">Size</th>
                    <th className="px-2 py-2">SKU</th>
                    <th className="px-2 py-2">Barcode</th>
                    <th className="px-2 py-2">Price</th>
                    <th className="px-2 py-2">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {product.variations.map((variation) => (
                    <tr key={variation.id} className="border-b border-slate-900/60">
                      <td className="px-2 py-2">{variation.color}</td>
                      <td className="px-2 py-2">{variation.size}</td>
                      <td className="px-2 py-2 text-xs text-slate-400">{variation.sku}</td>
                      <td className="px-2 py-2 text-xs text-slate-400">{variation.barcode}</td>
                      <td className="px-2 py-2 text-emerald-200">{formatCurrency(variation.price)}</td>
                      <td className="px-2 py-2">{variation.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {!filteredProducts.length && (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-10 text-center text-sm text-slate-400">
            No products match the selected filters.
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-6">
          <div className="h-full w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                {editingId ? 'Edit Product' : 'Add Product'}
              </h2>
              <button onClick={resetForm} className="text-sm text-slate-400 hover:text-slate-200">
                Close
              </button>
            </div>
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="text-slate-400">Name</span>
                  <input
                    required
                    value={productForm.name}
                    onChange={(event) =>
                      setProductForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-slate-400">Category</span>
                  <select
                    value={productForm.category}
                    onChange={(event) =>
                      setProductForm((prev) => ({ ...prev, category: event.target.value }))
                    }
                    className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                  >
                    {categories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-slate-400">Brand</span>
                  <input
                    value={productForm.brand}
                    onChange={(event) =>
                      setProductForm((prev) => ({ ...prev, brand: event.target.value }))
                    }
                    className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-slate-400">Base Price</span>
                  <input
                    type="number"
                    value={productForm.basePrice}
                    onChange={(event) =>
                      setProductForm((prev) => ({ ...prev, basePrice: Number(event.target.value || 0) }))
                    }
                    className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                  />
                </label>
              </div>
              <div>
                <label className="text-sm text-slate-400">Product Image</label>
                <div className="mt-2 flex items-center gap-4">
                  {productForm.image ? (
                    <img
                      src={productForm.image}
                      alt="Preview"
                      className="h-24 w-24 rounded-lg border border-slate-800 object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-xs text-slate-500">
                      No image
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleImageUpload} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-200">Variations</h3>
                  <button
                    type="button"
                    onClick={addVariation}
                    className="text-xs text-emerald-300 hover:text-emerald-200"
                  >
                    Add Variation
                  </button>
                </div>
                <div className="mt-3 grid gap-3">
                  {productForm.variations.map((variation, index) => (
                    <div
                      key={index}
                      className="grid gap-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3 md:grid-cols-6"
                    >
                      <label className="space-y-1 text-xs">
                        <span className="text-slate-400">Color</span>
                        <input
                          value={variation.color}
                          onChange={(event) =>
                            updateVariation(index, { color: event.target.value })
                          }
                          className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
                        />
                      </label>
                      <label className="space-y-1 text-xs">
                        <span className="text-slate-400">Size</span>
                        <input
                          value={variation.size}
                          onChange={(event) =>
                            updateVariation(index, { size: event.target.value })
                          }
                          className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
                        />
                      </label>
                      <label className="space-y-1 text-xs">
                        <span className="text-slate-400">Price</span>
                        <input
                          type="number"
                          value={variation.price}
                          onChange={(event) =>
                            updateVariation(index, { price: Number(event.target.value || 0) })
                          }
                          className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
                        />
                      </label>
                      <label className="space-y-1 text-xs">
                        <span className="text-slate-400">Stock</span>
                        <input
                          type="number"
                          value={variation.stock}
                          onChange={(event) =>
                            updateVariation(index, { stock: Number(event.target.value || 0) })
                          }
                          className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
                        />
                      </label>
                      <label className="space-y-1 text-xs">
                        <span className="text-slate-400">SKU</span>
                        <input
                          value={variation.sku || ''}
                          onChange={(event) =>
                            updateVariation(index, { sku: event.target.value })
                          }
                          placeholder="Auto"
                          className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
                        />
                      </label>
                      <label className="space-y-1 text-xs">
                        <span className="text-slate-400">Barcode</span>
                        <input
                          value={variation.barcode || ''}
                          onChange={(event) =>
                            updateVariation(index, { barcode: event.target.value })
                          }
                          placeholder="Auto"
                          className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => removeVariation(index)}
                        className="text-xs text-rose-300 hover:text-rose-200"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {!productForm.variations.length && (
                    <div className="rounded border border-dashed border-slate-800 p-6 text-center text-xs text-slate-400">
                      No variations yet. Use "Add Variation" to create color-size combos.
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400 disabled:opacity-50"
                >
                  {submitting ? 'Saving…' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
