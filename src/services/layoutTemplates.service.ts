import apiClient from '../lib/api-client';

export interface LayoutCell {
  row: number;
  col: number;
  type: 'seat' | 'aisle' | 'empty';
  label: string | null;
  seatType: 'standard' | 'premium' | 'vip' | null;
}

export interface LayoutJson {
  rows: number;
  columns: number;
  cells: LayoutCell[];
}

export interface SeatLayoutTemplate {
  id: string;
  name: string;
  is_public: boolean;
  agency_id: string | null;
  layout_json: LayoutJson;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateDto {
  name: string;
  is_public?: boolean;
  layout_json: LayoutJson;
}

export interface UpdateTemplateDto {
  name?: string;
  is_public?: boolean;
  layout_json?: LayoutJson;
}

const layoutTemplatesService = {
  async getAll(): Promise<SeatLayoutTemplate[]> {
    const res = await apiClient.get('/admin/layout-templates');
    return res.data;
  },

  async create(dto: CreateTemplateDto): Promise<SeatLayoutTemplate> {
    const res = await apiClient.post('/admin/layout-templates', dto);
    return res.data;
  },

  async update(id: string, dto: UpdateTemplateDto): Promise<SeatLayoutTemplate> {
    const res = await apiClient.patch(`/admin/layout-templates/${id}`, dto);
    return res.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/admin/layout-templates/${id}`);
  },
};

export default layoutTemplatesService;
