'use client';

import React, { useState } from 'react';
import { Mic, Sparkles, CheckCircle2, StickyNote, BookOpen, Settings, ArrowRight, ArrowLeft, X, Shield } from 'lucide-react';

interface AppTourProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TourStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  badge: string;
  highlightText: string;
}

export default function AppTour({ isOpen, onClose }: AppTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps: TourStep[] = [
    {
      title: "Welcome to TalkTo",
      description: "Your premium offline-first AI speech assistant. TalkTo lets you record, transcribe, and structure spoken conversations seamlessly. Best of all, all data is stored securely in your browser's local database (IndexedDB) for complete privacy.",
      icon: <Sparkles className="w-10 h-10 text-violet-400" />,
      badge: "Getting Started",
      highlightText: "TalkTo is 100% secure, offline-first, and private by design."
    },
    {
      title: "Voice Recording & Audio Feed",
      description: "Tap the floating microphone button to capture speech in real-time. Don't have microphone permissions enabled or want to test? Upload audio files directly, or use our built-in Speech Simulator to try out pre-written meeting scripts.",
      icon: <Mic className="w-10 h-10 text-violet-400 animate-pulse" />,
      badge: "Real-time Capture",
      highlightText: "Press the microphone on the Home Feed to start your first recording."
    },
    {
      title: "Advanced AI Structuring",
      description: "Once your audio is recorded, our AI automatically translates, transcribes, and structures your speech. It creates a concise title, summarizes the conversation, highlights 3 key takeaways, and lists action items in seconds.",
      icon: <Sparkles className="w-10 h-10 text-indigo-400" />,
      badge: "Intelligent Summaries",
      highlightText: "AI processing transcribes, summarizes, and extracts key takeaways instantly."
    },
    {
      title: "Smart Task Board ('To Work On')",
      description: "Say goodbye to manual action lists! Action items extracted from your recordings are automatically synced to the 'To Work On' board. You can check them off, delete them, or write custom task notes directly.",
      icon: <CheckCircle2 className="w-10 h-10 text-emerald-400" />,
      badge: "Action Lists",
      highlightText: "View, update, and manage all your tasks under the 'To Work On' tab."
    },
    {
      title: "Persistent Working Notes",
      description: "Need to jot down thoughts, ideas, or quick lists manually? Use the Working Notes tab to write persistent notes. You can easily add, edit, or delete notes as you work through your day.",
      icon: <StickyNote className="w-10 h-10 text-amber-400" />,
      badge: "Scratchpad",
      highlightText: "Tap 'Notes' at the bottom to access your manual notepad."
    },
    {
      title: "Built-in User Manual",
      description: "We've built a comprehensive User Manual & FAQ section right into the application. If you have questions about speech-to-text, data storage, or troubleshooting, just check the 'Manual' tab to find answers instantly.",
      icon: <BookOpen className="w-10 h-10 text-violet-400" />,
      badge: "Help Center",
      highlightText: "Visit the 'Manual' tab at the bottom for instant self-help guides."
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('talkto_onboarding_completed', 'true');
    onClose();
  };

  const step = steps[currentStep];

  return (
    <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-between p-6 animate-fade-in select-none">
      
      {/* Top Header */}
      <div className="flex justify-between items-center shrink-0">
        <div className="flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-violet-400" />
          <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Interactive Tour</span>
        </div>
        <button
          onClick={handleComplete}
          className="p-1.5 rounded-xl hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
          aria-label="Skip Tour"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Card Content */}
      <div className="flex-1 flex flex-col items-center justify-center py-6 text-center space-y-6 max-w-sm mx-auto">
        
        {/* Animated Icon Circle */}
        <div className="relative flex items-center justify-center w-24 h-24 rounded-3xl bg-white/5 border border-white/10 shadow-inner animate-scale-up">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-violet-600/20 to-indigo-600/20 filter blur-sm" />
          {step.icon}
        </div>

        {/* Text Info */}
        <div className="space-y-3.5 animate-fade-in">
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-violet-500/10 border border-violet-500/20 text-violet-300">
            {step.badge}
          </span>
          <h2 className="text-xl font-extrabold text-white tracking-tight leading-snug">
            {step.title}
          </h2>
          <p className="text-xs text-gray-400 leading-relaxed font-sans px-2">
            {step.description}
          </p>
        </div>

        {/* Tip Box */}
        <div className="w-full p-3.5 rounded-2xl bg-white/5 border border-white/5 text-[11px] text-violet-300 leading-relaxed italic animate-scale-up">
          💡 {step.highlightText}
        </div>

      </div>

      {/* Footer Navigation */}
      <div className="border-t border-white/5 pt-5 shrink-0 flex flex-col gap-4">
        
        {/* Dot Indicators & Step Text */}
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] text-gray-500 font-mono">
            Step {currentStep + 1} of {steps.length}
          </span>
          
          <div className="flex gap-1.5">
            {steps.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStep ? 'w-4 bg-violet-500' : 'w-1.5 bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {currentStep > 0 ? (
            <button
              onClick={handleBack}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-xs font-bold text-gray-300 hover:text-white transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-xs font-bold text-gray-400 hover:text-white transition-all cursor-pointer text-center"
            >
              Skip
            </button>
          )}

          <button
            onClick={handleNext}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg shadow-violet-600/15 transition-all cursor-pointer"
          >
            <span>{currentStep === steps.length - 1 ? 'Get Started' : 'Next'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

    </div>
  );
}
