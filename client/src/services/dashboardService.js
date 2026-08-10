import api from './api';

const dashboardService = {
  stats: async () => (await api.get('/dashboard/stats')).data,
  activity: async () => (await api.get('/dashboard/activity')).data,
};

export default dashboardService;