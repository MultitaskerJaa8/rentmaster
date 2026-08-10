import api from './api';

const propertyService = {
  list: async (params = {}) => (await api.get('/properties', { params })).data,
  get: async (id) => (await api.get(`/properties/${id}`)).data,
  create: async (payload) => (await api.post('/properties', payload)).data,
  update: async (id, payload) => (await api.put(`/properties/${id}`, payload)).data,
  remove: async (id) => (await api.delete(`/properties/${id}`)).data,
};

export default propertyService;