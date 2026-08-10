import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function Layout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-ink-50">
      <Sidebar open={open} onClose={() => setOpen(false)} />

      <div className="lg:pl-[268px]">
        <Navbar onMenu={() => setOpen(true)} />
        <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
        <footer className="border-t border-ink-100 bg-white/60 px-6 py-5">
          <div className="mx-auto flex max-w-[1500px] flex-col items-center justify-between gap-2 text-xs text-ink-400 sm:flex-row">
            <p>
              © {new Date().getFullYear()} <span className="font-bold text-ink-600">RentMaster</span> · Real-Time
              Property, Maintenance &amp; Amenity Management
            </p>
            <p className="flex items-center gap-2">
              <span className="live-dot" /> MongoDB Atlas connected · SLA target 48h
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}