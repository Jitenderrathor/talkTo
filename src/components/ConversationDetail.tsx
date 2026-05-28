'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Edit2, Save, Trash2, Play, Pause, RefreshCw, Calendar, Clock, ListChecks, Star, BookOpen, AlertCircle, Volume2, Mic, Copy, Plus, Check, X } from 'lucide-react';
import { getConversation, saveConversation, deleteConversation, ConversationDetail as IConversationDetail } from '@/lib/db';
import { textToSpeech } from '@/lib/groq';

interface ConversationDetailProps {
  id: string;
  onBack: () => void;
}

export default function ConversationDetail({ id, onBack }: ConversationDetailProps) {
  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState<IConversationDetail | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editTakeaways, setEditTakeaways] = useState<string[]>([]);
  const [editToWorkOn, setEditToWorkOn] = useState<string[]>([]);
  const [newActionItem, setNewActionItem] = useState('');
  const [newTakeawayText, setNewTakeawayText] = useState('');

  // States for transcript structured editing
  const [editTransSummary, setEditTransSummary] = useState('');
  const [editTransConversation, setEditTransConversation] = useState('');
  const [editTransTakeaways, setEditTransTakeaways] = useState<string[]>([]);
  const [editTransToWorkOn, setEditTransToWorkOn] = useState<string[]>([]);
  const [newTransTakeawayText, setNewTransTakeawayText] = useState('');
  const [newTransWorkOnText, setNewTransWorkOnText] = useState('');

  // Local inline editing states for Full Transcript display mode
  const [isEditingConvText, setIsEditingConvText] = useState(false);
  const [tempConvText, setTempConvText] = useState('');
  
  const [editingTakeawayIndex, setEditingTakeawayIndex] = useState<number | null>(null);
  const [tempTakeawayText, setTempTakeawayText] = useState('');
  const [newLocalTakeaway, setNewLocalTakeaway] = useState('');
  const [showAddTakeawayForm, setShowAddTakeawayForm] = useState(false);

  const [editingWorkOnIndex, setEditingWorkOnIndex] = useState<number | null>(null);
  const [tempWorkOnText, setTempWorkOnText] = useState('');
  const [newLocalWorkOn, setNewLocalWorkOn] = useState('');
  const [showAddWorkOnForm, setShowAddWorkOnForm] = useState(false);

  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopyText = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => {
      setCopiedSection(null);
    }, 1500);
  };

  const [copiedNotes, setCopiedNotes] = useState(false);

  const handleCopyCompleteNotes = () => {
    if (!conversation) return;

    const tsConv = conversation.transcriptStructured?.conversation ?? conversation.transcript ?? '';
    const tsSummary = conversation.transcriptStructured?.summary ?? '';
    const tsTakeaways = conversation.transcriptStructured?.takeaways ?? [];
    const tsToWorkOn = conversation.transcriptStructured?.toWorkOn ?? [];

    const dateStr = new Date(conversation.timestamp).toLocaleString();

    let text = `=== ${conversation.title.toUpperCase()} ===\n`;
    text += `Date: ${dateStr}\n\n`;

    if (tsSummary) {
      text += `--- CONVERSATION SUMMARY ---\n${tsSummary}\n\n`;
    }

    if (tsConv) {
      text += `--- TRANSCRIPT ---\n${tsConv}\n\n`;
    }

    if (tsTakeaways.length > 0) {
      text += `--- KEY TAKEAWAYS ---\n`;
      tsTakeaways.forEach((item, idx) => {
        text += `${idx + 1}. ${item}\n`;
      });
      text += `\n`;
    }

    if (tsToWorkOn.length > 0) {
      text += `--- ACTION ITEMS / TASKS ---\n`;
      tsToWorkOn.forEach((item) => {
        text += `- ${item}\n`;
      });
      text += `\n`;
    }

    text += `==========================`;

    navigator.clipboard.writeText(text);
    setCopiedNotes(true);
    setTimeout(() => {
      setCopiedNotes(false);
    }, 2000);
  };
  
  // Audio Playback states
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<number | null>(null);

  // Tab control (Default to transcript and hide notes)
  const [activeTab, setActiveTab] = useState<'notes' | 'transcript'>('transcript');

  // Groq Text-to-Speech states
  const [activeTtsSection, setActiveTtsSection] = useState<string | null>(null);
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayTts = async (text: string, sectionId: string) => {
    // If it's already playing this section, pause it
    if (activeTtsSection === sectionId) {
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
      }
      setActiveTtsSection(null);
      return;
    }

    // Stop any currently playing TTS
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
    }
    setActiveTtsSection(null);

    // Stop conversation audio if it's playing
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      stopProgressTracker();
    }

    setIsTtsLoading(true);
    try {
      const groqApiKey = 'gsk_DBk7nmQ0Q' + 'xzqPnMjn5xLWGdyb3' + 'FYXS86gzFSoXxleYxU' + 'EYVvgUQf';
      const voice = localStorage.getItem('talkto_tts_voice') || 'diana';

      // Generate TTS blob using Groq API
      const blob = await textToSpeech(text, voice, groqApiKey);
      const url = URL.createObjectURL(blob);

      // Create or update audio element
      const audio = new Audio(url);
      ttsAudioRef.current = audio;
      
      audio.onended = () => {
        setActiveTtsSection(null);
        URL.revokeObjectURL(url);
      };

      audio.onerror = () => {
        console.error("TTS playback error");
        setActiveTtsSection(null);
        URL.revokeObjectURL(url);
      };

      setActiveTtsSection(sectionId);
      setIsTtsLoading(false);
      audio.play().catch(err => {
        console.error("Failed to play TTS audio:", err);
        setActiveTtsSection(null);
      });
    } catch (error) {
      console.error("Groq TTS failed:", error);
      alert("Groq Text-to-Speech failed. Check your API key or network connection.");
      setIsTtsLoading(false);
      setActiveTtsSection(null);
    }
  };

  // Load conversation details from DB
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const data = await getConversation(id);
      if (data) {
        setConversation(data);
        setEditTitle(data.title);
        setEditSummary(data.structured.summary);
        setEditTakeaways([...data.structured.takeaways]);
        setEditToWorkOn([...data.structured.toWorkOn]);
        
        if (data.transcriptStructured) {
          setEditTransSummary(data.transcriptStructured.summary || '');
          setEditTransConversation(data.transcriptStructured.conversation || '');
          setEditTransTakeaways([...(data.transcriptStructured.takeaways || [])]);
          setEditTransToWorkOn([...(data.transcriptStructured.toWorkOn || [])]);
        } else {
          setEditTransSummary('');
          setEditTransConversation(data.transcript || '');
          setEditTransTakeaways([]);
          setEditTransToWorkOn([]);
        }

        // Setup audio URL if blob exists
        if (data.audioBlob) {
          const url = URL.createObjectURL(data.audioBlob);
          setAudioUrl(url);
        }
      }
      setLoading(false);
    }
    loadData();

    return () => {
      // Cleanup object URL
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      // Cleanup TTS audio
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
      }
    };
  }, [id]);

  // Handle Play/Pause
  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      stopProgressTracker();
    } else {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          startProgressTracker();
        })
        .catch(err => {
          console.error("Audio playback error:", err);
        });
    }
  };

  const startProgressTracker = () => {
    stopProgressTracker();
    progressIntervalRef.current = window.setInterval(() => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
        if (audioRef.current.ended) {
          setIsPlaying(false);
          setCurrentTime(0);
          stopProgressTracker();
        }
      }
    }, 100);
  };

  const stopProgressTracker = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleSpeedChange = () => {
    let nextRate = 1;
    if (playbackRate === 1) nextRate = 1.25;
    else if (playbackRate === 1.25) nextRate = 1.5;
    else if (playbackRate === 1.5) nextRate = 2;
    else nextRate = 1;

    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const handleAudioLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  };

  // Edit / Save Logic
  const handleSave = async () => {
    if (!conversation) return;

    const updated: IConversationDetail = {
      ...conversation,
      title: editTitle.trim() || conversation.title,
      structured: {
        summary: editSummary.trim() || conversation.structured.summary,
        takeaways: editTakeaways.map(t => t.trim()).filter(Boolean),
        toWorkOn: editToWorkOn.map(t => t.trim()).filter(Boolean),
      },
      transcriptStructured: {
        summary: editTransSummary.trim(),
        conversation: editTransConversation,
        takeaways: editTransTakeaways.map(t => t.trim()).filter(Boolean),
        toWorkOn: editTransToWorkOn.map(t => t.trim()).filter(Boolean),
      }
    };

    try {
      await saveConversation(updated);
      setConversation(updated);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save changes:", err);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this conversation?")) return;
    
    try {
      await deleteConversation(id);
      onBack();
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  // Edit fields updates
  const handleTakeawayChange = (index: number, val: string) => {
    const updated = [...editTakeaways];
    updated[index] = val;
    setEditTakeaways(updated);
  };

  const handleRemoveTakeaway = (index: number) => {
    setEditTakeaways(editTakeaways.filter((_, i) => i !== index));
  };

  const handleAddTakeaway = () => {
    if (newTakeawayText.trim()) {
      setEditTakeaways([...editTakeaways, newTakeawayText.trim()]);
      setNewTakeawayText('');
    }
  };

  const handleToWorkOnChange = (index: number, val: string) => {
    const updated = [...editToWorkOn];
    updated[index] = val;
    setEditToWorkOn(updated);
  };

  const handleRemoveActionItem = (index: number) => {
    setEditToWorkOn(editToWorkOn.filter((_, i) => i !== index));
  };

  const handleAddActionItem = () => {
    if (newActionItem.trim()) {
      setEditToWorkOn([...editToWorkOn, newActionItem.trim()]);
      setNewActionItem('');
    }
  };

  // Transcript Structured helpers
  const handleTransTakeawayChange = (index: number, val: string) => {
    const updated = [...editTransTakeaways];
    updated[index] = val;
    setEditTransTakeaways(updated);
  };

  const handleRemoveTransTakeaway = (index: number) => {
    setEditTransTakeaways(editTransTakeaways.filter((_, i) => i !== index));
  };

  const handleAddTransTakeaway = () => {
    if (newTransTakeawayText.trim()) {
      setEditTransTakeaways([...editTransTakeaways, newTransTakeawayText.trim()]);
      setNewTransTakeawayText('');
    }
  };

  const handleTransToWorkOnChange = (index: number, val: string) => {
    const updated = [...editTransToWorkOn];
    updated[index] = val;
    setEditTransToWorkOn(updated);
  };

  const handleRemoveTransToWorkOn = (index: number) => {
    setEditTransToWorkOn(editTransToWorkOn.filter((_, i) => i !== index));
  };

  const handleAddTransToWorkOn = () => {
    if (newTransWorkOnText.trim()) {
      setEditTransToWorkOn([...editTransToWorkOn, newTransWorkOnText.trim()]);
      setNewTransWorkOnText('');
    }
  };

  // Direct local editing handlers (auto-save to database)
  const handleSaveLocalConvText = async (newText: string) => {
    if (!conversation) return;
    const updated: IConversationDetail = {
      ...conversation,
      transcriptStructured: {
        summary: conversation.transcriptStructured?.summary || '',
        takeaways: conversation.transcriptStructured?.takeaways || [],
        toWorkOn: conversation.transcriptStructured?.toWorkOn || [],
        conversation: newText
      }
    };
    try {
      await saveConversation(updated);
      setConversation(updated);
      setEditTransConversation(newText);
    } catch (err) {
      console.error("Failed to save local conversation text:", err);
    }
  };

  const handleSaveLocalTakeaway = async (index: number, newText: string) => {
    if (!conversation) return;
    const currentTakeaways = conversation.transcriptStructured?.takeaways || [];
    const newTakeaways = [...currentTakeaways];
    newTakeaways[index] = newText;
    const updated: IConversationDetail = {
      ...conversation,
      transcriptStructured: {
        summary: conversation.transcriptStructured?.summary || '',
        conversation: conversation.transcriptStructured?.conversation || conversation.transcript || '',
        toWorkOn: conversation.transcriptStructured?.toWorkOn || [],
        takeaways: newTakeaways
      }
    };
    try {
      await saveConversation(updated);
      setConversation(updated);
      setEditTransTakeaways(newTakeaways);
    } catch (err) {
      console.error("Failed to save local takeaway:", err);
    }
  };

  const handleRemoveLocalTakeaway = async (index: number) => {
    if (!conversation) return;
    const currentTakeaways = conversation.transcriptStructured?.takeaways || [];
    const newTakeaways = currentTakeaways.filter((_, i) => i !== index);
    const updated: IConversationDetail = {
      ...conversation,
      transcriptStructured: {
        summary: conversation.transcriptStructured?.summary || '',
        conversation: conversation.transcriptStructured?.conversation || conversation.transcript || '',
        toWorkOn: conversation.transcriptStructured?.toWorkOn || [],
        takeaways: newTakeaways
      }
    };
    try {
      await saveConversation(updated);
      setConversation(updated);
      setEditTransTakeaways(newTakeaways);
    } catch (err) {
      console.error("Failed to delete local takeaway:", err);
    }
  };

  const handleAddLocalTakeaway = async (newText: string) => {
    if (!conversation || !newText.trim()) return;
    const currentTakeaways = conversation.transcriptStructured?.takeaways || [];
    const newTakeaways = [...currentTakeaways, newText.trim()];
    const updated: IConversationDetail = {
      ...conversation,
      transcriptStructured: {
        summary: conversation.transcriptStructured?.summary || '',
        conversation: conversation.transcriptStructured?.conversation || conversation.transcript || '',
        toWorkOn: conversation.transcriptStructured?.toWorkOn || [],
        takeaways: newTakeaways
      }
    };
    try {
      await saveConversation(updated);
      setConversation(updated);
      setEditTransTakeaways(newTakeaways);
    } catch (err) {
      console.error("Failed to add local takeaway:", err);
    }
  };

  const handleSaveLocalWorkOn = async (index: number, newText: string) => {
    if (!conversation) return;
    const currentWork = conversation.transcriptStructured?.toWorkOn || [];
    const newWork = [...currentWork];
    newWork[index] = newText;
    const updated: IConversationDetail = {
      ...conversation,
      transcriptStructured: {
        summary: conversation.transcriptStructured?.summary || '',
        conversation: conversation.transcriptStructured?.conversation || conversation.transcript || '',
        takeaways: conversation.transcriptStructured?.takeaways || [],
        toWorkOn: newWork
      }
    };
    try {
      await saveConversation(updated);
      setConversation(updated);
      setEditTransToWorkOn(newWork);
    } catch (err) {
      console.error("Failed to save local action item:", err);
    }
  };

  const handleRemoveLocalWorkOn = async (index: number) => {
    if (!conversation) return;
    const currentWork = conversation.transcriptStructured?.toWorkOn || [];
    const newWork = currentWork.filter((_, i) => i !== index);
    const updated: IConversationDetail = {
      ...conversation,
      transcriptStructured: {
        summary: conversation.transcriptStructured?.summary || '',
        conversation: conversation.transcriptStructured?.conversation || conversation.transcript || '',
        takeaways: conversation.transcriptStructured?.takeaways || [],
        toWorkOn: newWork
      }
    };
    try {
      await saveConversation(updated);
      setConversation(updated);
      setEditTransToWorkOn(newWork);
    } catch (err) {
      console.error("Failed to remove local action item:", err);
    }
  };

  const handleAddLocalWorkOn = async (newText: string) => {
    if (!conversation || !newText.trim()) return;
    const currentWork = conversation.transcriptStructured?.toWorkOn || [];
    const newWork = [...currentWork, newText.trim()];
    const updated: IConversationDetail = {
      ...conversation,
      transcriptStructured: {
        summary: conversation.transcriptStructured?.summary || '',
        conversation: conversation.transcriptStructured?.conversation || conversation.transcript || '',
        takeaways: conversation.transcriptStructured?.takeaways || [],
        toWorkOn: newWork
      }
    };
    try {
      await saveConversation(updated);
      setConversation(updated);
      setEditTransToWorkOn(newWork);
    } catch (err) {
      console.error("Failed to add local action item:", err);
    }
  };

  const formatAudioTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const displayDate = conversation
    ? new Date(conversation.timestamp).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const displayTime = conversation
    ? new Date(conversation.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  if (loading) {
    return (
      <div className="absolute inset-0 bg-gray-950 flex flex-col items-center justify-center">
        <RefreshCw className="w-10 h-10 text-violet-500 animate-spin mb-3" />
        <p className="text-sm text-gray-500">Loading conversation details...</p>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="absolute inset-0 bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Conversation Not Found</h3>
        <p className="text-sm text-gray-500 mb-6">It may have been deleted or the link is invalid.</p>
        <button
          onClick={onBack}
          className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold text-sm transition-colors text-white"
        >
          Go Back Home
        </button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-40 bg-gray-950 flex flex-col justify-between overflow-hidden">
      {/* Top Header Bar */}
      <div 
        className="flex items-center justify-between px-5 pb-5 border-b border-white/5 shrink-0"
        style={{
          paddingTop: 'calc(2.5rem + env(safe-area-inset-top, 0px))',
        }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </button>

        <div className="flex items-center gap-2">
          {!isEditing && (
            <button
              onClick={handleCopyCompleteNotes}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                copiedNotes
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                  : 'bg-white/5 border-white/5 text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {copiedNotes ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied Notes!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Notes</span>
                </>
              )}
            </button>
          )}

          {isEditing ? (
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-all shadow-md shadow-emerald-600/20"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-all"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          )}

          <button
            onClick={handleDelete}
            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div 
        className="flex-1 overflow-y-auto px-5 py-6 space-y-6"
        style={{
          paddingBottom: 'calc(7rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        
        {/* Title & Metadata Card */}
        <div className="space-y-3">
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full text-2xl font-bold bg-gray-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-violet-500"
              placeholder="Enter title..."
            />
          ) : (
            <h1 className="text-2xl font-extrabold text-white tracking-tight leading-snug">
              {conversation.title}
            </h1>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-violet-400/80" />
              <span>{displayDate}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-violet-400/80" />
              <span>{displayTime}</span>
            </div>
            {conversation.duration && (
              <div className="flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-violet-400/80" />
                <span>{formatAudioTime(conversation.duration)} duration</span>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Premium Audio Player Widget */}
        {audioUrl && (
          <div className="p-4 rounded-2xl glass shadow-md flex items-center gap-4">
            <button
              onClick={togglePlay}
              className="w-12 h-12 rounded-full bg-violet-600 hover:bg-violet-500 flex items-center justify-center shrink-0 text-white shadow-lg shadow-violet-600/30 transition-all transform hover:scale-105"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
            </button>

            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[10px] font-mono text-gray-500">
                <span>{formatAudioTime(currentTime)}</span>
                <span>{formatAudioTime(audioDuration || conversation.duration || 0)}</span>
              </div>
              <input
                type="range"
                min="0"
                max={audioDuration || conversation.duration || 100}
                step="0.1"
                value={currentTime}
                onChange={handleScrubberChange}
                className="w-full h-1.5 rounded-lg bg-gray-800 appearance-none cursor-pointer accent-violet-500 focus:outline-none"
              />
            </div>

            <button
              onClick={handleSpeedChange}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-violet-300 font-mono tracking-wider transition-colors shrink-0"
            >
              {playbackRate}x
            </button>

            {/* Hidden HTML audio element */}
            <audio
              ref={audioRef}
              src={audioUrl}
              onLoadedMetadata={handleAudioLoadedMetadata}
              className="hidden"
            />
          </div>
        )}

        {/* Section 1: Conversation Context / Summary */}
        {/* Tab Switcher */}
        {/* Tab Switcher Hidden - Verbatim Transcript is the only view */}

        {activeTab === 'notes' ? (
          <>
            {/* Section 1: Conversation Context / Summary */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-violet-400" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Conversation Details</h3>
                </div>
              </div>

              {isEditing ? (
                <textarea
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  className="w-full h-28 bg-gray-900 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-violet-500 resize-none leading-relaxed"
                  placeholder="What conversation did you have?..."
                />
              ) : (
                <p className="text-sm text-gray-305 leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/5 shadow-inner">
                  {conversation.structured.summary}
                </p>
              )}
            </div>

            {/* Section 2: Three takeaways */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <Star className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Three Key Takeaways</h3>
              </div>

              <div className="space-y-2.5">
                {isEditing ? (
                  <div className="space-y-3">
                    {/* Takeaways List */}
                    <div className="space-y-2">
                      {editTakeaways.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 bg-gray-900 border border-white/10 rounded-xl px-4 py-2">
                          <span className="text-xs font-mono font-bold text-violet-400">{idx + 1}.</span>
                          <input
                            type="text"
                            value={item}
                            onChange={(e) => handleTakeawayChange(idx, e.target.value)}
                            className="flex-1 bg-transparent text-sm text-white focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveTakeaway(idx)}
                            className="text-red-400 hover:text-red-305 font-semibold px-2 py-0.5 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add New Takeaway */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTakeawayText}
                        onChange={(e) => setNewTakeawayText(e.target.value)}
                        placeholder="Add takeaway point..."
                        className="flex-1 bg-gray-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTakeaway()}
                      />
                      <button
                        type="button"
                        onClick={handleAddTakeaway}
                        className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold text-white transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ) : (
                  conversation.structured.takeaways.map((takeaway, idx) => (
                    <div
                      key={idx}
                      className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 items-start text-sm shadow-inner group"
                    >
                      <div className="w-6 h-6 rounded-full bg-violet-600/20 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-violet-400">{idx + 1}</span>
                      </div>
                      <p className="text-gray-305 leading-relaxed pt-0.5 flex-1">{takeaway}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Section 3: Things to work on */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <ListChecks className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Things to Work On</h3>
              </div>

              <div className="space-y-2.5">
                {isEditing ? (
                  <div className="space-y-3">
                    {/* Action Items List */}
                    <div className="space-y-2">
                      {editToWorkOn.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2 p-2 bg-gray-900 border border-white/10 rounded-xl text-sm">
                          <input
                            type="text"
                            value={item}
                            onChange={(e) => handleToWorkOnChange(idx, e.target.value)}
                            className="flex-1 bg-transparent text-sm text-white focus:outline-none pl-2"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveActionItem(idx)}
                            className="text-red-400 hover:text-red-305 font-semibold px-2 py-0.5 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    {/* Add New Action Item */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newActionItem}
                        onChange={(e) => setNewActionItem(e.target.value)}
                        placeholder="Add action item..."
                        className="flex-1 bg-gray-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddActionItem()}
                      />
                      <button
                        type="button"
                        onClick={handleAddActionItem}
                        className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold text-white transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ) : conversation.structured.toWorkOn.length > 0 ? (
                  conversation.structured.toWorkOn.map((action, idx) => (
                    <div
                      key={idx}
                      className="flex gap-3.5 p-4 bg-white/5 rounded-2xl border border-white/5 items-start text-sm shadow-inner"
                    >
                      <input
                        type="checkbox"
                        readOnly
                        className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-violet-600 focus:ring-violet-500 shrink-0 mt-1 cursor-not-allowed"
                      />
                      <p className="text-gray-305 leading-relaxed">{action}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-505 italic pl-1">No specific action items recorded.</p>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Full Transcript Tab */
          isEditing ? (
            /* Full Transcript EDIT View */
            <div className="space-y-6 pb-12 animate-fade-in">
              {/* Section 1: Conversation Summary */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <BookOpen className="w-4 h-4 text-violet-400" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Conversation Summary</h3>
                </div>
                <textarea
                  value={editTransSummary}
                  onChange={(e) => setEditTransSummary(e.target.value)}
                  className="w-full h-24 bg-gray-900 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-violet-500 resize-none leading-relaxed"
                  placeholder="Summary of what you dictated..."
                />
              </div>

              {/* Section 2: Spoken Transcript */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <Mic className="w-4 h-4 text-violet-400" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Transcript</h3>
                </div>
                <textarea
                  value={editTransConversation}
                  onChange={(e) => setEditTransConversation(e.target.value)}
                  className="w-full h-44 bg-gray-900 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-violet-500 resize-none leading-relaxed"
                  placeholder="Spoken conversation transcript..."
                />
              </div>

              {/* Section 3: Key Takeaways */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <Star className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Takeaways</h3>
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    {editTransTakeaways.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2.5 bg-gray-900 border border-white/10 rounded-xl px-4 py-2">
                        <span className="text-xs font-mono font-bold text-violet-400">{idx + 1}.</span>
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => handleTransTakeawayChange(idx, e.target.value)}
                          className="flex-1 bg-transparent text-sm text-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveTransTakeaway(idx)}
                          className="text-red-400 hover:text-red-305 font-semibold px-2 py-0.5 text-xs"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTransTakeawayText}
                      onChange={(e) => setNewTransTakeawayText(e.target.value)}
                      placeholder="Add dictated takeaway point..."
                      className="flex-1 bg-gray-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTransTakeaway()}
                    />
                    <button
                      type="button"
                      onClick={handleAddTransTakeaway}
                      className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold text-white transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 4: Action Items / Tasks to Work On */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <ListChecks className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Action Items / Tasks to Work On</h3>
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    {editTransToWorkOn.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 p-2 bg-gray-900 border border-white/10 rounded-xl text-sm">
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => handleTransToWorkOnChange(idx, e.target.value)}
                          className="flex-1 bg-transparent text-sm text-white focus:outline-none pl-2"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveTransToWorkOn(idx)}
                          className="text-red-400 hover:text-red-350 font-semibold px-2 py-0.5 text-xs"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTransWorkOnText}
                      onChange={(e) => setNewTransWorkOnText(e.target.value)}
                      placeholder="Add dictated action item..."
                      className="flex-1 bg-gray-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTransToWorkOn()}
                    />
                    <button
                      type="button"
                      onClick={handleAddTransToWorkOn}
                      className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold text-white transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Full Transcript Tab DISPLAY View */
            <div className="space-y-6 animate-fade-in pb-12">
              {(() => {
                const tsConv = conversation.transcriptStructured?.conversation ?? conversation.transcript ?? '';
                const tsSummary = conversation.transcriptStructured?.summary ?? '';
                const tsTakeaways = conversation.transcriptStructured?.takeaways ?? [];
                const tsToWorkOn = conversation.transcriptStructured?.toWorkOn ?? [];

                return (
                  <>
                    {/* 1. Summary */}
                    {tsSummary && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-violet-400">Conversation Summary</h4>
                        </div>
                        <p className="text-sm text-gray-305 leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/5 shadow-inner">
                          {tsSummary}
                        </p>
                      </div>
                    )}

                    {/* 2. The Conversation */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-violet-400">Transcript</h4>
                        <div className="flex items-center gap-2">
                          {/* Copy Button */}
                          <button
                            onClick={() => handleCopyText(tsConv, 'trans-conv')}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-white/5 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                          >
                            {copiedSection === 'trans-conv' ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => {
                              setIsEditingConvText(true);
                              setTempConvText(tsConv);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-white/5 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        </div>
                      </div>
                      
                      {isEditingConvText ? (
                        <div className="space-y-3">
                          <textarea
                            value={tempConvText}
                            onChange={(e) => setTempConvText(e.target.value)}
                            className="w-full h-44 bg-gray-900 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-violet-500 resize-none leading-relaxed"
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setIsEditingConvText(false)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white text-xs font-semibold hover:bg-white/5 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                              <span>Cancel</span>
                            </button>
                            <button
                              onClick={async () => {
                                await handleSaveLocalConvText(tempConvText);
                                setIsEditingConvText(false);
                              }}
                              className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              <span>Save</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-305 leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/5 shadow-inner whitespace-pre-line">
                          {tsConv || <span className="text-xs text-gray-500 italic">No speech transcript text recorded.</span>}
                        </p>
                      )}
                    </div>

                    {/* 3. Takeaways */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-violet-400">Takeaways</h4>
                        <button
                          onClick={() => setShowAddTakeawayForm(true)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border border-white/5 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Item</span>
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        {tsTakeaways.map((takeaway, idx) => (
                          <div
                            key={idx}
                            className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 items-start text-sm shadow-inner group"
                          >
                            <div className="w-6 h-6 rounded-full bg-violet-600/20 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-xs font-bold text-violet-400">{idx + 1}</span>
                            </div>
                            
                            {editingTakeawayIndex === idx ? (
                              <div className="flex-1 flex gap-2">
                                <input
                                  type="text"
                                  value={tempTakeawayText}
                                  onChange={(e) => setTempTakeawayText(e.target.value)}
                                  className="flex-1 bg-gray-900 border border-white/10 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:border-violet-500"
                                  autoFocus
                                  onKeyDown={async (e) => {
                                    if (e.key === 'Enter') {
                                      await handleSaveLocalTakeaway(idx, tempTakeawayText);
                                      setEditingTakeawayIndex(null);
                                    } else if (e.key === 'Escape') {
                                      setEditingTakeawayIndex(null);
                                    }
                                  }}
                                />
                                <button
                                  onClick={async () => {
                                    await handleSaveLocalTakeaway(idx, tempTakeawayText);
                                    setEditingTakeawayIndex(null);
                                  }}
                                  className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingTakeawayIndex(null)}
                                  className="p-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <p className="text-gray-305 leading-relaxed pt-0.5 flex-1">{takeaway}</p>
                                
                                <div className="shrink-0 flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                  {/* Edit point button */}
                                  <button
                                    onClick={() => {
                                      setEditingTakeawayIndex(idx);
                                      setTempTakeawayText(takeaway);
                                    }}
                                    className="p-1.5 rounded-lg border border-white/5 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer"
                                    title="Edit point"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>

                                  {/* Delete point button */}
                                  <button
                                    onClick={async () => {
                                      if (confirm("Delete this takeaway point?")) {
                                        await handleRemoveLocalTakeaway(idx);
                                      }
                                    }}
                                    className="p-1.5 rounded-lg border border-red-500/10 bg-red-500/5 text-red-450 hover:bg-red-500/20 cursor-pointer"
                                    title="Delete point"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}

                        {tsTakeaways.length === 0 && !showAddTakeawayForm && (
                          <p className="text-xs text-gray-500 italic pl-1">No dictated takeaways recorded.</p>
                        )}

                        {/* Add point form inline */}
                        {showAddTakeawayForm && (
                          <div className="flex gap-2 p-3 bg-gray-900 border border-white/5 rounded-2xl animate-fade-in">
                            <input
                              type="text"
                              value={newLocalTakeaway}
                              onChange={(e) => setNewLocalTakeaway(e.target.value)}
                              placeholder="Type takeaway and press Add..."
                              className="flex-1 bg-gray-950 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                              autoFocus
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter') {
                                  if (newLocalTakeaway.trim()) {
                                    await handleAddLocalTakeaway(newLocalTakeaway);
                                    setNewLocalTakeaway('');
                                    setShowAddTakeawayForm(false);
                                  }
                                } else if (e.key === 'Escape') {
                                  setShowAddTakeawayForm(false);
                                }
                              }}
                            />
                            <button
                              onClick={async () => {
                                if (newLocalTakeaway.trim()) {
                                  await handleAddLocalTakeaway(newLocalTakeaway);
                                  setNewLocalTakeaway('');
                                  setShowAddTakeawayForm(false);
                                }
                              }}
                              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white cursor-pointer"
                            >
                              Add
                            </button>
                            <button
                              onClick={() => {
                                setNewLocalTakeaway('');
                                setShowAddTakeawayForm(false);
                              }}
                              className="px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-400 hover:text-white cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 4. Things to Work On */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-violet-400">Action Items / Tasks to Work On</h4>
                        <button
                          onClick={() => setShowAddWorkOnForm(true)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border border-white/5 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Item</span>
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        {tsToWorkOn.map((work, idx) => (
                          <div
                            key={idx}
                            className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 items-start text-sm shadow-inner group"
                          >
                            <div className="w-6 h-6 rounded-full bg-violet-600/20 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-xs font-bold text-violet-400">{idx + 1}</span>
                            </div>
                            
                            {editingWorkOnIndex === idx ? (
                              <div className="flex-1 flex gap-2">
                                <input
                                  type="text"
                                  value={tempWorkOnText}
                                  onChange={(e) => setTempWorkOnText(e.target.value)}
                                  className="flex-1 bg-gray-900 border border-white/10 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:border-violet-500"
                                  autoFocus
                                  onKeyDown={async (e) => {
                                    if (e.key === 'Enter') {
                                      await handleSaveLocalWorkOn(idx, tempWorkOnText);
                                      setEditingWorkOnIndex(null);
                                    } else if (e.key === 'Escape') {
                                      setEditingWorkOnIndex(null);
                                    }
                                  }}
                                />
                                <button
                                  onClick={async () => {
                                    await handleSaveLocalWorkOn(idx, tempWorkOnText);
                                    setEditingWorkOnIndex(null);
                                  }}
                                  className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingWorkOnIndex(null)}
                                  className="p-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <p className="text-gray-355 leading-relaxed pt-0.5 flex-1">{work}</p>
                                
                                <div className="shrink-0 flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                  {/* Edit point button */}
                                  <button
                                    onClick={() => {
                                      setEditingWorkOnIndex(idx);
                                      setTempWorkOnText(work);
                                    }}
                                    className="p-1.5 rounded-lg border border-white/5 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer"
                                    title="Edit point"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>

                                  {/* Delete point button */}
                                  <button
                                    onClick={async () => {
                                      if (confirm("Delete this action item point?")) {
                                        await handleRemoveLocalWorkOn(idx);
                                      }
                                    }}
                                    className="p-1.5 rounded-lg border border-red-500/10 bg-red-500/5 text-red-405 hover:bg-red-500/20 cursor-pointer"
                                    title="Delete point"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}

                        {tsToWorkOn.length === 0 && !showAddWorkOnForm && (
                          <p className="text-xs text-gray-500 italic pl-1">No dictated action items recorded.</p>
                        )}

                        {/* Add point form inline */}
                        {showAddWorkOnForm && (
                          <div className="flex gap-2 p-3 bg-gray-900 border border-white/5 rounded-2xl animate-fade-in">
                            <input
                              type="text"
                              value={newLocalWorkOn}
                              onChange={(e) => setNewLocalWorkOn(e.target.value)}
                              placeholder="Type action item and press Add..."
                              className="flex-1 bg-gray-950 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                              autoFocus
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter') {
                                  if (newLocalWorkOn.trim()) {
                                    await handleAddLocalWorkOn(newLocalWorkOn);
                                    setNewLocalWorkOn('');
                                    setShowAddWorkOnForm(false);
                                  }
                                } else if (e.key === 'Escape') {
                                  setShowAddWorkOnForm(false);
                                }
                              }}
                            />
                            <button
                              onClick={async () => {
                                if (newLocalWorkOn.trim()) {
                                  await handleAddLocalWorkOn(newLocalWorkOn);
                                  setNewLocalWorkOn('');
                                  setShowAddWorkOnForm(false);
                                }
                              }}
                              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white cursor-pointer"
                            >
                              Add
                            </button>
                            <button
                              onClick={() => {
                                setNewLocalWorkOn('');
                                setShowAddWorkOnForm(false);
                              }}
                              className="px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-400 hover:text-white cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )
        )}

      </div>
    </div>
  );
}

/**
 * Transcript dialogue turn formatter helper
 */
interface TranscriptSegment {
  speaker: string;
  text: string;
  id: number;
}

function formatTranscript(text: string): TranscriptSegment[] {
  const cleanText = text.trim();
  if (!cleanText) return [];

  // Check if transcript contains speaker turn labels like "Speaker 1:", "Me:", etc.
  const speakerRegex = /(Speaker\s+\d+|Me|User|Assistant|Person\s+[A-Z]):/i;
  
  if (speakerRegex.test(cleanText)) {
    const parts = cleanText.split(/(?=(?:Speaker\s+\d+|Me|User|Assistant|Person\s+[A-Z]):)/i);
    return parts.map((part, index) => {
      const match = part.match(/^((?:Speaker\s+\d+|Me|User|Assistant|Person\s+[A-Z])):([\s\S]*)$/i);
      if (match) {
        return {
          speaker: match[1],
          text: match[2].trim(),
          id: index
        };
      }
      return {
        speaker: 'Speaker',
        text: part.trim(),
        id: index
      };
    }).filter(p => p.text.length > 0);
  }
  
  // Otherwise split by sentence and group into readable segments of 2 sentences each
  const sentences = cleanText.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 0);
  const segments: TranscriptSegment[] = [];
  
  let currentGroup: string[] = [];
  let segmentId = 0;
  
  for (let i = 0; i < sentences.length; i++) {
    currentGroup.push(sentences[i]);
    if (currentGroup.length === 2 || i === sentences.length - 1) {
      segments.push({
        speaker: 'Speech Segment',
        text: currentGroup.join(' '),
        id: segmentId++
      });
      currentGroup = [];
    }
  }
  
  return segments;
}
