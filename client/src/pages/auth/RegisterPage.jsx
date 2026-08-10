import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FiUser, FiMail, FiLock, FiPhone, FiHome, FiEye, FiEyeOff,
  FiArrowRight, FiArrowLeft, FiCheck, FiBriefcase, FiTool, FiShield,
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const ROLE_CARDS = [
  { value: 'tenant', label: 'Tenant', desc: 'Raise requests & book amenities', icon: FiHome, color: 'from-emerald-500 to-teal-500' },
  { value: 'owner', label: 'Property Owner', desc: 'Manage properties & approvals', icon: FiBriefcase, color: 'from-brand-500 to-violet-500' },
  { value: 'staff', label: 'Maintenance Staff', desc: 'Resolve assigned tickets', icon: FiTool, color: 'from-amber-500 to-orange-500' },
];

const DEPARTMENTS = ['General', 'Plumbing', 'Electrical', 'Carpentry', 'Appliance', 'Cleaning', 'Security'];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [properties, setProperties] = useState([]);
  const [form, setForm] = useState({
    role: 'tenant', name: '', email: '', phone: '',
    password: '', confirmPassword: '', property: '', unitNumber: '', department: 'General',
  });

  /* public-ish property list for tenant selection (uses seeded data) */
  useEffect(() => {
    if (form.role !== 'tenant') return;
    (async () => {
      try {
        const res = await api.get('/properties/public/list');
        setProperties(res.data?.data || []);
      } catch {
        setProperties([]);
      }
    })();
  }, [form.role]);

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const strength = useMemo(() => {
    const p = form.password;
    let s = 0;
    if (p.length >= 6) s++;
    if (p.length >= 10) s++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return Math.min(s, 4);
  }, [form.password]);

  const strengthMeta = [
    { label: 'Too weak', color: 'bg-rose-500', w: 'w-1/4' },
    { label: 'Weak', color: 'bg-orange-500', w: 'w-2/4' },
    { label: 'Good', color: 'bg-amber-500', w: 'w-3/4' },
    { label: 'Strong', color: 'bg-emerald-500', w: 'w-full' },
    { label: 'Very strong', color: 'bg-emerald-600', w: 'w-full' },
  ][strength];

  const validateStep2 = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    else if (form.name.trim().length < 2) e.name = 'Name is too short';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email';
    if (form.phone && !/^[0-9+\-\s()]{7,18}$/.test(form.phone)) e.phone = 'Enter a valid phone number';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'Minimum 6 characters required';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validateStep2()) return;
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
        role: form.role,
        ...(form.role === 'tenant' && form.property ? { property: form.property, unitNumber: form.unitNumber } : {}),
        ...(form.role === 'staff' ? { department: form.department } : {}),
      };
      await register(payload);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-hero-gradient bg-ink-50 px-4 py-10">
      <div className="mx-auto w-full max-w-[560px] animate-fade-up">
        {/* Brand */}
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient text-white shadow-pop">
            <FiHome className="text-2xl" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-extrabold text-ink-900">Create your account</h1>
          <p className="muted mt-1">Join RentMaster and manage rentals in real time</p>
        </div>

        {/* Stepper */}
        <div className="mb-6 flex items-center justify-center gap-3">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-3">
              <div
                className={`grid h-9 w-9 place-items-center rounded-xl text-sm font-bold transition ${
                  step >= s ? 'bg-brand-600 text-white shadow-pop' : 'bg-white text-ink-400 border border-ink-200'
                }`}
              >
                {step > s ? <FiCheck /> : s}
              </div>
              {s === 1 && <span className={`h-1 w-16 rounded-full ${step > 1 ? 'bg-brand-600' : 'bg-ink-200'}`} />}
            </div>
          ))}
        </div>

        <div className="card p-6 sm:p-8">
          {step === 1 && (
            <div className="animate-fade-in">
              <h2 className="section-title">Choose your role</h2>
              <p className="muted mt-1">This decides what you can access on the platform</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {ROLE_CARDS.map((r) => {
                  const active = form.role === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setForm({ ...form, role: r.value })}
                      className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all ${
                        active
                          ? 'border-brand-500 bg-brand-50/60 shadow-glow'
                          : 'border-ink-200 bg-white hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-soft'
                      }`}
                    >
                      <div className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${r.color} text-white shadow-soft`}>
                        <r.icon className="text-lg" />
                      </div>
                      <p className="mt-3 text-sm font-bold text-ink-900">{r.label}</p>
                      <p className="mt-0.5 text-[11px] leading-snug text-ink-500">{r.desc}</p>
                      {active && (
                        <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-white">
                          <FiCheck className="text-xs" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <button onClick={() => setStep(2)} className="btn-primary mt-6 w-full !py-3">
                Continue <FiArrowRight />
              </button>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={submit} className="animate-fade-in space-y-4" noValidate>
              <div className="flex items-center justify-between">
                <h2 className="section-title">Your details</h2>
                <span className="badge-brand">{ROLE_CARDS.find((r) => r.value === form.role)?.label}</span>
              </div>

              <div>
                <label className="label">Full name *</label>
                <div className="relative">
                  <FiUser className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input name="name" value={form.name} onChange={onChange} placeholder="e.g. Sneha Iyer"
                    className={`input pl-10 ${errors.name ? 'input-error' : ''}`} />
                </div>
                {errors.name && <p className="form-err">{errors.name}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Email *</label>
                  <div className="relative">
                    <FiMail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                    <input type="email" name="email" value={form.email} onChange={onChange} placeholder="you@example.com"
                      className={`input pl-10 ${errors.email ? 'input-error' : ''}`} />
                  </div>
                  {errors.email && <p className="form-err">{errors.email}</p>}
                </div>
                <div>
                  <label className="label">Phone</label>
                  <div className="relative">
                    <FiPhone className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                    <input name="phone" value={form.phone} onChange={onChange} placeholder="+91 98765 43210"
                      className={`input pl-10 ${errors.phone ? 'input-error' : ''}`} />
                  </div>
                  {errors.phone && <p className="form-err">{errors.phone}</p>}
                </div>
              </div>

              {form.role === 'tenant' && (
                <div className="grid gap-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 sm:grid-cols-2">
                  <div>
                    <label className="label">Your property</label>
                    <select name="property" value={form.property} onChange={onChange} className="select">
                      <option value="">Select later</option>
                      {properties.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name} — {p.city}
                        </option>
                      ))}
                    </select>
                    <p className="form-hint">Owner can assign this later too</p>
                  </div>
                  <div>
                    <label className="label">Unit / Flat no.</label>
                    <input name="unitNumber" value={form.unitNumber} onChange={onChange} placeholder="A-1204" className="input" />
                  </div>
                </div>
              )}

              {form.role === 'staff' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                  <label className="label">Department / Skill</label>
                  <select name="department" value={form.department} onChange={onChange} className="select">
                    {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="label">Password *</label>
                <div className="relative">
                  <FiLock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input type={show ? 'text' : 'password'} name="password" value={form.password} onChange={onChange}
                    placeholder="Minimum 6 characters"
                    className={`input pl-10 pr-11 ${errors.password ? 'input-error' : ''}`} />
                  <button type="button" onClick={() => setShow((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink-400 hover:bg-ink-100">
                    {show ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {form.password && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                      <div className={`h-full rounded-full transition-all ${strengthMeta.color} ${strengthMeta.w}`} />
                    </div>
                    <span className="text-[11px] font-bold text-ink-500">{strengthMeta.label}</span>
                  </div>
                )}
                {errors.password && <p className="form-err">{errors.password}</p>}
              </div>

              <div>
                <label className="label">Confirm password *</label>
                <div className="relative">
                  <FiLock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input type={show ? 'text' : 'password'} name="confirmPassword" value={form.confirmPassword}
                    onChange={onChange} placeholder="Re-enter password"
                    className={`input pl-10 ${errors.confirmPassword ? 'input-error' : ''}`} />
                </div>
                {errors.confirmPassword && <p className="form-err">{errors.confirmPassword}</p>}
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setStep(1)} className="btn-ghost !py-3">
                  <FiArrowLeft /> Back
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 !py-3">
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Creating account…
                    </>
                  ) : (
                    <>Create account <FiArrowRight /></>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-ink-500">
          Already registered?{' '}
          <Link to="/login" className="font-bold text-brand-600 hover:underline">Sign in instead</Link>
        </p>
      </div>
    </div>
  );
}