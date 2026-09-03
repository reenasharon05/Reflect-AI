import React, { useState, useEffect, useRef } from 'react';
import { LandingPage } from './components/LandingPage';
import { Navbar } from './components/Navbar';
import { ReflectionSidebar } from './components/ReflectionSidebar';
import { ReflectionEditor } from './components/ReflectionEditor';
import { ConversationPanel } from './components/ConversationPanel';
import { MoodTrendChart } from './components/MoodTrendChart';
import { ThreatModelModal } from './components/ThreatModelModal';
import { UserProfile, ReflectionEntry, ChatMessage } from './types';
import { useTheme } from './context/ThemeContext';
import {
  subscribeToAuth,
  subscribeToUserReflections,
  saveReflectionToFirestore,
  deleteReflectionFromFirestore
} from './lib/firebase';
import { Menu, MessageSquare, Edit3, TrendingUp } from 'lucide-react';

export default function App() {
  const { syncWithUser } = useTheme();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'journal' | 'trends'>('journal');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [isThreatModalOpen, setIsThreatModalOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<'editor' | 'dialogue'>('editor');
  const [prefilledChatPrompt, setPrefilledChatPrompt] = useState<string | undefined>(undefined);

  // Auto-save debounce timer ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Subscribe to Firebase Auth
  useEffect(() => {
    const unsubscribe = subscribeToAuth((firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
      if (firebaseUser?.uid) {
        syncWithUser(firebaseUser.uid);
      }
    });
    return () => unsubscribe();
  }, [syncWithUser]);


  // 2. Subscribe to user's reflections in Cloud Firestore
  useEffect(() => {
    if (!user?.uid) {
      setReflections([]);
      setSelectedEntryId(null);
      return;
    }

    const unsubscribe = subscribeToUserReflections(
      user.uid,
      (entries) => {
        setReflections(entries);
        // Select first entry if none is currently selected
        setSelectedEntryId((prevId) => {
          if (prevId && entries.some((e) => e.id === prevId)) {
            return prevId;
          }
          return entries.length > 0 ? entries[0].id : null;
        });
      },
      (err) => {
        console.error('Error fetching reflections:', err);
        setSaveError('Failed to sync with Firestore. Please check your network.');
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Selected entry object
  const selectedEntry = reflections.find((r) => r.id === selectedEntryId) || null;

  // Handler: Create new reflection
  const handleNewReflection = async () => {
    if (!user) return;
    const now = Date.now();
    const newEntry: ReflectionEntry = {
      id: 'ref-' + now,
      userId: user.uid,
      title: `Reflection on ${new Date(now).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })}`,
      content: '',
      summary: '',
      tags: ['Daily'],
      mood: 'thoughtful',
      createdAt: now,
      updatedAt: now,
      messages: [],
    };

    try {
      setIsSaving(true);
      await saveReflectionToFirestore(user.uid, newEntry);
      setSelectedEntryId(newEntry.id);
      setMobileActiveTab('editor');
    } catch (err: any) {
      console.error('Failed to create new reflection:', err);
      setSaveError(err?.message || 'Could not create new reflection in Firestore');
    } finally {
      setIsSaving(false);
    }
  };

  // Handler: Delete reflection
  const handleDeleteReflection = async (id: string) => {
    if (!user) return;
    try {
      await deleteReflectionFromFirestore(user.uid, id);
      if (selectedEntryId === id) {
        const remaining = reflections.filter((r) => r.id !== id);
        setSelectedEntryId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err: any) {
      console.error('Delete error:', err);
      setSaveError('Could not delete reflection: ' + err.message);
    }
  };

  // Handler: Update active reflection
  const handleUpdateEntry = (updates: Partial<ReflectionEntry>) => {
    if (!selectedEntry || !user) return;

    const updated = {
      ...selectedEntry,
      ...updates,
      updatedAt: Date.now(),
    };

    // Optimistic local update
    setReflections((prev) =>
      prev.map((item) => (item.id === selectedEntry.id ? updated : item))
    );

    // Debounce auto-save to Firestore
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSaving(true);
        setSaveError(null);
        await saveReflectionToFirestore(user.uid, updated);
      } catch (err: any) {
        console.error('Auto-save error:', err);
        setSaveError(err.message || 'Auto-save failed');
      } finally {
        setIsSaving(false);
      }
    }, 800);
  };

  // Explicit Save Handler
  const handleExplicitSave = async () => {
    if (!selectedEntry || !user) return;
    try {
      setIsSaving(true);
      setSaveError(null);
      await saveReflectionToFirestore(user.uid, selectedEntry);
    } catch (err: any) {
      console.error('Explicit save error:', err);
      setSaveError(err.message || 'Failed to save to Firestore');
    } finally {
      setIsSaving(false);
    }
  };

  // Handler: Add multi-turn message to reflection
  const handleAddMessage = async (userMsg: ChatMessage, modelMsg: ChatMessage) => {
    if (!selectedEntry || !user) return;

    const updatedMessages = [...(selectedEntry.messages || []), userMsg, modelMsg];
    const updatedEntry: ReflectionEntry = {
      ...selectedEntry,
      messages: updatedMessages,
      updatedAt: Date.now(),
    };

    // Optimistically update
    setReflections((prev) =>
      prev.map((item) => (item.id === selectedEntry.id ? updatedEntry : item))
    );

    // Persist immediately to Firestore
    try {
      setIsSaving(true);
      setSaveError(null);
      await saveReflectionToFirestore(user.uid, updatedEntry);
    } catch (err: any) {
      console.error('Message save error:', err);
      setSaveError('Dialogue generated, but failed to persist to Firestore.');
    } finally {
      setIsSaving(false);
    }
  };

  // Quick switch from Brainstorm question to Chat
  const handleStartChatWithPrompt = (prompt: string) => {
    setPrefilledChatPrompt(prompt);
    setMobileActiveTab('dialogue');
  };

  // Loading state
  if (authLoading) {
    return (
      <div id="auth-loading-spinner" className="min-h-screen bg-[#F5F5F0] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#D9D7CE] border-t-[#5A5A40] rounded-full animate-spin" />
          <p className="text-xs font-serif font-semibold text-[#5A5A40] tracking-wide">
            Authenticating with Firebase...
          </p>
        </div>
      </div>
    );
  }

  // Unauthenticated -> Landing page
  if (!user) {
    return (
      <>
        <LandingPage onOpenThreatModel={() => setIsThreatModalOpen(true)} />
        <ThreatModelModal
          isOpen={isThreatModalOpen}
          onClose={() => setIsThreatModalOpen(false)}
        />
      </>
    );
  }

  // Authenticated -> Dashboard
  return (
    <div id="dashboard-root" className="min-h-screen bg-[#F5F5F0] flex flex-col h-screen overflow-hidden text-[#333333]">
      {/* Top Navbar */}
      <Navbar
        user={user}
        activeView={activeView}
        onToggleView={setActiveView}
        onNewReflection={handleNewReflection}
        onOpenThreatModel={() => setIsThreatModalOpen(true)}
        isSaving={isSaving}
      />

      {/* Mobile Top Bar to toggle sidebar & tabs */}
      <div className="md:hidden bg-[#FDFCF9] border-b border-[#D9D7CE] px-4 py-2 flex items-center justify-between">
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="p-1.5 rounded-lg text-[#5A5A40] hover:bg-[#EDEBE4] flex items-center gap-1.5 text-xs font-medium"
        >
          <Menu className="w-4 h-4" />
          <span>Reflections ({reflections.length})</span>
        </button>

        <div className="flex items-center gap-1 bg-[#EDEBE4] border border-[#D9D7CE] p-0.5 rounded-lg text-xs">
          {activeView === 'journal' ? (
            <>
              <button
                onClick={() => setMobileActiveTab('editor')}
                className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                  mobileActiveTab === 'editor'
                    ? 'bg-[#FDFCF9] text-[#2C2C24] shadow-xs'
                    : 'text-[#706E64]'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Journal</span>
              </button>
              <button
                onClick={() => setMobileActiveTab('dialogue')}
                className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                  mobileActiveTab === 'dialogue'
                    ? 'bg-[#FDFCF9] text-[#2C2C24] shadow-xs'
                    : 'text-[#706E64]'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Gemini ({selectedEntry?.messages?.length || 0})</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setActiveView('journal')}
              className="px-3 py-1 rounded-md font-medium bg-[#FDFCF9] text-[#2C2C24] shadow-xs flex items-center gap-1"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#5A5A40]" />
              <span>Back to Journal</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <ReflectionSidebar
          entries={reflections}
          selectedId={selectedEntryId}
          onSelectEntry={(entry) => {
            setSelectedEntryId(entry.id);
            setActiveView('journal');
          }}
          onNewEntry={() => {
            setActiveView('journal');
            handleNewReflection();
          }}
          onDeleteEntry={handleDeleteReflection}
          isOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          onOpenTrends={() => setActiveView('trends')}
        />

        {/* Content Area (Journal + Chat OR Mood Trend Chart) */}
        {activeView === 'trends' ? (
          <MoodTrendChart
            entries={reflections}
            onSelectEntry={(entry) => {
              setSelectedEntryId(entry.id);
              setActiveView('journal');
            }}
            onNewEntry={() => {
              setActiveView('journal');
              handleNewReflection();
            }}
          />
        ) : (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {selectedEntry ? (
              <>
                {/* Journal Editor Panel */}
                <div
                  className={`flex-1 overflow-hidden h-full ${
                    mobileActiveTab === 'dialogue' ? 'hidden md:flex md:w-1/2' : 'flex'
                  }`}
                >
                  <ReflectionEditor
                    entry={selectedEntry}
                    onUpdateEntry={handleUpdateEntry}
                    onSaveEntry={handleExplicitSave}
                    isSaving={isSaving}
                    saveError={saveError}
                    onStartChatWithPrompt={handleStartChatWithPrompt}
                  />
                </div>

                {/* Gemini Dialogue Panel */}
                <div
                  className={`flex-1 md:w-[420px] lg:w-[480px] xl:w-[520px] overflow-hidden h-full shrink-0 ${
                    mobileActiveTab === 'editor' ? 'hidden md:flex' : 'flex'
                  }`}
                >
                  <ConversationPanel
                    entry={selectedEntry}
                    onAddMessage={handleAddMessage}
                    isSaving={isSaving}
                    prefilledPrompt={prefilledChatPrompt}
                    onClearPrefilledPrompt={() => setPrefilledChatPrompt(undefined)}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#F5F5F0]">
                <div className="max-w-md space-y-4">
                  <h3 className="text-xl font-serif font-bold text-[#2C2C24]">Your Personal Journal & Reflection Space</h3>
                  <p className="text-xs text-[#706E64] leading-relaxed">
                    Start your first entry to unpack your thoughts, discover Socratic insights, and converse with Gemini 3.6 Flash.
                  </p>
                  <button
                    id="empty-state-new-reflection-btn"
                    onClick={handleNewReflection}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#5A5A40] text-[#F5F5F0] rounded-xl text-xs font-semibold hover:bg-[#4A4A30] transition-all shadow-sm"
                  >
                    Create New Reflection
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Threat Model Modal */}
      <ThreatModelModal
        isOpen={isThreatModalOpen}
        onClose={() => setIsThreatModalOpen(false)}
      />
    </div>
  );
}
