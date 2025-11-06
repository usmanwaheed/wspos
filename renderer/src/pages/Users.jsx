import { useEffect, useState } from 'react';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: '', password: '', role: 'Cashier' });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    const list = await window.api.getUsers();
    setUsers(list);
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setCreating(true);
    await window.api.createUser(form);
    setForm({ username: '', password: '', role: 'Cashier' });
    await loadUsers();
    setCreating(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-6">
        <h2 className="text-lg font-semibold text-white">Staff Accounts</h2>
        <p className="text-xs text-slate-400">
          Cashiers can access POS and reports. Admin accounts can manage products, inventory and staff.
        </p>
        <div className="mt-4 space-y-3">
          {loading && <p className="text-sm text-slate-400">Loading users…</p>}
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm">
              <div>
                <p className="font-semibold text-slate-100">{user.username}</p>
                <p className="text-xs text-slate-400">Role: {user.role}</p>
              </div>
              <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                {user.role}
              </span>
            </div>
          ))}
          {!loading && !users.length && (
            <div className="rounded border border-dashed border-slate-800 p-6 text-center text-xs text-slate-400">
              No users yet. Create one using the form.
            </div>
          )}
        </div>
      </section>
      <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-6">
        <h2 className="text-lg font-semibold text-white">Create User</h2>
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm text-slate-300">
            Username
            <input
              required
              value={form.username}
              onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
            />
          </label>
          <label className="block text-sm text-slate-300">
            Password
            <input
              required
              type="password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
            />
          </label>
          <label className="block text-sm text-slate-300">
            Role
            <select
              value={form.role}
              onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
            >
              <option>Admin</option>
              <option>Cashier</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={creating}
            className="w-full rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400 disabled:opacity-50"
          >
            {creating ? 'Saving…' : 'Create User'}
          </button>
        </form>
        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/70 p-4 text-xs text-slate-300">
          <p className="font-semibold text-slate-200">Password Security</p>
          <p className="mt-2 text-slate-400">
            Passwords are stored using SHA-256 hashing. Keep credentials safe and create separate accounts for each cashier.
          </p>
        </div>
      </section>
    </div>
  );
};

export default UsersPage;
