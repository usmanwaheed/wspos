import { useState } from 'react';

const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await window.api.login({ username, password });
      onLogin(user);
    } catch (err) {
      setError(err.message || 'Unable to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-slate-900">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950/80 p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-semibold text-white">Garment POS</h1>
          <p className="mt-2 text-sm text-slate-400">Offline point of sale for apparel stores</p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm text-slate-300">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100 focus:border-emerald-400 focus:outline-none"
              placeholder="admin"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100 focus:border-emerald-400 focus:outline-none"
              placeholder="••••••"
            />
          </div>
          {error && (
            <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Login'}
          </button>
        </form>
        <div className="mt-6 rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400">
          <p className="font-semibold text-slate-200">Demo Accounts</p>
          <ul className="mt-2 space-y-1">
            <li>Admin: admin / admin123</li>
            <li>Cashier: cashier / cashier123</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
