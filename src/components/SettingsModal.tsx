'use client';

import React, { useState, useEffect } from 'react';
import { X, Key, Info, HelpCircle, Save, CheckCircle, Volume2, Cpu, Lock, Unlock, LogOut, Eye, EyeOff } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [aiProvider, setAiProvider] = useState('groq');
  const [ttsVoice, setTtsVoice] = useState('diana');
  const [transcriptionLang, setTranscriptionLang] = useState('en-US');
  const [isSaved, setIsSaved] = useState(false);

  // EmailJS configuration states
  const [emailJsServiceId, setEmailJsServiceId] = useState('');
  const [emailJsTemplateId, setEmailJsTemplateId] = useState('');
  const [emailJsPublicKey, setEmailJsPublicKey] = useState('');

  // Admin and Password protection states
  const [isAdmin, setIsAdmin] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Secret API Keys configuration states
  const [groqApiKey, setGroqApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedProvider = localStorage.getItem('talkto_ai_provider') || 'groq';
      setAiProvider(savedProvider);

      const savedVoice = localStorage.getItem('talkto_tts_voice') || 'diana';
      setTtsVoice(savedVoice);

      const savedServiceId = localStorage.getItem('talkto_emailjs_service_id') || 'service_j3jgz6g';
      setEmailJsServiceId(savedServiceId);

      const savedTemplateId = localStorage.getItem('talkto_emailjs_template_id') || 'template_ooplf43';
      setEmailJsTemplateId(savedTemplateId);

      const savedPublicKey = localStorage.getItem('talkto_emailjs_public_key') || 'fU7F-EkzL8hF1qNR9';
      setEmailJsPublicKey(savedPublicKey);

      const savedGroqKey = localStorage.getItem('talkto_groq_api_key') || '';
      setGroqApiKey(savedGroqKey);

      const savedGeminiKey = localStorage.getItem('talkto_gemini_api_key') || '';
      setGeminiApiKey(savedGeminiKey);

      const savedLang = localStorage.getItem('talkto_transcription_lang') || 'en-US';
      setTranscriptionLang(savedLang);

      const sessionAdmin = sessionStorage.getItem('talkto_admin_session') === 'true';
      setIsAdmin(sessionAdmin);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (passwordInput === 'admin@talkto') {
      setIsAdmin(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('talkto_admin_session', 'true');
      }
      setPasswordInput('');
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

  const handleSave = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('talkto_ai_provider', aiProvider);
      localStorage.setItem('talkto_tts_voice', ttsVoice);
      localStorage.setItem('talkto_emailjs_service_id', emailJsServiceId);
      localStorage.setItem('talkto_emailjs_template_id', emailJsTemplateId);
      localStorage.setItem('talkto_emailjs_public_key', emailJsPublicKey);
      localStorage.setItem('talkto_groq_api_key', groqApiKey);
      localStorage.setItem('talkto_gemini_api_key', geminiApiKey);
      localStorage.setItem('talkto_transcription_lang', transcriptionLang);
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        onClose();
      }, 1000);
    }
  };

  const handleReset = () => {
    setAiProvider('groq');
    setTtsVoice('diana');
    setTranscriptionLang('en-US');
    setEmailJsServiceId('');
    setEmailJsTemplateId('');
    setEmailJsPublicKey('');
    setGroqApiKey('');
    setGeminiApiKey('');
    if (typeof window !== 'undefined') {
      localStorage.setItem('talkto_ai_provider', 'groq');
      localStorage.setItem('talkto_tts_voice', 'diana');
      localStorage.setItem('talkto_transcription_lang', 'en-US');
      localStorage.setItem('talkto_emailjs_service_id', '');
      localStorage.setItem('talkto_emailjs_template_id', '');
      localStorage.setItem('talkto_emailjs_public_key', '');
      localStorage.removeItem('talkto_groq_api_key');
      localStorage.removeItem('talkto_gemini_api_key');
    }
  };

  const voices = [
    { id: 'diana', name: 'Diana (Standard Female)' },
    { id: 'autumn', name: 'Autumn (Soft Female)' },
    { id: 'hannah', name: 'Hannah (Expressive Female)' },
    { id: 'austin', name: 'Austin (Warm Male)' },
    { id: 'daniel', name: 'Daniel (Clear Male)' },
    { id: 'troy', name: 'Troy (Deep Male)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl glass shadow-2xl border border-white/10 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <Key className="w-5 h-5 text-violet-400" />
            <h2 className="font-semibold text-lg text-white">
              {isAdmin ? 'AI Configuration (Admin)' : 'Admin Access Required'}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {!isAdmin ? (
          /* Admin Login Form */
          <form onSubmit={handleLogin} className="p-6 flex flex-col gap-4 text-sm text-gray-300">
            <div className="text-center space-y-1.5 py-2">
              <div className="w-12 h-12 rounded-full bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mx-auto">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white">Enter Administrator Password</h3>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                Access to system settings and secret API configurations is restricted.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-400">Admin Password</label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter admin password"
                  required
                  className="w-full bg-gray-900 border border-white/10 rounded-xl pl-4 pr-10 py-2.5 text-xs text-white placeholder-gray-650 focus:outline-none focus:border-violet-500/50 transition-colors"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2 animate-scale-up">
                <span>❌ {loginError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-all shadow-lg shadow-violet-600/20 flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              Unlock Settings
            </button>
          </form>
        ) : (
          /* Settings Panel Content */
          <>
            <div className="flex-1 p-5 overflow-y-auto space-y-5 text-sm text-gray-300">
              
              {/* AI Provider Toggle */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 font-medium text-gray-200">
                  <Cpu className="w-4 h-4 text-violet-400" />
                  <span>Note Structuring Provider</span>
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-gray-900/60 border border-white/5">
                  <button
                    type="button"
                    onClick={() => setAiProvider('groq')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                      aiProvider === 'groq'
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-600/10'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Groq (Llama 3.3)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiProvider('gemini')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                      aiProvider === 'gemini'
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-600/10'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Google Gemini
                  </button>
                </div>
              </div>

              {/* Text to Speech Voice Selection */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 font-medium text-gray-200">
                  <Volume2 className="w-4 h-4 text-violet-400" />
                  <span>Text to Speech Voice (Groq Orpheus)</span>
                </label>
                <select
                  value={ttsVoice}
                  onChange={(e) => setTtsVoice(e.target.value)}
                  className="w-full py-3 px-4 rounded-xl bg-gray-900/80 border border-white/10 text-white focus:outline-none focus:border-violet-500/50 transition-colors cursor-pointer"
                >
                  {voices.map((voice) => (
                    <option key={voice.id} value={voice.id} className="bg-gray-950">
                      {voice.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Speech to Text Language Selection */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 font-medium text-gray-200">
                  <Volume2 className="w-4 h-4 text-violet-400" />
                  <span>Preferred Recording Language</span>
                </label>
                <select
                  value={transcriptionLang}
                  onChange={(e) => setTranscriptionLang(e.target.value)}
                  className="w-full py-3 px-4 rounded-xl bg-gray-900/80 border border-white/10 text-white focus:outline-none focus:border-violet-500/50 transition-colors cursor-pointer"
                >
                  <option value="en-US" className="bg-gray-950">English (US)</option>
                  <option value="hi-IN" className="bg-gray-950">Hindi (हिंदी)</option>
                  <option value="auto" className="bg-gray-950">Auto-Detect (Groq Only)</option>
                </select>
              </div>

              {/* Secret API Keys (Admin Only) */}
              <div className="p-4 rounded-xl bg-violet-600/10 border border-violet-500/20 space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-white/5">
                  <Key className="w-4 h-4 text-violet-400" />
                  <p className="font-semibold text-xs text-gray-200 uppercase tracking-wider font-sans">Secret API Keys</p>
                </div>
                
                <div className="space-y-2 text-xs">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-gray-400">Groq API Key</label>
                    <input
                      type="password"
                      value={groqApiKey}
                      onChange={(e) => setGroqApiKey(e.target.value)}
                      placeholder="e.g. gsk_xxxxxxxxxxxxxxxxxxxx"
                      className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-gray-400">Gemini API Key</label>
                    <input
                      type="password"
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      placeholder="e.g. AIzaSyxxxxxxxxxxxxxxxxxxxx"
                      className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* EmailJS settings */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-white/5">
                  <span className="text-violet-400">📧</span>
                  <p className="font-semibold text-xs text-gray-200 uppercase tracking-wider font-sans">EmailJS Settings</p>
                </div>
                
                <div className="space-y-2 text-xs">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-gray-400">EmailJS Service ID</label>
                    <input
                      type="text"
                      value={emailJsServiceId}
                      onChange={(e) => setEmailJsServiceId(e.target.value)}
                      placeholder="e.g. service_xxxxxxx"
                      className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-gray-400">EmailJS Template ID</label>
                    <input
                      type="text"
                      value={emailJsTemplateId}
                      onChange={(e) => setEmailJsTemplateId(e.target.value)}
                      placeholder="e.g. template_xxxxxxx"
                      className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-gray-400">EmailJS Public Key</label>
                    <input
                      type="text"
                      value={emailJsPublicKey}
                      onChange={(e) => setEmailJsPublicKey(e.target.value)}
                      placeholder="e.g. xxxxxxx_xxxxxxxxxx"
                      className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* Info alerts */}
              <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 space-y-2 animate-fade-in">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-violet-300 text-xs uppercase tracking-wider font-mono">Live Configuration Mode</p>
                    <p className="text-gray-305 text-xs leading-relaxed mt-1">
                      You are logged in as Administrator. Any custom API keys set here will override backend environment defaults.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gray-950/60 border border-white/5 space-y-2">
                <div className="flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-250 text-xs">Offline / Demo mode</p>
                    <p className="text-gray-400 text-xs leading-relaxed mt-1">
                      If API Keys are not configured in your environment, the application will automatically fall back to local client-side heuristics so you can still record and use the app offline!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 bg-gray-950/40 border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-all text-xs"
                >
                  Reset Defaults
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-500/10 hover:border-red-500/20 bg-red-600/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all text-xs"
                >
                  <LogOut className="w-4 h-4" />
                  Lock Settings
                </button>
              </div>
              
              <button
                onClick={handleSave}
                disabled={isSaved}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-emerald-600 text-white font-medium shadow-lg shadow-violet-600/20 disabled:shadow-emerald-600/20 transition-all text-xs"
              >
                {isSaved ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save & Close
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
