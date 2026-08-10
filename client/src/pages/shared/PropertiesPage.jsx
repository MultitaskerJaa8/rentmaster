import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FiPlus, FiSearch, FiEdit2, FiTrash2, FiMapPin, FiX, FiHome, FiUsers,
  FiTool, FiLayers, FiGrid, FiList, FiRefreshCw, FiChevronRight, FiCheck,
} from 'react-icons/fi';
import usePoll from '../../hooks/usePoll';
import propertyService from '../../services/propertyService';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { can, PROPERTY_TYPES, money, fmtDate } from '../../utils/role';

const EMPTY = {
  name: '', type: 'Apartment', description: '',
  address: { line1: '', city: '', state: '', pincode: '', country: 'India' },
  totalUnits: 1, occupiedUnits: 0, rentAmount: 0,
  bedrooms: 1, bathrooms: 1, areaSqft: 0, status: 'Available', imageUrl: '', tags: [],
};

const STATUS_PILL = {
  Available: 'bg-emerald-100 text-emerald-700',
  Occupied: 'bg-brand-100 text-brand-700',
  'Under Maintenance': 'bg-amber-100 text-amber-700',
  Inactive: 'bg-ink-100 text-ink-600',
};

/* ---------------- Modal shell ---------------- */
function Modal({ open, onClose, title, subtitle, children, wide = false }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    if (open) {
      document.addEventListener('keydown', esc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-pop animate-scale-in sm:rounded-3xl ${
          wide ? 'sm:max-w-3xl' : 'sm:max-w-xl'
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-6 py-5">
          <div>
            <h3 className="font-display text-lg font-extrabold text-ink-900">{title}</h3>
            {subtitle && <p className="muted mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="btn-icon"><FiX className="text-lg" /></button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ---------------- Page ---------------- */
export default function PropertiesPage() {
  const { role } = useAuth();
  const editable = can.manageProperties(role);

  const [filters, setFilters] = useState({ search: '', status: '', type: '' });
  const [view, setView] = useState('grid');
  const [modal, setModal] = useState(false);
  const [detail, setDetail] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const { data, loading, syncing, refresh } = usePoll(
    () => propertyService.list(filters),
    { interval: 10000, deps: [filters.search, filters.status, filters.type] }
  );

  const items = data?.data || [];

  const summary = useMemo(() => {
    const units = items.reduce((s, p) => s + (p.totalUnits || 0), 0);
    const occ = items.reduce((s, p) => s + (p.occupiedUnits || 0), 0);
    return {
      total: items.length,
      units,
      occupancy: units ? Math.round((occ / units) * 100) : 0,
      openReq: items.reduce((s, p) => s + (p.openRequests || 0), 0),
      revenue: items.reduce((s, p) => s + (p.rentAmount || 0) * (p.occupiedUnits || 0), 0),
    };
  }, [items]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setErrors({});
    setModal(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name || '', type: p.type || 'Apartment', description: p.description || '',
      address: {
        line1: p.address?.line1 || '', city: p.address?.city || '', state: p.address?.state || '',
        pincode: p.address?.pincode || '', country: p.address?.country || 'India',
      },
      totalUnits: p.totalUnits || 1, occupiedUnits: p.occupiedUnits || 0, rentAmount: p.rentAmount || 0,
      bedrooms: p.bedrooms || 1, bathrooms: p.bathrooms || 1, areaSqft: p.areaSqft || 0,
      status: p.status || 'Available', imageUrl: p.imageUrl || '', tags: p.tags || [],
    });
    setErrors({});
    setModal(true);
  };

  const setField = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };
  const setAddr = (k, v) => {
    setForm((f) => ({ ...f, address: { ...f.address, [k]: v } }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Property name is required';
    if (!form.address.line1.trim()) e.line1 = 'Address line is required';
    if (!form.address.city.trim()) e.city = 'City is required';
    if (Number(form.occupiedUnits) > Number(form.totalUnits)) e.occupiedUnits = 'Occupied cannot exceed total units';
    if (Number(form.totalUnits) < 1) e.totalUnits = 'Minimum 1 unit';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async (e) => {
    e.preventDefault();
    if (!validate()) return toast.error('Please fix the highlighted fields');
    setSaving(true);
    try {
      const payload = {
        ...form,
        totalUnits: Number(form.totalUnits), occupiedUnits: Number(form.occupiedUnits),
        rentAmount: Number(form.rentAmount), bedrooms: Number(form.bedrooms),
        bathrooms: Number(form.bathrooms), areaSqft: Number(form.areaSqft),
      };
      if (!payload.imageUrl) delete payload.imageUrl;

      const res = editing
        ? await propertyService.update(editing._id, payload)
        : await propertyService.create(payload);
      toast.success(res.message);
      setModal(false);
      refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.name}"? All its amenities and requests will be removed.`)) return;
    try {
      const res = await propertyService.remove(p._id);
      toast.success(res.message);
      setDetail(null);
      refresh();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const openDetail = async (p) => {
    setDetail({ loading: true });
    try {
      const res = await propertyService.get(p._id);
      setDetail(res.data);
    } catch (err) {
      toast.error(err.message);
      setDetail(null);
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) setField('tags', [...form.tags, t]);
    setTagInput('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-display text-xl font-extrabold text-ink-900">Property Portfolio</h2>
          <p className="muted mt-0.5">
            {summary.total} properties · {summary.units} units · {summary.occupancy}% occupied
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden rounded-xl border border-ink-200 p-1 sm:flex">
            <button onClick={() => setView('grid')} className={`btn-sm rounded-lg px-2.5 ${view === 'grid' ? 'bg-brand-600 text-white' : 'text-ink-500'}`}><FiGrid /></button>
            <button onClick={() => setView('list')} className={`btn-sm rounded-lg px-2.5 ${view === 'list' ? 'bg-brand-600 text-white' : 'text-ink-500'}`}><FiList /></button>
          </div>
          <button onClick={refresh} className="btn-ghost">
            <FiRefreshCw className={syncing ? 'animate-spin text-brand-600' : ''} /> Refresh
          </button>
          {editable && (
            <button onClick={openCreate} className="btn-primary"><FiPlus /> Add Property</button>
          )}
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: FiHome, label: 'Total Properties', value: summary.total, tone: 'bg-brand-500' },
          { icon: FiLayers, label: 'Total Units', value: summary.units, tone: 'bg-violet-500' },
          { icon: FiUsers, label: 'Occupancy Rate', value: `${summary.occupancy}%`, tone: 'bg-emerald-500' },
          { icon: FiTool, label: 'Open Requests', value: summary.openReq, tone: 'bg-amber-500' },
        ].map((s) => (
          <div key={s.label} className="card flex items-center gap-4 p-4">
            <div className={`grid h-11 w-11 place-items-center rounded-xl ${s.tone} text-white`}><s.icon /></div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">{s.label}</p>
              <p className="font-display text-xl font-extrabold text-ink-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card flex flex-col gap-3 p-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Search by name, code or city…"
            className="input pl-10"
          />
        </div>
        <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} className="select md:w-44">
          <option value="">All types</option>
          {PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="select md:w-48">
          <option value="">All statuses</option>
          {['Available', 'Occupied', 'Under Maintenance', 'Inactive'].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Content */}
      {loading && !data ? (
        <Loader card rows={6} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={FiHome}
          title="No properties found"
          message={filters.search || filters.status || filters.type
            ? 'Try changing your filters to see more results.'
            : editable ? 'Add your first property to start managing rentals.' : 'No property has been assigned to you yet.'}
          actionLabel={editable ? 'Add Property' : undefined}
          onAction={editable ? openCreate : undefined}
        />
      ) : view === 'grid' ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((p) => (
            <div key={p._id} className="card-hover group overflow-hidden">
              <div className="relative h-44 overflow-hidden bg-ink-100">
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=70'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950/75 via-ink-950/10 to-transparent" />
                <span className={`badge absolute left-3 top-3 ${STATUS_PILL[p.status]}`}>{p.status}</span>
                <span className="badge absolute right-3 top-3 bg-white/90 text-ink-700">{p.type}</span>
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="truncate font-display text-base font-extrabold text-white">{p.name}</h3>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11.5px] text-white/75">
                    <FiMapPin className="shrink-0" /> {p.address?.city}, {p.address?.state || p.address?.country}
                  </p>
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-baseline justify-between">
                  <p className="font-display text-lg font-extrabold text-brand-700">
                    {money(p.rentAmount)}<span className="text-xs font-semibold text-ink-400">/mo</span>
                  </p>
                  <span className="text-[11px] font-bold text-ink-400">{p.code}</span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {[
                    ['Units', `${p.occupiedUnits}/${p.totalUnits}`],
                    ['Amenities', p.amenityCount],
                    ['Open Req', p.openRequests],
                  ].map(([l, v]) => (
                    <div key={l} className="rounded-xl bg-ink-50 py-2">
                      <p className="text-sm font-extrabold text-ink-900">{v}</p>
                      <p className="text-[10px] font-semibold uppercase text-ink-400">{l}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-[11px] font-semibold text-ink-500">
                    <span>Occupancy</span><span>{p.occupancyRate}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                    <div className="h-full rounded-full bg-brand-gradient transition-all duration-700" style={{ width: `${p.occupancyRate}%` }} />
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button onClick={() => openDetail(p)} className="btn-ghost btn-sm flex-1">
                    Details <FiChevronRight />
                  </button>
                  {editable && (
                    <>
                      <button onClick={() => openEdit(p)} className="btn-soft btn-sm"><FiEdit2 /></button>
                      <button onClick={() => remove(p)} className="btn-sm btn bg-rose-50 text-rose-600 hover:bg-rose-100"><FiTrash2 /></button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Property</th><th>Type</th><th>Location</th><th>Units</th>
                <th>Rent</th><th>Open Req</th><th>Status</th><th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p._id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <img src={p.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover ring-1 ring-ink-100" />
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-bold text-ink-900">{p.name}</p>
                        <p className="text-[11px] text-ink-400">{p.code}</p>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge bg-ink-100 text-ink-600">{p.type}</span></td>
                  <td className="text-[13px] text-ink-600">{p.address?.city}</td>
                  <td className="text-[13px] font-semibold">{p.occupiedUnits}/{p.totalUnits}</td>
                  <td className="text-[13px] font-bold text-brand-700">{money(p.rentAmount)}</td>
                  <td>
                    <span className={`badge ${p.openRequests ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {p.openRequests}
                    </span>
                  </td>
                  <td><span className={`badge ${STATUS_PILL[p.status]}`}>{p.status}</span></td>
                  <td>
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => openDetail(p)} className="btn-icon"><FiChevronRight /></button>
                      {editable && (
                        <>
                          <button onClick={() => openEdit(p)} className="btn-icon hover:text-brand-600"><FiEdit2 /></button>
                          <button onClick={() => remove(p)} className="btn-icon hover:bg-rose-50 hover:text-rose-600"><FiTrash2 /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------- Create / Edit modal ---------- */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        wide
        title={editing ? 'Edit Property' : 'Add New Property'}
        subtitle={editing ? `Updating ${editing.name}` : 'Fill in the details to add it to your portfolio'}
      >
        <form onSubmit={save} className="space-y-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Property name *</label>
              <input value={form.name} onChange={(e) => setField('name', e.target.value)}
                placeholder="e.g. Skyline Residency" className={`input ${errors.name ? 'input-error' : ''}`} />
              {errors.name && <p className="form-err">{errors.name}</p>}
            </div>

            <div>
              <label className="label">Type</label>
              <select value={form.type} onChange={(e) => setField('type', e.target.value)} className="select">
                {PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select value={form.status} onChange={(e) => setField('status', e.target.value)} className="select">
                {['Available', 'Occupied', 'Under Maintenance', 'Inactive'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea value={form.description} onChange={(e) => setField('description', e.target.value)}
                rows={3} placeholder="Short description of the property…" className="textarea" />
            </div>
          </div>

          <div className="rounded-2xl border border-ink-100 bg-ink-50/60 p-4">
            <p className="mb-3 flex items-center gap-2 text-[13px] font-bold text-ink-700">
              <FiMapPin className="text-brand-600" /> Address
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Address line *</label>
                <input value={form.address.line1} onChange={(e) => setAddr('line1', e.target.value)}
                  placeholder="12 Hill Road" className={`input ${errors.line1 ? 'input-error' : ''}`} />
                {errors.line1 && <p className="form-err">{errors.line1}</p>}
              </div>
              <div>
                <label className="label">City *</label>
                <input value={form.address.city} onChange={(e) => setAddr('city', e.target.value)}
                  placeholder="Mumbai" className={`input ${errors.city ? 'input-error' : ''}`} />
                {errors.city && <p className="form-err">{errors.city}</p>}
              </div>
              <div>
                <label className="label">State</label>
                <input value={form.address.state} onChange={(e) => setAddr('state', e.target.value)} placeholder="Maharashtra" className="input" />
              </div>
              <div>
                <label className="label">Pincode</label>
                <input value={form.address.pincode} onChange={(e) => setAddr('pincode', e.target.value)} placeholder="400050" className="input" />
              </div>
              <div>
                <label className="label">Country</label>
                <input value={form.address.country} onChange={(e) => setAddr('country', e.target.value)} className="input" />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Total units *</label>
              <input type="number" min="1" value={form.totalUnits} onChange={(e) => setField('totalUnits', e.target.value)}
                className={`input ${errors.totalUnits ? 'input-error' : ''}`} />
              {errors.totalUnits && <p className="form-err">{errors.totalUnits}</p>}
            </div>
            <div>
              <label className="label">Occupied units</label>
              <input type="number" min="0" value={form.occupiedUnits} onChange={(e) => setField('occupiedUnits', e.target.value)}
                className={`input ${errors.occupiedUnits ? 'input-error' : ''}`} />
              {errors.occupiedUnits && <p className="form-err">{errors.occupiedUnits}</p>}
            </div>
            <div>
              <label className="label">Monthly rent (₹)</label>
              <input type="number" min="0" value={form.rentAmount} onChange={(e) => setField('rentAmount', e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Bedrooms</label>
              <input type="number" min="0" value={form.bedrooms} onChange={(e) => setField('bedrooms', e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Bathrooms</label>
              <input type="number" min="0" value={form.bathrooms} onChange={(e) => setField('bathrooms', e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Area (sqft)</label>
              <input type="number" min="0" value={form.areaSqft} onChange={(e) => setField('areaSqft', e.target.value)} className="input" />
            </div>
          </div>

          <div>
            <label className="label">Cover image URL</label>
            <input value={form.imageUrl} onChange={(e) => setField('imageUrl', e.target.value)}
              placeholder="https://images.unsplash.com/…" className="input" />
            <p className="form-hint">Leave blank to use a default cover image</p>
          </div>

          <div>
            <label className="label">Highlights / tags</label>
            <div className="flex gap-2">
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="e.g. Power Backup, then press Enter" className="input flex-1" />
              <button type="button" onClick={addTag} className="btn-ghost"><FiPlus /></button>
            </div>
            {form.tags.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {form.tags.map((t) => (
                  <span key={t} className="badge-brand gap-1.5">
                    {t}
                    <button type="button" onClick={() => setField('tags', form.tags.filter((x) => x !== t))} className="hover:text-rose-600">
                      <FiX />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 border-t border-ink-100 pt-5">
            <button type="button" onClick={() => setModal(false)} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? (
                <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Saving…</>
              ) : (
                <><FiCheck /> {editing ? 'Update Property' : 'Create Property'}</>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ---------- Detail modal ---------- */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        wide
        title={detail?.property?.name || 'Property details'}
        subtitle={detail?.property?.code}
      >
        {detail?.loading ? (
          <Loader label="Loading property…" />
        ) : detail?.property ? (
          <div className="space-y-5">
            <div className="relative h-52 overflow-hidden rounded-2xl">
              <img src={detail.property.imageUrl} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 to-transparent" />
              <div className="absolute bottom-4 left-4 text-white">
                <span className={`badge ${STATUS_PILL[detail.property.status]}`}>{detail.property.status}</span>
                <p className="mt-2 flex items-center gap-1.5 text-sm">
                  <FiMapPin /> {detail.property.address?.line1}, {detail.property.address?.city}
                </p>
              </div>
            </div>

            {detail.property.description && (
              <p className="text-[13.5px] leading-relaxed text-ink-600">{detail.property.description}</p>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Rent', money(detail.property.rentAmount)],
                ['Units', `${detail.property.occupiedUnits}/${detail.property.totalUnits}`],
                ['Bedrooms', detail.property.bedrooms],
                ['Area', `${detail.property.areaSqft} sqft`],
              ].map(([l, v]) => (
                <div key={l} className="rounded-xl bg-ink-50 p-3 text-center">
                  <p className="text-[10px] font-bold uppercase text-ink-400">{l}</p>
                  <p className="mt-0.5 text-[15px] font-extrabold text-ink-900">{v}</p>
                </div>
              ))}
            </div>

            {detail.property.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {detail.property.tags.map((t) => <span key={t} className="chip">{t}</span>)}
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-[13px] font-bold text-ink-700">Amenities ({detail.amenities.length})</p>
                <div className="space-y-2">
                  {detail.amenities.length === 0 && <p className="muted">No amenities added</p>}
                  {detail.amenities.map((a) => (
                    <div key={a._id} className="flex items-center justify-between rounded-xl border border-ink-100 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-ink-800">{a.name}</p>
                        <p className="text-[11px] text-ink-400">{a.openTime} – {a.closeTime} · cap {a.capacity}</p>
                      </div>
                      <span className={`badge ${a.availabilityStatus === 'Available' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {a.availabilityStatus}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-[13px] font-bold text-ink-700">Tenants ({detail.tenants.length})</p>
                <div className="space-y-2">
                  {detail.tenants.length === 0 && <p className="muted">No tenants assigned</p>}
                  {detail.tenants.map((t) => (
                    <div key={t._id} className="flex items-center gap-3 rounded-xl border border-ink-100 px-3 py-2.5">
                      <span className="grid h-8 w-8 place-items-center rounded-lg text-[11px] font-bold text-white"
                        style={{ background: t.avatarColor || '#316bff' }}>
                        {t.name.slice(0, 1)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-ink-800">{t.name}</p>
                        <p className="truncate text-[11px] text-ink-400">{t.unitNumber || '—'} · {t.phone || t.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-[13px] font-bold text-ink-700">Recent maintenance ({detail.requests.length})</p>
              <div className="space-y-2">
                {detail.requests.length === 0 && <p className="muted">No requests raised for this property</p>}
                {detail.requests.slice(0, 5).map((r) => (
                  <div key={r._id} className="flex items-center justify-between rounded-xl border border-ink-100 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-ink-800">{r.title}</p>
                      <p className="text-[11px] text-ink-400">{r.ticketId} · {fmtDate(r.createdAt)}</p>
                    </div>
                    <span className="badge bg-ink-100 text-ink-600">{r.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {editable && (
              <div className="flex gap-3 border-t border-ink-100 pt-5">
                <button onClick={() => { const p = detail.property; setDetail(null); openEdit(p); }} className="btn-ghost flex-1">
                  <FiEdit2 /> Edit
                </button>
                <button onClick={() => remove(detail.property)} className="btn-danger flex-1">
                  <FiTrash2 /> Delete
                </button>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}