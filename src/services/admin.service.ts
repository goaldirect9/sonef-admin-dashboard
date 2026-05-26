import apiClient from '../lib/api-client';

export interface DashboardStats {
  users: {
    total: number;
  };
  agencies: {
    total: number;
    active: number;
    suspended: number;
  };
  transporters: {
    total: number;
    active: number;
    suspended: number;
  };
  bookings: {
    total: number;
  };
  trips: {
    total: number;
    active: number;
    inactive: number;
  };
}

export interface Agency {
  id: string;
  name: string;
  email: string;
  phone: string;
  is_active: boolean;
  created_at: string;
}

export type TransporterDocumentKind =
  | 'carte_grise'
  | 'driving_license'
  | 'nni_document'
  | 'insurance';

export interface TransporterRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  document_status?: string;
  documents_submitted_at?: string | null;
  carte_grise_url?: string | null;
  driving_license_url?: string | null;
  nni_document_url?: string | null;
  insurance_url?: string | null;
  driving_license_expires_at?: string | null;
  insurance_expires_at?: string | null;
}

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  created_at: string;
}

export interface Booking {
  id: string;
  user_id: string;
  trip_id: string;
  status: string;
  price: number;
  created_at: string;
}

export interface Trip {
  trip_id: string;
  source: string;
  destination: string;
  start_time: string;
  status: string;
  available_seats: number;
  total_capacity: number;
}

export interface PaymentWalletDefinition {
  id: string;
  provider_key: string;
  display_name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PlatformSetting {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

export interface PlatformWalletRow {
  id: string;
  wallet_definition_id: string;
  phone_or_code: string;
  is_enabled: boolean;
  wallet_definition?: PaymentWalletDefinition;
}

export interface PlatformWalletSetup {
  definitions: PaymentWalletDefinition[];
  platform_wallets: PlatformWalletRow[];
}

export interface PendingPublishTrip {
  trip_id: string;
  source: string;
  destination: string;
  departure_time: string;
  transporter_name: string | null;
  lifecycle_status: string;
  payment: {
    id: string;
    amount: number;
    payment_provider: string;
    user_phone: string;
    payment_proof_storage_path: string;
    status: string;
    created_at: string;
  } | null;
}

export interface PendingVehicleRow {
  id: string;
  brand: string;
  model: string;
  license_plate: string | null;
  seats: number;
  has_ac: boolean;
  created_at: string;
  approval_status: string;
  approval_reason: string | null;
  transporter_id: string | null;
  transporter_name: string | null;
}

class AdminService {
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiClient.get<DashboardStats>('/admin/dashboard/stats');
    return response.data;
  }

  async getAllAgencies(page = 1, limit = 10, search = '') {
    const response = await apiClient.get('/admin/agencies', {
      params: { page, limit, search }
    });
    return response.data;
  }

  async getAllUsers(page = 1, limit = 10, search = '') {
    const response = await apiClient.get('/admin/users', {
      params: { page, limit, search }
    });
    return response.data;
  }

  async getAllBookings(page = 1, limit = 10, search = '') {
    const response = await apiClient.get('/admin/bookings', {
      params: { page, limit, search }
    });
    return response.data;
  }

  async getAllTrips(page = 1, limit = 10, search = '') {
    const response = await apiClient.get('/admin/trips', {
      params: { page, limit, search }
    });
    return response.data;
  }

  async approveAgency(agencyId: string, reason?: string) {
    const response = await apiClient.patch(`/admin/agencies/${agencyId}/approve`, {
      status: 'approved',
      ...(reason ? { reason } : {}),
    });
    return response.data;
  }

  async suspendAgency(agencyId: string, reason?: string) {
    const response = await apiClient.patch(`/admin/agencies/${agencyId}/suspend`, {
      status: 'suspended',
      ...(reason ? { reason } : {}),
    });
    return response.data;
  }

  async getAllTransporters(page = 1, limit = 10, search = '') {
    const response = await apiClient.get('/admin/transporters', {
      params: { page, limit, search },
    });
    return response.data;
  }

  async getTransporter(transporterId: string): Promise<TransporterRow> {
    const response = await apiClient.get<TransporterRow>(`/admin/transporters/${transporterId}`);
    return response.data;
  }

  async getTransporterDocumentSignedUrl(
    transporterId: string,
    kind: TransporterDocumentKind,
  ): Promise<{ url: string; expires_at: string }> {
    const response = await apiClient.get<{ url: string; expires_at: string }>(
      `/admin/transporters/${transporterId}/document-signed-url`,
      { params: { kind } },
    );
    return response.data;
  }

  async patchTransporterDocumentExpirations(
    transporterId: string,
    body: {
      driving_license_expires_at?: string | null;
      insurance_expires_at?: string | null;
    },
  ): Promise<TransporterRow> {
    const response = await apiClient.patch<TransporterRow>(
      `/admin/transporters/${transporterId}/document-expirations`,
      body,
    );
    return response.data;
  }

  async approveTransporter(transporterId: string, reason?: string) {
    const response = await apiClient.patch(`/admin/transporters/${transporterId}/approve`, {
      status: 'approved',
      ...(reason ? { reason } : {}),
    });
    return response.data;
  }

  async suspendTransporter(transporterId: string, reason?: string) {
    const response = await apiClient.patch(`/admin/transporters/${transporterId}/suspend`, {
      status: 'suspended',
      ...(reason ? { reason } : {}),
    });
    return response.data;
  }

  async getRecentBookings(page = 1, limit = 10, filters?: any) {
    const response = await apiClient.get('/admin/bookings/recent', {
      params: { 
        page, 
        limit, 
        dateFrom: filters?.dateFrom,
        dateTo: filters?.dateTo,
        status: filters?.status,
        search: filters?.search
      }
    });
    return response.data;
  }

  async getActiveTrips(page = 1, limit = 10, filters?: any) {
    const response = await apiClient.get('/admin/trips/active', {
      params: { 
        page, 
        limit, 
        dateFrom: filters?.dateFrom,
        dateTo: filters?.dateTo,
        status: filters?.status,
        search: filters?.search
      }
    });
    return response.data;
  }

  async getRecentUsers(page = 1, limit = 10, filters?: any) {
    const response = await apiClient.get('/admin/users/recent', {
      params: { 
        page, 
        limit, 
        dateFrom: filters?.dateFrom,
        dateTo: filters?.dateTo,
        search: filters?.search
      }
    });
    return response.data;
  }

  async getPaymentProofSignedUrl(paymentId: string): Promise<{ url: string; expires_at: string }> {
    const response = await apiClient.get<{ url: string; expires_at: string }>(
      `/payments/admin/${paymentId}/proof-url`,
    );
    return response.data;
  }

  async listWalletDefinitions(): Promise<PaymentWalletDefinition[]> {
    const response = await apiClient.get<PaymentWalletDefinition[]>('/admin/wallet-definitions');
    return response.data;
  }

  async createWalletDefinition(body: {
    provider_key: string;
    display_name: string;
    sort_order?: number;
  }): Promise<PaymentWalletDefinition> {
    const response = await apiClient.post<PaymentWalletDefinition>('/admin/wallet-definitions', body);
    return response.data;
  }

  async updateWalletDefinition(
    id: string,
    body: { display_name?: string; is_active?: boolean; sort_order?: number },
  ): Promise<PaymentWalletDefinition> {
    const response = await apiClient.patch<PaymentWalletDefinition>(
      `/admin/wallet-definitions/${id}`,
      body,
    );
    return response.data;
  }

  async getPlatformWallets(): Promise<PlatformWalletSetup> {
    const response = await apiClient.get<PlatformWalletSetup>('/admin/platform-wallets');
    return response.data;
  }

  async upsertPlatformWallets(items: {
    wallet_definition_id: string;
    phone_or_code: string;
    is_enabled: boolean;
  }[]): Promise<PlatformWalletSetup> {
    const response = await apiClient.put<PlatformWalletSetup>('/admin/platform-wallets', {
      items,
    });
    return response.data;
  }

  async listPlatformSettings(): Promise<PlatformSetting[]> {
    const response = await apiClient.get<PlatformSetting[]>('/admin/settings');
    return response.data;
  }

  async updatePlatformSetting(key: string, value: string): Promise<PlatformSetting> {
    const response = await apiClient.patch<PlatformSetting>(`/admin/settings/${key}`, { value });
    return response.data;
  }

  async getPendingPublishTrips(): Promise<PendingPublishTrip[]> {
    const response = await apiClient.get<PendingPublishTrip[]>('/admin/trips/pending-publish');
    return response.data;
  }

  async approvePublishTrip(tripId: string): Promise<{ message: string }> {
    const response = await apiClient.patch<{ message: string }>(
      `/admin/trips/${tripId}/approve-publish`,
      {},
    );
    return response.data;
  }

  async rejectPublishTrip(tripId: string, reason?: string): Promise<{ message: string }> {
    const response = await apiClient.patch<{ message: string }>(
      `/admin/trips/${tripId}/reject-publish`,
      { reason },
    );
    return response.data;
  }

  async getPendingVehicles(page = 1, limit = 10, search = ''): Promise<{
    data: PendingVehicleRow[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const response = await apiClient.get<{ data: PendingVehicleRow[]; pagination: any }>(
      '/admin/vehicles/pending',
      { params: { page, limit, search } },
    );
    return response.data;
  }

  async approveVehicle(vehicleId: string) {
    const response = await apiClient.patch(`/admin/vehicles/${vehicleId}/approve`, {});
    return response.data;
  }

  async rejectVehicle(vehicleId: string, reason?: string) {
    const response = await apiClient.patch(`/admin/vehicles/${vehicleId}/reject`, {
      reason,
    });
    return response.data;
  }
}

export default new AdminService();
