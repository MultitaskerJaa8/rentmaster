import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FiMail, FiLock, FiEye, FiEyeOff, FiHome, FiArrowRight,
  FiShield, FiClock, FiCalendar, FiZap,
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

const DEMO = [
  { role: 'Admin', email: 'admin@rentmaster.com', password: 'admin123', color: 'bg-violet-500' },
  { role: 'Owner', email: 'owner@rentmaster.com', password: 'owner123', color: 'bg-brand-500' },
  { role: 'Tenant', email: 'tenant@rentmaster.com', password: 'tenant123', color: 'bg-emerald-500' },
  { role: 'Staff', email: 'staff@rentmaster.com', password: 'staff123', color: 'bg-amber-500' },
];

const FEATURES = [
  { icon: FiClock, title: 'Live Maintenance Tracking', text: 'Pending → In Progress → Completed, updated in real time.' },
  { icon: FiCalendar, title: 'Zero Booking Conflicts', text: 'Smart slot engine prevents every overlap automatically.' },
  { icon: FiShield, title: 'Secure & Role Based', text: 'JWT auth with admin, owner, tenant and staff scopes.' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const validate = () => {
    const e = {};
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await login(form);
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const quick = async (d) => {
    setForm({ email: d.email, password: d.password });
    setLoading(true);
    try {
      await login({ email: d.email, password: d.password });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* ---------- Left brand panel ---------- */}
      <div className="relative hidden overflow-hidden bg-ink-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-16 h-[420px] w-[420px] rounded-full bg-accent-500/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-grid-light [background-size:38px_38px] opacity-[.07]" />

        <div className="relative flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-gradient shadow-pop">
            <FiHome className="text-xl" />
          </div>
          <div className="leading-tight">
            <p className="font-display text-xl font-extrabold">RentMaster</p>
            <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-white/40">
              Property Suite
            </p>
          </div>
        </div>

        <div className="relative animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-accent-300">
            <span className="live-dot" /> Real-time platform
          </span>
          <h1 className="mt-6 font-display text-[44px] font-extrabold leading-[1.1]">
            Rentals, repairs &amp;<br />
            amenities —{' '}
            <span className="bg-gradient-to-r from-brand-400 via-violet-400 to-accent-400 bg-clip-text text-transparent">
              one live hub.
            </span>
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/60">
            Track every maintenance ticket, book shared amenities without a single conflict, and give
            tenants and owners total transparency.
          </p>

          <div className="mt-9 space-y-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-gradient">
                  <f.icon className="text-lg" />
                </div>
                <div>
                  <p className="text-sm font-bold">{f.title}</p>
                  <p className="text-xs leading-relaxed text-white/50">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
          {[
            ['≤48h', 'Resolution SLA'],
            ['0', 'Booking Conflicts'],
            ['≤2s', 'Response Time'],
          ].map(([v, l]) => (
            <div key={l}>
              <p className="font-display text-2xl font-extrabold text-accent-400">{v}</p>
              <p className="text-[11px] text-white/40">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- Right form panel ---------- */}
      <div className="flex items-center justify-center bg-hero-gradient bg-ink-50 px-5 py-10">
        <div className="w-full max-w-[430px] animate-fade-up">
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-gradient text-white shadow-pop">
              <FiHome className="text-xl" />
            </div>
            <p className="font-display text-xl font-extrabold text-ink-900">RentMaster</p>
          </div>

          <div className="card p-7 sm:p-8">
            <h2 className="font-display text-2xl font-extrabold text-ink-900">Welcome back 👋</h2>
            <p className="muted mt-1.5">Sign in to your property management dashboard</p>

            <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
              <div>
                <label className="label">Email address</label>
                <div className="relative">
                  <FiMail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={onChange}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className={`input pl-10 ${errors.email ? 'input-error' : ''}`}
                  />
                </div>
                {errors.email && <p className="form-err">{errors.email}</p>}
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <FiLock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    type={show ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={onChange}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className={`input pl-10 pr-11 ${errors.password ? 'input-error' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                  >
                    {show ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {errors.password && <p className="form-err">{errors.password}</p>}
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full !py-3">
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in <FiArrowRight />
                  </>
                )}
              </button>
            </form>

            {/* Demo accounts */}
            <div className="mt-7">
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-ink-100" />
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-400">
                  <FiZap className="text-amber-500" /> Quick demo login
                </span>
                <span className="h-px flex-1 bg-ink-100" />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2.5">
                {DEMO.map((d) => (
                  <button
                    key={d.role}
                    type="button"
                    disabled={loading}
                    onClick={() => quick(d)}
                    className="group flex items-center gap-2.5 rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-soft disabled:opacity-60"
                  >
                    <span className={`h-8 w-8 shrink-0 rounded-lg ${d.color} grid place-items-center text-[11px] font-bold text-white`}>
                      {d.role[0]}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-bold text-ink-800">{d.role}</span>
                      <span className="block truncate text-[10px] text-ink-400">{d.password}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-7 text-center text-sm text-ink-500">
              New to RentMaster?{' '}
              <Link to="/register" className="font-bold text-brand-600 hover:text-brand-700 hover:underline">
                Create an account
              </Link>
            </p>
          </div>

          <p className="mt-5 text-center text-[11px] text-ink-400">
            🔒 Secured with JWT authentication · Data stored on MongoDB Atlas
          </p>
        </div>
      </div>
    </div>
  );
}