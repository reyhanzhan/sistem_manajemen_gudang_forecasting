import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor: Attach JWT token ──────────────
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('wms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ─── Response Interceptor: Handle auth errors ───────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('wms_token');
        localStorage.removeItem('wms_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Auth API ───────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: any) => api.post('/auth/register', data),
  getProfile: () => api.get('/auth/me'),
};

// ─── Dashboard API ──────────────────────────────────────
export const dashboardApi = {
  getOverview: () => api.get('/dashboard/overview'),
  getMovementTrends: (days?: number) =>
    api.get('/dashboard/movement-trends', { params: { days } }),
  getTopProducts: (limit?: number) =>
    api.get('/dashboard/top-products', { params: { limit } }),
  getWarehouseUtilization: () => api.get('/dashboard/warehouse-utilization'),
};

// ─── Inventory API ──────────────────────────────────────
export const inventoryApi = {
  getAll: (params?: any) => api.get('/inventory', { params }),
  getLowStock: () => api.get('/inventory/low-stock'),
  adjust: (data: any) => api.post('/inventory/adjust', data),
};

// ─── Products API ───────────────────────────────────────
export const productsApi = {
  getAll: (params?: any) => api.get('/products', { params }),
  getById: (id: string) => api.get(`/products/${id}`),
  create: (data: any) => api.post('/products', data),
  update: (id: string, data: any) => api.patch(`/products/${id}`, data),
  getStock: (id: string) => api.get(`/products/${id}/stock`),
};

// ─── Warehouses API ─────────────────────────────────────
export const warehousesApi = {
  getAll: (params?: any) => api.get('/warehouses', { params }),
  getById: (id: string) => api.get(`/warehouses/${id}`),
  create: (data: any) => api.post('/warehouses', data),
  update: (id: string, data: any) => api.patch(`/warehouses/${id}`, data),
  getInventory: (id: string) => api.get(`/warehouses/${id}/inventory`),
};

// ─── Movements API ──────────────────────────────────────
export const movementsApi = {
  getAll: (params?: any) => api.get('/movements', { params }),
  getById: (id: string) => api.get(`/movements/${id}`),
  create: (data: any) => api.post('/movements', data),
  approve: (id: string) => api.patch(`/movements/${id}/approve`),
  reject: (id: string, reason?: string) =>
    api.patch(`/movements/${id}/reject`, { reason }),
};

// ─── Suppliers API ──────────────────────────────────────
export const suppliersApi = {
  getAll: (params?: any) => api.get('/suppliers', { params }),
  getById: (id: string) => api.get(`/suppliers/${id}`),
  create: (data: any) => api.post('/suppliers', data),
  update: (id: string, data: any) => api.patch(`/suppliers/${id}`, data),
};

// ─── Forecast API ───────────────────────────────────────
export const forecastApi = {
  predict: (productId: string, warehouseId?: string, periodDays?: number) =>
    api.post(`/forecast/predict/${productId}`, null, {
      params: { warehouseId, periodDays },
    }),
  getHistory: (productId: string) =>
    api.get(`/forecast/history/${productId}`),
  bulkForecast: () => api.post('/forecast/bulk'),
  train: () => api.post('/forecast/train'),
  health: () => api.get('/forecast/health'),
};

// ─── Notifications API ──────────────────────────────────
export const notificationsApi = {
  getAll: (params?: any) => api.get('/notifications', { params }),
  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
};

// ─── Anomaly Detection API ──────────────────────────────
export const anomalyApi = {
  detect: (daysBack?: number, contamination?: number) =>
    api.post('/anomaly/detect', { daysBack, contamination }),
  check: (data: {
    movementType: string;
    quantity: number;
    hour: number;
    userDailyCount?: number;
    unitCost?: number;
  }) => api.post('/anomaly/check', data),
};

// ─── Optimization / Auto-PO API ─────────────────────────
export const optimizationApi = {
  generatePO: (data: {
    productId: string;
    warehouseId?: string;
    orderCost?: number;
    holdingCostRate?: number;
  }) => api.post('/optimization/purchase-order', data),
  bulkPO: (warehouseId?: string) =>
    api.post('/optimization/bulk-po', null, { params: { warehouseId } }),
};
