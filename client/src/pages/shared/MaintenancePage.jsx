import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FiPlus, FiSearch, FiX, FiTool, FiClock, FiCheckCircle, FiAlertTriangle,
  FiRefreshCw, FiMessageSquare, FiSend, FiUserCheck, FiTrash2, FiStar,
  FiGrid, FiList, FiActivity, FiChevronRight, FiCheck,
} from 'react-icons/fi';
import usePoll from '../../hooks/usePoll';
import maintenanceService from '../../services/maintenanceService';
import propertyService from '../../services/propertyService';
import userService from '../../services/userService';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';
import {
  can, CATEGORIES, STATUS_STYLE, PRIORITY_STYLE, timeAgo, fmtDateTime,
} from '../../utils/role';

const STATUSES = ['Pending', 'In Progress', 'Completed', 'Cancelled'];
const EMPTY = { property: '', title: '', description: '', category: 'Other', priority: 'Medium', unitNumber: '', imageUrl: '' };

/* ---------- Modal ---------- */
function Modal({ open, onClose, title, subtitle, children, wide }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    if (open) { document.addEventListener('keydown', esc); document.body.style.overflow = 'hidden'; }
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-pop animate-scale-in sm:rounded-3xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-xl'}`}>
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

/* ---------- Ticket Card ---------- */
const TicketCard = ({ r, onOpen }) => {
  const st = STATUS_STYLE[r.status] || STATUS_STYLE.Pending;
  const overdue = !['Completed', 'Cancelled'].includes(r.status) && (Date.now() - new Date(r.createdAt)) / 36e5 > 48;
  return (
    <button onClick={() => onOpen(r)} className="card-hover w-full p-4 text-left">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-400">{r.ticketId}</span>
        <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${PRIORITY_STYLE[r.priority]}`}>{r.priority}</span>
      </div>
      <p className="mt-2 line-clamp-2 text-[13.5px] font-bold leading-snug text-ink-900">{r.title}</p>
      <p className="mt-1 line-clamp-2 text-[11.5px] leading-snug text-ink-500">{r.description}</p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="badge bg-ink-100 text-ink-600">{r.category}</span>
        {overdue && <span className="badge-urgent"><FiAlertTriangle /> Overdue</span>}
        {r.comments?.length > 0 && (
          <span className="badge bg-sky-50 text-sky-600"><FiMessageSquare /> {r.comments.length}</span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[10px] font-bold text-white"
            style={{ background: r.raisedBy?.avatarColor || '#316bff' }}>
            {(r.raisedBy?.name || 'U').slice(0, 1)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[11.5px] font-semibold text-ink-700">{r.raisedBy?.name}</p>
            <p className="truncate text-[10px] text-ink-400">{r.property?.name}</p>
          </div>
        </div>
        <div className="text-right">
          <span className={`${st.cls} !text-[9.5px]`}>{r.status}</span>
          <p className="mt-1 text-[10px] text-ink-400">{timeAgo(r.createdAt)}</p>
        </div>
      </div>
    </button>
  );
};

/* ================= PAGE ================= */
export default function MaintenancePage() {
  const { user, role } = useAuth();
  const canCreate = can.createRequest(role);
  const canUpdate = can.updateRequestStatus(role);
  const canAssign = can.assignStaff(role);

  const [filters, setFilters] = useState({ search: '', status: '', priority: '', category: '' });
  const [view, setView] = useState('board');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [properties, setProperties] = useState([]);
  const [staff, setStaff] = useState([]);
  const [active, setActive] = useState(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, loading, syncing, refresh } = usePoll(
    () => maintenanceService.list(filters),
    { interval: 6000, deps: [filters.search, filters.status, filters.priority, filters.category] }
  );

  const items = data?.data || [];
  const stats = data?.stats || {};

  /* keep the open ticket fresh on every poll */
  useEffect(() => {
    if (!active) return;
    const fresh = items.find((x) => x._id === active._id);
    if (fresh && JSON.stringify(fresh.timeline?.length) !== JSON.stringify(active.timeline?.length)) setActive(fresh);
    else if (fresh && fresh.status !== active.status) setActive(fresh);
    else if (fresh && (fresh.comments?.length || 0) !== (active.comments?.length || 0)) setActive(fresh);
  }, [items]); // eslint-disable-line

  useEffect(() => {
    (async () => {
      try {
        const p = await propertyService.list();
        setProperties(p.data || []);
      } catch { setProperties([]); }
      if (canAssign) {
        try {
          const s = await userService.list({ role: 'staff' });
          setStaff(s.data || []);
        } catch { setStaff([]); }
      }
    })();
  }, [canAssign]);

  const grouped = useMemo(
    () => STATUSES.reduce((a, s) => ({ ...a, [s]: items.filter((i) => i.status === s) }), {}),
    [items]
  );

  const openCreate = () => {
    setForm({ ...EMPTY, property: user?.property?._id || '', unitNumber: user?.unitNumber || '' });
    setErrors({});
    setCreateOpen(true);
  };

  const validate = () => {
    const e = {};
    if (!form.property) e.property = 'Please select a property';
    if (!form.title.trim()) e.title = 'Issue title is required';
    else if (form.title.trim().length < 5) e.title = 'Title is too short';
    if (!form.description.trim()) e.description = 'Description is required';
    else if (form.description.trim().length < 10) e.description = 'Please describe the issue in more detail';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return toast.error('Please fix the highlighted fields');
    setSaving(true);
    try {
      const res = await maintenanceService.create(form);
      toast.success(res.message);
      setCreateOpen(false);
      refresh();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const changeStatus = async (status) => {
    setBusy(true);
    try {
      const res = await maintenanceService.updateStatus(active._id, { status });
      toast.success(res.message);
      setActive(res.data);
      refresh();
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  const assign = async (id) => {
    setBusy(true);
    try {
      const res = await maintenanceService.assign(active._id, id || null);
      toast.success(res.message);
      setActive(res.data);
      refresh();
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  const sendComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setBusy(true);
    try {
      const res = await maintenanceService.comment(active._id, comment.trim());
      setActive(res.data);
      setComment('');
      refresh();
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  const rate = async (n) => {
    try {
      await maintenanceService.rate(active._id, n);
      setActive({ ...active, rating: n });
      toast.success('Thanks for your feedback!');
      refresh();
    } catch (err) { toast.error(err.message); }
  };

  const removeTicket = async () => {
    if (!window.confirm('Delete this maintenance request permanently?')) return;
    try {
      await maintenanceService.remove(active._id);
      toast.success('Request deleted');
      setActive(null);
      refresh();
    } catch (err) { toast.error(err.message); }
  };

  const COLUMN_META = {
    Pending: { tone: 'border-amber-300 bg-amber-50', dot: 'bg-amber-500', icon: FiClock },
    'In Progress': { tone: 'border-sky-300 bg-sky-50', dot: 'bg-sky-500', icon: FiActivity },
    Completed: { tone: 'border-emerald-300 bg-emerald-50', dot: 'bg-emerald-500', icon: FiCheckCircle },
    Cancelled: { tone: 'border-ink-300 bg-ink-50', dot: 'bg-ink-400', icon: FiX },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-extrabold text-ink-900">Maintenance Requests</h2>
            <span className="badge bg-emerald-50 text-emerald-700"><span className="live-dot" /> LIVE</span>
          </div>
          <p className="muted mt-0.5">
            {stats.total || 0} total · {stats.pending || 0} pending · {stats.inProgress || 0} in progress ·{' '}
            <span className={stats.overdue ? 'font-bold text-rose-600' : ''}>{stats.overdue || 0} overdue</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden rounded-xl border border-ink-200 p-1 sm:flex">
            <button onClick={() => setView('board')} className={`btn-sm rounded-lg px-2.5 ${view === 'board' ? 'bg-brand-600 text-white' : 'text-ink-500'}`}><FiGrid /></button>
            <button onClick={() => setView('list')} className={`btn-sm rounded-lg px-2.5 ${view === 'list' ? 'bg-brand-600 text-white' : 'text-ink-500'}`}><FiList /></button>
          </div>
          <button onClick={refresh} className="btn-ghost">
            <FiRefreshCw className={syncing ? 'animate-spin text-brand-600' : ''} /> Refresh
          </button>
          {canCreate && <button onClick={openCreate} className="btn-primary"><FiPlus /> New Request</button>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: FiClock, l: 'Pending', v: stats.pending || 0, tone: 'bg-amber-500' },
          { icon: FiActivity, l: 'In Progress', v: stats.inProgress || 0, tone: 'bg-sky-500' },
          { icon: FiCheckCircle, l: 'Completed', v: stats.completed || 0, tone: 'bg-emerald-500' },
          { icon: FiAlertTriangle, l: 'Overdue (>48h)', v: stats.overdue || 0, tone: 'bg-rose-500' },
        ].map((s) => (
          <div key={s.l} className="card flex items-center gap-4 p-4">
            <div className={`grid h-11 w-11 place-items-center rounded-xl ${s.tone} text-white`}><s.icon /></div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">{s.l}</p>
              <p className="font-display text-xl font-extrabold text-ink-900">{s.v}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Search by title, ticket ID or description…" className="input pl-10" />
        </div>
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="select lg:w-40">
          <option value="">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })} className="select lg:w-36">
          <option value="">All priority</option>{['Urgent', 'High', 'Medium', 'Low'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} className="select lg:w-40">
          <option value="">All categories</option>{CATEGORIES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Content */}
      {loading && !data ? (
        <Loader card rows={6} />
      ) : items.length === 0 ? (
        <EmptyState icon={FiTool} title="No maintenance requests"
          message={Object.values(filters).some(Boolean) ? 'No requests match your filters.' : 'All clear! No issues reported yet.'}
          actionLabel={canCreate ? 'Raise a Request' : undefined} onAction={canCreate ? openCreate : undefined} />
      ) : view === 'board' ? (
        <div className="grid gap-4 lg:grid-cols-4">
          {STATUSES.map((s) => {
            const meta = COLUMN_META[s];
            return (
              <div key={s} className="flex flex-col">
                <div className={`mb-3 flex items-center justify-between rounded-xl border-2 border-dashed px-3.5 py-2.5 ${meta.tone}`}>
                  <span className="flex items-center gap-2 text-[12.5px] font-extrabold text-ink-800">
                    <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} /> {s}
                  </span>
                  <span className="rounded-lg bg-white px-2 py-0.5 text-[11px] font-bold text-ink-600">
                    {grouped[s].length}
                  </span>
                </div>
                <div className="space-y-3">
                  {grouped[s].length === 0 && (
                    <div className="rounded-xl border border-dashed border-ink-200 py-8 text-center text-[12px] text-ink-400">
                      No tickets
                    </div>
                  )}
                  {grouped[s].map((r) => <TicketCard key={r._id} r={r} onOpen={setActive} />)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr><th>Ticket</th><th>Property</th><th>Category</th><th>Priority</th><th>Raised by</th><th>Assigned</th><th>Status</th><th>Age</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((r) => {
                const st = STATUS_STYLE[r.status] || STATUS_STYLE.Pending;
                return (
                  <tr key={r._id} className="cursor-pointer" onClick={() => setActive(r)}>
                    <td>
                      <p className="text-[13px] font-bold text-ink-900">{r.title}</p>
                      <p className="text-[11px] text-ink-400">{r.ticketId}</p>
                    </td>
                    <td className="text-[13px] text-ink-600">{r.property?.name}</td>
                    <td><span className="badge bg-ink-100 text-ink-600">{r.category}</span></td>
                    <td><span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${PRIORITY_STYLE[r.priority]}`}>{r.priority}</span></td>
                    <td className="text-[13px] text-ink-600">{r.raisedBy?.name}</td>
                    <td className="text-[13px] text-ink-600">{r.assignedTo?.name || <span className="text-ink-300">—</span>}</td>
                    <td><span className={st.cls}>{r.status}</span></td>
                    <td className="text-[12px] text-ink-500">{timeAgo(r.createdAt)}</td>
                    <td><FiChevronRight className="text-ink-400" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------- Create modal ---------- */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Raise Maintenance Request"
        subtitle="Describe the issue — status updates appear in real time">
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <label className="label">Property *</label>
            <select value={form.property} onChange={(e) => setForm({ ...form, property: e.target.value })}
              className={`select ${errors.property ? 'input-error' : ''}`}>
              <option value="">Select property</option>
              {properties.map((p) => <option key={p._id} value={p._id}>{p.name} — {p.address?.city}</option>)}
            </select>
            {errors.property && <p className="form-err">{errors.property}</p>}
          </div>

          <div>
            <label className="label">Issue title *</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Kitchen sink pipe leaking" className={`input ${errors.title ? 'input-error' : ''}`} />
            {errors.title && <p className="form-err">{errors.title}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="select">
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="select">
                {['Low', 'Medium', 'High', 'Urgent'].map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Unit / Flat number</label>
            <input value={form.unitNumber} onChange={(e) => setForm({ ...form, unitNumber: e.target.value })}
              placeholder="A-1204" className="input" />
          </div>

          <div>
            <label className="label">Description *</label>
            <textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Explain what's wrong, since when, and any other detail…"
              className={`textarea ${errors.description ? 'input-error' : ''}`} />
            {errors.description && <p className="form-err">{errors.description}</p>}
            <p className="form-hint">{form.description.length}/1500 characters</p>
          </div>

          <div>
            <label className="label">Photo URL (optional)</label>
            <input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              placeholder="https://…" className="input" />
          </div>

          <div className="flex gap-3 border-t border-ink-100 pt-4">
            <button type="button" onClick={() => setCreateOpen(false)} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Submitting…</> : <><FiCheck /> Submit Request</>}
            </button>
          </div>
        </form>
      </Modal>

      {/* ---------- Detail modal ---------- */}
      <Modal open={!!active} onClose={() => setActive(null)} wide
        title={active?.title || ''} subtitle={active ? `${active.ticketId} · ${active.property?.name}` : ''}>
        {active && (
          <div className="space-y-5">
            {/* meta */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={STATUS_STYLE[active.status]?.cls}>{active.status}</span>
              <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${PRIORITY_STYLE[active.priority]}`}>{active.priority}</span>
              <span className="badge bg-ink-100 text-ink-600">{active.category}</span>
              {active.unitNumber && <span className="badge bg-brand-50 text-brand-700">Unit {active.unitNumber}</span>}
              <span className="text-[11.5px] text-ink-400">Raised {timeAgo(active.createdAt)}</span>
            </div>

            <p className="rounded-xl bg-ink-50 p-4 text-[13.5px] leading-relaxed text-ink-700">{active.description}</p>

            {active.imageUrl && (
              <img src={active.imageUrl} alt="issue" className="max-h-64 w-full rounded-xl object-cover" />
            )}

            {/* status actions */}
            {canUpdate && (
              <div className="rounded-2xl border border-ink-100 p-4">
                <p className="mb-3 text-[13px] font-bold text-ink-700">Update status</p>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map((s) => (
                    <button key={s} disabled={busy || active.status === s} onClick={() => changeStatus(s)}
                      className={`chip ${active.status === s ? 'chip-active !cursor-default' : ''}`}>
                      <span className={`h-2 w-2 rounded-full ${STATUS_STYLE[s].dot}`} /> {s}
                    </button>
                  ))}
                </div>

                {canAssign && (
                  <div className="mt-4">
                    <label className="label"><FiUserCheck className="mb-0.5 mr-1 inline" /> Assign technician</label>
                    <select value={active.assignedTo?._id || ''} disabled={busy}
                      onChange={(e) => assign(e.target.value)} className="select">
                      <option value="">Unassigned</option>
                      {staff.map((s) => <option key={s._id} value={s._id}>{s.name} — {s.department}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* timeline */}
            <div>
              <p className="mb-3 text-[13px] font-bold text-ink-700">Status timeline</p>
              <div className="relative space-y-4 pl-6">
                <span className="absolute left-[7px] top-2 bottom-2 w-px bg-ink-200" />
                {(active.timeline || []).map((t, i) => (
                  <div key={i} className="relative">
                    <span className={`absolute -left-[22px] top-1 h-3.5 w-3.5 rounded-full ring-4 ring-white ${STATUS_STYLE[t.status]?.dot || 'bg-ink-400'}`} />
                    <p className="text-[13px] font-bold text-ink-900">{t.status}</p>
                    <p className="text-[12px] text-ink-500">{t.note}</p>
                    <p className="mt-0.5 text-[11px] text-ink-400">{t.byName} · {fmtDateTime(t.at)}</p>
                  </div>
                ))}
              </div>
            </div>

            {active.resolutionNote && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-[12px] font-bold uppercase tracking-wide text-emerald-700">Resolution</p>
                <p className="mt-1 text-[13px] text-emerald-900">{active.resolutionNote}</p>
                {active.resolvedAt && <p className="mt-1 text-[11px] text-emerald-600">Resolved {fmtDateTime(active.resolvedAt)}</p>}
              </div>
            )}

            {/* rating */}
            {active.status === 'Completed' && String(active.raisedBy?._id) === String(user._id) && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-[13px] font-bold text-amber-800">Rate this service</p>
                <div className="mt-2 flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => rate(n)}
                      className={`text-2xl transition hover:scale-110 ${n <= (active.rating || 0) ? 'text-amber-500' : 'text-ink-300'}`}>
                      <FiStar fill={n <= (active.rating || 0) ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* comments */}
            <div>
              <p className="mb-3 flex items-center gap-2 text-[13px] font-bold text-ink-700">
                <FiMessageSquare /> Conversation ({active.comments?.length || 0})
              </p>
              <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
                {(active.comments || []).length === 0 && <p className="muted">No messages yet. Start the conversation.</p>}
                {(active.comments || []).map((c) => {
                  const mine = String(c.user) === String(user._id);
                  return (
                    <div key={c._id} className={`flex gap-2.5 ${mine ? 'flex-row-reverse' : ''}`}>
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-500 text-[11px] font-bold text-white">
                        {c.name.slice(0, 1)}
                      </span>
                      <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 ${mine ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-800'}`}>
                        <p className={`text-[10.5px] font-bold ${mine ? 'text-white/70' : 'text-ink-500'}`}>
                          {c.name} · {c.role}
                        </p>
                        <p className="mt-0.5 text-[13px] leading-snug">{c.text}</p>
                        <p className={`mt-1 text-[10px] ${mine ? 'text-white/50' : 'text-ink-400'}`}>{timeAgo(c.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={sendComment} className="mt-3 flex gap-2">
                <input value={comment} onChange={(e) => setComment(e.target.value)}
                  placeholder="Write a message…" className="input flex-1" />
                <button type="submit" disabled={busy || !comment.trim()} className="btn-primary px-4"><FiSend /></button>
              </form>
            </div>

            {(role === 'admin' || String(active.raisedBy?._id) === String(user._id)) && (
              <div className="border-t border-ink-100 pt-4">
                <button onClick={removeTicket} className="btn-danger w-full"><FiTrash2 /> Delete Request</button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}