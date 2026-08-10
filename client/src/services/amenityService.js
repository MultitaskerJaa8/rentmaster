import api from './api';

const amenityService = {
  list: async (params = {}) => (await api.get('/amenities', { params })).data,
  create: async (payload) => (await api.post('/amenities', payload)).data,
  update: async (id, payload) => (await api.put(`/amenities/${id}`, payload)).data,
  remove: async (id) => (await api.delete(`/amenities/${id}`)).data,
  slots: async (id, date) => (await api.get(`/amenities/${id}/slots`, { params: { date } })).data,

  bookings: async (params = {}) => (await api.get('/amenities/bookings', { params })).data,
  book: async (payload) => (await api.post('/amenities/bookings', payload)).data,
  checkIn: async (id) => (await api.put(`/amenities/bookings/${id}/checkin`)).data,
  checkOut: async (id) => (await api.put(`/amenities/bookings/${id}/checkout`)).data,
  cancel: async (id, reason = '') =>
    (await api.put(`/amenities/bookings/${id}/cancel`, { reason })).data,
};

export default amenityService;