import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import authService from '@/services/auth.service';
import adminService, {
  TransporterDocumentKind,
  TransporterRow,
} from '@/services/admin.service';

const DOC_LABELS: Record<TransporterDocumentKind, string> = {
  carte_grise: 'Carte grise',
  driving_license: 'Driving licence',
  insurance: 'Insurance',
};

const DOC_ORDER: TransporterDocumentKind[] = ['carte_grise', 'driving_license', 'insurance'];

function docPathFor(row: TransporterRow, kind: TransporterDocumentKind): string | null | undefined {
  if (kind === 'carte_grise') return row.carte_grise_url;
  if (kind === 'driving_license') return row.driving_license_url;
  return row.insurance_url;
}

function kindsWithDocuments(row: TransporterRow): TransporterDocumentKind[] {
  return DOC_ORDER.filter((k) => !!docPathFor(row, k)?.trim());
}

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function documentStatusBadgeClass(status: string | undefined): string {
  switch (status) {
    case 'pending_review':
      return 'bg-amber-100 text-amber-900';
    case 'approved':
      return 'bg-green-100 text-green-800';
    case 'rejected':
      return 'bg-red-100 text-red-800';
    case 'not_submitted':
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function formatDocumentStatus(status: string | undefined): string {
  if (!status) return '—';
  return status.replace(/_/g, ' ');
}

type ReasonModal = {
  show: boolean;
  id: string;
  action: 'approve' | 'suspend';
  name: string;
};

type DocViewerState = {
  url: string;
  kind: TransporterDocumentKind;
  label: string;
  availableKinds: TransporterDocumentKind[];
};

export default function Transporters() {
  const router = useRouter();
  const [rows, setRows] = useState<TransporterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reasonModal, setReasonModal] = useState<ReasonModal | null>(null);
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState<TransporterRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [licenseExpiryInput, setLicenseExpiryInput] = useState('');
  const [insuranceExpiryInput, setInsuranceExpiryInput] = useState('');
  const [savingExpirations, setSavingExpirations] = useState(false);
  const [docViewer, setDocViewer] = useState<DocViewerState | null>(null);
  const [docLoading, setDocLoading] = useState<TransporterDocumentKind | null>(null);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadTransporters();
  }, [router, currentPage, searchTerm]);

  useEffect(() => {
    if (!reasonModal) {
      setDetail(null);
      setDetailError('');
      setLicenseExpiryInput('');
      setInsuranceExpiryInput('');
      return;
    }
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      setDetailError('');
      try {
        const d = await adminService.getTransporter(reasonModal.id);
        if (cancelled) return;
        setDetail(d);
        setLicenseExpiryInput(toDateInputValue(d.driving_license_expires_at));
        setInsuranceExpiryInput(toDateInputValue(d.insurance_expires_at));
      } catch (err: unknown) {
        console.error('Error loading transporter detail:', err);
        if (!cancelled) setDetailError('Could not load transporter details');
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reasonModal]);

  const loadTransporters = async () => {
    try {
      setLoading(true);
      const response = await adminService.getAllTransporters(currentPage, 10, searchTerm);
      setRows(response.data);
      setTotalPages(response.pagination.totalPages);
      setError('');
    } catch (err: unknown) {
      console.error('Error loading transporters:', err);
      setError('Failed to load transporters');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (id: string, name: string) => {
    setDocViewer(null);
    setReasonModal({ show: true, id, action: 'approve', name });
  };

  const handleSuspend = (id: string, name: string) => {
    setDocViewer(null);
    setReasonModal({ show: true, id, action: 'suspend', name });
  };

  const closeReasonModal = () => {
    setReasonModal(null);
    setReason('');
    setDocViewer(null);
  };

  const saveExpirations = async () => {
    if (!reasonModal) return;
    try {
      setSavingExpirations(true);
      setDetailError('');
      const updated = await adminService.patchTransporterDocumentExpirations(reasonModal.id, {
        driving_license_expires_at: licenseExpiryInput.trim() || null,
        insurance_expires_at: insuranceExpiryInput.trim() || null,
      });
      setDetail(updated);
      setLicenseExpiryInput(toDateInputValue(updated.driving_license_expires_at));
      setInsuranceExpiryInput(toDateInputValue(updated.insurance_expires_at));
      await loadTransporters();
    } catch (err: unknown) {
      console.error('Error saving expirations:', err);
      setDetailError('Failed to save expiration dates');
    } finally {
      setSavingExpirations(false);
    }
  };

  const openDocument = useCallback(
    async (kind: TransporterDocumentKind, rowOverride?: TransporterRow | null) => {
      if (!reasonModal) return;
      const row = rowOverride ?? detail;
      if (!row) return;
      setDocLoading(kind);
      try {
        const { url } = await adminService.getTransporterDocumentSignedUrl(reasonModal.id, kind);
        setDocViewer({
          url,
          kind,
          label: DOC_LABELS[kind],
          availableKinds: kindsWithDocuments(row),
        });
      } catch (err: unknown) {
        console.error('Error loading document URL:', err);
        setDetailError('Could not open document. Try again or use Open in new tab after retry.');
      } finally {
        setDocLoading(null);
      }
    },
    [reasonModal, detail],
  );

  const stepDocument = async (delta: number) => {
    if (!docViewer || !reasonModal || !detail) return;
    const { availableKinds, kind } = docViewer;
    if (availableKinds.length <= 1) return;
    const idx = availableKinds.indexOf(kind);
    const next = availableKinds[(idx + delta + availableKinds.length) % availableKinds.length];
    await openDocument(next, detail);
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
      closeReasonModal();
    } catch (err: unknown) {
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
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{t.name}</h3>
                        <span
                          className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            t.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {t.is_active ? 'Active' : 'Suspended'}
                        </span>
                        {t.document_status && (
                          <span
                            className={`px-3 py-1 text-xs font-semibold rounded-full capitalize ${documentStatusBadgeClass(
                              t.document_status,
                            )}`}
                          >
                            Docs: {formatDocumentStatus(t.document_status)}
                          </span>
                        )}
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
                      {(t.driving_license_expires_at || t.insurance_expires_at) && (
                        <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
                          {t.driving_license_expires_at && (
                            <span>
                              <span className="font-medium text-gray-500">Licence expires:</span>{' '}
                              {formatDate(t.driving_license_expires_at)}
                            </span>
                          )}
                          {t.insurance_expires_at && (
                            <span>
                              <span className="font-medium text-gray-500">Insurance expires:</span>{' '}
                              {formatDate(t.insurance_expires_at)}
                            </span>
                          )}
                        </div>
                      )}
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 my-8">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {reasonModal.action === 'approve' ? 'Approve' : 'Suspend'} transporter
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {reasonModal.action === 'approve'
                  ? `Review documents and expiries before approving "${reasonModal.name}".`
                  : `Review "${reasonModal.name}" before suspension.`}
              </p>

              {detailLoading && (
                <p className="text-sm text-gray-500 mb-4">Loading transporter details…</p>
              )}
              {detailError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {detailError}
                </div>
              )}

              {!detailLoading && detail && (
                <>
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Uploaded documents
                    </p>
                    <div className="flex flex-col gap-2">
                      {DOC_ORDER.map((kind) => {
                        const has = !!docPathFor(detail, kind)?.trim();
                        return (
                          <button
                            key={kind}
                            type="button"
                            disabled={!has || !!docLoading}
                            onClick={() => openDocument(kind, detail)}
                            className="text-left px-3 py-2 rounded-lg border text-sm font-medium border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {docLoading === kind ? 'Opening…' : `View ${DOC_LABELS[kind]}`}
                            {!has && <span className="text-gray-400 font-normal"> (not uploaded)</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Driver licence expires
                      </label>
                      <input
                        type="date"
                        value={licenseExpiryInput}
                        onChange={(e) => setLicenseExpiryInput(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Insurance expires
                      </label>
                      <input
                        type="date"
                        value={insuranceExpiryInput}
                        onChange={(e) => setInsuranceExpiryInput(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={saveExpirations}
                    disabled={savingExpirations || !!actionLoading}
                    className="mb-6 w-full sm:w-auto px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingExpirations ? 'Saving…' : 'Save expiration dates'}
                  </button>
                </>
              )}

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
                  onClick={closeReasonModal}
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

        {docViewer && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b px-4 py-3 gap-2 flex-wrap">
                <h4 className="font-semibold text-gray-900">{docViewer.label}</h4>
                <div className="flex items-center gap-2 flex-wrap">
                  {docViewer.availableKinds.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => stepDocument(-1)}
                        disabled={!!docLoading}
                        className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => stepDocument(1)}
                        disabled={!!docLoading}
                        className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </>
                  )}
                  <a
                    href={docViewer.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 text-sm text-blue-600 hover:underline"
                  >
                    Open in new tab
                  </a>
                  <button
                    type="button"
                    onClick={() => setDocViewer(null)}
                    className="px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    Close
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-[50vh] bg-gray-100">
                {docLoading ? (
                  <div className="flex items-center justify-center h-64 text-gray-600 text-sm">Loading…</div>
                ) : (
                  <iframe title={docViewer.label} src={docViewer.url} className="w-full h-[70vh] border-0 bg-white" />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
