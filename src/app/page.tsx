'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Home, Plus, Mic, Calendar, ChevronRight, MicOff, MessageSquare, BookOpen, User, RefreshCw } from 'lucide-react';
import CalendarStrip from '@/components/CalendarStrip';
import SettingsModal from '@/components/SettingsModal';
import RecordScreen from '@/components/RecordScreen';
import ConversationDetail from '@/components/ConversationDetail';
import { getConversationsMetadata, ConversationMetadata, TaskItem, getGlobalTasks, addGlobalTask, toggleGlobalTask, deleteGlobalTask } from '@/lib/db';
import { ListChecks } from 'lucide-react';

export default function AppHome() {
  const [selectedDate, setSelectedDate] = useState('');
  const [conversations, setConversations] = useState<ConversationMetadata[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeDetailId, setActiveDetailId] = useState<string | null>(null);
  const [isRecordingOpen, setIsRecordingOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Global Tasks Board states
  const [activeTab, setActiveTab] = useState<'feed' | 'tasks' | 'feedback'>('feed');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Feedback states
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackPhone, setFeedbackPhone] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackStatus('sending');
    setFeedbackError(null);

    const serviceId = localStorage.getItem('talkto_emailjs_service_id') || 'service_j3jgz6g';
    const templateId = localStorage.getItem('talkto_emailjs_template_id') || 'template_ooplf43';
    const publicKey = localStorage.getItem('talkto_emailjs_public_key') || 'fU7F-EkzL8hF1qNR9';

    if (!serviceId || !templateId || !publicKey) {
      console.log('EmailJS details not configured. Simulating email send... Details:', {
        feedbackName,
        feedbackPhone,
        feedbackEmail,
        feedbackMessage
      });
      
      setTimeout(() => {
        setFeedbackStatus('success');
        setFeedbackName('');
        setFeedbackPhone('');
        setFeedbackEmail('');
        setFeedbackMessage('');
      }, 1500);
      return;
    }

    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,
          template_params: {
            name: feedbackName,
            email: feedbackEmail,
            phone: feedbackPhone,
            message: feedbackMessage
          }
        })
      });

      if (response.ok) {
        setFeedbackStatus('success');
        setFeedbackName('');
        setFeedbackPhone('');
        setFeedbackEmail('');
        setFeedbackMessage('');
      } else {
        const errorText = await response.text();
        throw new Error(errorText || `Failed (Status: ${response.status})`);
      }
    } catch (err: any) {
      console.error('EmailJS feedback send failed:', err);
      setFeedbackStatus('error');
      setFeedbackError(err.message || 'Unknown error occurred.');
    }
  };

  // Initialize date to today on client side
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  }, []);

  // Check admin session on mount and when Settings modal opens/closes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sessionAdmin = sessionStorage.getItem('talkto_admin_session') === 'true';
      setIsAdmin(sessionAdmin);
    }
  }, [isSettingsOpen]);

  // Fetch conversations from DB
  const loadConversations = async () => {
    const list = await getConversationsMetadata();
    setConversations(list);
  };

  // Fetch global tasks from DB
  const loadTasks = async () => {
    const list = await getGlobalTasks();
    setTasks(list);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    await addGlobalTask(newTaskText.trim());
    setNewTaskText('');
    await loadTasks();
  };

  const handleToggleTask = async (id: string) => {
    await toggleGlobalTask(id);
    await loadTasks();
  };

  const handleDeleteTask = async (id: string) => {
    await deleteGlobalTask(id);
    await loadTasks();
  };

  useEffect(() => {
    loadConversations();
    loadTasks();
  }, [activeDetailId, isRecordingOpen, activeTab]);

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
      <div className="w-full h-[100dvh] md:max-w-md md:h-[880px] md:rounded-[45px] md:border-[12px] md:border-gray-800 bg-gray-950 md:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden relative flex flex-col justify-between">
        
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
          
          {isAdmin && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </header>

        {/* Core Home Content */}
        <div className="flex-1 flex flex-col min-h-0 bg-gray-950/20 overflow-hidden">
          {activeTab === 'feed' ? (
            <>
              {/* Calendar strip */}
              <CalendarStrip
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                activityDates={activityDates}
              />

              {/* List of Conversations */}
              <div 
                className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5"
                style={{
                  paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))',
                }}
              >
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
              
              {/* Floating Action Button for Recording */}
              <button
                onClick={() => setIsRecordingOpen(true)}
                className="absolute bottom-24 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-600/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95 z-30 border border-violet-500/20 animate-fade-in"
                aria-label="Record New Conversation"
              >
                <Mic className="w-6 h-6 stroke-[2.5]" />
              </button>
            </>
          ) : activeTab === 'tasks' ? (
            /* Global Tasks List View */
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-5 pt-4">
              
              {/* Custom Action Note Creator Form */}
              <form onSubmit={handleAddTask} className="flex gap-2 mb-4 shrink-0">
                <input
                  type="text"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  placeholder="Add custom task note to work on..."
                  className="flex-1 bg-gray-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 transition-colors"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition-all shadow-md shadow-violet-600/10"
                >
                  Add
                </button>
              </form>

              {/* Filter Tabs */}
              <div className="flex gap-2 mb-4 shrink-0">
                {(['all', 'pending', 'completed'] as const).map((filter) => {
                  const filteredCount = tasks.filter(t => {
                    if (filter === 'pending') return !t.completed;
                    if (filter === 'completed') return t.completed;
                    return true;
                  }).length;
                  
                  return (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setTaskFilter(filter)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                        taskFilter === filter
                          ? 'bg-violet-600/10 border-violet-500 text-violet-300'
                          : 'bg-white/5 border-white/5 text-gray-500 hover:text-gray-350'
                      }`}
                    >
                      {filter} <span className="font-mono text-[9px] opacity-70">({filteredCount})</span>
                    </button>
                  );
                })}
              </div>

              {/* Tasks List */}
              <div 
                className="flex-1 overflow-y-auto space-y-3 pb-24"
                style={{
                  paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))',
                }}
              >
                {tasks.filter(t => {
                  if (taskFilter === 'pending') return !t.completed;
                  if (taskFilter === 'completed') return t.completed;
                  return true;
                }).length > 0 ? (
                  tasks
                    .filter(t => {
                      if (taskFilter === 'pending') return !t.completed;
                      if (taskFilter === 'completed') return t.completed;
                      return true;
                    })
                    .map((task) => (
                      <div
                        key={task.id}
                        className={`flex gap-3 p-4 rounded-2xl border transition-all ${
                          task.completed 
                            ? 'bg-white/2 border-white/5 opacity-55' 
                            : 'bg-white/5 border-white/10 hover:border-violet-500/20'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => handleToggleTask(task.id)}
                          className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-violet-600 focus:ring-violet-500 shrink-0 mt-0.5 cursor-pointer"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs text-white leading-relaxed font-sans ${task.completed ? 'line-through text-gray-500' : ''}`}>
                            {task.text}
                          </p>
                          
                          {task.conversationId ? (
                            <button
                              onClick={() => handleConversationClick(task.conversationId!)}
                              className="text-[9px] text-violet-400/80 hover:text-violet-300 hover:underline mt-1 block text-left truncate"
                            >
                              From: {task.conversationTitle || 'Recording'}
                            </button>
                          ) : (
                            <span className="text-[9px] text-gray-550 mt-1 block select-none">
                              Custom Task Note
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-[10px] text-red-500/50 hover:text-red-400 shrink-0 self-start px-1 py-0.5 transition-colors"
                          title="Delete task"
                        >
                          Delete
                        </button>
                      </div>
                    ))
                ) : (
                  /* Empty state for tasks */
                  <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-500 mx-auto">
                      <ListChecks className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">No Tasks Found</h4>
                      <p className="text-[11px] text-gray-500 max-w-[200px] leading-relaxed mx-auto">
                        {taskFilter === 'completed'
                          ? 'Complete some tasks first!'
                          : 'Tasks from recordings or custom notes will appear here.'}
                      </p>
                    </div>
                  </div>
                )}
              {/* End of Tasks Scroll Wrapper */}
              </div>
            </div>
          ) : (
            /* Feedback Form View */
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-5 pt-4">
              <div className="space-y-1.5 mb-4 shrink-0">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-violet-400">Share Feedback</h2>
                <p className="text-xs text-gray-550">
                  Suggest a feature, report an issue, or tell us how to improve.
                </p>
              </div>



              <form 
                onSubmit={handleSendFeedback} 
                className="flex-1 flex flex-col min-h-0 overflow-y-auto space-y-4 pb-24"
                style={{
                  paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))',
                }}
              >
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-400">Full Name</label>
                  <input
                    type="text"
                    value={feedbackName}
                    onChange={(e) => setFeedbackName(e.target.value)}
                    placeholder="Enter your name"
                    required
                    className="w-full bg-gray-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-400">Mobile Number</label>
                  <input
                    type="tel"
                    value={feedbackPhone}
                    onChange={(e) => setFeedbackPhone(e.target.value)}
                    placeholder="Enter your mobile number"
                    required
                    className="w-full bg-gray-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-400">Email ID</label>
                  <input
                    type="email"
                    value={feedbackEmail}
                    onChange={(e) => setFeedbackEmail(e.target.value)}
                    placeholder="Enter your email ID"
                    required
                    className="w-full bg-gray-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-400">Feature to Improve / Message</label>
                  <textarea
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    placeholder="Describe the feature or improvement you want..."
                    required
                    rows={4}
                    className="w-full bg-gray-900 border border-white/10 rounded-xl p-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors resize-none leading-relaxed"
                  />
                </div>

                {feedbackStatus === 'success' && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-305 text-xs flex items-center gap-2 animate-scale-up">
                    <span>✅ Feedback successfully submitted! Thank you.</span>
                  </div>
                )}

                {feedbackStatus === 'error' && (
                  <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-305 text-xs flex items-center gap-2 animate-scale-up">
                    <span>❌ Submission failed: {feedbackError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={feedbackStatus === 'sending'}
                  className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white font-semibold text-xs transition-all shadow-lg shadow-violet-600/25 flex items-center justify-center gap-2"
                >
                  {feedbackStatus === 'sending' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Feedback'
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Premium Bottom Navigation Footer */}
        <div 
          className="absolute bottom-0 left-0 right-0 glass-dark px-6 pt-4 flex items-center justify-around z-20"
          style={{
            paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
          }}
        >
          {/* Home Tab */}
          <button 
            onClick={() => setActiveTab('feed')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === 'feed' ? 'text-violet-400 animate-pulse' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-wider uppercase">Feed</span>
          </button>
          
          {/* Tasks Tab */}
          <button 
            onClick={() => setActiveTab('tasks')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === 'tasks' ? 'text-violet-400 animate-pulse' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <ListChecks className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-wider uppercase">To Work On</span>
          </button>

          {/* Feedback Tab */}
          <button 
            onClick={() => setActiveTab('feedback')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === 'feedback' ? 'text-violet-400 animate-pulse' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-wider uppercase">Feedback</span>
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
