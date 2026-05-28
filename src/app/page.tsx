'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Home, Plus, Mic, Calendar, ChevronRight, MicOff, MessageSquare, BookOpen, User, RefreshCw, StickyNote, Trash2, Edit2, Check, X, Sparkles, HelpCircle } from 'lucide-react';
import CalendarStrip from '@/components/CalendarStrip';
import SettingsModal from '@/components/SettingsModal';
import RecordScreen from '@/components/RecordScreen';
import ConversationDetail from '@/components/ConversationDetail';
import AppTour from '@/components/AppTour';
import { getConversationsMetadata, ConversationMetadata, TaskItem, getGlobalTasks, addGlobalTask, toggleGlobalTask, deleteGlobalTask, WorkingNote, getWorkingNotes, addWorkingNote, updateWorkingNote, deleteWorkingNote } from '@/lib/db';
import { ListChecks } from 'lucide-react';

const manualSections = [
  {
    id: 'get-started',
    title: '🚀 Getting Started',
    icon: <Sparkles className="w-4 h-4 text-violet-400" />,
    content: 'TalkTo is a voice-first workspace that automatically converts spoken audio into actionable takeaways and tasks using AI.',
    steps: [
      'Tap the bottom Feed tab, then tap the floating microphone button on the bottom right.',
      'Choose whether to record audio from your mic, upload an audio file, or use the Speech Simulator (perfect for quick testing).',
      'Once complete, wait a few seconds as the AI models (Gemini/Groq) transcribe, summarize, and extract items.',
      'View the generated AI notes, key takeaways, and structured action items.'
    ]
  },
  {
    id: 'recording',
    title: '🎙️ Recording & Audio Options',
    icon: <Mic className="w-4 h-4 text-violet-400" />,
    content: 'TalkTo supports multiple input channels to accommodate different workflows:',
    faq: [
      {
        q: 'How do I grant microphone permissions?',
        a: 'Your browser will prompt you for microphone permissions the first time you record. If denied, you can re-enable it in your browser settings (look for the lock icon in the URL bar).'
      },
      {
        q: 'What is the Speech Simulator?',
        a: 'The Simulator is designed for quick testing without using a microphone. It uses pre-defined mock transcripts (e.g. design, marketing, or dev updates) to demonstrate the AI structuring capabilities immediately.'
      },
      {
        q: 'Can I upload files directly?',
        a: 'Yes! Tap "Upload Audio" on the recording screen to upload pre-recorded MP3, WAV, or M4A files from your device.'
      }
    ]
  },
  {
    id: 'tasks',
    title: '📋 Task Management Board',
    icon: <ListChecks className="w-4 h-4 text-violet-400" />,
    content: 'TalkTo keeps you organized by automatically pulling action items from your transcripts:',
    steps: [
      'When speech is structured, any item listed in "Action Items" is automatically added to your To Work On board.',
      'Tap the checkmark next to a task to toggle its completed state.',
      'You can also add custom task notes manually using the input form at the top of the To Work On board.'
    ]
  },
  {
    id: 'notes',
    title: '📝 Manual Notes Scratchpad',
    icon: <StickyNote className="w-4 h-4 text-violet-400" />,
    content: 'For thoughts, meeting summaries, or details that do not come from voice recordings:',
    steps: [
      'Tap the Notes tab, and click "New Note" at the top.',
      'Enter a title and write down your thoughts or custom pointers.',
      'Tap "Save Note" to store it securely in IndexedDB.',
      'You can edit or delete notes at any time using the edit/trash icons.'
    ]
  },
  {
    id: 'feedback',
    title: '📬 Feedback & Suggestions',
    icon: <MessageSquare className="w-4 h-4 text-violet-400" />,
    content: 'All your recording data is stored strictly locally in your browser. The feedback submission feature is designed purely for reference to request new features or suggest improvements to the developer.',
  },
  {
    id: 'troubleshooting',
    title: '❓ Troubleshooting & FAQs',
    icon: <HelpCircle className="w-4 h-4 text-violet-400" />,
    content: 'Stuck? Here are solutions to common problems:',
    faq: [
      {
        q: 'Are my conversations private?',
        a: 'Yes. TalkTo stores your titles, transcripts, and audio blobs entirely inside your browser (IndexedDB). No backend servers store your data permanently.'
      },
      {
        q: 'Why does AI structuring fail?',
        a: 'Verify your internet connection. If the default AI backend keys are rate-limited, processing may temporarily fail.'
      },
      {
        q: 'Can I copy the complete conversation notes?',
        a: 'Yes! Inside the conversation detail view, click the "Copy Notes" button in the header. This will instantly format and copy the title, summary, transcript, takeaways, and action items directly to your clipboard.'
      },
      {
        q: 'How do I clear all data?',
        a: 'You can clear all application data and conversations by clearing the site cache or IndexedDB storage in your browser settings.'
      }
    ]
  }
];

export default function AppHome() {
  const [selectedDate, setSelectedDate] = useState('');
  const [conversations, setConversations] = useState<ConversationMetadata[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeDetailId, setActiveDetailId] = useState<string | null>(null);
  const [isRecordingOpen, setIsRecordingOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Global Tasks Board states
  const [activeTab, setActiveTab] = useState<'feed' | 'tasks' | 'notes' | 'manual' | 'feedback'>('feed');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // User Manual and App Tour states
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'get-started': true,
  });

  // Working Notes states
  const [notes, setNotes] = useState<WorkingNote[]>([]);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteTitle, setEditNoteTitle] = useState('');
  const [editNoteContent, setEditNoteContent] = useState('');

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

  // Initialize date to today and check onboarding tour on mount
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);

    if (typeof window !== 'undefined') {
      const tourCompleted = localStorage.getItem('talkto_onboarding_completed') === 'true';
      if (!tourCompleted) {
        setIsTourOpen(true);
      }
    }
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

  // Fetch working notes from DB
  const loadNotes = async () => {
    const list = await getWorkingNotes();
    setNotes(list);
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
    loadNotes();
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

  // Filter manual sections based on search query
  const filteredSections = React.useMemo(() => {
    const q = manualSearchQuery.trim().toLowerCase();
    if (!q) return manualSections;
    return manualSections.filter((section) => {
      const titleMatch = section.title.toLowerCase().includes(q);
      const contentMatch = section.content.toLowerCase().includes(q);
      const stepsMatch = section.steps?.some(s => s.toLowerCase().includes(q)) || false;
      const faqMatch = section.faq?.some(f => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)) || false;
      return titleMatch || contentMatch || stepsMatch || faqMatch;
    });
  }, [manualSearchQuery]);

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

        {/* 3. Onboarding Tour Overlay */}
        <AppTour
          isOpen={isTourOpen}
          onClose={() => setIsTourOpen(false)}
        />

        {/* Header Bar */}
        <header 
          className="px-5 pb-4 bg-gray-900/20 border-b border-white/5 flex items-center justify-between shrink-0"
          style={{
            paddingTop: 'calc(2.5rem + env(safe-area-inset-top, 0px))',
          }}
        >
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
                            {item.transcriptStructured?.summary || item.structured.summary}
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
                className="absolute right-6 w-14 h-14 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-600/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95 z-30 border border-violet-500/20 animate-fade-in"
                style={{
                  bottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))',
                }}
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
          ) : activeTab === 'notes' ? (
            /* Working Notes View */
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-5 pt-4">
              <div className="flex justify-between items-center mb-4 shrink-0">
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-violet-400">Working Notes</h2>
                  <p className="text-[10px] text-gray-500 font-mono">{notes.length} total notes</p>
                </div>
                {!isAddingNote && (
                  <button
                    onClick={() => {
                      setIsAddingNote(true);
                      setNoteTitle('');
                      setNoteContent('');
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition-all shadow-md shadow-violet-600/10 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Note</span>
                  </button>
                )}
              </div>

              {/* Add Note Form Card */}
              {isAddingNote && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 shrink-0 space-y-3.5 animate-scale-up">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h3 className="text-xs font-bold text-violet-400 uppercase tracking-wider">Create New Note</h3>
                    <button
                      onClick={() => setIsAddingNote(false)}
                      className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                      placeholder="Note Title/Heading"
                      className="w-full bg-gray-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <textarea
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Type note content (paragraphs, pointers, etc.)...."
                      rows={5}
                      className="w-full bg-gray-900 border border-white/10 rounded-xl p-4 text-xs text-white placeholder-gray-550 focus:outline-none focus:border-violet-500/50 resize-none leading-relaxed"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setIsAddingNote(false)}
                      className="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-400 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!noteTitle.trim()) {
                          alert("Please enter a note title.");
                          return;
                        }
                        await addWorkingNote(noteTitle, noteContent);
                        setNoteTitle('');
                        setNoteContent('');
                        setIsAddingNote(false);
                        await loadNotes();
                      }}
                      className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white cursor-pointer"
                    >
                      Save Note
                    </button>
                  </div>
                </div>
              )}

              {/* Working Notes List */}
              <div 
                className="flex-1 overflow-y-auto space-y-4 pb-24"
                style={{
                  paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))',
                }}
              >
                {notes.length > 0 ? (
                  notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2.5 transition-all hover:border-violet-500/20 group"
                    >
                      {editingNoteId === note.id ? (
                        <div className="space-y-3.5">
                          <input
                            type="text"
                            value={editNoteTitle}
                            onChange={(e) => setEditNoteTitle(e.target.value)}
                            className="w-full bg-gray-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-violet-500/50"
                          />
                          <textarea
                            value={editNoteContent}
                            onChange={(e) => setEditNoteContent(e.target.value)}
                            rows={4}
                            className="w-full bg-gray-900 border border-white/10 rounded-xl p-4 text-xs text-white focus:outline-none focus:border-violet-500/50 resize-none leading-relaxed"
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setEditingNoteId(null)}
                              className="px-3.5 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-400 hover:text-white cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={async () => {
                                if (!editNoteTitle.trim()) {
                                  alert("Please enter a note title.");
                                  return;
                                }
                                await updateWorkingNote(note.id, editNoteTitle, editNoteContent);
                                setEditingNoteId(null);
                                await loadNotes();
                              }}
                              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-sm text-white group-hover:text-violet-300 transition-colors">
                                {note.title}
                              </h3>
                              <span className="text-[9px] text-gray-500 font-mono block mt-0.5">
                                {new Date(note.createdAt).toLocaleDateString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })} at {new Date(note.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>

                            <div className="shrink-0 flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingNoteId(note.id);
                                  setEditNoteTitle(note.title);
                                  setEditNoteContent(note.content);
                                }}
                                className="p-1.5 rounded-lg border border-white/5 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                title="Edit Note"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={async () => {
                                  if (confirm("Delete this working note?")) {
                                    await deleteWorkingNote(note.id);
                                    await loadNotes();
                                  }
                                }}
                                className="p-1.5 rounded-lg border border-red-500/10 bg-red-500/5 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                                title="Delete Note"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-gray-350 leading-relaxed font-sans whitespace-pre-line">
                            {note.content}
                          </p>
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  /* Empty state for Working Notes */
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-500 mx-auto">
                      <StickyNote className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">No Notes Recorded</h4>
                      <p className="text-[11px] text-gray-500 max-w-[200px] leading-relaxed mx-auto">
                        Create your first working note to store key reminders, bullet points, or thoughts.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'manual' ? (
            /* User Manual View */
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-5 pt-4">
              <div className="flex justify-between items-center mb-3 shrink-0">
                <div className="space-y-0.5">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" />
                    <span>App Manual & Guide</span>
                  </h2>
                  <p className="text-[10px] text-gray-500 font-mono">Everything you need to know</p>
                </div>
                
                {/* Restart Tour button */}
                <button
                  onClick={() => setIsTourOpen(true)}
                  className="px-2.5 py-1.5 rounded-xl border border-violet-500/20 bg-violet-600/10 hover:bg-violet-600/20 text-[10px] font-bold text-violet-300 transition-all cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Restart Tour</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="mb-4 shrink-0 relative flex items-center">
                <input
                  type="text"
                  value={manualSearchQuery}
                  onChange={(e) => setManualSearchQuery(e.target.value)}
                  placeholder="Search guide by keywords (e.g. mic, API, tasks)..."
                  className="w-full bg-gray-900 border border-white/10 rounded-xl pl-4 pr-10 py-2.5 text-xs text-white placeholder-gray-550 focus:outline-none focus:border-violet-500/50 transition-colors"
                />
                {manualSearchQuery && (
                  <button
                    onClick={() => setManualSearchQuery('')}
                    className="absolute right-3 text-gray-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sections Accordion */}
              <div 
                className="flex-1 overflow-y-auto space-y-3.5 pb-24"
                style={{
                  paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))',
                }}
              >
                {filteredSections.length > 0 ? (
                  filteredSections.map((section) => {
                    const isExpanded = manualSearchQuery ? true : !!expandedSections[section.id];
                    return (
                      <div
                        key={section.id}
                        className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden transition-all hover:border-violet-500/25"
                      >
                        {/* Accordion Trigger */}
                        <button
                          onClick={() => {
                            if (!manualSearchQuery) {
                              setExpandedSections(prev => ({
                                ...prev,
                                [section.id]: !prev[section.id]
                              }));
                            }
                          }}
                          disabled={!!manualSearchQuery}
                          className="w-full flex items-center justify-between p-4 text-left transition-colors hover:bg-white/2"
                        >
                          <div className="flex items-center gap-2">
                            {section.icon}
                            <span className="font-bold text-sm text-white">{section.title}</span>
                          </div>
                          {!manualSearchQuery && (
                            <ChevronRight
                              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                                isExpanded ? 'rotate-90 text-violet-400' : ''
                              }`}
                            />
                          )}
                        </button>

                        {/* Accordion Content */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-1 border-t border-white/5 bg-gray-900/20 text-xs text-gray-305 space-y-3">
                            <p className="leading-relaxed">{section.content}</p>
                            
                            {/* Steps List */}
                            {section.steps && (
                              <ol className="space-y-2 list-decimal pl-4 text-gray-450">
                                {section.steps.map((step, i) => (
                                  <li key={i} className="leading-relaxed">
                                    {step}
                                  </li>
                                ))}
                              </ol>
                            )}

                            {/* Q&A / FAQs */}
                            {section.faq && (
                              <div className="space-y-3 pt-1">
                                {section.faq.map((item, i) => (
                                  <div key={i} className="p-3 bg-white/2 rounded-xl border border-white/5 space-y-1.5">
                                    <h4 className="font-bold text-white text-xs flex items-start gap-1">
                                      <span className="text-violet-400 font-mono">Q:</span>
                                      <span>{item.q}</span>
                                    </h4>
                                    <p className="text-[11px] text-gray-450 leading-relaxed pl-3.5">
                                      {item.a}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  /* Empty state for search */
                  <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-500 mx-auto">
                      <HelpCircle className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">No Matches Found</h4>
                      <p className="text-[11px] text-gray-500 max-w-[200px] leading-relaxed mx-auto">
                        Try searching for other terms like 'microphone', 'API', 'Gemini', or 'tasks'.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Feedback Form View */
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-5 pt-4">
              <div className="space-y-1.5 mb-4 shrink-0">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-violet-400">Share Feedback</h2>
                <p className="text-xs text-gray-400 leading-relaxed">
                  All your recording data is stored strictly locally. Use this form to suggest new features, request changes, or submit enhancements directly to the developer.
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
          className="absolute bottom-0 left-0 right-0 glass-dark px-4 pt-4 flex items-center justify-between gap-1 z-20"
          style={{
            paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
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
            <span className="text-[9px] font-bold tracking-wider uppercase">Feed</span>
          </button>
          
          {/* Tasks Tab */}
          <button 
            onClick={() => setActiveTab('tasks')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === 'tasks' ? 'text-violet-400 animate-pulse' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <ListChecks className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-wider uppercase">Tasks</span>
          </button>

          {/* Notes Tab */}
          <button 
            onClick={() => setActiveTab('notes')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === 'notes' ? 'text-violet-400 animate-pulse' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <StickyNote className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-wider uppercase">Notes</span>
          </button>

          {/* Manual Tab */}
          <button 
            onClick={() => setActiveTab('manual')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === 'manual' ? 'text-violet-400 animate-pulse' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-wider uppercase">Manual</span>
          </button>

          {/* Feedback Tab */}
          <button 
            onClick={() => setActiveTab('feedback')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === 'feedback' ? 'text-violet-400 animate-pulse' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-wider uppercase">Feedback</span>
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
