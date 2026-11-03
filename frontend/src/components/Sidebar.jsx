import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Wallet,
  CheckSquare,
  Mic,
  Settings,
  X,
  AudioWaveform,
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/expenses', label: 'Expenses', icon: Wallet },
  { to: '/tasks', label: 'Tasks & Reminders', icon: CheckSquare },
  { to: '/assistant', label: 'AI Assistant', icon: Mic },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-60 bg-[#0f1225] border-r border-white/5 z-50 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center">
              <AudioWaveform className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">VoiceLedger</h1>
              <p className="text-[10px] text-gray-500 tracking-wider uppercase">Speak · Track · Remember</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-gray-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => {
            const isActive =
              to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

            return (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-violet-600/15 text-violet-400'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-violet-400' : ''}`} />
                {label}
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/5">
          <p className="text-xs text-gray-600 text-center">v1.0.0 · Built with AI</p>
        </div>
      </aside>
    </>
  );
}
