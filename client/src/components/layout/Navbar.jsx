import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiMenu, FiBell, FiRefreshCw, FiUser, FiLogOut, FiChevronDown, FiCheckCircle } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABEL, timeAgo } from '../../utils/role';
import dashboardService from '../../services/dashboardService';

const TITLES = {
  '/dashboard': { t: 'Dashboard', s: 'Real-time overview of your properties' },
  '/properties': { t: 'Properties', s: 'Manage your rental portfolio' },
  '/maintenance': { t: 'Maintenance', s: 'Track and resolve requests live' },
  '/amenities': { t: 'Amenities & Bookings', s: 'Conflict-free amenity scheduling' },
  '/users': { t: 'People', s: 'Tenants, owners and staff directory' },
};

export default function Navbar({ onMenu }) {
  const { user, role, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const meta = TITLES[pathname] || { t: 'RentMaster', s: '' };

  const [openMenu, setOpenMenu] = useState(false);
  const [openBell, setOpenBell] = useState(false);
  const [feed, setFeed] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(new Date());
  const wrapRef = useRef(null);

  const loadFeed = async (manual = false) => {
    if (manual) setSyncing(true);
    try {
      const res = await dashboardService.activity();
      setFeed(res.data || []);
      setLastSync(new Date());
    } catch {
      /* silent */
    } finally {
      if (manual) setTimeout(() => setSyncing(false), 500);
    }
  };

  useEffect(() => {
    loadFeed();
    const id = setInterval(loadFeed, 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const h = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpenMenu(false);
        setOpenBell(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/85 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button onClick={onMenu} className="btn-icon lg:hidden">
          <FiMenu className="text-xl" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-lg font-extrabold text-ink-900 sm:text-xl">{meta.t}</h1>
          <p className="hidden truncate text-xs text-ink-400 sm:block">{meta.s}</p>
        </div>

        <div ref={wrapRef} className="flex items-center gap-1.5 sm:gap-2">
          <div className="hidden items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 md:flex">
            <span className="live-dot" />
            <span className="text-[11px] font-bold text-emerald-700">
              LIVE · {lastSync.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          <button onClick={() => loadFeed(true)} className="btn-icon" title="Refresh now">
            <FiRefreshCw className={`text-lg ${syncing ? 'animate-spin text-brand-600' : ''}`} />
          </button>

          <div className="relative">
            <button onClick={() => { setOpenBell((v) => !v); setOpenMenu(false); }} className="btn-icon relative">
              <FiBell className="text-lg" />
              {feed.length > 0 && (
                <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                  {feed.length > 9 ? '9+' : feed.length}
                </span>
              )}
            </button>

            {openBell && (
              <div className="absolute right-0 mt-2 w-[330px] origin-top-right animate-scale-in overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-pop">
                <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
                  <p className="text-sm font-bold text-ink-900">Live Activity</p>
                  <span className="badge-brand">{feed.length}</span>
                </div>
                <div className="max-h-[340px] overflow-y-auto">
                  {feed.length === 0 && <p className="px-4 py-8 text-center text-sm text-ink-400">No activity yet</p>}
                  {feed.map((f) => (
                    <div key={`${f.type}-${f.id}`} className="flex gap-3 border-b border-ink-50 px-4 py-3 transition hover:bg-brand-50/40">
                      <div
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[11px] font-bold text-white"
                        style={{ background: f.color }}
                      >
                        {f.user.slice(0, 1)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-ink-800">{f.title}</p>
                        <p className="truncate text-[11px] text-ink-400">{f.subtitle}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="rounded-md bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold text-ink-600">{f.status}</span>
                          <span className="text-[10px] text-ink-400">{timeAgo(f.at)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => { setOpenMenu((v) => !v); setOpenBell(false); }}
              className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white py-1.5 pl-1.5 pr-2 transition hover:border-brand-300 hover:shadow-soft"
            >
              <span
                className="grid h-8 w-8 place-items-center rounded-lg text-xs font-bold text-white"
                style={{ background: user?.avatarColor || '#316bff' }}
              >
                {(user?.name || 'U').slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block max-w-[120px] truncate text-[13px] font-bold text-ink-800">{user?.name}</span>
                <span className="block text-[10px] font-semibold text-ink-400">{ROLE_LABEL[role]}</span>
              </span>
              <FiChevronDown className="text-ink-400" />
            </button>

            {openMenu && (
              <div className="absolute right-0 mt-2 w-64 origin-top-right animate-scale-in overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-pop">
                <div className="bg-brand-gradient px-4 py-4 text-white">
                  <p className="text-sm font-bold">{user?.name}</p>
                  <p className="truncate text-xs text-white/80">{user?.email}</p>
                  {user?.property?.name && (
                    <p className="mt-1 inline-flex rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-bold">
                      {user.property.name} {user?.unitNumber ? `· ${user.unitNumber}` : ''}
                    </p>
                  )}
                </div>
                <div className="p-2">
                  <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-ink-600">
                    <FiUser className="text-ink-400" /> {ROLE_LABEL[role]}
                  </div>
                  <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-ink-600">
                    <FiCheckCircle className="text-emerald-500" /> Account active
                  </div>
                  <button
                    onClick={() => { logout(); navigate('/login'); }}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-bold text-rose-600 transition hover:bg-rose-50"
                  >
                    <FiLogOut /> Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}