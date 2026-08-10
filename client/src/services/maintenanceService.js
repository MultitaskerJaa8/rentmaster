import api from './api';

const maintenanceService = {
  list: async (params = {}) => (await api.get('/maintenance', { params })).data,
  get: async (id) => (await api.get(`/maintenance/${id}`)).data,
  create: async (payload) => (await api.post('/maintenance', payload)).data,
  updateStatus: async (id, payload) => (await api.put(`/maintenance/${id}/status`, payload)).data,
  assign: async (id, assignedTo) => (await api.put(`/maintenance/${id}/assign`, { assignedTo })).data,
  comment: async (id, text) => (await api.post(`/maintenance/${id}/comment`, { text })).data,
  rate: async (id, rating) => (await api.put(`/maintenance/${id}/rate`, { rating })).data,
  remove: async (id) => (await api.delete(`/maintenance/${id}`)).data,
};

export default maintenanceService;