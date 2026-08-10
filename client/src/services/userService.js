import api from './api';

const userService = {
  list: async (params = {}) => (await api.get('/users', { params })).data,
  get: async (id) => (await api.get(`/users/${id}`)).data,
  create: async (payload) => (await api.post('/users', payload)).data,
  update: async (id, payload) => (await api.put(`/users/${id}`, payload)).data,
  remove: async (id) => (await api.delete(`/users/${id}`)).data,
};

export default userService;