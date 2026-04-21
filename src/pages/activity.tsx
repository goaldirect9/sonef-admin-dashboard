import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import authService from '@/services/auth.service';
import adminService, { PendingPublishTrip } from '@/services/admin.service';

interface Filters {
  dateFrom: string;
  dateTo: string;
  status: string;
  search: string;
}

export default function ActivityMonitor() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Data states
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [activeTrips, setActiveTrips] = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [pendingPublishTrips, setPendingPublishTrips] = useState<PendingPublishTrip[]>([]);
  
  // Pagination states
  const [bookingsPage, setBookingsPage] = useState(1);
  const [tripsPage, setTripsPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);
  const [bookingsTotal, setBookingsTotal] = useState(0);
  const [tripsTotal, setTripsTotal] = useState(0);
  const [usersTotal, setUsersTotal] = useState(0);
  
  // Filter states
  const [filters, setFilters] = useState<Filters>({
    dateFrom: '',
    dateTo: '',
    status: '',
    search: '',
  });
  
  const [activeTab, setActiveTab] = useState<'bookings' | 'trips' | 'users' | 'pending-publish'>('bookings');
  const [proofDialog, setProofDialog] = useState<{ paymentId: string; url: string } | null>(null);
  const [proofLoadingId, setProofLoadingId] = useState<string | null>(null);

  // Reject modal state for pending publish
  const [rejectModal, setRejectModal] = useState<{ tripId: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadData();
  }, [router, bookingsPage, tripsPage, usersPage, filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadRecentBookings(),
        loadActiveTrips(),
        loadRecentUsers(),
        loadPendingPublish(),
      ]);
      setError('');
    } catch (err: any) {
      console.error('Error loading activity data:', err);
      setError('Failed to load activity data');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingPublish = async () => {
    try {
      const data = await adminService.getPendingPublishTrips();
      setPendingPublishTrips(data);
    } catch (err) {
      console.error('Error loading pending publish trips:', err);
    }
  };

  const handleApprovePublish = async (tripId: string) => {
    setActionLoading(tripId);
    try {
      await adminService.approvePublishTrip(tripId);
      setPendingPublishTrips((prev) => prev.filter((t) => t.trip_id !== tripId));
    } catch {
      setError('Failed to approve trip');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectPublish = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal.tripId);
    try {
      await adminService.rejectPublishTrip(rejectModal.tripId, rejectReason.trim() || undefined);
      setPendingPublishTrips((prev) => prev.filter((t) => t.trip_id !== rejectModal.tripId));
      setRejectModal(null);
      setRejectReason('');
    } catch {
      setError('Failed to reject trip');
    } finally {
      setActionLoading(null);
    }
  };

  const openPublishProof = async (paymentId: string) => {
    setProofLoadingId(paymentId);
    try {
      const { url } = await adminService.getPaymentProofSignedUrl(paymentId);
      setProofDialog({ paymentId, url });
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      alert(msg ?? 'Could not load payment proof.');
    } finally {
      setProofLoadingId(null);
    }
  };

  const loadRecentBookings = async () => {
    try {
      const data = await adminService.getRecentBookings(bookingsPage, 10, filters);
      setRecentBookings(data.bookings || []);
      setBookingsTotal(data.total || 0);
    } catch (err) {
      console.error('Error loading bookings:', err);
    }
  };

  const loadActiveTrips = async () => {
    try {
      const data = await adminService.getActiveTrips(tripsPage, 10, filters);
      setActiveTrips(data.trips || []);
      setTripsTotal(data.total || 0);
    } catch (err) {
      console.error('Error loading trips:', err);
    }
  };

  const loadRecentUsers = async () => {
    try {
      const data = await adminService.getRecentUsers(usersPage, 10, filters);
      setRecentUsers(data.users || []);
      setUsersTotal(data.total || 0);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const openBookingPaymentProof = async (paymentId: string) => {
    setProofLoadingId(paymentId);
    try {
      const { url } = await adminService.getPaymentProofSignedUrl(paymentId);
      setProofDialog({ paymentId, url });
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      alert(msg ?? 'Could not load payment proof.');
    } finally {
      setProofLoadingId(null);
    }
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    // Reset pages when filters change
    setBookingsPage(1);
    setTripsPage(1);
    setUsersPage(1);
  };

  const handleClearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      status: '',
      search: '',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (value: unknown) => {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(2) : '0.00';
  };

  const getStatusBadgeClass = (status: string | undefined | null) => {
    const statusLower = (status ?? '').toLowerCase();
    if (statusLower === 'confirmed' || statusLower === 'active') {
      return 'bg-green-100 text-green-800';
    } else if (statusLower === 'pending') {
      return 'bg-yellow-100 text-yellow-800';
    } else if (statusLower === 'cancelled' || statusLower === 'inactive') {
      return 'bg-red-100 text-red-800';
    } else if (statusLower === 'completed') {
      return 'bg-blue-100 text-blue-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <>
      <Head>
        <title>System Activity - Admin - Sonef</title>
        <meta name="description" content="Monitor system activity" />
      </Head>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">System Activity Monitor</h1>
                <p className="text-sm text-gray-500 mt-1">Monitor recent bookings, active trips, and user registrations</p>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Back to Dashboard
                </button>
                <button
                  onClick={loadData}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  disabled={loading}
                >
                  {loading ? 'Refreshing...' : 'Refresh'}
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

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date From
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date To
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Statuses</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('bookings')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                    activeTab === 'bookings'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Recent Bookings ({bookingsTotal})
                </button>
                <button
                  onClick={() => setActiveTab('trips')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                    activeTab === 'trips'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Active Trips ({tripsTotal})
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                    activeTab === 'users'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Recent Users ({usersTotal})
                </button>
                <button
                  onClick={() => setActiveTab('pending-publish')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                    activeTab === 'pending-publish'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Pending Publish
                  {pendingPublishTrips.length > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 bg-orange-100 text-orange-700 text-xs rounded-full font-bold">
                      {pendingPublishTrips.length}
                    </span>
                  )}
                </button>
              </nav>
            </div>

            {/* Recent Bookings Table */}
            {activeTab === 'bookings' && (
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Booking ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Trip
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created At
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Proof
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loading && recentBookings.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                            Loading bookings...
                          </td>
                        </tr>
                      ) : recentBookings.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                            No bookings found
                          </td>
                        </tr>
                      ) : (
                        recentBookings.map((booking) => (
                          <tr key={booking.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {booking.id?.substring(0, 8)}...
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {booking.user?.name || booking.user_id?.substring(0, 8)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {booking.trip?.source} → {booking.trip?.destination}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(booking.status)}`}>
                                {booking.status ?? '—'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              ${formatPrice(booking.price)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(booking.created_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {booking.manual_payment?.has_proof && booking.manual_payment?.id ? (
                                <button
                                  type="button"
                                  onClick={() => openBookingPaymentProof(booking.manual_payment.id)}
                                  disabled={proofLoadingId === booking.manual_payment.id}
                                  className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                                >
                                  {proofLoadingId === booking.manual_payment.id ? 'Loading…' : 'View'}
                                </button>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Pagination for Bookings */}
                <div className="mt-4 flex justify-between items-center">
                  <div className="text-sm text-gray-700">
                    Showing {Math.min((bookingsPage - 1) * 10 + 1, bookingsTotal)} to{' '}
                    {Math.min(bookingsPage * 10, bookingsTotal)} of {bookingsTotal} results
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setBookingsPage(p => Math.max(1, p - 1))}
                      disabled={bookingsPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setBookingsPage(p => p + 1)}
                      disabled={bookingsPage * 10 >= bookingsTotal}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Active Trips Table */}
            {activeTab === 'trips' && (
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Trip ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Route
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Departure
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Seats
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Agency
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loading && activeTrips.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                            Loading trips...
                          </td>
                        </tr>
                      ) : activeTrips.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                            No active trips found
                          </td>
                        </tr>
                      ) : (
                        activeTrips.map((trip) => (
                          <tr key={trip.trip_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {trip.trip_id?.substring(0, 8)}...
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {trip.source} → {trip.destination}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(trip.start_time)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(trip.status)}`}>
                                {trip.status ?? '—'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {trip.available_seats} / {trip.total_capacity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {trip.agency?.name || 'N/A'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Pagination for Trips */}
                <div className="mt-4 flex justify-between items-center">
                  <div className="text-sm text-gray-700">
                    Showing {Math.min((tripsPage - 1) * 10 + 1, tripsTotal)} to{' '}
                    {Math.min(tripsPage * 10, tripsTotal)} of {tripsTotal} results
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTripsPage(p => Math.max(1, p - 1))}
                      disabled={tripsPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setTripsPage(p => p + 1)}
                      disabled={tripsPage * 10 >= tripsTotal}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Users Table */}
            {activeTab === 'users' && (
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Registered At
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loading && recentUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                            Loading users...
                          </td>
                        </tr>
                      ) : recentUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                            No users found
                          </td>
                        </tr>
                      ) : (
                        recentUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {user.id?.substring(0, 8)}...
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {user.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.phone}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                {user.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(user.created_at)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Pagination for Users */}
                <div className="mt-4 flex justify-between items-center">
                  <div className="text-sm text-gray-700">
                    Showing {Math.min((usersPage - 1) * 10 + 1, usersTotal)} to{' '}
                    {Math.min(usersPage * 10, usersTotal)} of {usersTotal} results
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                      disabled={usersPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setUsersPage(p => p + 1)}
                      disabled={usersPage * 10 >= usersTotal}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
            {/* Pending Publish Tab */}
            {activeTab === 'pending-publish' && (
              <div className="p-6">
                {loading && pendingPublishTrips.length === 0 ? (
                  <p className="text-gray-500">Loading…</p>
                ) : pendingPublishTrips.length === 0 ? (
                  <p className="text-gray-500">No trips awaiting publish approval.</p>
                ) : (
                  <div className="space-y-4">
                    {pendingPublishTrips.map((trip) => (
                      <div key={trip.trip_id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex flex-wrap gap-4 justify-between items-start">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {trip.source} → {trip.destination}
                            </p>
                            <p className="text-sm text-gray-500">
                              Departure: {new Date(trip.departure_time).toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-500">
                              Transporter: {trip.transporter_name ?? '—'}
                            </p>
                            {trip.payment && (
                              <p className="text-sm text-gray-500">
                                Payment: {trip.payment.amount} MRU via {trip.payment.payment_provider} · {trip.payment.user_phone}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {trip.payment?.id && (
                              <button
                                type="button"
                                onClick={() => openPublishProof(trip.payment!.id)}
                                disabled={proofLoadingId === trip.payment.id}
                                className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                              >
                                {proofLoadingId === trip.payment.id ? 'Loading…' : 'View proof'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleApprovePublish(trip.trip_id)}
                              disabled={actionLoading === trip.trip_id}
                              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                            >
                              {actionLoading === trip.trip_id ? 'Processing…' : 'Approve'}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setRejectModal({ tripId: trip.trip_id }); setRejectReason(''); }}
                              disabled={actionLoading === trip.trip_id}
                              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Reject trip publish</h2>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason (optional)
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:outline-none"
              placeholder="Explain why the trip is rejected…"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setRejectModal(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectPublish}
                disabled={actionLoading !== null}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {proofDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Payment proof</h2>
              <button
                type="button"
                onClick={() => setProofDialog(null)}
                className="text-gray-500 hover:text-gray-700 text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={proofDialog.url}
              alt="Payment proof"
              className="max-h-[75vh] w-full object-contain rounded border border-gray-200"
            />
          </div>
        </div>
      )}
    </>
  );
}
