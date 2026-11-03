import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Wallet,
  CheckSquare,
  Mic,
  X,
  AudioWaveform,
  LogOut,
  LogIn,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/expenses', label: 'Expenses', icon: Wallet },
  { to: '/tasks', label: 'Tasks & Reminders', icon: CheckSquare },
  { to: '/assistant', label: 'AI Assistant', icon: Mic },
];

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/auth');
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200/90 z-50 flex flex-col transition-transform duration-300 lg:translate-x-0 shadow-xs ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/20">
              <AudioWaveform className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight leading-tight">VoiceLedger</h1>
              <p className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">Speak · Track · Remember</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-slate-600 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3.5 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => {
            const isActive =
              to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

            return (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-violet-50 text-violet-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-violet-600' : 'text-slate-400'}`} />
                <span>{label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-600" />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile & Auth Footer */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/60">
          {isAuthenticated ? (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate leading-tight">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {user?.email}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Log Out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <NavLink
              to="/auth"
              onClick={onClose}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-xs transition-all"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In / Demo</span>
            </NavLink>
          )}
        </div>
      </aside>
    </>
  );
}
