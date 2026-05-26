'use client';

import React, { useState, useEffect } from 'react';
import { X, Key, Info, HelpCircle, Save, CheckCircle, Volume2, Cpu } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [aiProvider, setAiProvider] = useState('groq');
  const [ttsVoice, setTtsVoice] = useState('diana');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedProvider = localStorage.getItem('talkto_ai_provider') || 'groq';
      setAiProvider(savedProvider);

      const savedVoice = localStorage.getItem('talkto_tts_voice') || 'diana';
      setTtsVoice(savedVoice);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('talkto_ai_provider', aiProvider);
      localStorage.setItem('talkto_tts_voice', ttsVoice);
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
    if (typeof window !== 'undefined') {
      localStorage.setItem('talkto_ai_provider', 'groq');
      localStorage.setItem('talkto_tts_voice', 'diana');
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

          {/* Key Information Alert */}
          <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 space-y-2">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-violet-300 text-xs uppercase tracking-wider">Secure Configurations</p>
                <p className="text-gray-300 text-xs leading-relaxed mt-1">
                  API Keys are securely stored as environment variables on the backend/server config and are hidden from the user interface for security.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gray-950/60 border border-white/5 space-y-2">
            <div className="flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-200 text-xs">Offline / Demo mode</p>
                <p className="text-gray-400 text-xs leading-relaxed mt-1">
                  If API Keys are not configured in your environment, the application will automatically fall back to local client-side heuristics so you can still record and use the app offline!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 bg-gray-950/40 border-t border-white/10 flex items-center justify-between gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-all text-xs"
          >
            Reset Defaults
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
