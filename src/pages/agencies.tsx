import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import authService from '@/services/auth.service';
import adminService, { Agency } from '@/services/admin.service';

export default function Agencies() {
  const router = useRouter();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reasonModal, setReasonModal] = useState<{
    show: boolean;
    agencyId: string;
    action: 'approve' | 'suspend';
    agencyName: string;
  } | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadAgencies();
  }, [router, currentPage, searchTerm]);

  const loadAgencies = async () => {
    try {
      setLoading(true);
      const response = await adminService.getAllAgencies(currentPage, 10, searchTerm);
      setAgencies(response.data);
      setTotalPages(response.pagination.totalPages);
      setError('');
    } catch (err: any) {
      console.error('Error loading agencies:', err);
      setError('Failed to load agencies');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (agencyId: string, agencyName: string) => {
    setReasonModal({
      show: true,
      agencyId,
      action: 'approve',
      agencyName,
    });
  };

  const handleSuspend = async (agencyId: string, agencyName: string) => {
    setReasonModal({
      show: true,
      agencyId,
      action: 'suspend',
      agencyName,
    });
  };

  const executeAction = async () => {
    if (!reasonModal) return;

    try {
      setActionLoading(reasonModal.agencyId);
      
      if (reasonModal.action === 'approve') {
        await adminService.approveAgency(reasonModal.agencyId, reason || undefined);
      } else {
        await adminService.suspendAgency(reasonModal.agencyId, reason || 'Suspended by admin');
      }

      // Reload agencies
      await loadAgencies();
      
      // Close modal
      setReasonModal(null);
      setReason('');
    } catch (err: any) {
      console.error(`Error ${reasonModal.action}ing agency:`, err);
      setError(`Failed to ${reasonModal.action} agency`);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <>
      <Head>
        <title>Manage Agencies - Admin - Sonef</title>
        <meta name="description" content="Approve and manage transport agencies" />
      </Head>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="text-blue-600 hover:text-blue-700 mb-2 flex items-center"
                >
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Dashboard
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Manage Agencies</h1>
                <p className="text-sm text-gray-500 mt-1">Approve or suspend transport agencies</p>
              </div>
              <button
                onClick={() => authService.logout()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search Bar */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search agencies by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Agencies List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading agencies...</p>
            </div>
          ) : agencies.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">No agencies found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try a different search term' : 'No agencies have been registered yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {agencies.map((agency) => (
                <div
                  key={agency.id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
                >
                  <div className="flex items-start justify-between">
                    {/* Agency Info */}
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{agency.name}</h3>
                        <span
                          className={`ml-3 px-3 py-1 text-xs font-semibold rounded-full ${
                            agency.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {agency.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        {/* Contact Info */}
                        <div>
                          <p className="text-sm font-medium text-gray-500">Email</p>
                          <p className="text-sm text-gray-900 mt-1">{agency.email}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Phone</p>
                          <p className="text-sm text-gray-900 mt-1">{agency.phone}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Registration Date</p>
                          <p className="text-sm text-gray-900 mt-1">{formatDate(agency.created_at)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="ml-6 flex flex-col space-y-2">
                      {!agency.is_active ? (
                        <button
                          onClick={() => handleApprove(agency.id, agency.name)}
                          disabled={actionLoading === agency.id}
                          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
                        >
                          {actionLoading === agency.id ? 'Processing...' : 'Approve'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSuspend(agency.id, agency.name)}
                          disabled={actionLoading === agency.id}
                          className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
                        >
                          {actionLoading === agency.id ? 'Processing...' : 'Suspend'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center space-x-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </main>

        {/* Reason Modal */}
        {reasonModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {reasonModal.action === 'approve' ? 'Approve' : 'Suspend'} Agency
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {reasonModal.action === 'approve' 
                  ? `Are you sure you want to approve "${reasonModal.agencyName}"?`
                  : `Are you sure you want to suspend "${reasonModal.agencyName}"?`
                }
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason {reasonModal.action === 'suspend' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    reasonModal.action === 'approve'
                      ? 'Optional reason for approval...'
                      : 'Required reason for suspension...'
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  rows={3}
                  required={reasonModal.action === 'suspend'}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setReasonModal(null);
                    setReason('');
                  }}
                  disabled={!!actionLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={executeAction}
                  disabled={!!actionLoading || (reasonModal.action === 'suspend' && !reason)}
                  className={`flex-1 px-4 py-2 text-white rounded-lg transition disabled:opacity-50 ${
                    reasonModal.action === 'approve'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {actionLoading ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
