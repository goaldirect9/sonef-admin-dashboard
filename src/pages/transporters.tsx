import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import authService from '@/services/auth.service';
import adminService, { TransporterRow } from '@/services/admin.service';

export default function Transporters() {
  const router = useRouter();
  const [rows, setRows] = useState<TransporterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reasonModal, setReasonModal] = useState<{
    show: boolean;
    id: string;
    action: 'approve' | 'suspend';
    name: string;
  } | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadTransporters();
  }, [router, currentPage, searchTerm]);

  const loadTransporters = async () => {
    try {
      setLoading(true);
      const response = await adminService.getAllTransporters(currentPage, 10, searchTerm);
      setRows(response.data);
      setTotalPages(response.pagination.totalPages);
      setError('');
    } catch (err: any) {
      console.error('Error loading transporters:', err);
      setError('Failed to load transporters');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (id: string, name: string) => {
    setReasonModal({ show: true, id, action: 'approve', name });
  };

  const handleSuspend = (id: string, name: string) => {
    setReasonModal({ show: true, id, action: 'suspend', name });
  };

  const executeAction = async () => {
    if (!reasonModal) return;
    try {
      setActionLoading(reasonModal.id);
      if (reasonModal.action === 'approve') {
        await adminService.approveTransporter(reasonModal.id, reason || undefined);
      } else {
        await adminService.suspendTransporter(reasonModal.id, reason || 'Suspended by admin');
      }
      await loadTransporters();
      setReasonModal(null);
      setReason('');
    } catch (err: any) {
      console.error(`Error ${reasonModal.action}ing transporter:`, err);
      setError(`Failed to ${reasonModal.action} transporter`);
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
        <title>Manage Transporters - Admin - Sonef</title>
        <meta name="description" content="Approve and manage transporter accounts" />
      </Head>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="text-blue-600 hover:text-blue-700 mb-2 flex items-center"
                >
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Dashboard
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Manage Transporters</h1>
                <p className="text-sm text-gray-500 mt-1">Approve or suspend independent carrier accounts</p>
              </div>
              <button
                type="button"
                onClick={() => authService.logout()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
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

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading transporters...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <h3 className="mt-2 text-lg font-medium text-gray-900">No transporters found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try a different search term' : 'No transporter accounts yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {rows.map((t) => (
                <div
                  key={t.id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{t.name}</h3>
                        <span
                          className={`ml-3 px-3 py-1 text-xs font-semibold rounded-full ${
                            t.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {t.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Email</p>
                          <p className="text-sm text-gray-900 mt-1">{t.email || '—'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Phone</p>
                          <p className="text-sm text-gray-900 mt-1">{t.phone || '—'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Registration Date</p>
                          <p className="text-sm text-gray-900 mt-1">{formatDate(t.created_at)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="ml-6 flex flex-col space-y-2">
                      {!t.is_active ? (
                        <button
                          type="button"
                          onClick={() => handleApprove(t.id, t.name)}
                          disabled={actionLoading === t.id}
                          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50 min-w-[100px]"
                        >
                          {actionLoading === t.id ? 'Processing...' : 'Approve'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSuspend(t.id, t.name)}
                          disabled={actionLoading === t.id}
                          className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition disabled:opacity-50 min-w-[100px]"
                        >
                          {actionLoading === t.id ? 'Processing...' : 'Suspend'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-6 flex justify-center space-x-2">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </main>

        {reasonModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {reasonModal.action === 'approve' ? 'Approve' : 'Suspend'} transporter
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {reasonModal.action === 'approve'
                  ? `Approve "${reasonModal.name}"?`
                  : `Suspend "${reasonModal.name}"?`}
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
                      ? 'Optional reason...'
                      : 'Required reason for suspension...'
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  rows={3}
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setReasonModal(null);
                    setReason('');
                  }}
                  disabled={!!actionLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeAction}
                  disabled={!!actionLoading || (reasonModal.action === 'suspend' && !reason)}
                  className={`flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
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
