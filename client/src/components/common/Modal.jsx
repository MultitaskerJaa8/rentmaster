import { useEffect } from 'react';
import { FiX } from 'react-icons/fi';

export default function Modal({ open, onClose, title, subtitle, children, wide = false }) {
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
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
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
          <button onClick={onClose} className="btn-icon">
            <FiX className="text-lg" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}