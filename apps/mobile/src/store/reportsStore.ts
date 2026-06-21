import { create } from 'zustand';
import { api } from '../services/api';

interface ReportData {
  id?: string;
  type: string;
  format: string;
  lens: string;
  generatedAt: string;
  fileUrl?: string;
  data?: any;
}

interface ReportsState {
  savedReports: ReportData[];
  currentReport: ReportData | null;
  exportLoading: boolean;
  fetchSavedReports: () => Promise<void>;
  setCurrentReport: (report: ReportData | null) => void;
  setExportLoading: (loading: boolean) => void;
  clear: () => void;
}

export const useReportsStore = create<ReportsState>((set) => ({
  savedReports: [],
  currentReport: null,
  exportLoading: false,

  fetchSavedReports: async () => {
    try {
      const res = await api.get<any>('/reports?page=1&limit=20');
      const data = res?.data || res || [];
      set({ savedReports: Array.isArray(data) ? data : [] });
    } catch {
      set({ savedReports: [] });
    }
  },

  setCurrentReport: (report) => set({ currentReport: report }),
  setExportLoading: (loading) => set({ exportLoading: loading }),

  clear: () => set({ savedReports: [], currentReport: null, exportLoading: false }),
}));
