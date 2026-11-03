import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar.jsx';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0d1a]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-[#0a0d1a]/90 backdrop-blur-sm border-b border-white/5 px-4 py-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Main content */}
      <main className="lg:ml-60 min-h-screen">
        <div className="pt-16 lg:pt-0 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
