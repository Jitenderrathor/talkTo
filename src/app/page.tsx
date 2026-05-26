'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Home, Plus, Mic, Calendar, ChevronRight, MicOff, MessageSquare, BookOpen, User } from 'lucide-react';
import CalendarStrip from '@/components/CalendarStrip';
import SettingsModal from '@/components/SettingsModal';
import RecordScreen from '@/components/RecordScreen';
import ConversationDetail from '@/components/ConversationDetail';
import { getConversationsMetadata, ConversationMetadata } from '@/lib/db';

export default function AppHome() {
  const [selectedDate, setSelectedDate] = useState('');
  const [conversations, setConversations] = useState<ConversationMetadata[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeDetailId, setActiveDetailId] = useState<string | null>(null);
  const [isRecordingOpen, setIsRecordingOpen] = useState(false);

  // Initialize date to today on client side
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  }, []);

  // Fetch conversations from DB
  const loadConversations = async () => {
    const list = await getConversationsMetadata();
    setConversations(list);
  };

  useEffect(() => {
    loadConversations();
  }, [activeDetailId, isRecordingOpen]);

  // Set of dates containing recordings for the calendar indicator dots
  const activityDates = React.useMemo(() => {
    return new Set(conversations.map((c) => c.date));
  }, [conversations]);

  // Filter conversations for the selected day
  const filteredConversations = React.useMemo(() => {
    if (!selectedDate) return [];
    return conversations.filter((c) => c.date === selectedDate);
  }, [conversations, selectedDate]);

  // Handle clicking on a conversation
  const handleConversationClick = (id: string) => {
    setActiveDetailId(id);
  };

  // Callback when a new recording is processed successfully
  const handleRecordingFinished = (id: string) => {
    setIsRecordingOpen(false);
    setActiveDetailId(id); // Take directly to the detail view of the newly recorded item
  };

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center p-0 md:p-6 select-none">
      
      {/* Premium Mobile Phone Frame Mockup for Desktop, full-screen on mobile */}
      <div className="w-full h-screen md:max-w-md md:h-[880px] md:rounded-[45px] md:border-[12px] md:border-gray-800 bg-gray-950 md:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden relative flex flex-col justify-between">
        
        {/* Phone Notch/Dynamic Island for premium realism on Desktop */}
        <div className="hidden md:block absolute top-2 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-full z-50 flex items-center justify-between px-4">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
          <span className="w-4 h-1.5 rounded-full bg-gray-900" />
          <span className="w-1.5 h-1.5 rounded-full bg-gray-900" />
        </div>

        {/* 1. Detail Screen Overlay */}
        {activeDetailId && (
          <ConversationDetail
            id={activeDetailId}
            onBack={() => {
              setActiveDetailId(null);
              loadConversations();
            }}
          />
        )}

        {/* 2. Recording Screen Overlay */}
        {isRecordingOpen && (
          <RecordScreen
            onClose={() => setIsRecordingOpen(false)}
            onFinished={handleRecordingFinished}
          />
        )}

        {/* Header Bar */}
        <header className="px-5 pt-8 pb-4 bg-gray-900/20 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">My Assistant</span>
            <h1 className="text-2xl font-extrabold bg-gradient-to-r from-violet-400 via-indigo-300 to-violet-500 bg-clip-text text-transparent">
              TalkTo
            </h1>
          </div>
          
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </header>

        {/* Core Home Content */}
        <div className="flex-1 flex flex-col min-h-0 bg-gray-950/20 overflow-hidden">
          
          {/* Calendar strip */}
          <CalendarStrip
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            activityDates={activityDates}
          />

          {/* List of Conversations */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 pb-24">
            <div className="flex justify-between items-center text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              <span>Today's Recordings</span>
              <span className="font-mono text-violet-400">{filteredConversations.length} total</span>
            </div>

            {filteredConversations.length > 0 ? (
              filteredConversations.map((item) => {
                const timeStr = new Date(item.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleConversationClick(item.id)}
                    className="w-full flex items-center justify-between p-4 rounded-2xl glass text-left hover:scale-[1.01] hover:border-violet-500/30 transition-all group"
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-bold text-violet-400 font-mono">{timeStr}</span>
                        {item.duration && (
                          <span className="text-[10px] bg-white/5 border border-white/5 text-gray-400 px-1.5 py-0.5 rounded-md font-mono">
                            {Math.floor(item.duration / 60)}m {item.duration % 60}s
                          </span>
                        )}
                      </div>
                      
                      <h3 className="font-bold text-sm text-white group-hover:text-violet-300 transition-colors truncate mb-1">
                        {item.title}
                      </h3>
                      
                      <p className="text-xs text-gray-400 line-clamp-1 leading-relaxed">
                        {item.structured.summary}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white/5 group-hover:bg-violet-600/20 text-gray-500 group-hover:text-violet-400 transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                );
              })
            ) : (
              /* High-fidelity Empty State */
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-500">
                  <MicOff className="w-7 h-7" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-sm font-semibold text-gray-200">No recordings for this day</h4>
                  <p className="text-xs text-gray-500 max-w-[220px] mx-auto leading-relaxed">
                    Tap the footer record button to log a conversation for {new Date(selectedDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Premium Bottom Navigation Footer */}
        <div className="absolute bottom-0 left-0 right-0 glass-dark px-6 py-4 flex items-center justify-around z-20">
          
          {/* Home Tab (Active) */}
          <button className="flex flex-col items-center gap-1 text-violet-400 transition-all">
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-wider uppercase">Feed</span>
          </button>
          
          {/* Record Action Plus Button (Floating in Notch/Middle) */}
          <button
            onClick={() => setIsRecordingOpen(true)}
            className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-600/30 -translate-y-4 border-[4px] border-gray-950 transition-all hover:scale-105 active:scale-95"
            aria-label="Record New Conversation"
          >
            <Plus className="w-7 h-7 stroke-[2.5]" />
          </button>

          {/* Settings Tab / Info Quick Trigger */}
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex flex-col items-center gap-1 text-gray-500 hover:text-gray-300 transition-all"
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-medium tracking-wider uppercase">Settings</span>
          </button>

        </div>

        {/* Settings Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />

      </div>
    </main>
  );
}
