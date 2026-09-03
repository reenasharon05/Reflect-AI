import React, { useState, useEffect } from 'react';
import { Sparkles, Brain, Save, Tag, X, Check, RefreshCw, AlertCircle, MessageSquare, Activity, TrendingUp, Info, MapPin, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import { ReflectionEntry, EntryLocation } from '../types';
import { LocationPickerModal } from './LocationPickerModal';
import { MapPinView } from './MapPinView';

interface ReflectionEditorProps {
  entry: ReflectionEntry;
  onUpdateEntry: (updated: Partial<ReflectionEntry>) => void;
  onSaveEntry: () => Promise<void>;
  isSaving: boolean;
  saveError: string | null;
  onStartChatWithPrompt?: (prompt: string) => void;
}

const MOODS = [
  { id: 'thoughtful', label: 'Thoughtful', emoji: '🍂' },
  { id: 'calm', label: 'Calm', emoji: '🧘' },
  { id: 'inspired', label: 'Inspired', emoji: '💡' },
  { id: 'focused', label: 'Focused', emoji: '🎯' },
  { id: 'energized', label: 'Energized', emoji: '⚡' },
  { id: 'overwhelmed', label: 'Overwhelmed', emoji: '🌧️' },
];

export const ReflectionEditor: React.FC<ReflectionEditorProps> = ({
  entry,
  onUpdateEntry,
  onSaveEntry,
  isSaving,
  saveError,
  onStartChatWithPrompt,
}) => {
  const [newTagInput, setNewTagInput] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isBrainstorming, setIsBrainstorming] = useState(false);
  const [brainstormQuestions, setBrainstormQuestions] = useState<string[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isLocationPreviewExpanded, setIsLocationPreviewExpanded] = useState(false);

  const handleAddTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const tag = newTagInput.trim();
    if (tag && !entry.tags.includes(tag)) {
      onUpdateEntry({ tags: [...entry.tags, tag] });
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdateEntry({ tags: entry.tags.filter((t) => t !== tagToRemove) });
  };

  // AI Summarization & Tagging Action
  const handleSummarize = async () => {
    if (!entry.content.trim()) {
      setAiError('Please write some reflection content before summarizing.');
      return;
    }

    try {
      setIsSummarizing(true);
      setAiError(null);

      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: entry.title,
          content: entry.content,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to summarize reflection');
      }

      const data = await res.json();
      const updatedTags = Array.from(new Set([...entry.tags, ...(data.tags || [])]));

      onUpdateEntry({
        summary: data.summary,
        tags: updatedTags,
        sentimentScore: data.sentimentScore,
        sentimentLabel: data.sentimentLabel,
        sentimentReasoning: data.sentimentReasoning,
      });
    } catch (err: any) {
      console.error('Summarize error:', err);
      setAiError(err.message || 'Could not generate summary.');
    } finally {
      setIsSummarizing(false);
    }
  };

  // AI Brainstorming Prompts Action
  const handleBrainstorm = async () => {
    try {
      setIsBrainstorming(true);
      setAiError(null);

      const res = await fetch('/api/brainstorm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: entry.title,
          content: entry.content,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to brainstorm questions');
      }

      const data = await res.json();
      setBrainstormQuestions(data.questions || []);
    } catch (err: any) {
      console.error('Brainstorm error:', err);
      setAiError(err.message || 'Could not generate brainstorm questions.');
    } finally {
      setIsBrainstorming(false);
    }
  };

  return (
    <div id="reflection-editor-root" className="flex flex-col h-full bg-[#F5F5F0] overflow-y-auto">
      {/* Top action header */}
      <div className="p-4 sm:p-6 pb-3 border-b border-[#D9D7CE] bg-[#FDFCF9] space-y-4">
        {/* Title & Mood */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <input
            id="editor-title-input"
            type="text"
            placeholder="Title of this reflection..."
            value={entry.title}
            onChange={(e) => onUpdateEntry({ title: e.target.value })}
            className="text-xl sm:text-2xl font-serif font-bold text-[#2C2C24] bg-transparent placeholder-[#B7B7A4] focus:outline-hidden w-full"
          />

          <div className="flex items-center gap-2 shrink-0">
            {/* Mood selector */}
            <div className="flex items-center gap-1 bg-[#EDEBE4] p-1 rounded-xl border border-[#D9D7CE]">
              {MOODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onUpdateEntry({ mood: m.id })}
                  title={m.label}
                  className={`px-2 py-1 rounded-lg text-sm transition-all ${
                    entry.mood === m.id
                      ? 'bg-[#FDFCF9] shadow-xs scale-105 border border-[#D9D7CE]'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  {m.emoji}
                </button>
              ))}
            </div>

            {/* Save Button & Status */}
            <button
              id="editor-save-btn"
              onClick={() => onSaveEntry()}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#5A5A40] text-[#F5F5F0] rounded-xl text-xs font-semibold hover:bg-[#4A4A30] transition-all shadow-xs active:scale-98 disabled:opacity-50"
            >
              {isSaving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{isSaving ? 'Saving' : 'Save'}</span>
            </button>
          </div>
        </div>

        {/* Save error guarantee alert */}
        {saveError && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Failed to persist changes to Firestore: {saveError}</span>
            </div>
            <button
              onClick={() => onSaveEntry()}
              className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 font-semibold rounded-md text-[11px] transition-colors"
            >
              Retry Save
            </button>
          </div>
        )}

        {/* AI Error Alert */}
        {aiError && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{aiError}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setAiError(null);
                  handleSummarize();
                }}
                className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 font-medium rounded text-[11px] transition-colors"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => setAiError(null)}
                className="p-1 text-amber-600 hover:text-amber-900"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Tags input & Location row */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-[#D9D7CE]/60">
          <div className="flex flex-wrap items-center gap-1.5 flex-1">
            <Tag className="w-3.5 h-3.5 text-[#8A887D] mr-0.5" />
            {entry.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EDEBE4] text-[#4A4A30] font-medium border border-[#D9D7CE]"
              >
                #{tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="text-[#8A887D] hover:text-[#2C2C24]"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <input
              id="editor-new-tag-input"
              type="text"
              placeholder="+ Add tag (press Enter)"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              className="px-2 py-0.5 bg-transparent border-b border-[#D9D7CE] text-[#4A4A30] placeholder-[#A19F95] text-xs focus:outline-hidden focus:border-[#5A5A40]"
            />
          </div>

          {/* Location Opt-in Badge / Trigger */}
          <div className="flex items-center gap-1.5 shrink-0">
            {entry.location ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#EDEBE4] border border-[#D9D7CE] text-[#4A4A30] shadow-xs">
                <button
                  id="editor-location-toggle-preview-btn"
                  type="button"
                  onClick={() => setIsLocationPreviewExpanded(!isLocationPreviewExpanded)}
                  className="inline-flex items-center gap-1 hover:text-[#2C2C24] font-medium transition-colors"
                  title="Click to toggle map preview"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#5A5A40]" />
                  <span className="truncate max-w-[140px]">{entry.location.placeName}</span>
                  {isLocationPreviewExpanded ? (
                    <ChevronUp className="w-3 h-3 text-[#8A887D]" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-[#8A887D]" />
                  )}
                </button>

                <button
                  id="editor-location-edit-btn"
                  type="button"
                  onClick={() => setIsLocationModalOpen(true)}
                  title="Edit or change location"
                  className="p-0.5 text-[#8A887D] hover:text-[#5A5A40] rounded transition-colors"
                >
                  <Edit3 className="w-3 h-3" />
                </button>

                <button
                  id="editor-location-remove-btn"
                  type="button"
                  onClick={() => {
                    onUpdateEntry({ location: undefined });
                    setIsLocationPreviewExpanded(false);
                  }}
                  title="Remove location from entry"
                  className="p-0.5 text-[#8A887D] hover:text-red-700 rounded transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                id="editor-attach-location-btn"
                type="button"
                onClick={() => setIsLocationModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#EDEBE4] hover:bg-[#E4E2D8] border border-[#D9D7CE] text-[#5A5A40] font-medium transition-all shadow-xs"
                title="Opt-in to tag a location to this reflection"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Attach Location</span>
              </button>
            )}
          </div>
        </div>

        {/* Expandable Location Map Preview Card */}
        {entry.location && isLocationPreviewExpanded && (
          <div className="p-3 bg-[#FDFCF9] rounded-xl border border-[#D9D7CE] space-y-2 mt-2 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#5A5A40]" />
                <span className="font-serif font-semibold text-xs text-[#2C2C24]">
                  {entry.location.placeName}
                </span>
                {entry.location.address && (
                  <span className="text-[11px] text-[#706E64] truncate max-w-xs hidden sm:inline">
                    • {entry.location.address}
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsLocationPreviewExpanded(false)}
                className="text-xs text-[#8A887D] hover:text-[#2C2C24] p-1 rounded hover:bg-[#EDEBE4]"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <MapPinView location={entry.location} height="170px" />
          </div>
        )}
      </div>

      {/* Main Journal Canvas */}
      <div className="p-4 sm:p-6 flex-1 flex flex-col space-y-4">
        {/* Quick Gemini Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="editor-ai-summarize-btn"
            onClick={handleSummarize}
            disabled={isSummarizing}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FDFCF9] border border-[#D9D7CE] hover:border-[#B7B7A4] text-[#4A4A30] rounded-xl text-xs font-semibold transition-all shadow-xs active:scale-98 disabled:opacity-50"
          >
            {isSummarizing ? (
              <RefreshCw className="w-3.5 h-3.5 text-[#5A5A40] animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-[#5A5A40]" />
            )}
            <span>{isSummarizing ? 'Synthesizing...' : 'AI Summarize & Tag'}</span>
          </button>

          <button
            id="editor-ai-brainstorm-btn"
            onClick={handleBrainstorm}
            disabled={isBrainstorming}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FDFCF9] border border-[#D9D7CE] hover:border-[#B7B7A4] text-[#4A4A30] rounded-xl text-xs font-semibold transition-all shadow-xs active:scale-98 disabled:opacity-50"
          >
            {isBrainstorming ? (
              <RefreshCw className="w-3.5 h-3.5 text-[#5A5A40] animate-spin" />
            ) : (
              <Brain className="w-3.5 h-3.5 text-[#5A5A40]" />
            )}
            <span>{isBrainstorming ? 'Exploring...' : 'Brainstorm Follow-ups'}</span>
          </button>
        </div>

        {/* AI Summary & Sentiment Card (if available) */}
        {(entry.summary || entry.sentimentScore !== undefined) && (
          <div className="p-4 rounded-xl bg-[#EDEBE4] border border-[#D9D7CE] text-[#333333] text-xs space-y-3">
            {entry.summary && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-serif font-bold text-[#4A4A30]">
                  <Sparkles className="w-3.5 h-3.5 text-[#5A5A40]" />
                  <span>Gemini Synthesis</span>
                </div>
                <p className="leading-relaxed text-[#444440] font-normal">{entry.summary}</p>
              </div>
            )}

            {/* Sentiment & Mood Breakdown */}
            {entry.sentimentScore !== undefined && (
              <div className="pt-2 border-t border-[#D9D7CE]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 font-semibold text-[#4A4A30]">
                    <Activity className="w-3.5 h-3.5 text-[#5A5A40]" />
                    <span>Analyzed Mood:</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FDFCF9] border border-[#D9D7CE] font-bold text-[#2C2C24] text-[11px]">
                    {entry.sentimentLabel || 'Neutral'} ({entry.sentimentScore}/5)
                  </span>
                  {entry.sentimentReasoning && (
                    <span className="text-[#706E64] italic text-[11px] hidden md:inline">
                      — &ldquo;{entry.sentimentReasoning}&rdquo;
                    </span>
                  )}
                </div>

                {/* User manual score override for agency */}
                <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                  <span className="text-[10px] text-[#8A887D] mr-1">Adjust (1-5):</span>
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => onUpdateEntry({ sentimentScore: score })}
                      className={`w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center transition-all ${
                        entry.sentimentScore === score
                          ? 'bg-[#5A5A40] text-[#FDFCF9] shadow-xs'
                          : 'bg-[#FDFCF9] text-[#706E64] hover:text-[#2C2C24] border border-[#D9D7CE]'
                      }`}
                      title={`Set mood score to ${score}/5`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Brainstorm Questions Display */}
        {brainstormQuestions.length > 0 && (
          <div className="p-4 rounded-xl bg-[#EDEBE4] border border-[#D9D7CE] text-[#333333] text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-serif font-bold text-[#4A4A30]">
              <Brain className="w-3.5 h-3.5 text-[#5A5A40]" />
              <span>Suggested Socratic Inquiries (Click to reflect with Gemini):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {brainstormQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => onStartChatWithPrompt?.(q)}
                  className="text-left p-2.5 rounded-lg bg-[#FDFCF9] hover:bg-[#EDEBE4] border border-[#D9D7CE] text-[#4A4A30] text-xs hover:border-[#B7B7A4] transition-all flex items-start gap-2 shadow-xs group"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#5A5A40] shrink-0 mt-0.5 group-hover:text-[#2C2C24]" />
                  <span className="leading-normal">{q}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Text Area */}
        <div className="flex-1 flex flex-col min-h-[300px] bg-[#FDFCF9] rounded-2xl border border-[#D9D7CE] p-4 sm:p-6 shadow-xs">
          <textarea
            id="editor-content-textarea"
            placeholder="Write your reflection, thoughts, questions, or stream of consciousness here..."
            value={entry.content}
            onChange={(e) => onUpdateEntry({ content: e.target.value })}
            className="w-full flex-1 resize-none bg-transparent text-[#2C2C24] placeholder-[#A19F95] text-sm sm:text-base leading-relaxed focus:outline-hidden font-normal"
          />

          <div className="pt-3 border-t border-[#EDEBE4] flex items-center justify-between text-xs text-[#8A887D]">
            <span>
              {entry.content.trim() ? entry.content.trim().split(/\s+/).length : 0} words
            </span>
            <span className="text-[11px]">
              Last updated {new Date(entry.updatedAt || entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      {/* Opt-in Location Picker Modal */}
      <LocationPickerModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentLocation={entry.location}
        onSaveLocation={(newLoc) => {
          onUpdateEntry({ location: newLoc });
          if (newLoc) {
            setIsLocationPreviewExpanded(true);
          }
        }}
      />
    </div>
  );
};
