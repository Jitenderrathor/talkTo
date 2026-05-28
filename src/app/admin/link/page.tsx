'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Unlock, Eye, EyeOff, LogOut, ArrowLeft, CheckCircle, ShieldAlert } from 'lucide-react';

export default function AdminLinkPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Check initial admin session status
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const sessionAdmin = sessionStorage.getItem('talkto_admin_session') === 'true';
      setIsAdmin(sessionAdmin);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (passwordInput === 'admin@talkto') {
      setLoginSuccess(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('talkto_admin_session', 'true');
      }
      setTimeout(() => {
        router.push('/');
      }, 1000);
    } else {
      setLoginError('Invalid password. Access denied.');
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('talkto_admin_session');
    }
  };

  if (!isMounted) {
    // Show a loading placeholder during hydration to avoid flash
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center p-0 md:p-6 select-none">
        <div className="w-full h-[100dvh] md:max-w-md md:h-[880px] md:rounded-[45px] md:border-[12px] md:border-gray-800 bg-gray-950 md:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden relative flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center p-0 md:p-6 select-none">
      
      {/* Premium Mobile Phone Frame Mockup for Desktop, full-screen on mobile */}
      <div className="w-full h-[100dvh] md:max-w-md md:h-[880px] md:rounded-[45px] md:border-[12px] md:border-gray-800 bg-gray-950 md:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden relative flex flex-col justify-between">
        
        {/* Phone Notch/Dynamic Island for premium realism on Desktop */}
        <div className="hidden md:block absolute top-2 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-full z-50 flex items-center justify-between px-4">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
          <span className="w-4 h-1.5 rounded-full bg-gray-900" />
          <span className="w-1.5 h-1.5 rounded-full bg-gray-900" />
        </div>

        {/* Header Bar */}
        <header className="px-5 pt-8 pb-4 bg-gray-900/20 border-b border-white/5 flex items-center justify-between shrink-0">
          <button
            onClick={() => router.push('/')}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all flex items-center gap-1.5 text-xs font-semibold"
            aria-label="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Home</span>
          </button>
          
          <h1 className="text-sm font-bold uppercase tracking-widest bg-gradient-to-r from-violet-400 to-indigo-300 bg-clip-text text-transparent">
            Admin Portal
          </h1>

          {/* Symmetrical placeholder */}
          <div className="w-16" />
        </header>

        {/* Core Content */}
        <div className="flex-1 flex flex-col justify-center px-6 py-8 overflow-y-auto">
          {isAdmin ? (
            /* Logged in state view */
            <div className="space-y-6 text-center animate-scale-up">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                <Unlock className="w-6 h-6" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white">Authenticated as Admin</h2>
                <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
                  You have full administrative privileges. Settings and API overrides are unlocked.
                </p>
              </div>

              <div className="space-y-3 pt-4">
                <button
                  onClick={() => router.push('/')}
                  className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-all shadow-lg shadow-violet-600/20 flex items-center justify-center gap-2"
                >
                  Go to Home (Settings Unlocked)
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full py-3 rounded-xl border border-red-500/10 hover:border-red-500/20 bg-red-600/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 font-semibold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Log Out Administrator
                </button>
              </div>
            </div>
          ) : loginSuccess ? (
            /* Success redirect state */
            <div className="space-y-4 text-center animate-scale-up">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle className="w-6 h-6 animate-pulse" />
              </div>
              <h2 className="text-lg font-bold text-white">Access Granted</h2>
              <p className="text-xs text-gray-400">Redirecting to Dashboard...</p>
            </div>
          ) : (
            /* Login Form view */
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mx-auto">
                  <Lock className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-white">Administrator Login</h2>
                <p className="text-xs text-gray-400 max-w-[260px] mx-auto leading-relaxed">
                  Enter the password to unlock backend configurations, API overrides, and settings.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-400">Admin Password</label>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Enter administrator password"
                      required
                      className="w-full bg-gray-900 border border-white/10 rounded-xl pl-4 pr-10 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-gray-400 hover:text-white"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {loginError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2 animate-scale-up">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{loginError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-violet-600/20 flex items-center justify-center gap-2"
                >
                  <Unlock className="w-4 h-4" />
                  Unlock Admin Settings
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer info/copyright */}
        <footer className="py-4 text-center shrink-0 border-t border-white/5">
          <p className="text-[10px] text-gray-650">
            TalkTo Secure Admin Console
          </p>
        </footer>

      </div>
    </main>
  );
}
