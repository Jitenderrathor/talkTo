'use client';

import React, { useState, useEffect } from 'react';
import { X, Key, Info, HelpCircle, Save, CheckCircle, Volume2, Cpu, Lock, Unlock, LogOut, Eye, EyeOff, Database, RefreshCw, Server, Check, AlertCircle } from 'lucide-react';
import { checkMongoDBStatus, syncAllToMongoDB } from '@/lib/db';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [aiProvider, setAiProvider] = useState('groq');
  const [ttsVoice, setTtsVoice] = useState('diana');
  const [transcriptionLang, setTranscriptionLang] = useState('hinglish');
  const [isSaved, setIsSaved] = useState(false);

  // MongoDB connection settings
  const [mongoUri, setMongoUri] = useState('');
  const [mongoStatus, setMongoStatus] = useState<{ loading: boolean; connected?: boolean; message?: string; stats?: any }>({ loading: false });
  const [syncStatus, setSyncStatus] = useState<{ loading: boolean; success?: boolean; message?: string }>({ loading: false });

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

      const savedMongo = localStorage.getItem('talkto_mongodb_uri') || '';
      setMongoUri(savedMongo);

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

      const savedLang = localStorage.getItem('talkto_transcription_lang') || 'hinglish';
      setTranscriptionLang(savedLang);

      const sessionAdmin = sessionStorage.getItem('talkto_admin_session') === 'true';
      setIsAdmin(sessionAdmin);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestMongo = async () => {
    setMongoStatus({ loading: true });
    if (typeof window !== 'undefined') {
      localStorage.setItem('talkto_mongodb_uri', mongoUri.trim());
    }
    const result = await checkMongoDBStatus();
    setMongoStatus({
      loading: false,
      connected: result.connected,
      message: result.connected ? 'Connected to MongoDB Server' : result.message,
      stats: result.stats
    });
  };

  const handleSyncToMongo = async () => {
    setSyncStatus({ loading: true });
    const result = await syncAllToMongoDB();
    if (result.success) {
      setSyncStatus({
        loading: false,
        success: true,
        message: `Synced ${result.synced?.conversations || 0} notes & ${result.synced?.tasks || 0} tasks to MongoDB!`
      });
      setTimeout(() => setSyncStatus({ loading: false }), 4000);
    } else {
      setSyncStatus({
        loading: false,
        success: false,
        message: result.error || 'Failed to sync with MongoDB'
      });
    }
  };

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
      localStorage.setItem('talkto_mongodb_uri', mongoUri.trim());
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
    setTranscriptionLang('hinglish');
    setMongoUri('');
    setEmailJsServiceId('');
    setEmailJsTemplateId('');
    setEmailJsPublicKey('');
    setGroqApiKey('');
    setGeminiApiKey('');
    if (typeof window !== 'undefined') {
      localStorage.setItem('talkto_ai_provider', 'groq');
      localStorage.setItem('talkto_tts_voice', 'diana');
      localStorage.setItem('talkto_transcription_lang', 'hinglish');
      localStorage.removeItem('talkto_mongodb_uri');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-gray-950 border border-white/10 shadow-2xl flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0 bg-gray-900/40">
          <div className="flex items-center gap-2.5">
            <Key className="w-5 h-5 text-violet-400" />
            <h2 className="font-bold text-base text-white">
              {isAdmin ? 'System & Database Configuration' : 'Admin Access Required'}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {!isAdmin ? (
          /* Admin Login Form */
          <form onSubmit={handleLogin} className="p-6 flex flex-col gap-4 text-sm text-gray-300">
            <div className="text-center space-y-2 py-2">
              <div className="w-12 h-12 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mx-auto">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white">Enter Administrator Password</h3>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                Access to MongoDB connection URI and system API configurations is protected.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-400">Admin Password</label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter admin password (admin@talkto)"
                  required
                  className="w-full bg-gray-900 border border-white/10 rounded-xl pl-4 pr-10 py-2.5 text-xs text-white placeholder-gray-650 focus:outline-none focus:border-violet-500/50 transition-colors"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-gray-400 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {loginError && (
                <p className="text-red-400 text-xs mt-1 font-medium">{loginError}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold text-xs text-white transition-all shadow-lg shadow-violet-600/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>Unlock Settings</span>
            </button>
          </form>
        ) : (
          /* Settings Panel Content */
          <>
            <div className="flex-1 p-6 overflow-y-auto space-y-6 text-xs text-gray-300">
              
              {/* MongoDB Database Server Connection */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white text-xs uppercase tracking-wider">MongoDB Server Connection</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">Server Cloud DB</span>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-gray-300">MongoDB Connection URI</label>
                  <input
                    type="text"
                    value={mongoUri}
                    onChange={(e) => setMongoUri(e.target.value)}
                    placeholder="mongodb+srv://<user>:<password>@cluster0.mongodb.net/talkto"
                    className="w-full bg-gray-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 font-mono"
                  />
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    Paste your MongoDB Atlas connection string (or Compass URI) to store conversations, tasks, and users in the cloud database.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleTestMongo}
                    disabled={mongoStatus.loading}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {mongoStatus.loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Server className="w-3.5 h-3.5" />}
                    <span>Test Connection</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSyncToMongo}
                    disabled={syncStatus.loading}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {syncStatus.loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span>Sync Local Data to MongoDB</span>
                  </button>
                </div>

                {mongoStatus.message && (
                  <div className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                    mongoStatus.connected 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                      : 'bg-red-500/10 border-red-500/30 text-red-300'
                  }`}>
                    {mongoStatus.connected ? <Check className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                    <span>{mongoStatus.message}</span>
                  </div>
                )}

                {syncStatus.message && (
                  <div className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                    syncStatus.success 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                      : 'bg-red-500/10 border-red-500/30 text-red-300'
                  }`}>
                    {syncStatus.success ? <Check className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                    <span>{syncStatus.message}</span>
                  </div>
                )}
              </div>

              {/* AI Provider Toggle */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 font-medium text-gray-200">
                  <Cpu className="w-4 h-4 text-violet-400" />
                  <span>Note Structuring Provider</span>
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-gray-900 border border-white/5">
                  <button
                    type="button"
                    onClick={() => setAiProvider('groq')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      aiProvider === 'groq'
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-600/10'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Groq AI (Fast)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiProvider('gemini')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
                  className="w-full py-2.5 px-3 rounded-xl bg-gray-900 border border-white/10 text-white focus:outline-none focus:border-violet-500/50 transition-colors cursor-pointer"
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
                  className="w-full py-2.5 px-3 rounded-xl bg-gray-900 border border-white/10 text-white focus:outline-none focus:border-violet-500/50 transition-colors cursor-pointer"
                >
                  <option value="hinglish" className="bg-gray-950">Hinglish (Hindi + English)</option>
                  <option value="en-US" className="bg-gray-950">English (US)</option>
                  <option value="hi-IN" className="bg-gray-950">Hindi (हिंदी)</option>
                  <option value="auto" className="bg-gray-950">Auto-Detect</option>
                </select>
              </div>

              {/* Secret API Keys (Admin Only) */}
              <div className="p-4 rounded-2xl bg-violet-600/10 border border-violet-500/20 space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-white/5">
                  <Key className="w-4 h-4 text-violet-400" />
                  <p className="font-semibold text-xs text-gray-200 uppercase tracking-wider font-sans">Secret AI API Keys</p>
                </div>
                
                <div className="space-y-2 text-xs">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-gray-400">Groq API Key</label>
                    <input
                      type="password"
                      value={groqApiKey}
                      onChange={(e) => setGroqApiKey(e.target.value)}
                      placeholder="e.g. gsk_xxxxxxxxxxxxxxxxxxxx"
                      className="w-full bg-gray-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500/50 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-gray-400">Gemini API Key</label>
                    <input
                      type="password"
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      placeholder="e.g. AIzaSyxxxxxxxxxxxxxxxxxxxx"
                      className="w-full bg-gray-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500/50 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* EmailJS settings */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
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
                      className="w-full bg-gray-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500/50 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-gray-400">EmailJS Template ID</label>
                    <input
                      type="text"
                      value={emailJsTemplateId}
                      onChange={(e) => setEmailJsTemplateId(e.target.value)}
                      placeholder="e.g. template_xxxxxxx"
                      className="w-full bg-gray-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500/50 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-gray-400">EmailJS Public Key</label>
                    <input
                      type="password"
                      value={emailJsPublicKey}
                      onChange={(e) => setEmailJsPublicKey(e.target.value)}
                      placeholder="e.g. public_xxxxxxx"
                      className="w-full bg-gray-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500/50 font-mono"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer Controls */}
            <div className="p-5 border-t border-white/5 bg-gray-900/40 flex items-center justify-between shrink-0">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Lock</span>
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all text-xs font-semibold cursor-pointer"
                >
                  Reset
                </button>
              </div>

              <div className="flex gap-2 items-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 font-semibold text-xs text-gray-300 hover:text-white transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold text-xs text-white transition-all shadow-md shadow-violet-600/25 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSaved ? <CheckCircle className="w-3.5 h-3.5 text-emerald-300" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{isSaved ? 'Saved!' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
