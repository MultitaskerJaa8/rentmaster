import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FiPlus, FiSearch, FiX, FiUsers, FiEdit2, FiTrash2, FiMail, FiPhone,
  FiHome, FiRefreshCw, FiCheck, FiUserCheck, FiShield, FiTool, FiBriefcase,
} from 'react-icons/fi';
import usePoll from '../../hooks/usePoll';
import userService from '../../services/userService';
import propertyService from '../../services/propertyService';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABEL, ROLE_BADGE, fmtDate, timeAgo } from '../../utils/role';

const DEPARTMENTS = ['General', 'Plumbing', 'Electrical', 'Carpentry', 'Appliance', 'Cleaning', 'Security'];
const EMPTY = { name: '', email: '', password: '', phone: '', role: 'tenant', property: '', unitNumber: '', department: 'General', isActive: true };

function Modal({ open, onClose, title, subtitle, children }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    if (open) { document.addEventListener('keydown', esc); document.body.style.overflow = 'hidden'; }
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-pop animate-scale-in sm:max-w-xl sm:rounded-3xl">
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

export default function UsersPage() {
  const { user: me, role } = useAuth();
  const isAdmin = role === 'admin';

  const [filters, setFilters] = useState({ search: '', role: isAdmin ? '' : 'tenant' });
  const [properties, setProperties] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const { data, loading, syncing, refresh } = usePoll(
    () => userService.list(filters),
    { interval: 12000, deps: [filters.search, filters.role] }
  );

  const users = data?.data || [];

  useEffect(() => {
    (async () => {
      try { const p = await propertyService.list(); setProperties(p.data || []); }
      catch { setProperties([]); }
    })();
  }, []);

  const counts = useMemo(() => ({
    admin: users.filter((u) => u.role === 'admin').length,
    owner: users.filter((u) => u.role === 'owner').length,
    tenant: users.filter((u) => u.role === 'tenant').length,
    staff: users.filter((u) => u.role === 'staff').length,
  }), [users]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setErrors({}); setOpen(true); };
  const openEdit = (u) => {
    setEditing(u);
    setForm({
      name: u.name, email: u.email, password: '', phone: u.phone || '', role: u.role,
      property: u.property?._id || u.property || '', unitNumber: u.unitNumber || '',
      department: u.department || 'General', isActive: u.isActive,
    });
    setErrors({}); setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    const er = {};
    if (!form.name.trim()) er.name = 'Name is required';
    if (!editing) {
      if (!form.email.trim()) er.email = 'Email is required';
      else if (!/^\S+@\S+\.\S+$/.test(form.email)) er.email = 'Enter a valid email';
      if (!form.password) er.password = 'Password is required';
      else if (form.password.length < 6) er.password = 'Minimum 6 characters';
    }
    setErrors(er);
    if (Object.keys(er).length) return toast.error('Please fix the highlighted fields');

    setSaving(true);
    try {
      const payload = { ...form };
      if (editing) { delete payload.password; delete payload.email; }
      if (payload.role !== 'tenant') { payload.property = ''; payload.unitNumber = ''; }
      const res = editing ? await userService.update(editing._id, payload) : await userService.create(payload);
      toast.success(res.message);
      setOpen(false);
      refresh();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const toggleActive = async (u) => {
    try {
      const res = await userService.update(u._id, { isActive: !u.isActive });
      toast.success(`${u.name} ${res.data.isActive ? 'activated' : 'deactivated'}`);
      refresh();
    } catch (err) { toast.error(err.message); }
  };

  const remove = async (u) => {
    if (!window.confirm(`Remove ${u.name} permanently?`)) return;
    try {
      const res = await userService.remove(u._id);
      toast.success(res.message);
      refresh();
    } catch (err) { toast.error(err.message); }
  };

  const ROLE_ICON = { admin: FiShield, owner: FiBriefcase, tenant: FiHome, staff: FiTool };

  return (
    <div className="space-y-6">
      <div className="card flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-display text-xl font-extrabold text-ink-900">People Directory</h2>
          <p className="muted mt-0.5">{users.length} users · manage roles, access and assignments</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={refresh} className="btn-ghost">
            <FiRefreshCw className={syncing ? 'animate-spin text-brand-600' : ''} /> Refresh
          </button>
          {isAdmin && <button onClick={openCreate} className="btn-primary"><FiPlus /> Add User</button>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { k: 'admin', l: 'Administrators', tone: 'bg-violet-500', I: FiShield },
          { k: 'owner', l: 'Property Owners', tone: 'bg-brand-500', I: FiBriefcase },
          { k: 'tenant', l: 'Tenants', tone: 'bg-emerald-500', I: FiHome },
          { k: 'staff', l: 'Maintenance Staff', tone: 'bg-amber-500', I: FiTool },
        ].map((s) => (
          <button key={s.k} onClick={() => setFilters({ ...filters, role: filters.role === s.k ? '' : s.k })}
            className={`card flex items-center gap-4 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-pop ${filters.role === s.k ? 'ring-2 ring-brand-400' : ''}`}>
            <div className={`grid h-11 w-11 place-items-center rounded-xl ${s.tone} text-white`}><s.I /></div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">{s.l}</p>
              <p className="font-display text-xl font-extrabold text-ink-900">{counts[s.k]}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="card flex flex-col gap-3 p-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Search by name or email…" className="input pl-10" />
        </div>
        <select value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })} className="select md:w-52">
          {isAdmin && <option value="">All roles</option>}
          {(isAdmin ? ['admin', 'owner', 'tenant', 'staff'] : ['tenant', 'staff']).map((r) => (
            <option key={r} value={r}>{ROLE_LABEL[r]}</option>
          ))}
        </select>
      </div>

      {loading && !data ? (
        <Loader card rows={6} />
      ) : users.length === 0 ? (
        <EmptyState icon={FiUsers} title="No users found" message="Try changing filters or add a new user."
          actionLabel={isAdmin ? 'Add User' : undefined} onAction={isAdmin ? openCreate : undefined} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {users.map((u) => {
            const I = ROLE_ICON[u.role] || FiUsers;
            return (
              <div key={u._id} className={`card-hover p-5 ${!u.isActive ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-sm font-extrabold text-white"
                    style={{ background: u.avatarColor || '#316bff' }}>
                    {u.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-extrabold text-ink-900">{u.name}</p>
                    <span className={`badge mt-1 ${ROLE_BADGE[u.role]}`}><I className="text-[10px]" /> {ROLE_LABEL[u.role]}</span>
                  </div>
                  {!u.isActive && <span className="badge bg-rose-100 text-rose-700">Inactive</span>}
                </div>

                <div className="mt-4 space-y-1.5 text-[12.5px] text-ink-600">
                  <p className="flex items-center gap-2 truncate"><FiMail className="shrink-0 text-ink-400" /> {u.email}</p>
                  {u.phone && <p className="flex items-center gap-2"><FiPhone className="shrink-0 text-ink-400" /> {u.phone}</p>}
                  {u.property?.name && (
                    <p className="flex items-center gap-2 truncate"><FiHome className="shrink-0 text-ink-400" /> {u.property.name} {u.unitNumber && `· ${u.unitNumber}`}</p>
                  )}
                  {u.role === 'staff' && <p className="flex items-center gap-2"><FiTool className="shrink-0 text-ink-400" /> {u.department}</p>}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3 text-[11px] text-ink-400">
                  <span>Joined {fmtDate(u.createdAt)}</span>
                  <span>{u.lastLogin ? `Active ${timeAgo(u.lastLogin)}` : 'Never logged in'}</span>
                </div>

                {isAdmin && String(u._id) !== String(me._id) && (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => openEdit(u)} className="btn-ghost btn-sm flex-1"><FiEdit2 /> Edit</button>
                    <button onClick={() => toggleActive(u)} className={`btn-sm btn flex-1 ${u.isActive ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                      <FiUserCheck /> {u.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => remove(u)} className="btn-sm btn bg-rose-50 text-rose-600 hover:bg-rose-100"><FiTrash2 /></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)}
        title={editing ? `Edit ${editing.name}` : 'Add New User'}
        subtitle={editing ? 'Update role, property assignment or access' : 'Create an account with a specific role'}>
        <form onSubmit={save} className="space-y-4" noValidate>
          <div>
            <label className="label">Full name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={`input ${errors.name ? 'input-error' : ''}`} />
            {errors.name && <p className="form-err">{errors.name}</p>}
          </div>

          {!editing && (
            <>
              <div>
                <label className="label">Email *</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={`input ${errors.email ? 'input-error' : ''}`} />
                {errors.email && <p className="form-err">{errors.email}</p>}
              </div>
              <div>
                <label className="label">Temporary password *</label>
                <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Minimum 6 characters" className={`input ${errors.password ? 'input-error' : ''}`} />
                {errors.password && <p className="form-err">{errors.password}</p>}
              </div>
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="select">
                {['tenant', 'owner', 'staff', 'admin'].map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
            </div>
          </div>

          {form.role === 'tenant' && (
            <div className="grid gap-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 sm:grid-cols-2">
              <div>
                <label className="label">Property</label>
                <select value={form.property} onChange={(e) => setForm({ ...form, property: e.target.value })} className="select">
                  <option value="">Unassigned</option>
                  {properties.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Unit number</label>
                <input value={form.unitNumber} onChange={(e) => setForm({ ...form, unitNumber: e.target.value })}
                  placeholder="A-1204" className="input" />
              </div>
            </div>
          )}

          {form.role === 'staff' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
              <label className="label">Department</label>
              <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="select">
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
          )}

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-ink-200 p-3.5">
            <input type="checkbox" checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="h-4 w-4 rounded accent-brand-600" />
            <span className="text-[13px] font-semibold text-ink-700">Account is active (can log in)</span>
          </label>

          <div className="flex gap-3 border-t border-ink-100 pt-4">
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Saving…</> : <><FiCheck /> {editing ? 'Update User' : 'Create User'}</>}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}