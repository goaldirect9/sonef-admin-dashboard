import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import authService from '@/services/auth.service';
import adminService, { DashboardStats } from '@/services/admin.service';
import StatCard from '@/components/StatCard';
import ChartCard from '@/components/ChartCard';
import SystemOverviewChart from '@/components/SystemOverviewChart';
import AgencyStatusChart from '@/components/AgencyStatusChart';

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check authentication
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }

    setUser(authService.getCurrentUser());
    loadDashboardStats();
  }, [router]);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const data = await adminService.getDashboardStats();
      setStats(data);
      setError('');
    } catch (err: any) {
      console.error('Error loading dashboard stats:', err);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
  };

  const handleRefresh = () => {
    loadDashboardStats();
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard - Admin - Sonef</title>
        <meta name="description" content="Admin dashboard for Sonef transport system" />
      </Head>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-500 mt-1">Welcome back, {user?.name || 'Admin'}</p>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  disabled={loading}
                >
                  {loading ? 'Refreshing...' : 'Refresh'}
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {stats && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
                <StatCard
                  title="Total Users"
                  value={stats.users.total.toLocaleString()}
                  subtitle="Registered users"
                  color="blue"
                  icon={
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  }
                />

                <StatCard
                  title="Total Agencies"
                  value={stats.agencies.total.toLocaleString()}
                  subtitle={`${stats.agencies.active} active, ${stats.agencies.suspended} suspended`}
                  color="green"
                  icon={
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  }
                />

                <StatCard
                  title="Transporters"
                  value={(stats.transporters?.total ?? 0).toLocaleString()}
                  subtitle={`${stats.transporters?.active ?? 0} active, ${stats.transporters?.suspended ?? 0} suspended`}
                  color="teal"
                  icon={
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  }
                />

                <StatCard
                  title="Total Trips"
                  value={stats.trips.total.toLocaleString()}
                  subtitle={`${stats.trips.active} active, ${stats.trips.inactive} inactive`}
                  color="purple"
                  icon={
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  }
                />

                <StatCard
                  title="Total Bookings"
                  value={stats.bookings.total.toLocaleString()}
                  subtitle="All time bookings"
                  color="orange"
                  icon={
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  }
                />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ChartCard title="System Overview">
                  <SystemOverviewChart
                    data={{
                      users: stats.users.total,
                      agencies: stats.agencies.total,
                      transporters: stats.transporters?.total ?? 0,
                      trips: stats.trips.total,
                      bookings: stats.bookings.total,
                    }}
                  />
                </ChartCard>

                <ChartCard title="Agency Status Distribution">
                  <AgencyStatusChart
                    active={stats.agencies.active}
                    suspended={stats.agencies.suspended}
                  />
                </ChartCard>

                <ChartCard title="Transporter accounts">
                  <AgencyStatusChart
                    active={stats.transporters?.active ?? 0}
                    suspended={stats.transporters?.suspended ?? 0}
                  />
                </ChartCard>
              </div>

              {/* Quick Actions */}
              <div className="mt-8 bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => router.push('/activity')}
                    className="px-6 py-4 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition text-left"
                  >
                    <div className="font-semibold">System Activity</div>
                    <div className="text-sm mt-1">Monitor recent activity</div>
                  </button>
                  <button
                    onClick={() => router.push('/agencies')}
                    className="px-6 py-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-left"
                  >
                    <div className="font-semibold">Manage Agencies</div>
                    <div className="text-sm mt-1">View and manage all agencies</div>
                  </button>
                  <button
                    onClick={() => router.push('/transporters')}
                    className="px-6 py-4 bg-cyan-50 text-cyan-800 rounded-lg hover:bg-cyan-100 transition text-left"
                  >
                    <div className="font-semibold">Manage Transporters</div>
                    <div className="text-sm mt-1">Approve or suspend carrier accounts</div>
                  </button>
                  <button
                    onClick={() => router.push('/users')}
                    className="px-6 py-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition text-left"
                  >
                    <div className="font-semibold">Manage Users</div>
                    <div className="text-sm mt-1">View all registered users</div>
                  </button>
                  <button
                    onClick={() => router.push('/bookings')}
                    className="px-6 py-4 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition text-left"
                  >
                    <div className="font-semibold">View Bookings</div>
                    <div className="text-sm mt-1">Monitor all bookings</div>
                  </button>
                  <button
                    onClick={() => router.push('/layout-templates')}
                    className="px-6 py-4 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 transition text-left"
                  >
                    <div className="font-semibold">🚌 Seat Layout Templates</div>
                    <div className="text-sm mt-1">Design vehicle seat maps for buses</div>
                  </button>
                  <button
                    onClick={() => router.push('/payment-wallets')}
                    className="px-6 py-4 bg-amber-50 text-amber-900 rounded-lg hover:bg-amber-100 transition text-left"
                  >
                    <div className="font-semibold">Payment wallet catalog</div>
                    <div className="text-sm mt-1">Manage platform wallet types (Masrivi, Bankili, …)</div>
                  </button>
                  <button
                    onClick={() => router.push('/settings')}
                    className="px-6 py-4 bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 transition text-left"
                  >
                    <div className="font-semibold">⚙️ Platform Settings</div>
                    <div className="text-sm mt-1">Trip publish fee and other configurable values</div>
                  </button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}
