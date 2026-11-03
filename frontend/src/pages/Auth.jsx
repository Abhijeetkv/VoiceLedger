import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AudioWaveform, Mail, Lock, User, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const { login, signup, loginDemo } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!isLogin && !name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setSubmitting(true);
    try {
      if (isLogin) {
        await login(email, password);
        toast.success('Welcome back!');
      } else {
        await signup(email, password, name);
        toast.success('Account created successfully!');
      }
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Authentication failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail('');
    setPassword('');
    setDemoLoading(true);
    try {
      const res = await loginDemo();
      toast.success(`Logged in as ${res.user?.name || 'Demo User'}`);
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Demo login failed');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-violet-600 text-white shadow-sm mb-3">
            <AudioWaveform className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">VoiceLedger</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </p>
        </div>

        {/* Minimalist Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs">
          <div
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit(e);
            }}
            className="space-y-3.5"
          >
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    autoComplete="off"
                    data-lpignore="true"
                    className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-600 focus:bg-white focus:ring-2 focus:ring-violet-600/10 transition-all font-medium"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="off"
                  data-lpignore="true"
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-600 focus:bg-white focus:ring-2 focus:ring-violet-600/10 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  className={`w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-600 focus:bg-white focus:ring-2 focus:ring-violet-600/10 transition-all font-medium ${
                    showPassword ? '' : 'masked-field'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  tabIndex={-1}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || demoLoading}
              className="w-full mt-1 py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isLogin ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-2.5 text-xs text-slate-400 uppercase tracking-wider font-medium">or</span>
            <div className="border-t border-slate-200 w-full" />
          </div>

          {/* Clean 1-Click Demo Account Button */}
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={demoLoading || submitting}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/70 hover:bg-slate-100 text-slate-700 text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {demoLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
            ) : (
              <>
                <span>Demo Account</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </>
            )}
          </button>

          {/* Toggle between Sign In and Sign Up */}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors"
            >
              {isLogin ? (
                <>
                  Don't have an account? <span className="text-violet-600 font-semibold hover:underline">Sign up</span>
                </>
              ) : (
                <>
                  Already have an account? <span className="text-violet-600 font-semibold hover:underline">Sign in</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
