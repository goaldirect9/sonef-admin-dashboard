import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import authService from '@/services/auth.service';
import adminService, { PlatformSetting } from '@/services/admin.service';

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

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
      const data = await adminService.listPlatformSettings();
      setSettings(data);
      const vals: Record<string, string> = {};
      data.forEach((s) => (vals[s.key] = s.value));
      setEditValues(vals);
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

  const getSettingLabel = (setting: PlatformSetting) => {
    if (setting.key === 'customer_service_whatsapp') {
      return 'Customer Service WhatsApp';
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

        <main className="max-w-3xl mx-auto px-4 py-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-gray-500">Loading…</p>
          ) : settings.length === 0 ? (
            <p className="text-gray-500">No settings found.</p>
          ) : (
            <div className="bg-white rounded-lg shadow divide-y">
              {settings.map((s) => (
                <div key={s.key} className="p-5">
                  <div className="flex flex-wrap gap-3 items-end justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{getSettingLabel(s)}</p>
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
        </main>
      </div>
    </>
  );
}
