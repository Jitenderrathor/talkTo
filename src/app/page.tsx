'use client';

import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Plus, 
  Mic, 
  Calendar, 
  ChevronRight, 
  MicOff, 
  MessageSquare, 
  BookOpen, 
  RefreshCw, 
  StickyNote, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Sparkles, 
  HelpCircle,
  Settings,
  ListChecks,
  Search,
  Clock,
  Volume2,
  Database,
  User,
  Users,
  ChevronDown,
  ArrowRight,
  Shield,
  Layers,
  Activity,
  Flame,
  CheckCircle2,
  Circle
} from 'lucide-react';
import CalendarStrip from '@/components/CalendarStrip';
import RecordScreen from '@/components/RecordScreen';
import ConversationDetail from '@/components/ConversationDetail';
import AppTour from '@/components/AppTour';
import SettingsModal from '@/components/SettingsModal';
import { 
  getConversationsMetadata, 
  ConversationMetadata, 
  TaskItem, 
  getGlobalTasks, 
  addGlobalTask, 
  toggleGlobalTask, 
  deleteGlobalTask, 
  WorkingNote, 
  getWorkingNotes, 
  addWorkingNote, 
  updateWorkingNote, 
  deleteWorkingNote,
  UserProfile,
  getCurrentUser,
  setCurrentUser,
  getUserProfiles,
  createUserProfile,
  checkMongoDBStatus
} from '@/lib/db';

const manualSections = [
  {
    id: 'get-started',
    title: 'Getting Started',
    icon: <Sparkles className="w-4 h-4 text-violet-400" />,
    content: 'TalkTo is a distraction-free AI voice workspace that transcribes spoken conversations into structured notes, key takeaways, and action items.',
    steps: [
      'Tap "+ Record" to begin capturing a conversation or dictation.',
      'Speak naturally in English, Hindi, or conversational Hinglish.',
      'AI transcribes verbatim and generates coaching summaries, takeaways, and tasks.',
      'View, edit, or copy complete structured notes with one click.'
    ]
  },
  {
    id: 'mongodb',
    title: 'MongoDB Server Database',
    icon: <Database className="w-4 h-4 text-emerald-400" />,
    content: 'TalkTo connects to MongoDB to store your data on your server or cloud database (MongoDB Atlas / Compass):',
    steps: [
      'Open Settings (Gear icon) -> Enter Admin password (admin@talkto).',
      'Paste your MongoDB URI (e.g. mongodb+srv://<user>:<pwd>@cluster.mongodb.net/talkto).',
      'Click "Test Connection" and "Sync Local Data to MongoDB" to upload your records.'
    ]
  },
  {
    id: 'profiles',
    title: 'User Profiles & Switching',
    icon: <Users className="w-4 h-4 text-violet-400" />,
    content: 'Organize voice notes across multiple profiles with fast 1-click user switching:',
    steps: [
      'Click on your profile name in the top bar or sidebar.',
      'Create a new user profile or switch between existing profiles instantly.',
      'Conversations, tasks, and notes are automatically segregated per profile in MongoDB.'
    ]
  },
  {
    id: 'tasks',
    title: 'To Work On Board',
    icon: <ListChecks className="w-4 h-4 text-violet-400" />,
    content: 'Key improvement points extracted from conversations appear directly in your To Work On board with checkbox tracking.'
  },
  {
    id: 'notes',
    title: 'Working Notes Scratchpad',
    icon: <StickyNote className="w-4 h-4 text-violet-400" />,
    content: 'A minimal scratchpad for logging reflections, discussion points, and ideas alongside voice notes.'
  }
];

export default function AppHome() {
  const [selectedDate, setSelectedDate] = useState('');
  const [conversations, setConversations] = useState<ConversationMetadata[]>([]);
  const [activeDetailId, setActiveDetailId] = useState<string | null>(null);
  const [isRecordingOpen, setIsRecordingOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'feed' | 'tasks' | 'notes' | 'manual' | 'feedback'>('feed');
  
  // Search state for Feed
  const [feedSearchQuery, setFeedSearchQuery] = useState('');

  // User Profile & Switcher
  const [currentUser, setCurrentUserState] = useState<UserProfile>({ id: 'default_user', name: 'My Profile', createdAt: Date.now() });
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // MongoDB Status Indicator
  const [isMongoConnected, setIsMongoConnected] = useState<boolean | null>(null);

  // Global Tasks Board states
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
  const [notesSearchQuery, setNotesSearchQuery] = useState('');
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

  // Initialize data on mount
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);

    loadUserData();
    checkDbStatus();
  }, []);

  const loadUserData = async () => {
    const user = await getCurrentUser();
    setCurrentUserState(user);
    const profiles = await getUserProfiles();
    setUserProfiles(profiles);
  };

  const checkDbStatus = async () => {
    const res = await checkMongoDBStatus();
    setIsMongoConnected(res.connected);
  };

  const handleSwitchUser = (user: UserProfile) => {
    setCurrentUser(user);
    setCurrentUserState(user);
    setIsUserMenuOpen(false);
    loadConversations();
    loadTasks();
    loadNotes();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    const created = await createUserProfile(newUserName.trim());
    setNewUserName('');
    setIsCreatingUser(false);
    handleSwitchUser(created);
    const profiles = await getUserProfiles();
    setUserProfiles(profiles);
  };

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

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackStatus('sending');
    setFeedbackError(null);

    const serviceId = localStorage.getItem('talkto_emailjs_service_id') || 'service_j3jgz6g';
    const templateId = localStorage.getItem('talkto_emailjs_template_id') || 'template_ooplf43';
    const publicKey = localStorage.getItem('talkto_emailjs_public_key') || 'fU7F-EkzL8hF1qNR9';

    if (!serviceId || !templateId || !publicKey) {
      setTimeout(() => {
        setFeedbackStatus('success');
        setFeedbackName('');
        setFeedbackPhone('');
        setFeedbackEmail('');
        setFeedbackMessage('');
      }, 1200);
      return;
    }

    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      setFeedbackStatus('error');
      setFeedbackError(err.message || 'Unknown error occurred.');
    }
  };

  useEffect(() => {
    loadConversations();
    loadTasks();
    loadNotes();
  }, [activeDetailId, isRecordingOpen, activeTab, currentUser.id]);

  const activityDates = React.useMemo(() => {
    return new Set(conversations.map((c) => c.date));
  }, [conversations]);

  const filteredConversations = React.useMemo(() => {
    let list = conversations;
    if (selectedDate) {
      list = list.filter((c) => c.date === selectedDate);
    }
    if (feedSearchQuery.trim()) {
      const q = feedSearchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.structured?.summary?.toLowerCase().includes(q) ||
          c.transcriptStructured?.summary?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [conversations, selectedDate, feedSearchQuery]);

  const filteredSections = React.useMemo(() => {
    const q = manualSearchQuery.trim().toLowerCase();
    if (!q) return manualSections;
    return manualSections.filter((section) => {
      return (
        section.title.toLowerCase().includes(q) ||
        section.content.toLowerCase().includes(q) ||
        section.steps?.some(s => s.toLowerCase().includes(q))
      );
    });
  }, [manualSearchQuery]);

  const filteredNotes = React.useMemo(() => {
    if (!notesSearchQuery.trim()) return notes;
    const q = notesSearchQuery.toLowerCase().trim();
    return notes.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
  }, [notes, notesSearchQuery]);

  const pendingTasks = React.useMemo(() => tasks.filter(t => !t.completed), [tasks]);
  const completedTasks = React.useMemo(() => tasks.filter(t => t.completed), [tasks]);

  const handleConversationClick = (id: string) => {
    setActiveDetailId(id);
  };

  const handleRecordingFinished = (id: string) => {
    setIsRecordingOpen(false);
    setActiveDetailId(id);
    loadConversations();
  };

  return (
    <div className="min-h-screen h-[100dvh] w-full bg-[#0a0b10] text-gray-100 flex flex-col md:flex-row overflow-hidden select-none font-sans">
      
      {/* 1. Mobile Fullscreen Detail Overlay (< lg) */}
      {activeDetailId && (
        <div className="lg:hidden fixed inset-0 z-50 bg-[#0a0b10]">
          <ConversationDetail
            id={activeDetailId}
            onBack={() => {
              setActiveDetailId(null);
              loadConversations();
            }}
          />
        </div>
      )}

      {/* 2. Recording Modal */}
      {isRecordingOpen && (
        <RecordScreen
          onClose={() => setIsRecordingOpen(false)}
          onFinished={handleRecordingFinished}
        />
      )}

      {/* 3. Onboarding Tour Modal */}
      <AppTour
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
      />

      {/* 4. Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          checkDbStatus();
        }}
      />

      {/* ========================================================================= */}
      {/* DESKTOP / TABLET CLEAN SIDEBAR (md:) */}
      {/* ========================================================================= */}
      <aside className="hidden md:flex flex-col w-60 lg:w-64 bg-[#0d0e15] border-r border-white/[0.06] p-4 shrink-0 justify-between z-20">
        <div className="space-y-5">
          
          {/* Brand Header */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-sm">
                <Mic className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-white">
                  TalkTo
                </h1>
                <span className="text-[10px] text-gray-500 font-medium block">
                  AI Speech Notes
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* User Profile Switcher */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-full bg-violet-600/30 border border-violet-500/30 flex items-center justify-center text-violet-300 text-xs font-bold">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-gray-200 truncate">
                  {currentUser.name}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gray-500 group-hover:text-gray-300 transition-transform" />
            </button>

            {/* Profile Switcher Dropdown */}
            {isUserMenuOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 p-2 bg-[#12141c] border border-white/10 rounded-2xl shadow-2xl z-30 space-y-1.5 animate-scale-up">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 px-2 pt-1">
                  Profiles
                </div>
                <div className="max-h-40 overflow-y-auto space-y-0.5">
                  {userProfiles.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSwitchUser(p)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        currentUser.id === p.id 
                          ? 'bg-violet-600 text-white' 
                          : 'text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                      {currentUser.id === p.id && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </div>

                {!isCreatingUser ? (
                  <button
                    onClick={() => setIsCreatingUser(true)}
                    className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-violet-400 hover:bg-violet-600/10 transition-colors cursor-pointer border-t border-white/5 pt-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Profile</span>
                  </button>
                ) : (
                  <form onSubmit={handleCreateUser} className="space-y-1.5 pt-1 border-t border-white/5">
                    <input
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Profile name (e.g. Alex)"
                      className="w-full bg-gray-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500"
                      autoFocus
                    />
                    <div className="flex gap-1 justify-end">
                      <button
                        type="button"
                        onClick={() => setIsCreatingUser(false)}
                        className="px-2 py-1 text-[10px] text-gray-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-2.5 py-1 bg-violet-600 text-[10px] font-semibold text-white rounded-md"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Primary CTA: Record Button */}
          <button
            onClick={() => setIsRecordingOpen(true)}
            className="w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <Mic className="w-4 h-4 stroke-[2.2]" />
            <span>Record Conversation</span>
          </button>

          {/* Navigation Links */}
          <nav className="space-y-1 pt-1">
            <button
              onClick={() => {
                setActiveTab('feed');
                setActiveDetailId(null);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'feed'
                  ? 'bg-white/[0.08] text-white font-semibold'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Home className="w-4 h-4" />
                <span>Audio Feed</span>
              </div>
              <span className="text-[10px] font-mono text-gray-500">
                {conversations.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('tasks')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'tasks'
                  ? 'bg-white/[0.08] text-white font-semibold'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ListChecks className="w-4 h-4" />
                <span>To Work On</span>
              </div>
              {pendingTasks.length > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-violet-600/30 text-violet-300">
                  {pendingTasks.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('notes')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'notes'
                  ? 'bg-white/[0.08] text-white font-semibold'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <StickyNote className="w-4 h-4" />
                <span>Working Notes</span>
              </div>
              <span className="text-[10px] font-mono text-gray-500">
                {notes.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('manual')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'manual'
                  ? 'bg-white/[0.08] text-white font-semibold'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4" />
                <span>Manual & Guide</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('feedback')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'feedback'
                  ? 'bg-white/[0.08] text-white font-semibold'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4" />
                <span>Feedback</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer: Database & Status */}
        <div className="space-y-2 pt-3 border-t border-white/[0.06]">
          <div className="flex items-center justify-between px-2 py-1 text-[11px] text-gray-400">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-gray-500" />
              <span>Storage</span>
            </span>
            <span className={`flex items-center gap-1 text-[10px] font-medium ${isMongoConnected ? 'text-emerald-400' : 'text-gray-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isMongoConnected ? 'bg-emerald-400' : 'bg-gray-500'}`} />
              {isMongoConnected ? 'MongoDB' : 'Local DB'}
            </span>
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={() => setIsTourOpen(true)}
              className="flex-1 py-1.5 px-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] text-[11px] font-medium text-gray-400 hover:text-white transition-all cursor-pointer text-center"
            >
              Tour
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex-1 py-1.5 px-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] text-[11px] font-medium text-gray-400 hover:text-white transition-all cursor-pointer text-center"
            >
              Settings
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MAIN VIEWPORT */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        
        {/* MOBILE TOP BAR (< md:) */}
        <header 
          className="md:hidden px-4 pb-2.5 bg-[#0d0e15] border-b border-white/[0.06] flex items-center justify-between shrink-0"
          style={{
            paddingTop: 'calc(0.6rem + env(safe-area-inset-top, 0px))',
          }}
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center text-white">
              <Mic className="w-3.5 h-3.5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-tight">
                TalkTo
              </h1>
              <span className="text-[10px] text-gray-400 font-medium">
                {currentUser.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* DESKTOP TOP BAR (md:) */}
        <header className="hidden md:flex items-center justify-between px-6 py-3 bg-[#0d0e15]/50 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
            <span className="text-white">
              {activeTab === 'feed' && 'Audio Feed'}
              {activeTab === 'tasks' && 'To Work On Board'}
              {activeTab === 'notes' && 'Working Notes'}
              {activeTab === 'manual' && 'Documentation'}
              {activeTab === 'feedback' && 'Share Feedback'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
              <Calendar className="w-3.5 h-3.5 text-gray-500" />
              <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>

            <button
              onClick={() => setIsRecordingOpen(true)}
              className="py-1 px-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>
        </header>

        {/* TAB CONTENTS */}
        <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
          
          {/* ========================================================================= */}
          {/* TAB 1: AUDIO FEED */}
          {/* ========================================================================= */}
          {activeTab === 'feed' && (
            <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
              
              {/* Left Column: Calendar Strip + Recording List */}
              <div className="w-full lg:w-[360px] xl:w-[400px] flex flex-col min-h-0 border-r border-white/[0.06] bg-[#0a0b10] shrink-0">
                
                <CalendarStrip
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  activityDates={activityDates}
                />

                {/* Search input */}
                <div className="px-4 py-2 shrink-0">
                  <div className="relative flex items-center">
                    <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      value={feedSearchQuery}
                      onChange={(e) => setFeedSearchQuery(e.target.value)}
                      placeholder="Search recordings..."
                      className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 transition-colors"
                    />
                    {feedSearchQuery && (
                      <button
                        onClick={() => setFeedSearchQuery('')}
                        className="absolute right-2.5 text-gray-400 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Feed Count */}
                <div className="px-4 py-1.5 flex justify-between items-center text-[11px] font-medium text-gray-400 shrink-0">
                  <span>Recordings</span>
                  <span className="font-mono text-gray-400">{filteredConversations.length}</span>
                </div>

                {/* Scrollable Recording Cards */}
                <div 
                  className="flex-1 overflow-y-auto px-4 pb-28 md:pb-6 space-y-2"
                  style={{
                    paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))',
                  }}
                >
                  {filteredConversations.length > 0 ? (
                    filteredConversations.map((item) => {
                      const timeStr = new Date(item.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      const isSelected = activeDetailId === item.id;
                      
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleConversationClick(item.id)}
                          className={`w-full flex items-center justify-between p-3.5 rounded-xl text-left transition-all group cursor-pointer border ${
                            isSelected
                              ? 'bg-violet-600/10 border-violet-500/40 text-white'
                              : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] text-gray-300'
                          }`}
                        >
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[11px] font-semibold text-violet-400 font-mono">{timeStr}</span>
                              {item.duration && (
                                <span className="text-[10px] text-gray-500 font-mono">
                                  {Math.floor(item.duration / 60)}m {item.duration % 60}s
                                </span>
                              )}
                            </div>
                            
                            <h3 className="font-semibold text-xs text-white truncate mb-0.5">
                              {item.title}
                            </h3>
                            
                            <p className="text-[11px] text-gray-400 line-clamp-1 leading-relaxed">
                              {item.transcriptStructured?.summary || item.structured.summary}
                            </p>
                          </div>

                          <ChevronRight className={`w-4 h-4 shrink-0 transition-colors ${isSelected ? 'text-violet-400' : 'text-gray-600 group-hover:text-gray-400'}`} />
                        </button>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-gray-500">
                        <MicOff className="w-5 h-5" />
                      </div>
                      <p className="text-xs text-gray-400 max-w-[200px]">
                        {feedSearchQuery ? 'No matching recordings.' : 'No recordings on this date.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Floating Action Button for Mobile */}
                <button
                  onClick={() => setIsRecordingOpen(true)}
                  className="md:hidden fixed right-5 w-12 h-12 rounded-full bg-violet-600 text-white shadow-lg flex items-center justify-center active:scale-95 z-30"
                  style={{
                    bottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px))',
                  }}
                  aria-label="Record"
                >
                  <Mic className="w-5 h-5 stroke-[2.2]" />
                </button>
              </div>

              {/* Right Column (Desktop Master Detail Preview) */}
              <div className="hidden lg:flex flex-1 flex-col min-h-0 bg-[#0a0b10] overflow-hidden relative">
                {activeDetailId ? (
                  <ConversationDetail
                    id={activeDetailId}
                    isInlineDesktop={true}
                    onBack={() => {
                      setActiveDetailId(null);
                      loadConversations();
                    }}
                  />
                ) : (
                  /* Minimalist Workspace Placeholder */
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-5">
                    <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-violet-400">
                      <Mic className="w-7 h-7 stroke-[1.8]" />
                    </div>

                    <div className="space-y-1.5 max-w-sm">
                      <h3 className="text-base font-bold text-white">
                        No Conversation Selected
                      </h3>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Select a recording from the left pane to view structured notes, or record a new conversation.
                      </p>
                    </div>

                    <div className="flex gap-4 pt-2 text-xs text-gray-400">
                      <div className="px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <span className="font-mono font-bold text-white block">{conversations.length}</span>
                        <span className="text-[10px] text-gray-400">Total Notes</span>
                      </div>
                      <div className="px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <span className="font-mono font-bold text-white block">{pendingTasks.length}</span>
                        <span className="text-[10px] text-gray-400">Pending Tasks</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsRecordingOpen(true)}
                      className="py-2 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Start New Recording</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: TASKS */}
          {/* ========================================================================= */}
          {activeTab === 'tasks' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto px-4 md:px-8 py-5 space-y-4">
              
              <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between shrink-0">
                <form onSubmit={handleAddTask} className="flex-1 flex gap-2 max-w-xl">
                  <input
                    type="text"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    placeholder="Add task to work on..."
                    className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition-all cursor-pointer"
                  >
                    Add
                  </button>
                </form>

                <div className="flex gap-1.5 shrink-0">
                  {(['all', 'pending', 'completed'] as const).map((filter) => {
                    const count = filter === 'all' ? tasks.length : filter === 'pending' ? pendingTasks.length : completedTasks.length;
                    return (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setTaskFilter(filter)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          taskFilter === filter
                            ? 'bg-white/[0.1] text-white font-semibold'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {filter} <span className="text-[10px] text-gray-500">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-28 md:pb-6"
                style={{
                  paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))',
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
                        className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between gap-2.5 transition-all hover:bg-white/[0.04]"
                      >
                        <div className="flex items-start gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleToggleTask(task.id)}
                            className="shrink-0 mt-0.5 cursor-pointer text-gray-500 hover:text-violet-400"
                          >
                            {task.completed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Circle className="w-4 h-4 text-gray-600" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <p className={`text-xs text-white leading-relaxed ${task.completed ? 'line-through text-gray-500' : ''}`}>
                              {task.text}
                            </p>
                            
                            {task.conversationId && (
                              <button
                                onClick={() => {
                                  setActiveDetailId(task.conversationId!);
                                  setActiveTab('feed');
                                }}
                                className="text-[10px] text-violet-400/80 hover:underline mt-1 block truncate"
                              >
                                From: {task.conversationTitle || 'Recording'}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-[10px] text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="col-span-full py-16 text-center text-xs text-gray-400">
                    No tasks in this view.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: WORKING NOTES */}
          {/* ========================================================================= */}
          {activeTab === 'notes' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto px-4 md:px-8 py-5 space-y-4">
              
              <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between shrink-0">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={notesSearchQuery}
                    onChange={(e) => setNotesSearchQuery(e.target.value)}
                    placeholder="Search notes..."
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-8 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
                  />
                </div>

                {!isAddingNote && (
                  <button
                    onClick={() => {
                      setIsAddingNote(true);
                      setNoteTitle('');
                      setNoteContent('');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Note</span>
                  </button>
                )}
              </div>

              {isAddingNote && (
                <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 space-y-3 max-w-xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-violet-400">Create Working Note</h3>
                    <button
                      onClick={() => setIsAddingNote(false)}
                      className="p-1 text-gray-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="Title"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                  />
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Write your note..."
                    rows={4}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none leading-relaxed"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setIsAddingNote(false)}
                      className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!noteTitle.trim()) return;
                        await addWorkingNote(noteTitle, noteContent);
                        setNoteTitle('');
                        setNoteContent('');
                        setIsAddingNote(false);
                        await loadNotes();
                      }}
                      className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}

              <div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-28 md:pb-6"
                style={{
                  paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))',
                }}
              >
                {filteredNotes.length > 0 ? (
                  filteredNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-2 hover:bg-white/[0.04] transition-all flex flex-col justify-between group"
                    >
                      {editingNoteId === note.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editNoteTitle}
                            onChange={(e) => setEditNoteTitle(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
                          />
                          <textarea
                            value={editNoteContent}
                            onChange={(e) => setEditNoteContent(e.target.value)}
                            rows={3}
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white resize-none"
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setEditingNoteId(null)}
                              className="px-2 py-1 text-xs text-gray-400 hover:text-white"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={async () => {
                                if (!editNoteTitle.trim()) return;
                                await updateWorkingNote(note.id, editNoteTitle, editNoteContent);
                                setEditingNoteId(null);
                                await loadNotes();
                              }}
                              className="px-3 py-1 rounded-lg bg-emerald-600 text-xs font-semibold text-white"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-semibold text-xs text-white">
                                {note.title}
                              </h3>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => {
                                    setEditingNoteId(note.id);
                                    setEditNoteTitle(note.title);
                                    setEditNoteContent(note.content);
                                  }}
                                  className="p-1 text-gray-400 hover:text-white"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={async () => {
                                    await deleteWorkingNote(note.id);
                                    await loadNotes();
                                  }}
                                  className="p-1 text-gray-400 hover:text-red-400"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-line">
                              {note.content}
                            </p>
                          </div>

                          <span className="text-[10px] text-gray-500 font-mono pt-1">
                            {new Date(note.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-16 text-center text-xs text-gray-400">
                    No notes found.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: MANUAL & GUIDE */}
          {/* ========================================================================= */}
          {activeTab === 'manual' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto px-4 md:px-8 py-5 space-y-4">
              
              <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between shrink-0">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={manualSearchQuery}
                    onChange={(e) => setManualSearchQuery(e.target.value)}
                    placeholder="Search documentation..."
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-8 pr-4 py-2 text-xs text-white placeholder-gray-550 focus:outline-none focus:border-violet-500/50"
                  />
                </div>

                <button
                  onClick={() => setIsTourOpen(true)}
                  className="px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-xs font-medium text-gray-300 transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Restart Walkthrough Tour</span>
                </button>
              </div>

              <div 
                className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-28 md:pb-6"
                style={{
                  paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))',
                }}
              >
                {filteredSections.map((section) => {
                  const isExpanded = manualSearchQuery ? true : !!expandedSections[section.id];
                  return (
                    <div
                      key={section.id}
                      className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden"
                    >
                      <button
                        onClick={() => {
                          if (!manualSearchQuery) {
                            setExpandedSections(prev => ({
                              ...prev,
                              [section.id]: !prev[section.id]
                            }));
                          }
                        }}
                        className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/[0.02] cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          {section.icon}
                          <span className="font-semibold text-xs text-white">{section.title}</span>
                        </div>
                        <ChevronRight
                          className={`w-3.5 h-3.5 text-gray-500 transition-transform ${isExpanded ? 'rotate-90 text-violet-400' : ''}`}
                        />
                      </button>

                      {isExpanded && (
                        <div className="px-3.5 pb-3.5 pt-1 text-xs text-gray-400 space-y-2 border-t border-white/[0.04]">
                          <p>{section.content}</p>
                          {section.steps && (
                            <ol className="space-y-1.5 list-decimal pl-4 text-gray-400 text-[11px]">
                              {section.steps.map((step, i) => (
                                <li key={i}>{step}</li>
                              ))}
                            </ol>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: FEEDBACK */}
          {/* ========================================================================= */}
          {activeTab === 'feedback' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto px-4 md:px-8 py-5 space-y-4">
              
              <div 
                className="grid grid-cols-1 lg:grid-cols-12 gap-5 pb-28 md:pb-6 max-w-4xl"
                style={{
                  paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))',
                }}
              >
                <div className="lg:col-span-7 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white">Send Feedback & Suggestions</h3>
                    <p className="text-xs text-gray-400">
                      Let us know how we can improve TalkTo or request new features.
                    </p>
                  </div>

                  <form onSubmit={handleSendFeedback} className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-400 mb-1">Your Name</label>
                      <input
                        type="text"
                        value={feedbackName}
                        onChange={(e) => setFeedbackName(e.target.value)}
                        placeholder="Full name"
                        required
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-white placeholder-gray-550 focus:outline-none focus:border-violet-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">Phone</label>
                        <input
                          type="tel"
                          value={feedbackPhone}
                          onChange={(e) => setFeedbackPhone(e.target.value)}
                          placeholder="Phone number"
                          required
                          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-white placeholder-gray-550 focus:outline-none focus:border-violet-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">Email</label>
                        <input
                          type="email"
                          value={feedbackEmail}
                          onChange={(e) => setFeedbackEmail(e.target.value)}
                          placeholder="Email address"
                          required
                          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-white placeholder-gray-550 focus:outline-none focus:border-violet-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-gray-400 mb-1">Message</label>
                      <textarea
                        value={feedbackMessage}
                        onChange={(e) => setFeedbackMessage(e.target.value)}
                        placeholder="Your thoughts, suggestions, or feature requests..."
                        required
                        rows={3}
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-white placeholder-gray-550 focus:outline-none focus:border-violet-500 resize-none leading-relaxed"
                      />
                    </div>

                    {feedbackStatus === 'success' && (
                      <p className="text-emerald-400 text-xs font-medium">✅ Feedback sent successfully!</p>
                    )}

                    <button
                      type="submit"
                      disabled={feedbackStatus === 'sending'}
                      className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-all cursor-pointer"
                    >
                      {feedbackStatus === 'sending' ? 'Sending...' : 'Submit Feedback'}
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-5 space-y-3">
                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2 text-xs">
                    <Shield className="w-4 h-4 text-violet-400" />
                    <h4 className="font-semibold text-white">Cloud Database Sync</h4>
                    <p className="text-gray-400 leading-relaxed text-[11px]">
                      Your conversations sync automatically with your configured MongoDB database server across your devices.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ========================================================================= */}
        {/* MOBILE BOTTOM NAVIGATION BAR (< md:) */}
        {/* ========================================================================= */}
        <nav 
          className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0d0e15]/95 backdrop-blur-md px-2 pt-2 flex items-center justify-around z-30 border-t border-white/[0.06]"
          style={{
            paddingBottom: 'calc(0.6rem + env(safe-area-inset-bottom, 0px))',
          }}
        >
          <button 
            onClick={() => {
              setActiveTab('feed');
              setActiveDetailId(null);
            }}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'feed' ? 'text-violet-400 font-semibold' : 'text-gray-500'
            }`}
          >
            <Home className="w-4 h-4" />
            <span className="text-[9px] uppercase tracking-wider">Feed</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('tasks')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'tasks' ? 'text-violet-400 font-semibold' : 'text-gray-500'
            }`}
          >
            <ListChecks className="w-4 h-4" />
            <span className="text-[9px] uppercase tracking-wider">Tasks</span>
          </button>

          <button 
            onClick={() => setActiveTab('notes')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'notes' ? 'text-violet-400 font-semibold' : 'text-gray-500'
            }`}
          >
            <StickyNote className="w-4 h-4" />
            <span className="text-[9px] uppercase tracking-wider">Notes</span>
          </button>

          <button 
            onClick={() => setActiveTab('manual')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'manual' ? 'text-violet-400 font-semibold' : 'text-gray-500'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span className="text-[9px] uppercase tracking-wider">Manual</span>
          </button>

          <button 
            onClick={() => setActiveTab('feedback')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'feedback' ? 'text-violet-400 font-semibold' : 'text-gray-500'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-[9px] uppercase tracking-wider">Feedback</span>
          </button>
        </nav>

      </div>
    </div>
  );
}
