export const ROLES = {
  ADMIN: 'admin',
  OWNER: 'owner',
  TENANT: 'tenant',
  STAFF: 'staff',
};

export const ROLE_LABEL = {
  admin: 'Administrator',
  owner: 'Property Owner',
  tenant: 'Tenant',
  staff: 'Maintenance Staff',
};

export const ROLE_BADGE = {
  admin: 'bg-violet-100 text-violet-700',
  owner: 'bg-brand-100 text-brand-700',
  tenant: 'bg-emerald-100 text-emerald-700',
  staff: 'bg-amber-100 text-amber-700',
};

export const can = {
  manageUsers: (r) => r === 'admin',
  manageProperties: (r) => ['admin', 'owner'].includes(r),
  manageAmenities: (r) => ['admin', 'owner'].includes(r),
  createRequest: (r) => ['admin', 'owner', 'tenant'].includes(r),
  updateRequestStatus: (r) => ['admin', 'owner', 'staff'].includes(r),
  assignStaff: (r) => ['admin', 'owner'].includes(r),
  bookAmenity: (r) => ['admin', 'owner', 'tenant'].includes(r),
};

export const STATUS_STYLE = {
  Pending: { cls: 'badge-pending', dot: 'bg-amber-500' },
  'In Progress': { cls: 'badge-progress', dot: 'bg-sky-500' },
  Completed: { cls: 'badge-done', dot: 'bg-emerald-500' },
  Cancelled: { cls: 'badge-cancel', dot: 'bg-ink-400' },
  Booked: { cls: 'badge-progress', dot: 'bg-sky-500' },
  CheckedIn: { cls: 'badge-done', dot: 'bg-emerald-500' },
  NoShow: { cls: 'badge-urgent', dot: 'bg-rose-500' },
};

export const PRIORITY_STYLE = {
  Urgent: 'bg-rose-100 text-rose-700 border-rose-200',
  High: 'bg-orange-100 text-orange-700 border-orange-200',
  Medium: 'bg-amber-100 text-amber-700 border-amber-200',
  Low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

export const CATEGORIES = [
  'Plumbing', 'Electrical', 'Carpentry', 'Appliance', 'Cleaning', 'Security', 'Other',
];

export const AMENITY_CATEGORIES = [
  'Gym', 'Swimming Pool', 'Clubhouse', 'Party Hall', 'Tennis Court',
  'Parking', 'Co-working', 'Garden', 'Other',
];

export const PROPERTY_TYPES = [
  'Apartment', 'Villa', 'Studio', 'Penthouse', 'Duplex', 'Commercial', 'Society',
];

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';

export const fmtDateTime = (d) => (d ? `${fmtDate(d)} · ${fmtTime(d)}` : '—');

export const timeAgo = (d) => {
  if (!d) return '—';
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const dd = Math.floor(h / 24);
  if (dd < 30) return `${dd}d ago`;
  return fmtDate(d);
};

export const money = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

export const todayStr = () => new Date().toISOString().slice(0, 10);