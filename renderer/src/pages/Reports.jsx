import { format } from 'date-fns';
import { formatCurrency } from '../utils/format.js';

const ReportsPage = ({ reports, orders, reloadReports }) => {
  if (!reports) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-6 text-center text-sm text-slate-400">
        Loading reports…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Sales Summary</h2>
          <p className="text-sm text-slate-400">Daily snapshot and monthly trend for quick performance review.</p>
        </div>
        <button
          onClick={reloadReports}
          className="rounded border border-emerald-400/40 px-4 py-2 text-sm text-emerald-200 hover:bg-emerald-500/10"
        >
          Refresh
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs uppercase text-slate-400">Today&apos;s Sales</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-300">{formatCurrency(reports.daily.total)}</p>
          <p className="text-xs text-slate-400">Orders: {reports.daily.orders}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs uppercase text-slate-400">Monthly Sales</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-300">{formatCurrency(reports.monthly.total)}</p>
          <p className="text-xs text-slate-400">Orders: {reports.monthly.orders}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs uppercase text-slate-400">Low Stock Items</p>
          <p className="mt-2 text-2xl font-semibold text-amber-300">{reports.lowStock.length}</p>
          <p className="text-xs text-slate-400">Reorder soon to avoid outages.</p>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <h3 className="text-lg font-semibold text-white">Product-wise Sales</h3>
          <p className="text-xs text-slate-400">Revenue by garment to identify top performers.</p>
          <div className="mt-4 space-y-3">
            {reports.productSales.map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm">
                <div>
                  <p className="font-semibold text-slate-100">{item.name}</p>
                  <p className="text-xs text-slate-400">Qty {item.quantity}</p>
                </div>
                <span className="text-emerald-200">{formatCurrency(item.revenue)}</span>
              </div>
            ))}
            {!reports.productSales.length && (
              <div className="rounded border border-dashed border-slate-700 p-6 text-center text-xs text-slate-400">
                No order data yet.
              </div>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <h3 className="text-lg font-semibold text-white">Recent Orders</h3>
          <p className="text-xs text-slate-400">Latest transactions completed on the POS.</p>
          <div className="mt-4 space-y-3">
            {orders.slice(0, 6).map((order) => (
              <div key={order.id} className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-100">{order.order_number}</p>
                  <p className="text-emerald-200">{formatCurrency(order.total)}</p>
                </div>
                <p className="text-[11px] text-slate-400">
                  {format(new Date(order.created_at), 'dd MMM yyyy HH:mm')} • {order.payment_method}
                </p>
                <ul className="mt-2 space-y-1 text-xs text-slate-400">
                  {order.items?.map((item) => (
                    <li key={item.id}>
                      {item.name} ({item.color}/{item.size}) × {item.quantity}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {!orders.length && (
              <div className="rounded border border-dashed border-slate-700 p-6 text-center text-xs text-slate-400">
                No orders recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
