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
}

export default new AdminService();
