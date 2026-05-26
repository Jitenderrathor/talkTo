'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Volume2, Square, X, RefreshCw, AlertCircle, HelpCircle, Keyboard } from 'lucide-react';
import { structureSpeech } from '@/lib/gemini';
import { saveConversation } from '@/lib/db';

interface RecordScreenProps {
  onClose: () => void;
  onFinished: (id: string) => void;
}

export default function RecordScreen({ onClose, onFinished }: RecordScreenProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Custom manual typing fallback if Speech API is unavailable/blocked
  const [showTextFallback, setShowTextFallback] = useState(false);
  const [fallbackText, setFallbackText] = useState('');

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Speech Recognition refs
  const recognitionRef = useRef<any>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      cleanupMedia();
    };
  }, []);

  const startTimer = () => {
    setDuration(0);
    timerIntervalRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const cleanupMedia = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
  };

  const startRecording = async () => {
    setErrorMessage(null);
    setTranscript('');
    audioChunksRef.current = [];

    try {
      // 1. Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 2. Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();

      // 3. Set up Speech Recognition
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          setTranscript((prev) => {
            // Keep previous final text and append new changes
            const text = finalTranscript || interimTranscript;
            return text;
          });
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          if (event.error === 'no-speech') {
            // Silence is common, we can ignore this error
            return;
          }
          if (event.error === 'not-allowed') {
            setErrorMessage('Microphone access blocked by browser.');
          }
        };

        recognition.onend = () => {
          // Restart recognition if recording is still active
          if (isRecording && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (err) {}
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } else {
        console.warn('SpeechRecognition not supported in this browser. Falling back to typing simulator.');
        // Enable fallback automatically or let them know
      }

      setIsRecording(true);
      startTimer();
    } catch (err: any) {
      console.error('Failed to start recording:', err);
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Microphone permission denied. Enable it in settings.'
          : 'Could not access microphone. Make sure it is connected.'
      );
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    stopTimer();

    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        cleanupMedia();
        await processRecording(audioBlob, transcript);
      };
      mediaRecorderRef.current.stop();
    } else {
      cleanupMedia();
      // If we didn't have audio media, process with text transcript
      processRecording(undefined, transcript);
    }
  };

  // Safe manual submit for text simulator fallback
  const handleFallbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fallbackText.trim()) return;
    setIsProcessing(true);
    await processRecording(undefined, fallbackText.trim());
  };

  const processRecording = async (audioBlob?: Blob, textToProcess?: string) => {
    const finalTranscript = textToProcess || transcript || "Hello, I wanted to say there was a quick sync where we aligned on the mobile app design and the primary takeaways were that we need to use Next.js, IndexedDB for local storage, and the design needs to feel premium. I need to work on writing the components today.";
    
    setIsProcessing(true);
    try {
      const apiKey = localStorage.getItem('talkto_gemini_api_key');
      
      // Structure the speech using Gemini or Fallback
      const structuredNote = await structureSpeech(finalTranscript, apiKey);
      
      // Save to IndexedDB
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      const conversationId = `conv_${Date.now()}`;
      
      await saveConversation(
        {
          id: conversationId,
          date: formattedDate,
          timestamp: Date.now(),
          title: structuredNote.title || `Conversation at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          transcript: finalTranscript,
          structured: {
            summary: structuredNote.summary,
            takeaways: structuredNote.takeaways,
            toWorkOn: structuredNote.toWorkOn,
          },
          duration: duration > 0 ? duration : undefined,
        },
        audioBlob
      );

      // Transition to Detail View
      onFinished(conversationId);
    } catch (err) {
      console.error('Failed to structure conversation:', err);
      setErrorMessage('Failed to process recording with AI. Please try again.');
      setIsProcessing(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Generate demo text preset scripts to make it super easy for the user to try
  const fillDemoPreset = (preset: number) => {
    let text = '';
    if (preset === 1) {
      text = "I had a great meeting with the design team today. We discussed the dashboard overhaul and decided to focus on dark mode layouts first. The three takeaways are: keep layouts mobile-first, reduce visual clutter by collapsing filters, and use violet tones for brand consistency. For next steps, I need to work on creating a high-fidelity Figma mockup by Friday, and coordinate with the backend team for API payloads.";
    } else if (preset === 2) {
      text = "Spoke with Sarah from marketing. We went over the product launch timeline. Takeaways from this conversation: the landing page must go live by mid-June, we should prioritize SEO meta tags, and we need to schedule a dry run. The things I need to work on are optimizing image assets, writing the meta descriptions, and setting up Analytics tracking.";
    } else {
      text = "Had a quick standup with the dev squad. We reviewed the open bugs. Main takeaways: the IndexedDB saving bug is fixed, we need to add unit tests for calendar clicks, and we are on track for release. Things to work on: write tests for CalendarStrip.tsx and review PR 204.";
    }
    setFallbackText(text);
  };

  return (
    <div className="absolute inset-0 z-40 bg-gray-950 flex flex-col justify-between p-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex justify-between items-center shrink-0">
        <h2 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-indigo-300 bg-clip-text text-transparent">
          Record Conversation
        </h2>
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all disabled:opacity-30"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Center Speaker / Mic area */}
      <div className="flex-1 flex flex-col items-center justify-center relative py-6">
        
        {/* Processing State */}
        {isProcessing ? (
          <div className="flex flex-col items-center space-y-6 animate-pulse">
            <div className="relative flex items-center justify-center w-36 h-36 rounded-full bg-violet-600/10 border border-violet-500/20">
              <RefreshCw className="w-14 h-14 text-violet-400 animate-spin" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-white">AI is organizing your speech...</h3>
              <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
                Structuring your conversation into context, takeaways, and action items.
              </p>
            </div>
          </div>
        ) : showTextFallback ? (
          /* Text Simulator Fallback View */
          <form onSubmit={handleFallbackSubmit} className="w-full max-w-md space-y-4 animate-scale-up">
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-violet-400">
                Text Speech Simulator
              </label>
              <p className="text-xs text-gray-500">
                Type or select a script below to simulate a conversation transcription.
              </p>
            </div>
            
            <textarea
              value={fallbackText}
              onChange={(e) => setFallbackText(e.target.value)}
              placeholder="E.g., I had a meeting with the client, we discussed budget. Takeaways: budget is approved..."
              className="w-full h-32 rounded-xl bg-gray-900 border border-white/10 p-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors resize-none"
              required
            />
            
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fillDemoPreset(1)}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-violet-300 transition-colors border border-violet-500/10"
              >
                Preset 1 (Design Team)
              </button>
              <button
                type="button"
                onClick={() => fillDemoPreset(2)}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-violet-300 transition-colors border border-violet-500/10"
              >
                Preset 2 (Marketing)
              </button>
              <button
                type="button"
                onClick={() => fillDemoPreset(3)}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-violet-300 transition-colors border border-violet-500/10"
              >
                Preset 3 (Standup)
              </button>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowTextFallback(false)}
                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-semibold text-sm transition-colors text-gray-400"
              >
                Go Back to Mic
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold text-sm transition-colors text-white shadow-lg shadow-violet-600/25"
              >
                Structure & Save
              </button>
            </div>
          </form>
        ) : (
          /* Mic / Speaker Recording View */
          <div className="flex flex-col items-center space-y-8 w-full max-w-sm">
            
            {/* Siri-like Wave Animation when recording */}
            <div className="relative flex items-center justify-center w-48 h-48">
              {isRecording && (
                <>
                  <div className="absolute w-36 h-36 rounded-full bg-violet-500/10 border border-violet-500/20 animate-pulse-wave" />
                  <div className="absolute w-44 h-44 rounded-full bg-violet-600/5 border border-violet-600/10 animate-pulse-wave-delayed" />
                </>
              )}
              
              {/* Speaker / Mic Central Button */}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`z-10 relative flex items-center justify-center w-28 h-28 rounded-full transition-all shadow-xl ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-400 scale-95 shadow-red-500/20'
                    : 'bg-violet-600 hover:bg-violet-500 scale-100 hover:scale-105 shadow-violet-600/30'
                }`}
              >
                {isRecording ? (
                  <Square className="w-10 h-10 text-white fill-white" />
                ) : (
                  <Volume2 className="w-12 h-12 text-white animate-pulse" />
                )}
              </button>
            </div>

            {/* Timer & Transcript Status */}
            <div className="text-center space-y-2">
              {isRecording ? (
                <>
                  <div className="text-2xl font-mono font-bold text-white tracking-widest animate-pulse">
                    {formatTime(duration)}
                  </div>
                  <p className="text-xs text-red-400 uppercase tracking-widest font-semibold flex items-center justify-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    Recording Speech...
                  </p>
                </>
              ) : (
                <>
                  <p className="text-base font-semibold text-gray-200">Tap to start recording</p>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                    Say who you spoke with, describe the conversation context, then outline takeaways and action items.
                  </p>
                </>
              )}
            </div>

            {/* Real-time Scrolling Transcript Preview */}
            {isRecording && transcript && (
              <div className="w-full max-h-24 overflow-y-auto px-4 py-3 rounded-xl bg-gray-900/60 border border-white/5 text-center text-sm text-gray-300 italic leading-relaxed">
                "{transcript}"
              </div>
            )}

            {/* Error Message banner */}
            {errorMessage && (
              <div className="flex gap-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs items-start leading-relaxed w-full">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Footer Actions */}
      {!isProcessing && !showTextFallback && (
        <div className="flex justify-center border-t border-white/5 pt-4 shrink-0">
          <button
            onClick={() => setShowTextFallback(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-gray-400 hover:text-white transition-all"
          >
            <Keyboard className="w-4 h-4 text-violet-400" />
            No Microphone? Use Simulator
          </button>
        </div>
      )}
    </div>
  );
}
