import { FiAlertTriangle, FiX } from 'react-icons/fi';

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Delete',
  loading = false,
  danger = true,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-5">
      <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-pop animate-scale-in">
        <div className="flex items-start gap-4">
          <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${danger ? 'bg-rose-50 text-rose-600' : 'bg-brand-50 text-brand-600'}`}>
            <FiAlertTriangle className="text-xl" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-base font-extrabold text-ink-900">{title}</h3>
            <p className="muted mt-1 leading-snug">{message}</p>
          </div>
          <button onClick={onClose} className="btn-icon"><FiX /></button>
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 ${danger ? 'btn-danger' : 'btn-primary'}`}
          >
            {loading ? (
              <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Please wait…</>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}