import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import authService from '@/services/auth.service';
import adminService, { PlatformSetting, PaymentWalletDefinition } from '@/services/admin.service';

type WalletEditRow = {
  wallet_definition_id: string;
  provider_key: string;
  display_name: string;
  phone_or_code: string;
  is_enabled: boolean;
};

function buildWalletRows(
  definitions: PaymentWalletDefinition[],
  platformWallets: { wallet_definition_id: string; phone_or_code: string; is_enabled: boolean }[],
): WalletEditRow[] {
  const byDef = new Map(platformWallets.map((w) => [w.wallet_definition_id, w]));
  return definitions.map((d) => {
    const existing = byDef.get(d.id);
    return {
      wallet_definition_id: d.id,
      provider_key: d.provider_key,
      display_name: d.display_name,
      phone_or_code: existing?.phone_or_code ?? '',
      is_enabled: existing?.is_enabled ?? false,
    };
  });
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [walletRows, setWalletRows] = useState<WalletEditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [walletsSaving, setWalletsSaving] = useState(false);
  const [walletsSaved, setWalletsSaved] = useState(false);

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
      const [data, walletSetup] = await Promise.all([
        adminService.listPlatformSettings(),
        adminService.getPlatformWallets(),
      ]);
      setSettings(data);
      const vals: Record<string, string> = {};
      data.forEach((s) => (vals[s.key] = s.value));
      setEditValues(vals);
      setWalletRows(buildWalletRows(walletSetup.definitions, walletSetup.platform_wallets));
    } catch {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key: string) => {
    const value = editValues[key];
    if (value === undefined) return;
    setSaving((p) => ({ ...p, [key]: true }));
    setError('');
    try {
      const updated = await adminService.updatePlatformSetting(key, value);
      setSettings((prev) =>
        prev.map((s) => (s.key === updated.key ? updated : s)),
      );
      setSaved((p) => ({ ...p, [key]: true }));
      setTimeout(() => setSaved((p) => ({ ...p, [key]: false })), 2000);
    } catch {
      setError(`Failed to save ${key}`);
    } finally {
      setSaving((p) => ({ ...p, [key]: false }));
    }
  };

  const handleSaveWallets = async () => {
    setWalletsSaving(true);
    setError('');
    setWalletsSaved(false);
    try {
      const setup = await adminService.upsertPlatformWallets(
        walletRows.map((r) => ({
          wallet_definition_id: r.wallet_definition_id,
          phone_or_code: r.phone_or_code,
          is_enabled: r.is_enabled,
        })),
      );
      setWalletRows(buildWalletRows(setup.definitions, setup.platform_wallets));
      setWalletsSaved(true);
      setTimeout(() => setWalletsSaved(false), 2000);
    } catch {
      setError('Failed to save platform payment wallets');
    } finally {
      setWalletsSaving(false);
    }
  };

  const getSettingLabel = (setting: PlatformSetting) => {
    if (setting.key === 'customer_service_whatsapp') {
      return 'Customer Service WhatsApp';
    }
    if (setting.key === 'trip_publish_fee') {
      return 'Trip publish fee (MRU)';
    }
    return setting.key;
  };

  return (
    <>
      <Head>
        <title>Platform Settings - Admin - Sonef</title>
      </Head>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-900">Platform Settings</h1>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="text-sm text-blue-600 hover:underline"
            >
              Back to dashboard
            </button>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-gray-500">Loading…</p>
          ) : (
            <>
              <section className="bg-white rounded-lg shadow">
                <div className="p-5 border-b">
                  <h2 className="text-base font-semibold text-gray-900">
                    Publish fee payment wallets
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Sonef Masrivi/Bankili/Sedad codes shown to transporters when they pay the trip
                    publish fee.
                  </p>
                </div>
                {walletRows.length === 0 ? (
                  <p className="p-5 text-sm text-gray-500">
                    No wallet types defined. Add types under Payment wallet catalog first.
                  </p>
                ) : (
                  <div className="divide-y">
                    {walletRows.map((row) => (
                      <div key={row.wallet_definition_id} className="p-5 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-medium text-gray-900">{row.display_name}</p>
                            <p className="text-xs text-gray-400 font-mono">{row.provider_key}</p>
                          </div>
                          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={row.is_enabled}
                              onChange={(e) =>
                                setWalletRows((prev) =>
                                  prev.map((r) =>
                                    r.wallet_definition_id === row.wallet_definition_id
                                      ? { ...r, is_enabled: e.target.checked }
                                      : r,
                                  ),
                                )
                              }
                              className="rounded border-gray-300"
                            />
                            Enabled
                          </label>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone or merchant code
                          </label>
                          <input
                            type="text"
                            value={row.phone_or_code}
                            onChange={(e) =>
                              setWalletRows((prev) =>
                                prev.map((r) =>
                                  r.wallet_definition_id === row.wallet_definition_id
                                    ? { ...r, phone_or_code: e.target.value }
                                    : r,
                                ),
                              )
                            }
                            className="border rounded px-3 py-2 text-sm w-full font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                            placeholder="+222… or merchant code"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {walletRows.length > 0 && (
                  <div className="p-5 border-t flex justify-end">
                    <button
                      type="button"
                      onClick={() => void handleSaveWallets()}
                      disabled={walletsSaving}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {walletsSaving ? 'Saving…' : walletsSaved ? '✓ Saved' : 'Save payment wallets'}
                    </button>
                  </div>
                )}
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-3">General settings</h2>
                {settings.length === 0 ? (
                  <p className="text-gray-500">No settings found.</p>
                ) : (
                  <div className="bg-white rounded-lg shadow divide-y">
                    {settings.map((s) => (
                      <div key={s.key} className="p-5">
                        <div className="flex flex-wrap gap-3 items-end justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800">
                              {getSettingLabel(s)}
                            </p>
                            <p className="font-mono text-xs text-gray-500 mt-0.5">{s.key}</p>
                            {s.description && (
                              <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              Last updated: {new Date(s.updated_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editValues[s.key] ?? s.value}
                              onChange={(e) =>
                                setEditValues((prev) => ({ ...prev, [s.key]: e.target.value }))
                              }
                              className="border rounded px-3 py-2 text-sm w-36 font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                            <button
                              type="button"
                              onClick={() => handleSave(s.key)}
                              disabled={saving[s.key]}
                              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                              {saving[s.key] ? 'Saving…' : saved[s.key] ? '✓ Saved' : 'Save'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </>
  );
}
