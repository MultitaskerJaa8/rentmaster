import { FiInbox } from 'react-icons/fi';

export default function EmptyState({
  icon: Icon = FiInbox,
  title = 'Nothing here yet',
  message = 'Once data is added it will appear right here.',
  actionLabel,
  onAction,
  compact = false,
}) {
  return (
    <div className={`card grid place-items-center text-center animate-fade-up ${compact ? 'p-8' : 'p-14'}`}>
      <div className="relative">
        <div className="absolute -inset-4 rounded-full bg-brand-100/60 blur-xl" />
        <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-3xl text-brand-500 ring-1 ring-brand-100">
          <Icon />
        </div>
      </div>
      <h3 className="mt-5 text-base font-bold text-ink-900">{title}</h3>
      <p className="muted mt-1.5 max-w-sm">{message}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn-primary mt-6">
          {actionLabel}
        </button>
      )}
    </div>
  );
}