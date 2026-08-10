import { FiHome } from 'react-icons/fi';

export default function Loader({ full = false, label = 'Loading…', card = false, rows = 3 }) {
  if (card) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="card p-5">
            <div className="skeleton h-32 w-full rounded-xl" />
            <div className="skeleton mt-4 h-4 w-2/3" />
            <div className="skeleton mt-2 h-3 w-1/2" />
            <div className="mt-4 flex gap-2">
              <div className="skeleton h-8 w-20 rounded-lg" />
              <div className="skeleton h-8 w-20 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const spinner = (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-2xl bg-brand-gradient opacity-20 animate-ping" />
        <div className="absolute inset-0 grid place-items-center rounded-2xl bg-brand-gradient shadow-pop animate-float">
          <FiHome className="text-2xl text-white" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-brand-500 animate-bounce [animation-delay:-.3s]" />
        <span className="h-2 w-2 rounded-full bg-violet-500 animate-bounce [animation-delay:-.15s]" />
        <span className="h-2 w-2 rounded-full bg-accent-500 animate-bounce" />
      </div>
      <p className="text-sm font-semibold text-ink-500">{label}</p>
    </div>
  );

  if (full) {
    return (
      <div className="fixed inset-0 z-[60] grid place-items-center bg-hero-gradient bg-ink-50">
        {spinner}
      </div>
    );
  }

  return <div className="grid min-h-[280px] place-items-center py-10">{spinner}</div>;
}