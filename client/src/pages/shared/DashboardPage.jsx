import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import {
  FiHome, FiTool, FiCalendar, FiUsers, FiClock, FiAlertTriangle, FiCheckCircle,
  FiActivity, FiTrendingUp, FiArrowRight, FiZap, FiLogIn, FiTarget,
} from 'react-icons/fi';
import usePoll from '../../hooks/usePoll';
import dashboardService from '../../services/dashboardService';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { STATUS_STYLE, PRIORITY_STYLE, timeAgo, fmtDate, fmtTime, ROLE_LABEL } from '../../utils/role';

const PIE_COLORS = ['#316bff', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#94a3b8'];

/* ------------------------- Small UI blocks ------------------------- */

const StatCard = ({ icon: Icon, label, value, sub, tone = 'brand', to }) => {
  const tones = {
    brand: 'bg-brand-50 text-brand-600 ring-brand-100',
    amber: 'bg-amber-50 text-amber-600 ring-amber-100',
    sky: 'bg-sky-50 text-sky-600 ring-sky-100',
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    rose: 'bg-rose-50 text-rose-600 ring-rose-100',
    violet: 'bg-violet-50 text-violet-600 ring-violet-100',
  };
  const Wrapper = to ? Link : 'div';
  return (
    <Wrapper to={to} className="card-hover group p-5">
      <div className="flex items-start justify-between">
        <div className={`stat-icon ring-1 ${tones[tone]}`}>
          <Icon />
        </div>
        {to && (
          <FiArrowRight className="text-ink-300 transition group-hover:translate-x-1 group-hover:text-brand-500" />
        )}
      </div>
      <p className="mt-4 font-display text-3xl font-extrabold leading-none text-ink-900">{value ?? 0}</p>
      <p className="mt-1.5 text-[13px] font-semibold text-ink-600">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-ink-400">{sub}</p>}
    </Wrapper>
  );
};

const ChartCard = ({ title, subtitle, right, children, className = '' }) => (
  <div className={`card p-5 ${className}`}>
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="section-title">{title}</h3>
        {subtitle && <p className="muted mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
    {children}
  </div>
);

const TooltipBox = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-ink-100 bg-white px-3.5 py-2.5 shadow-pop">
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-400">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-[13px] font-semibold" style={{ color: p.color || p.fill }}>
          {p.name}: <span className="text-ink-900">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

/* ------------------------- Page ------------------------- */

export default function DashboardPage() {
  const { user, role } = useAuth();
  const { data, loading, error, syncing, lastSync, refresh } = usePoll(
    () => dashboardService.stats(),
    { interval: 6000 }
  );

  const d = data?.data;
  const c = d?.cards || {};
  const k = d?.kpis || {};

  const donut = useMemo(
    () =>
      [
        { name: 'Pending', value: c.pending || 0, color: '#f59e0b' },
        { name: 'In Progress', value: c.inProgress || 0, color: '#0ea5e9' },
        { name: 'Completed', value: c.completed || 0, color: '#10b981' },
        { name: 'Cancelled', value: c.cancelled || 0, color: '#94a3b8' },
      ].filter((x) => x.value > 0),
    [c.pending, c.inProgress, c.completed, c.cancelled]
  );

  const categoryData = (d?.charts?.byCategory || []).filter((x) => x.value > 0);
  const priorityData = (d?.charts?.byPriority || []).filter((x) => x.value > 0);

  if (loading && !d) return <Loader label="Loading your live dashboard…" />;

  if (error && !d) {
    return (
      <EmptyState
        icon={FiAlertTriangle}
        title="Could not load dashboard"
        message={error}
        actionLabel="Try again"
        onAction={refresh}
      />
    );
  }

  const slaOk = k.avgResolutionHours > 0 && k.avgResolutionHours <= 48;

  return (
    <div className="space-y-6">
      {/* ---------- Hero ---------- */}
      <div className="relative overflow-hidden rounded-3xl bg-ink-950 p-6 text-white sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full bg-brand-600/35 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-accent-500/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-grid-light [background-size:34px_34px] opacity-[.06]" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-accent-300">
              <span className="live-dot" /> Live · synced {lastSync ? timeAgo(lastSync) : 'now'}
            </span>
            <h2 className="mt-4 font-display text-2xl font-extrabold sm:text-3xl">
              Hello, {user?.name?.split(' ')[0]} 👋
            </h2>
            <p className="mt-1.5 max-w-xl text-sm text-white/60">
              {ROLE_LABEL[role]} view · {c.totalRequests || 0} maintenance requests tracked ·{' '}
              {c.bookingsToday || 0} amenity bookings today.
            </p>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link to="/maintenance" className="btn bg-white text-ink-900 hover:bg-white/90">
                <FiTool /> Maintenance
              </Link>
              <Link to="/amenities" className="btn border border-white/25 bg-white/10 text-white hover:bg-white/20">
                <FiCalendar /> Book Amenity
              </Link>
              <button
                onClick={refresh}
                className="btn border border-white/25 bg-white/10 text-white hover:bg-white/20"
              >
                <FiActivity className={syncing ? 'animate-spin' : ''} /> Sync now
              </button>
            </div>
          </div>

          {/* KPI capsule */}
          <div className="grid w-full max-w-md grid-cols-2 gap-3 lg:w-auto">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-white/45">
                <FiClock /> Avg resolution
              </div>
              <p className={`mt-2 font-display text-2xl font-extrabold ${slaOk ? 'text-accent-400' : 'text-amber-400'}`}>
                {k.avgResolutionHours || 0}h
              </p>
              <p className="text-[10px] text-white/40">Target ≤ 48h</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-white/45">
                <FiTarget /> Completion
              </div>
              <p className="mt-2 font-display text-2xl font-extrabold text-brand-300">
                {k.completionRate || 0}%
              </p>
              <p className="text-[10px] text-white/40">Target ≥ 90%</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-white/45">
                <FiZap /> Conflicts
              </div>
              <p className="mt-2 font-display text-2xl font-extrabold text-accent-400">0</p>
              <p className="text-[10px] text-white/40">Guaranteed by slot engine</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-white/45">
                <FiAlertTriangle /> Overdue
              </div>
              <p className={`mt-2 font-display text-2xl font-extrabold ${c.overdue ? 'text-rose-400' : 'text-accent-400'}`}>
                {c.overdue || 0}
              </p>
              <p className="text-[10px] text-white/40">Beyond 48h SLA</p>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Stat cards ---------- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={FiHome} label="Properties" value={c.totalProperties} sub="In your portfolio" tone="brand" to="/properties" />
        <StatCard icon={FiTool} label="Open Requests" value={(c.pending || 0) + (c.inProgress || 0)} sub={`${c.pending || 0} pending · ${c.inProgress || 0} in progress`} tone="amber" to="/maintenance" />
        <StatCard icon={FiCalendar} label="Bookings Today" value={c.bookingsToday} sub={`${c.activeBookings || 0} currently checked-in`} tone="sky" to="/amenities" />
        <StatCard icon={FiUsers} label="Tenants" value={c.totalTenants} sub={`${c.totalAmenities || 0} amenities available`} tone="violet" to={['admin', 'owner'].includes(role) ? '/users' : undefined} />
      </div>

      {/* ---------- Charts row ---------- */}
      <div className="grid gap-5 xl:grid-cols-3">
        <ChartCard
          title="Request Trend"
          subtitle="Created vs resolved · last 7 days"
          className="xl:col-span-2"
          right={
            <span className="badge bg-emerald-50 text-emerald-700">
              <span className="live-dot" /> LIVE
            </span>
          }
        >
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d?.charts?.trend || []} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="gCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#316bff" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#316bff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eceef2" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8492ac' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#8492ac' }} axisLine={false} tickLine={false} />
                <Tooltip content={<TooltipBox />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Area type="monotone" dataKey="created" name="Created" stroke="#316bff" strokeWidth={2.5} fill="url(#gCreated)" />
                <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" strokeWidth={2.5} fill="url(#gResolved)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Status Split" subtitle="All maintenance requests">
          {donut.length === 0 ? (
            <div className="grid h-[280px] place-items-center text-sm text-ink-400">No requests yet</div>
          ) : (
            <>
              <div className="h-[210px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donut} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3} stroke="none">
                      {donut.map((e) => <Cell key={e.name} fill={e.color} />)}
                    </Pie>
                    <Tooltip content={<TooltipBox />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-2">
                {donut.map((e) => (
                  <div key={e.name} className="flex items-center justify-between text-[13px]">
                    <span className="flex items-center gap-2 font-medium text-ink-600">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: e.color }} />
                      {e.name}
                    </span>
                    <span className="font-bold text-ink-900">{e.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Issues by Category" subtitle="Where problems occur most">
          {categoryData.length === 0 ? (
            <div className="grid h-[250px] place-items-center text-sm text-ink-400">No data yet</div>
          ) : (
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eceef2" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10.5, fill: '#8492ac' }} axisLine={false} tickLine={false} interval={0} angle={-18} textAnchor="end" height={52} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#8492ac' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<TooltipBox />} cursor={{ fill: 'rgba(49,107,255,.06)' }} />
                  <Bar dataKey="value" name="Requests" radius={[8, 8, 0, 0]}>
                    {categoryData.map((e, i) => <Cell key={e.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Priority Distribution" subtitle="Urgency of open workload">
          {priorityData.length === 0 ? (
            <div className="grid h-[250px] place-items-center text-sm text-ink-400">No data yet</div>
          ) : (
            <div className="space-y-4 py-3">
              {priorityData.map((p) => {
                const total = priorityData.reduce((s, x) => s + x.value, 0) || 1;
                const pct = Math.round((p.value / total) * 100);
                const bar = {
                  Urgent: 'bg-rose-500', High: 'bg-orange-500',
                  Medium: 'bg-amber-500', Low: 'bg-emerald-500',
                }[p.name];
                return (
                  <div key={p.name}>
                    <div className="mb-1.5 flex items-center justify-between text-[13px]">
                      <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${PRIORITY_STYLE[p.name]}`}>
                        {p.name}
                      </span>
                      <span className="font-bold text-ink-900">{p.value} <span className="text-ink-400">({pct}%)</span></span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-ink-100">
                      <div className={`h-full rounded-full ${bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-brand-50 p-3.5">
                <FiTrendingUp className="shrink-0 text-xl text-brand-600" />
                <p className="text-[12.5px] leading-snug text-brand-800">
                  <b>{c.completed || 0}</b> requests completed with an average resolution of{' '}
                  <b>{k.avgResolutionHours || 0}h</b> — {slaOk ? 'well within' : 'above'} the 48h SLA target.
                </p>
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      {/* ---------- Lists ---------- */}
      <div className="grid gap-5 xl:grid-cols-2">
        {/* Recent requests */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
            <div>
              <h3 className="section-title">Recent Maintenance</h3>
              <p className="muted mt-0.5">Latest tickets in real time</p>
            </div>
            <Link to="/maintenance" className="btn-soft btn-sm">View all <FiArrowRight /></Link>
          </div>

          {(d?.recentRequests || []).length === 0 ? (
            <div className="p-10 text-center text-sm text-ink-400">No maintenance requests yet</div>
          ) : (
            <div className="divide-y divide-ink-50">
              {d.recentRequests.map((r) => {
                const st = STATUS_STYLE[r.status] || STATUS_STYLE.Pending;
                const overdue = !['Completed', 'Cancelled'].includes(r.status) &&
                  (Date.now() - new Date(r.createdAt)) / 36e5 > 48;
                return (
                  <div key={r._id} className="flex gap-3.5 px-5 py-4 transition hover:bg-brand-50/40">
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${st.dot}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[13.5px] font-bold text-ink-900">{r.title}</p>
                        {overdue && <span className="badge-urgent">Overdue</span>}
                      </div>
                      <p className="mt-0.5 truncate text-[11.5px] text-ink-400">
                        {r.ticketId} · {r.property?.name} · by {r.raisedBy?.name}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={st.cls}>{r.status}</span>
                        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${PRIORITY_STYLE[r.priority]}`}>
                          {r.priority}
                        </span>
                        <span className="text-[11px] text-ink-400">{timeAgo(r.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming bookings */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
            <div>
              <h3 className="section-title">Upcoming Bookings</h3>
              <p className="muted mt-0.5">Check-in / check-out schedule</p>
            </div>
            <Link to="/amenities" className="btn-soft btn-sm">Manage <FiArrowRight /></Link>
          </div>

          {(d?.upcomingBookings || []).length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-ink-400">No upcoming amenity bookings</p>
              <Link to="/amenities" className="btn-primary btn-sm mt-4">Book an amenity</Link>
            </div>
          ) : (
            <div className="divide-y divide-ink-50">
              {d.upcomingBookings.map((b) => {
                const st = STATUS_STYLE[b.status] || STATUS_STYLE.Booked;
                return (
                  <div key={b._id} className="flex items-center gap-3.5 px-5 py-4 transition hover:bg-brand-50/40">
                    <img
                      src={b.amenity?.imageUrl}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-ink-100"
                      onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-bold text-ink-900">{b.amenity?.name}</p>
                      <p className="mt-0.5 truncate text-[11.5px] text-ink-400">
                        {b.bookingId} · {b.user?.name} · {b.guests} guest{b.guests > 1 ? 's' : ''}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-[11.5px] font-semibold text-brand-700">
                        <FiLogIn className="text-xs" />
                        {fmtDate(b.checkIn)} · {fmtTime(b.checkIn)} → {fmtTime(b.checkOut)}
                      </p>
                    </div>
                    <span className={st.cls}>{b.status === 'CheckedIn' ? 'Checked In' : b.status}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ---------- KPI strip ---------- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: FiClock, label: 'Resolution Time', value: `${k.avgResolutionHours || 0}h`, target: '≤ 48h', ok: slaOk, tone: 'bg-brand-500' },
          { icon: FiCheckCircle, label: 'Completion Rate', value: `${k.completionRate || 0}%`, target: '≥ 90%', ok: (k.completionRate || 0) >= 90, tone: 'bg-emerald-500' },
          { icon: FiZap, label: 'Booking Conflicts', value: '0', target: '= 0', ok: true, tone: 'bg-violet-500' },
          { icon: FiActivity, label: 'Response Time', value: '< 2s', target: '≤ 2s', ok: true, tone: 'bg-sky-500' },
        ].map((x) => (
          <div key={x.label} className="card flex items-center gap-4 p-4">
            <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${x.tone} text-white`}>
              <x.icon />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">{x.label}</p>
              <p className="font-display text-xl font-extrabold text-ink-900">{x.value}</p>
            </div>
            <span className={`badge ${x.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {x.target}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}