import api from './api';

const authService = {
  register: async (payload) => (await api.post('/auth/register', payload)).data,
  login: async (payload) => (await api.post('/auth/login', payload)).data,
  getMe: async () => (await api.get('/auth/me')).data,
  updateProfile: async (payload) => (await api.put('/auth/profile', payload)).data,
};

export default authService;