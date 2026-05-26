'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Edit2, Save, Trash2, Play, Pause, RefreshCw, Calendar, Clock, ListChecks, Star, BookOpen, AlertCircle, Volume2 } from 'lucide-react';
import { getConversation, saveConversation, deleteConversation, ConversationDetail as IConversationDetail } from '@/lib/db';

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
  const [editTakeaways, setEditTakeaways] = useState<string[]>(['', '', '']);
  const [editToWorkOn, setEditToWorkOn] = useState<string[]>([]);
  const [newActionItem, setNewActionItem] = useState('');
  
  // Audio Playback states
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<number | null>(null);

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

  const handleRemoveActionItem = (index: number) => {
    setEditToWorkOn(editToWorkOn.filter((_, i) => i !== index));
  };

  const handleAddActionItem = () => {
    if (newActionItem.trim()) {
      setEditToWorkOn([...editToWorkOn, newActionItem.trim()]);
      setNewActionItem('');
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
    <div className="absolute inset-0 z-30 bg-gray-950 flex flex-col justify-between overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </button>

        <div className="flex items-center gap-2">
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
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 pb-28">
        
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
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <BookOpen className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Conversation Details</h3>
          </div>

          {isEditing ? (
            <textarea
              value={editSummary}
              onChange={(e) => setEditSummary(e.target.value)}
              className="w-full h-28 bg-gray-900 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-violet-500 resize-none leading-relaxed"
              placeholder="What conversation did you have?..."
            />
          ) : (
            <p className="text-sm text-gray-300 leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/5 shadow-inner">
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
              [0, 1, 2].map((idx) => (
                <div key={idx} className="flex gap-2.5 items-center bg-gray-900 border border-white/10 rounded-xl px-4 py-2">
                  <span className="text-xs font-mono font-bold text-violet-400">{idx + 1}.</span>
                  <input
                    type="text"
                    value={editTakeaways[idx] || ''}
                    onChange={(e) => handleTakeawayChange(idx, e.target.value)}
                    className="flex-1 bg-transparent text-sm text-white focus:outline-none"
                    placeholder={`Takeaway ${idx + 1}...`}
                  />
                </div>
              ))
            ) : (
              conversation.structured.takeaways.map((takeaway, idx) => (
                <div
                  key={idx}
                  className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 items-start text-sm shadow-inner"
                >
                  <div className="w-6 h-6 rounded-full bg-violet-600/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-violet-400">{idx + 1}</span>
                  </div>
                  <p className="text-gray-300 leading-relaxed pt-0.5">{takeaway}</p>
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
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-gray-900 border border-white/10 rounded-xl text-sm">
                      <span className="text-white truncate pr-2">{item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveActionItem(idx)}
                        className="text-red-400 hover:text-red-300 font-semibold px-2 py-0.5"
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
                  <p className="text-gray-300 leading-relaxed">{action}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500 italic pl-1">No specific action items recorded.</p>
            )}
          </div>
        </div>

        {/* Raw transcript toggler */}
        <div className="pt-4 border-t border-white/5">
          <details className="group">
            <summary className="list-none flex items-center justify-between text-xs text-gray-500 cursor-pointer hover:text-gray-350 select-none">
              <span>View Raw Speech Transcript</span>
              <span className="transition-transform group-open:rotate-180">▼</span>
            </summary>
            <div className="mt-3 p-4 bg-gray-950/60 rounded-xl border border-white/5 text-xs text-gray-400 leading-relaxed font-serif italic">
              "{conversation.transcript}"
            </div>
          </details>
        </div>

      </div>
    </div>
  );
}
