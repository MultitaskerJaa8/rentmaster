import { NavLink } from 'react-router-dom';
import { FiGrid, FiHome, FiTool, FiCalendar, FiUsers, FiX, FiZap, FiLogOut } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABEL, ROLE_BADGE } from '../../utils/role';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: FiGrid, roles: ['admin', 'owner', 'tenant', 'staff'] },
  { to: '/properties', label: 'Properties', icon: FiHome, roles: ['admin', 'owner', 'tenant', 'staff'] },
  { to: '/maintenance', label: 'Maintenance', icon: FiTool, roles: ['admin', 'owner', 'tenant', 'staff'] },
  { to: '/amenities', label: 'Amenities', icon: FiCalendar, roles: ['admin', 'owner', 'tenant'] },
  { to: '/users', label: 'People', icon: FiUsers, roles: ['admin', 'owner'] },
];

export default function Sidebar({ open, onClose }) {
  const { user, role, logout } = useAuth();
  const links = NAV.filter((n) => n.roles.includes(role));

  const content = (
    <div className="flex h-full flex-col bg-ink-950 text-white">
      <div className="flex items-center justify-between px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient shadow-pop">
            <FiHome className="text-lg" />
          </div>
          <div className="leading-tight">
            <p className="font-display text-lg font-extrabold">RentMaster</p>
            <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-white/40">Property Suite</p>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden rounded-lg p-2 text-white/60 hover:bg-white/10">
          <FiX />
        </button>
      </div>

      <div className="mx-5 mb-5 flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5">
        <span className="live-dot" />
        <div className="leading-tight">
          <p className="text-[11px] font-bold text-emerald-400">REAL-TIME SYNC ACTIVE</p>
          <p className="text-[10px] text-white/40">Auto-refresh every 6 seconds</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 scrollbar-none">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[.2em] text-white/30">Menu</p>
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all ${
                isActive ? 'bg-brand-600 text-white shadow-pop' : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-accent-400" />
                )}
                <Icon className="text-lg shrink-0" />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mx-4 mb-4 overflow-hidden rounded-2xl bg-brand-gradient p-4">
        <FiZap className="text-xl" />
        <p className="mt-2 text-sm font-bold leading-tight">Zero booking conflicts</p>
        <p className="mt-1 text-[11px] leading-snug text-white/80">
          Smart slot engine blocks every overlap automatically.
        </p>
      </div>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold text-white"
            style={{ background: user?.avatarColor || '#316bff' }}
          >
            {(user?.name || 'U').slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-bold">{user?.name}</p>
            <span className={`badge mt-1 ${ROLE_BADGE[role] || 'bg-white/10 text-white/70'}`}>
              {ROLE_LABEL[role]}
            </span>
          </div>
          <button
            onClick={logout}
            title="Logout"
            className="rounded-lg p-2 text-white/50 transition hover:bg-rose-500/20 hover:text-rose-400"
          >
            <FiLogOut />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block fixed inset-y-0 left-0 z-40 w-[268px]">{content}</aside>

      <div className={`fixed inset-0 z-50 lg:hidden transition ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div
          onClick={onClose}
          className={`absolute inset-0 bg-ink-950/60 backdrop-blur-sm transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        />
        <div
          className={`absolute inset-y-0 left-0 w-[280px] shadow-2xl transition-transform duration-300 ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {content}
        </div>
      </div>
    </>
  );
}