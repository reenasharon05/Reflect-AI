import React, { useState } from 'react';
import { Search, Plus, Calendar, Tag, Trash2, ChevronRight, Sparkles, MessageSquare, BookOpen, TrendingUp, Activity, MapPin, X } from 'lucide-react';
import { ReflectionEntry } from '../types';
import { MapPinView } from './MapPinView';

interface ReflectionSidebarProps {
  entries: ReflectionEntry[];
  selectedId: string | null;
  onSelectEntry: (entry: ReflectionEntry) => void;
  onNewEntry: () => void;
  onDeleteEntry: (id: string) => void;
  isOpen: boolean;
  onCloseMobile?: () => void;
  onOpenTrends?: () => void;
}

export const ReflectionSidebar: React.FC<ReflectionSidebarProps> = ({
  entries,
  selectedId,
  onSelectEntry,
  onNewEntry,
  onDeleteEntry,
  isOpen,
  onCloseMobile,
  onOpenTrends,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(null);

  // Extract all unique tags
  const allTags = Array.from(
    new Set(entries.flatMap((e) => e.tags || []).filter(Boolean))
  );

  // Filter entries
  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.summary && entry.summary.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTag = selectedTag ? entry.tags?.includes(selectedTag) : true;

    return matchesSearch && matchesTag;
  });

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  };

  const getMoodEmoji = (mood?: string) => {
    switch (mood) {
      case 'inspired': return '💡';
      case 'calm': return '🧘';
      case 'overwhelmed': return '🌧️';
      case 'focused': return '🎯';
      case 'reflective': return '🍂';
      case 'energized': return '⚡';
      default: return '📝';
    }
  };

  return (
    <aside
      id="reflection-sidebar"
      className={`fixed inset-y-0 left-0 z-20 w-80 bg-[#EDEBE4] border-r border-[#D9D7CE] flex flex-col transition-transform duration-200 md:static md:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Header & Search */}
      <div className="p-4 border-b border-[#D9D7CE] space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-serif font-bold uppercase tracking-wider text-[#5A5A40] flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            Your Reflections ({entries.length})
          </h2>
          <button
            id="sidebar-new-btn"
            onClick={() => {
              onNewEntry();
              if (onCloseMobile) onCloseMobile();
            }}
            className="p-1.5 rounded-lg bg-[#FDFCF9] hover:bg-[#E4E2D8] text-[#5A5A40] border border-[#D9D7CE] transition-colors"
            title="Create new reflection"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#8A887D] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            id="sidebar-search-input"
            type="text"
            placeholder="Search entries & tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-[#FDFCF9] border border-[#D9D7CE] rounded-lg text-xs text-[#2C2C24] placeholder-[#A19F95] focus:outline-hidden focus:ring-1 focus:ring-[#5A5A40] transition-all"
          />
        </div>

        {/* Tags horizontal scroll */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px]">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-2.5 py-0.5 rounded-full font-medium transition-colors shrink-0 ${
                selectedTag === null
                  ? 'bg-[#5A5A40] text-[#F5F5F0]'
                  : 'bg-[#FDFCF9] text-[#706E64] hover:bg-[#E4E2D8] border border-[#D9D7CE]'
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-2.5 py-0.5 rounded-full font-medium transition-colors shrink-0 flex items-center gap-1 ${
                  selectedTag === tag
                    ? 'bg-[#5A5A40] text-[#F5F5F0]'
                    : 'bg-[#FDFCF9] text-[#706E64] hover:bg-[#E4E2D8] border border-[#D9D7CE]'
                }`}
              >
                <Tag className="w-2.5 h-2.5" />
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Entry List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-12 px-4">
            <p className="text-xs font-medium text-[#706E64]">
              {entries.length === 0
                ? 'No reflections yet. Write your first entry!'
                : 'No entries match your search.'}
            </p>
            {entries.length === 0 && (
              <button
                onClick={onNewEntry}
                className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 bg-[#5A5A40] text-[#F5F5F0] rounded-lg text-xs font-semibold hover:bg-[#4A4A30] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Start Writing
              </button>
            )}
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const isSelected = selectedId === entry.id;
            const messageCount = entry.messages?.length || 0;

            return (
              <div
                key={entry.id}
                id={`sidebar-entry-${entry.id}`}
                onClick={() => {
                  onSelectEntry(entry);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`group relative p-3 rounded-xl cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-[#FDFCF9] border-[#5A5A40] text-[#2C2C24] shadow-xs'
                    : 'bg-[#FDFCF9]/60 border-[#D9D7CE]/60 hover:bg-[#FDFCF9] text-[#555550] hover:border-[#D9D7CE]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-serif font-bold text-xs text-[#2C2C24] truncate">
                    <span>{getMoodEmoji(entry.mood)}</span>
                    <span className="truncate">{entry.title || 'Untitled Entry'}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Are you sure you want to delete this reflection?')) {
                        onDeleteEntry(entry.id);
                      }
                    }}
                    title="Delete reflection"
                    className="opacity-0 group-hover:opacity-100 p-1 text-[#8A887D] hover:text-red-700 hover:bg-red-50 rounded transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {/* Snippet */}
                <p className="text-[11px] text-[#706E64] mt-1 line-clamp-2 leading-relaxed font-normal">
                  {entry.summary || entry.content || 'No content written yet...'}
                </p>

                {/* Footer metadata */}
                <div className="flex items-center justify-between text-[10px] text-[#8A887D] mt-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#5A5A40]" />
                    {formatDate(entry.updatedAt || entry.createdAt)}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Location Pin Badge - Click to toggle map preview */}
                    {entry.location && (
                      <button
                        id={`sidebar-pin-btn-${entry.id}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedLocationId(
                            expandedLocationId === entry.id ? null : entry.id
                          );
                        }}
                        title={`Location: ${entry.location.placeName}. Click to preview map.`}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium transition-colors ${
                          expandedLocationId === entry.id
                            ? 'bg-[#5A5A40] text-[#FDFCF9] border-[#5A5A40]'
                            : 'bg-[#EDEBE4] hover:bg-[#E4E2D8] border-[#D9D7CE] text-[#5A5A40]'
                        }`}
                      >
                        <MapPin className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate max-w-[75px]">
                          {entry.location.placeName}
                        </span>
                      </button>
                    )}

                    {typeof entry.sentimentScore === 'number' && (
                      <span
                        title={`Gemini Sentiment: ${entry.sentimentLabel || 'Analyzed'} (${entry.sentimentScore}/5)`}
                        className="px-1.5 py-0.5 rounded bg-[#EDEBE4] border border-[#D9D7CE] text-[#4A4A30] font-semibold flex items-center gap-1"
                      >
                        <Activity className="w-2.5 h-2.5 text-[#5A5A40]" />
                        <span>{entry.sentimentScore}/5</span>
                      </span>
                    )}

                    {messageCount > 0 && (
                      <span className="flex items-center gap-1 text-[#5A5A40] font-medium bg-[#EDEBE4] px-1.5 py-0.5 rounded border border-[#D9D7CE]">
                        <MessageSquare className="w-2.5 h-2.5" />
                        {messageCount}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expandable In-Card Map Preview */}
                {entry.location && expandedLocationId === entry.id && (
                  <div
                    className="mt-2.5 pt-2 border-t border-[#D9D7CE] space-y-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between text-[11px] text-[#4A4A30] font-medium">
                      <div className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-[#5A5A40] shrink-0" />
                        <span className="truncate">{entry.location.placeName}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedLocationId(null)}
                        className="text-[#8A887D] hover:text-[#2C2C24] p-0.5 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <MapPinView
                      location={entry.location}
                      height="130px"
                      zoom={13}
                      interactive={false}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Sidebar Footer with Mood Trends shortcut */}
      {onOpenTrends && (
        <div className="p-3 border-t border-[#D9D7CE] bg-[#FDFCF9]/80">
          <button
            id="sidebar-mood-trends-btn"
            onClick={() => {
              onOpenTrends();
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full py-2 px-3 rounded-xl bg-[#EDEBE4] hover:bg-[#E4E2D8] border border-[#D9D7CE] text-[#5A5A40] text-xs font-semibold flex items-center justify-between transition-all"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#5A5A40]" />
              <span>View Mood Trends</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#8A887D]" />
          </button>
        </div>
      )}
    </aside>
  );
};
