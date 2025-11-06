import { useEffect, useMemo, useState } from 'react';
import LoginPage from './pages/Login.jsx';
import POSPage from './pages/POS.jsx';
import ProductsPage from './pages/Products.jsx';
import InventoryPage from './pages/Inventory.jsx';
import ReportsPage from './pages/Reports.jsx';
import BarcodePage from './pages/Barcode.jsx';
import UsersPage from './pages/Users.jsx';

const navigation = [
  { key: 'pos', label: 'POS Billing', roles: ['Admin', 'Cashier'] },
  { key: 'products', label: 'Products', roles: ['Admin'] },
  { key: 'inventory', label: 'Inventory', roles: ['Admin'] },
  { key: 'barcodes', label: 'Barcode Printing', roles: ['Admin'] },
  { key: 'reports', label: 'Reports', roles: ['Admin', 'Cashier'] },
  { key: 'users', label: 'Users', roles: ['Admin'] }
];

const App = () => {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('pos');
  const [products, setProducts] = useState([]);
  const [reports, setReports] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const api = window.api;

  const loadProducts = async () => {
    const result = await api.getProducts();
    setProducts(result);
  };

  const loadReports = async () => {
    const summary = await api.getReports();
    setReports(summary);
    const low = await api.getLowStock();
    setLowStock(low);
  };

  const loadOrders = async () => {
    const list = await api.getOrders({});
    setOrders(list);
  };

  const bootstrap = async () => {
    setLoading(true);
    try {
      await Promise.all([loadProducts(), loadReports(), loadOrders()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      bootstrap();
    }
  }, [user]);

  const allowedTabs = useMemo(
    () => navigation.filter((item) => !user || item.roles.includes(user.role)),
    [user]
  );

  useEffect(() => {
    if (!allowedTabs.find((tab) => tab.key === view) && allowedTabs.length) {
      setView(allowedTabs[0].key);
    }
  }, [allowedTabs, view]);

  if (!api) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
        <div className="max-w-md space-y-4 rounded-lg bg-slate-800 p-8 text-center shadow-xl">
          <h1 className="text-2xl font-semibold">Garment POS</h1>
          <p className="text-slate-300">
            This interface runs inside the packaged Electron application. Please start the
            Electron shell via <code className="rounded bg-slate-900 px-2 py-1">npm run dev</code>.
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  const renderContent = () => {
    switch (view) {
      case 'pos':
        return (
          <POSPage
            user={user}
            products={products}
            reloadProducts={loadProducts}
            onOrderCreated={loadOrders}
          />
        );
      case 'products':
        return <ProductsPage products={products} reload={loadProducts} loading={loading} />;
      case 'inventory':
        return (
          <InventoryPage
            products={products}
            lowStock={lowStock}
            reloadProducts={loadProducts}
            reloadLowStock={async () => setLowStock(await api.getLowStock())}
          />
        );
      case 'barcodes':
        return <BarcodePage products={products} />;
      case 'reports':
        return <ReportsPage reports={reports} orders={orders} reloadReports={loadReports} />;
      case 'users':
        return <UsersPage />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100">
      <aside className="flex w-64 flex-col border-r border-slate-800 bg-slate-950/60">
        <div className="flex h-20 items-center justify-center border-b border-slate-800">
          <div>
            <p className="text-lg font-semibold">Garment POS</p>
            <p className="text-xs text-slate-400">{user.role}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {allowedTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-all ${
                view === tab.key
                  ? 'bg-emerald-500/20 text-emerald-200 shadow-inner'
                  : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-slate-800 p-4 text-sm">
          <p className="truncate font-semibold">{user.username}</p>
          <button
            onClick={() => setUser(null)}
            className="mt-2 w-full rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
          >
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-slate-900/40">
        <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              {navigation.find((item) => item.key === view)?.label}
            </h1>
            <p className="text-sm text-slate-400">Fully offline ready POS for garment stores.</p>
          </div>
          <button
            onClick={async () => {
              setLoading(true);
              await bootstrap();
              setLoading(false);
            }}
            className="rounded-md border border-emerald-400/40 px-4 py-2 text-sm text-emerald-200 transition hover:bg-emerald-500/20"
          >
            Refresh Data
          </button>
        </header>
        <div className="h-[calc(100%-5rem)] overflow-y-auto p-6">
          {loading && (
            <div className="mb-4 rounded-lg border border-slate-700 bg-slate-800/70 p-3 text-sm text-slate-200">
              Syncing latest data...
            </div>
          )}
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
