import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FiPlus, FiX, FiCalendar, FiClock, FiUsers, FiMapPin, FiRefreshCw, FiCheck,
  FiLogIn, FiLogOut, FiSlash, FiEdit2, FiTrash2, FiSearch, FiAlertTriangle, FiZap,
} from 'react-icons/fi';
import usePoll from '../../hooks/usePoll';
import amenityService from '../../services/amenityService';
import propertyService from '../../services/propertyService';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { can, AMENITY_CATEGORIES, STATUS_STYLE, fmtDate, fmtTime, todayStr, money } from '../../utils/role';

const EMPTY_AMENITY = {
  name: '', property: '', category: 'Other', description: '', location: '',
  capacity: 1, openTime: '06:00', closeTime: '22:00', slotDurationMins: 60,
  maxHoursPerBooking: 3, bookingFee: 0, availabilityStatus: 'Available', imageUrl: '', rules: [],
};

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

export default function AmenitiesPage() {
  const { user, role } = useAuth();
  const manage = can.manageAmenities(role);

  const [tab, setTab] = useState('amenities');
  const [search, setSearch] = useState('');
  const [properties, setProperties] = useState([]);

  /* amenity form */
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_AMENITY);
  const [ruleInput, setRuleInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  /* booking flow */
  const [booking, setBooking] = useState(null);          // amenity being booked
  const [date, setDate] = useState(todayStr());
  const [slots, setSlots] = useState([]);
  const [slotLoading, setSlotLoading] = useState(false);
  const [picked, setPicked] = useState(null);
  const [guests, setGuests] = useState(1);
  const [purpose, setPurpose] = useState('');
  const [bookingBusy, setBookingBusy] = useState(false);    // ✅ SAHI

  const amenitiesPoll = usePoll(() => amenityService.list({ search }), { interval: 8000, deps: [search] });
  const bookingsPoll = usePoll(() => amenityService.bookings({}), { interval: 6000 });

  const amenities = amenitiesPoll.data?.data || [];
  const bookings = bookingsPoll.data?.data || [];
  const bStats = bookingsPoll.data?.stats || {};

  useEffect(() => {
    (async () => {
      try { const p = await propertyService.list(); setProperties(p.data || []); }
      catch { setProperties([]); }
    })();
  }, []);

  /* ---------- slots ---------- */
  const loadSlots = async (amenityId, d) => {
    setSlotLoading(true);
    setPicked(null);
    try {
      const res = await amenityService.slots(amenityId, d);
      setSlots(res.data?.slots || []);
    } catch (err) { toast.error(err.message); setSlots([]); }
    finally { setSlotLoading(false); }
  };

  const openBooking = (a) => {
    setBooking(a);
    setDate(todayStr());
    setGuests(1);
    setPurpose('');
    loadSlots(a._id, todayStr());
  };

  useEffect(() => {
    if (booking) loadSlots(booking._id, date);
    // eslint-disable-next-line
  }, [date]);

  /* auto refresh open slot grid every 8s (live conflict view) */
  useEffect(() => {
    if (!booking) return;
    const id = setInterval(() => loadSlots(booking._id, date), 8000);
    return () => clearInterval(id);
    // eslint-disable-next-line
  }, [booking, date]);

  const confirmBooking = async () => {
    if (!picked) return toast.error('Please select a time slot');
    setBookingBusy(true);
    try {
      const res = await amenityService.book({
        amenity: booking._id, bookingDate: date,
        startTime: picked.start, endTime: picked.end,
        guests: Number(guests), purpose,
      });
      toast.success(res.message);
      setBooking(null);
      bookingsPoll.refresh();
      amenitiesPoll.refresh();
      setTab('bookings');
    } catch (err) {
      toast.error(err.message);
      loadSlots(booking._id, date);
    } finally { setBookingBusy(false); }
  };

  /* ---------- booking actions ---------- */
  const act = async (fn, id, ok) => {
    try {
      const res = await fn(id);
      toast.success(res.message || ok);
      bookingsPoll.refresh();
    } catch (err) { toast.error(err.message); }
  };

  /* ---------- amenity CRUD ---------- */
  const openCreate = () => { setEditing(null); setForm(EMPTY_AMENITY); setErrors({}); setFormOpen(true); };
  const openEdit = (a) => {
    setEditing(a);
    setForm({
      name: a.name, property: a.property?._id || a.property, category: a.category,
      description: a.description || '', location: a.location || '', capacity: a.capacity,
      openTime: a.openTime, closeTime: a.closeTime, slotDurationMins: a.slotDurationMins,
      maxHoursPerBooking: a.maxHoursPerBooking, bookingFee: a.bookingFee,
      availabilityStatus: a.availabilityStatus, imageUrl: a.imageUrl || '', rules: a.rules || [],
    });
    setErrors({}); setFormOpen(true);
  };

  const saveAmenity = async (e) => {
    e.preventDefault();
    const er = {};
    if (!form.name.trim()) er.name = 'Amenity name is required';
    if (!form.property) er.property = 'Select a property';
    if (form.closeTime <= form.openTime) er.closeTime = 'Close time must be after open time';
    if (Number(form.capacity) < 1) er.capacity = 'Capacity must be at least 1';
    setErrors(er);
    if (Object.keys(er).length) return toast.error('Please fix the highlighted fields');

    setSaving(true);
    try {
      const payload = {
        ...form, capacity: Number(form.capacity),
        slotDurationMins: Number(form.slotDurationMins),
        maxHoursPerBooking: Number(form.maxHoursPerBooking),
        bookingFee: Number(form.bookingFee),
      };
      if (!payload.imageUrl) delete payload.imageUrl;
      const res = editing
        ? await amenityService.update(editing._id, payload)
        : await amenityService.create(payload);
      toast.success(res.message);
      setFormOpen(false);
      amenitiesPoll.refresh();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const removeAmenity = async (a) => {
    if (!window.confirm(`Delete amenity "${a.name}"?`)) return;
    try {
      const res = await amenityService.remove(a._id);
      toast.success(res.message);
      amenitiesPoll.refresh();
    } catch (err) { toast.error(err.message); }
  };

  const availableCount = useMemo(() => amenities.filter((a) => a.availabilityStatus === 'Available').length, [amenities]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-extrabold text-ink-900">Amenities &amp; Bookings</h2>
            <span className="badge bg-emerald-50 text-emerald-700"><span className="live-dot" /> LIVE</span>
          </div>
          <p className="muted mt-0.5">
            {amenities.length} amenities · {availableCount} available · {bStats.booked || 0} upcoming bookings ·{' '}
            <span className="font-bold text-emerald-600">0 conflicts</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { amenitiesPoll.refresh(); bookingsPoll.refresh(); }} className="btn-ghost">
            <FiRefreshCw className={amenitiesPoll.syncing ? 'animate-spin text-brand-600' : ''} /> Refresh
          </button>
          {manage && <button onClick={openCreate} className="btn-primary"><FiPlus /> Add Amenity</button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 rounded-2xl border border-ink-100 bg-white p-1.5 shadow-card sm:w-fit">
        {[['amenities', 'Amenities', FiCalendar], ['bookings', `My / All Bookings (${bookings.length})`, FiClock]].map(([k, l, I]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold transition ${
              tab === k ? 'bg-brand-600 text-white shadow-pop' : 'text-ink-500 hover:bg-ink-50'}`}>
            <I /> {l}
          </button>
        ))}
      </div>

      {tab === 'amenities' && (
        <>
          <div className="card p-4">
            <div className="relative">
              <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search amenities…" className="input pl-10" />
            </div>
          </div>

          {amenitiesPoll.loading && !amenitiesPoll.data ? (
            <Loader card rows={6} />
          ) : amenities.length === 0 ? (
            <EmptyState icon={FiCalendar} title="No amenities found"
              message={manage ? 'Add shared amenities like gym, pool or party hall to enable bookings.' : 'No amenities available for your property yet.'}
              actionLabel={manage ? 'Add Amenity' : undefined} onAction={manage ? openCreate : undefined} />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {amenities.map((a) => {
                const avail = a.availabilityStatus === 'Available';
                return (
                  <div key={a._id} className="card-hover group overflow-hidden">
                    <div className="relative h-40 overflow-hidden bg-ink-100">
                      <img src={a.imageUrl} alt={a.name} loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=1200&q=70'; }} />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink-950/75 to-transparent" />
                      <span className={`badge absolute left-3 top-3 ${avail ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {a.availabilityStatus}
                      </span>
                      {a.todayBookings > 0 && (
                        <span className="badge absolute right-3 top-3 bg-white/90 text-ink-700">
                          {a.todayBookings} today
                        </span>
                      )}
                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="truncate font-display text-base font-extrabold text-white">{a.name}</h3>
                        <p className="truncate text-[11px] text-white/70">{a.category} · {a.property?.name}</p>
                      </div>
                    </div>

                    <div className="p-5">
                      {a.description && <p className="line-clamp-2 text-[12.5px] leading-snug text-ink-500">{a.description}</p>}

                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        {[
                          [FiClock, `${a.openTime}–${a.closeTime}`],
                          [FiUsers, `Cap ${a.capacity}`],
                          [FiZap, `${a.maxHoursPerBooking}h max`],
                        ].map(([I, v], i) => (
                          <div key={i} className="rounded-xl bg-ink-50 py-2">
                            <I className="mx-auto text-brand-600" />
                            <p className="mt-1 text-[10.5px] font-bold text-ink-700">{v}</p>
                          </div>
                        ))}
                      </div>

                      {a.location && (
                        <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-ink-400">
                          <FiMapPin /> {a.location}
                        </p>
                      )}
                      {a.bookingFee > 0 && (
                        <p className="mt-1 text-[12px] font-bold text-brand-700">Fee: {money(a.bookingFee)}</p>
                      )}

                      <div className="mt-4 flex gap-2">
                        <button onClick={() => openBooking(a)} disabled={!avail}
                          className="btn-primary btn-sm flex-1 disabled:bg-ink-300">
                          <FiCalendar /> {avail ? 'Book Slot' : 'Unavailable'}
                        </button>
                        {manage && (
                          <>
                            <button onClick={() => openEdit(a)} className="btn-soft btn-sm"><FiEdit2 /></button>
                            <button onClick={() => removeAmenity(a)} className="btn btn-sm bg-rose-50 text-rose-600 hover:bg-rose-100"><FiTrash2 /></button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'bookings' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { l: 'Upcoming', v: bStats.booked || 0, tone: 'bg-sky-500', I: FiCalendar },
              { l: 'Checked In', v: bStats.checkedIn || 0, tone: 'bg-emerald-500', I: FiLogIn },
              { l: 'Completed', v: bStats.completed || 0, tone: 'bg-brand-500', I: FiCheck },
              { l: 'Cancelled', v: bStats.cancelled || 0, tone: 'bg-ink-400', I: FiSlash },
            ].map((s) => (
              <div key={s.l} className="card flex items-center gap-4 p-4">
                <div className={`grid h-11 w-11 place-items-center rounded-xl ${s.tone} text-white`}><s.I /></div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">{s.l}</p>
                  <p className="font-display text-xl font-extrabold text-ink-900">{s.v}</p>
                </div>
              </div>
            ))}
          </div>

          {bookingsPoll.loading && !bookingsPoll.data ? (
            <Loader card rows={3} />
          ) : bookings.length === 0 ? (
            <EmptyState icon={FiCalendar} title="No bookings yet"
              message="Book an amenity and it will appear here with live check-in / check-out controls."
              actionLabel="Browse Amenities" onAction={() => setTab('amenities')} />
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => {
                const st = STATUS_STYLE[b.status] || STATUS_STYLE.Booked;
                const mine = String(b.user?._id) === String(user._id);
                const now = Date.now();
                const live = b.status === 'CheckedIn';
                const canCheckIn = b.status === 'Booked' && (mine || ['admin', 'owner'].includes(role)) && now >= new Date(b.checkIn) - 15 * 60000;
                return (
                  <div key={b._id} className={`card flex flex-col gap-4 p-4 sm:flex-row sm:items-center ${live ? 'ring-2 ring-emerald-300' : ''}`}>
                    <img src={b.amenity?.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-ink-100" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[14px] font-extrabold text-ink-900">{b.amenity?.name}</p>
                        <span className={st.cls}>{b.status === 'CheckedIn' ? 'Checked In' : b.status}</span>
                        {live && <span className="badge bg-emerald-100 text-emerald-700"><span className="live-dot" /> IN USE</span>}
                      </div>
                      <p className="mt-0.5 text-[11.5px] text-ink-400">
                        {b.bookingId} · {b.property?.name} · {b.user?.name} {b.user?.unitNumber ? `(${b.user.unitNumber})` : ''}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
                        <span className="flex items-center gap-1.5 font-semibold text-brand-700">
                          <FiCalendar /> {fmtDate(b.checkIn)}
                        </span>
                        <span className="flex items-center gap-1.5 font-semibold text-ink-700">
                          <FiLogIn className="text-emerald-600" /> {fmtTime(b.checkIn)}
                        </span>
                        <span className="flex items-center gap-1.5 font-semibold text-ink-700">
                          <FiLogOut className="text-rose-500" /> {fmtTime(b.checkOut)}
                        </span>
                        <span className="flex items-center gap-1.5 text-ink-500"><FiUsers /> {b.guests}</span>
                      </div>
                      {b.purpose && <p className="mt-1 text-[11.5px] italic text-ink-400">“{b.purpose}”</p>}
                      {b.actualCheckInAt && (
                        <p className="mt-1 text-[11px] text-emerald-600">
                          Actual check-in {fmtTime(b.actualCheckInAt)}
                          {b.actualCheckOutAt && ` · check-out ${fmtTime(b.actualCheckOutAt)}`}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {canCheckIn && (
                        <button onClick={() => act(amenityService.checkIn, b._id, 'Checked in')} className="btn-accent btn-sm">
                          <FiLogIn /> Check In
                        </button>
                      )}
                      {b.status === 'CheckedIn' && (mine || ['admin', 'owner'].includes(role)) && (
                        <button onClick={() => act(amenityService.checkOut, b._id, 'Checked out')} className="btn-dark btn-sm">
                          <FiLogOut /> Check Out
                        </button>
                      )}
                      {['Booked', 'CheckedIn'].includes(b.status) && (mine || ['admin', 'owner'].includes(role)) && (
                        <button onClick={() => act(amenityService.cancel, b._id, 'Cancelled')} className="btn btn-sm bg-rose-50 text-rose-600 hover:bg-rose-100">
                          <FiSlash /> Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ---------- Booking modal ---------- */}
      <Modal open={!!booking} onClose={() => setBooking(null)} wide
        title={`Book · ${booking?.name || ''}`}
        subtitle={`${booking?.openTime}–${booking?.closeTime} · capacity ${booking?.capacity} · max ${booking?.maxHoursPerBooking}h`}>
        {booking && (
          <div className="space-y-5">
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-3.5">
              <p className="flex items-center gap-2 text-[12.5px] font-bold text-brand-800">
                <FiZap /> Conflict-free booking
              </p>
              <p className="mt-1 text-[11.5px] leading-snug text-brand-700">
                Booked slots are blocked automatically and this grid refreshes every 8 seconds — double booking is impossible.
              </p>
            </div>

            <div>
              <label className="label">Select date</label>
              <input type="date" value={date} min={todayStr()}
                onChange={(e) => setDate(e.target.value)} className="input" />
            </div>

            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <label className="label !mb-0">Available time slots</label>
                <div className="flex gap-3 text-[10.5px] font-semibold">
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-emerald-500" /> Free</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-rose-400" /> Booked</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-ink-300" /> Past</span>
                </div>
              </div>

              {slotLoading ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {Array.from({ length: 12 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
                </div>
              ) : slots.length === 0 ? (
                <p className="rounded-xl bg-ink-50 p-6 text-center text-[13px] text-ink-400">
                  No slots configured for this amenity.
                </p>
              ) : (
                <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
                  {slots.map((s) => {
                    const sel = picked?.start === s.start;
                    const disabled = !s.available;
                    return (
                      <button key={s.start} type="button" disabled={disabled}
                        onClick={() => setPicked(s)}
                        className={`rounded-xl border px-2 py-2.5 text-center transition ${
                          sel ? 'border-brand-600 bg-brand-600 text-white shadow-pop'
                          : s.isPast ? 'cursor-not-allowed border-ink-100 bg-ink-50 text-ink-300'
                          : s.isBooked ? 'cursor-not-allowed border-rose-200 bg-rose-50 text-rose-400'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:-translate-y-0.5 hover:border-emerald-400'
                        }`}>
                        <p className="text-[12px] font-extrabold">{s.start}</p>
                        <p className="text-[9.5px] font-semibold opacity-80">
                          {s.isPast ? 'Past' : s.isBooked ? 'Booked' : `${s.seatsLeft} left`}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {picked && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-[12px] font-bold uppercase tracking-wide text-emerald-700">Selected slot</p>
                <p className="mt-1 text-[15px] font-extrabold text-emerald-900">
                  {fmtDate(date)} · {picked.start} → {picked.end}
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Number of guests</label>
                <input type="number" min="1" max={booking.capacity} value={guests}
                  onChange={(e) => setGuests(e.target.value)} className="input" />
                <p className="form-hint">Max {booking.capacity} allowed</p>
              </div>
              <div>
                <label className="label">Purpose (optional)</label>
                <input value={purpose} onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Birthday party" className="input" />
              </div>
            </div>

            {booking.rules?.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="flex items-center gap-2 text-[12.5px] font-bold text-amber-800">
                  <FiAlertTriangle /> Usage rules
                </p>
                <ul className="mt-2 space-y-1">
                  {booking.rules.map((r, i) => (
                    <li key={i} className="text-[12px] text-amber-900">• {r}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3 border-t border-ink-100 pt-4">
              <button onClick={() => setBooking(null)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={confirmBooking} disabled={bookingBusy || !picked} className="btn-primary flex-1">
                {bookingBusy ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Booking…</> : <><FiCheck /> Confirm Booking</>}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ---------- Amenity form modal ---------- */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} wide
        title={editing ? 'Edit Amenity' : 'Add Amenity'}
        subtitle="Define operating hours, capacity and slot duration">
        <form onSubmit={saveAmenity} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Amenity name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Rooftop Swimming Pool" className={`input ${errors.name ? 'input-error' : ''}`} />
              {errors.name && <p className="form-err">{errors.name}</p>}
            </div>
            <div>
              <label className="label">Property *</label>
              <select value={form.property} onChange={(e) => setForm({ ...form, property: e.target.value })}
                className={`select ${errors.property ? 'input-error' : ''}`}>
                <option value="">Select property</option>
                {properties.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
              {errors.property && <p className="form-err">{errors.property}</p>}
            </div>
            <div>
              <label className="label">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="select">
                {AMENITY_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Availability</label>
              <select value={form.availabilityStatus} onChange={(e) => setForm({ ...form, availabilityStatus: e.target.value })} className="select">
                {['Available', 'Unavailable', 'Under Maintenance'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="textarea !min-h-[70px]" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Location inside property</label>
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Terrace, Tower A" className="input" />
            </div>
          </div>

          <div className="rounded-2xl border border-ink-100 bg-ink-50/60 p-4">
            <p className="mb-3 flex items-center gap-2 text-[13px] font-bold text-ink-700"><FiClock className="text-brand-600" /> Timing &amp; capacity</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="label">Open time</label>
                <input type="time" value={form.openTime} onChange={(e) => setForm({ ...form, openTime: e.target.value })} className="input" />
              </div>
              <div>
                <label className="label">Close time</label>
                <input type="time" value={form.closeTime} onChange={(e) => setForm({ ...form, closeTime: e.target.value })}
                  className={`input ${errors.closeTime ? 'input-error' : ''}`} />
                {errors.closeTime && <p className="form-err">{errors.closeTime}</p>}
              </div>
              <div>
                <label className="label">Slot length (mins)</label>
                <select value={form.slotDurationMins} onChange={(e) => setForm({ ...form, slotDurationMins: e.target.value })} className="select">
                  {[30, 45, 60, 90, 120, 180].map((m) => <option key={m} value={m}>{m} mins</option>)}
                </select>
              </div>
              <div>
                <label className="label">Capacity per slot</label>
                <input type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  className={`input ${errors.capacity ? 'input-error' : ''}`} />
                {errors.capacity && <p className="form-err">{errors.capacity}</p>}
              </div>
              <div>
                <label className="label">Max hours / booking</label>
                <input type="number" min="1" max="12" value={form.maxHoursPerBooking}
                  onChange={(e) => setForm({ ...form, maxHoursPerBooking: e.target.value })} className="input" />
              </div>
              <div>
                <label className="label">Booking fee (₹)</label>
                <input type="number" min="0" value={form.bookingFee} onChange={(e) => setForm({ ...form, bookingFee: e.target.value })} className="input" />
              </div>
            </div>
          </div>

          <div>
            <label className="label">Image URL</label>
            <input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://…" className="input" />
          </div>

          <div>
            <label className="label">Usage rules</label>
            <div className="flex gap-2">
              <input value={ruleInput} onChange={(e) => setRuleInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (ruleInput.trim()) { setForm({ ...form, rules: [...form.rules, ruleInput.trim()] }); setRuleInput(''); } } }}
                placeholder="Type a rule and press Enter" className="input flex-1" />
              <button type="button" onClick={() => { if (ruleInput.trim()) { setForm({ ...form, rules: [...form.rules, ruleInput.trim()] }); setRuleInput(''); } }} className="btn-ghost"><FiPlus /></button>
            </div>
            {form.rules.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {form.rules.map((r, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-[12.5px] text-ink-700">
                    <span>• {r}</span>
                    <button type="button" onClick={() => setForm({ ...form, rules: form.rules.filter((_, x) => x !== i) })}
                      className="text-ink-400 hover:text-rose-600"><FiX /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 border-t border-ink-100 pt-4">
            <button type="button" onClick={() => setFormOpen(false)} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Saving…</> : <><FiCheck /> {editing ? 'Update' : 'Create'} Amenity</>}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}