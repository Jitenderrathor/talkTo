'use client';

import React, { useState, useEffect } from 'react';
import { X, Key, Info, HelpCircle, Eye, EyeOff, Save, CheckCircle } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('talkto_gemini_api_key') || '';
      setApiKey(savedKey);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('talkto_gemini_api_key', apiKey.trim());
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        onClose();
      }, 1000);
    }
  };

  const handleClear = () => {
    setApiKey('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('talkto_gemini_api_key');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl glass shadow-2xl border border-white/10 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <Key className="w-5 h-5 text-violet-400" />
            <h2 className="font-semibold text-lg text-white">AI Configuration</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 overflow-y-auto space-y-5 text-sm text-gray-300">
          <div>
            <label className="block mb-2 font-medium text-gray-200">Gemini API Key</label>
            <div className="relative flex rounded-xl bg-gray-900/80 border border-white/10 overflow-hidden focus-within:border-violet-500/50 transition-colors">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter Gemini API Key..."
                className="flex-1 py-3 pl-4 pr-10 bg-transparent text-white placeholder-gray-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Key Information Alert */}
          <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 space-y-2">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-violet-300 text-xs uppercase tracking-wider">How to get a key?</p>
                <p className="text-gray-300 text-xs leading-relaxed mt-1">
                  You can get a free API Key from the{' '}
                  <a
                    href="https://aistudio.google.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-violet-400 hover:underline inline-flex items-center gap-0.5"
                  >
                    Google AI Studio
                  </a>.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gray-950/60 border border-white/5 space-y-2">
            <div className="flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-200 text-xs">Demo AI Mode</p>
                <p className="text-gray-400 text-xs leading-relaxed mt-1">
                  If you leave the API key blank, the application will use high-fidelity **Demo AI Mode**. It automatically uses local heuristics to split and format your text so you can test and use the app fully without any keys!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 bg-gray-950/40 border-t border-white/10 flex items-center justify-between gap-3">
          <button
            onClick={handleClear}
            disabled={!apiKey}
            className="px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-transparent transition-all text-xs"
          >
            Clear Key
          </button>
          
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
      </div>
    </div>
  );
}
