import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import authService from '@/services/auth.service';
import adminService, { PaymentWalletDefinition } from '@/services/admin.service';

export default function PaymentWalletsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<PaymentWalletDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }
    void load();
  }, [router]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.listWalletDefinitions();
      setRows(data);
    } catch {
      setError('Failed to load wallet definitions');
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (row: PaymentWalletDefinition) => {
    try {
      const updated = await adminService.updateWalletDefinition(row.id, {
        is_active: !row.is_active,
      });
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch {
      setError('Update failed');
    }
  };

  const saveLabel = async (row: PaymentWalletDefinition, display_name: string) => {
    try {
      const updated = await adminService.updateWalletDefinition(row.id, { display_name });
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch {
      setError('Update failed');
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newLabel.trim()) return;
    setCreating(true);
    setError('');
    try {
      const created = await adminService.createWalletDefinition({
        provider_key: newKey.trim().toLowerCase(),
        display_name: newLabel.trim(),
      });
      setRows((prev) => [...prev, created].sort((a, b) => a.sort_order - b.sort_order));
      setNewKey('');
      setNewLabel('');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Create failed';
      setError(msg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Head>
        <title>Payment wallets - Admin - Sonef</title>
      </Head>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-900">Payment wallet catalog</h1>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="text-sm text-blue-600 hover:underline"
            >
              Back to dashboard
            </button>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
          )}

          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Add wallet type</h2>
            <form onSubmit={create} className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1">provider_key</label>
                <input
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="border rounded px-3 py-2 text-sm w-40 font-mono"
                  placeholder="orange_money"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Display name</label>
                <input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="border rounded px-3 py-2 text-sm w-48"
                  placeholder="Orange Money"
                />
              </div>
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'Adding…' : 'Add'}
              </button>
            </form>
            <p className="text-xs text-gray-500 mt-2">
              Only <code>masrivi</code> and <code>bankili</code> are used for manual checkout today; other keys
              appear in agency settings for future use.
            </p>
          </section>

          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Definitions</h2>
            {loading ? (
              <p className="text-gray-500">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="text-gray-500">No definitions</p>
            ) : (
              <ul className="divide-y">
                {rows.map((row) => (
                  <li key={row.id} className="py-4 flex flex-wrap gap-4 items-center justify-between">
                    <div>
                      <p className="font-mono text-sm text-gray-600">{row.provider_key}</p>
                      <InlineLabel
                        initial={row.display_name}
                        onSave={(v) => saveLabel(row, v)}
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        sort {row.sort_order} · {row.is_active ? 'active' : 'inactive'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleActive(row)}
                      className={`text-sm px-3 py-1 rounded border ${
                        row.is_active
                          ? 'border-green-300 text-green-800 bg-green-50'
                          : 'border-gray-300 text-gray-600'
                      }`}
                    >
                      {row.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>
      </div>
    </>
  );
}

function InlineLabel({
  initial,
  onSave,
}: {
  initial: string;
  onSave: (v: string) => void;
}) {
  const [value, setValue] = useState(initial);
  useEffect(() => setValue(initial), [initial]);
  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value.trim() && value.trim() !== initial) onSave(value.trim());
      }}
      className="mt-1 font-semibold text-gray-900 border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none"
    />
  );
}
