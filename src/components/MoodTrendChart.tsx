import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  Activity,
  Calendar,
  Sparkles,
  ShieldCheck,
  Smile,
  Meh,
  Frown,
  ArrowRight,
  Filter,
  Info,
  MapPin,
} from 'lucide-react';
import { ReflectionEntry } from '../types';
import { useTheme } from '../context/ThemeContext';

interface MoodTrendChartProps {
  entries: ReflectionEntry[];
  onSelectEntry: (entry: ReflectionEntry) => void;
  onNewEntry: () => void;
}

type TimeFilter = 'all' | '30days' | '14days' | '7days';

export const MoodTrendChart: React.FC<MoodTrendChartProps> = ({
  entries,
  onSelectEntry,
  onNewEntry,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [selectedPointEntryId, setSelectedPointEntryId] = useState<string | null>(null);

  // Chronologically sorted entries with sentiment score
  const chartData = useMemo(() => {
    const now = Date.now();
    const filtered = entries.filter((e) => {
      if (e.sentimentScore === undefined) return false;
      const timestamp = e.createdAt || e.updatedAt || now;
      if (timeFilter === '7days') return now - timestamp <= 7 * 86400000;
      if (timeFilter === '14days') return now - timestamp <= 14 * 86400000;
      if (timeFilter === '30days') return now - timestamp <= 30 * 86400000;
      return true;
    });

    // Sort ascending by creation/update timestamp for temporal progression
    const sorted = [...filtered].sort(
      (a, b) => (a.createdAt || a.updatedAt) - (b.createdAt || b.updatedAt)
    );

    return sorted.map((entry) => {
      const date = new Date(entry.createdAt || entry.updatedAt);
      return {
        id: entry.id,
        rawDate: entry.createdAt || entry.updatedAt,
        formattedDate: date.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        }),
        fullDate: date.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        title: entry.title || 'Untitled Reflection',
        score: entry.sentimentScore || 3,
        label: entry.sentimentLabel || 'Neutral',
        reasoning: entry.sentimentReasoning || '',
        mood: entry.mood || 'thoughtful',
        summary: entry.summary || '',
        entryObj: entry,
      };
    });
  }, [entries, timeFilter]);

  // Aggregate stats
  const stats = useMemo(() => {
    const scoredEntries = entries.filter((e) => typeof e.sentimentScore === 'number');
    if (scoredEntries.length === 0) {
      return {
        avgScore: 0,
        totalScored: 0,
        positiveCount: 0,
        neutralCount: 0,
        negativeCount: 0,
      };
    }

    const total = scoredEntries.length;
    const sum = scoredEntries.reduce((acc, curr) => acc + (curr.sentimentScore || 0), 0);
    const avgScore = Math.round((sum / total) * 10) / 10;

    const positiveCount = scoredEntries.filter((e) => (e.sentimentScore || 0) >= 4).length;
    const neutralCount = scoredEntries.filter((e) => (e.sentimentScore || 0) === 3).length;
    const negativeCount = scoredEntries.filter((e) => (e.sentimentScore || 0) <= 2).length;

    return {
      avgScore,
      totalScored: total,
      positiveCount,
      neutralCount,
      negativeCount,
    };
  }, [entries]);

  const getScoreDescription = (score: number) => {
    if (score >= 4.5) return 'Very Positive & Inspired';
    if (score >= 3.5) return 'Positive & Hopeful';
    if (score >= 2.5) return 'Balanced & Reflective';
    if (score >= 1.5) return 'Challenging & Processing';
    if (score > 0) return 'Heavy & Contemplative';
    return 'No score yet';
  };

  return (
    <div id="mood-trend-container" className="flex-1 h-full overflow-y-auto bg-[#F5F5F0] p-4 sm:p-8 space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FDFCF9] p-6 rounded-2xl border border-[#D9D7CE] shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#EDEBE4] text-[#5A5A40] border border-[#D9D7CE]">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#2C2C24]">
                Longitudinal Mood & Sentiment Trends
              </h1>
              <p className="text-xs text-[#706E64]">
                Descriptive emotional trajectory analyzed by Gemini 3.6 Flash from your reflection entries
              </p>
            </div>
          </div>
        </div>

        {/* Time Filter Controls */}
        <div className="flex items-center gap-1 bg-[#EDEBE4] p-1 rounded-xl border border-[#D9D7CE] text-xs self-start sm:self-auto">
          <Filter className="w-3.5 h-3.5 text-[#5A5A40] ml-1.5 mr-0.5" />
          {(
            [
              { id: 'all', label: 'All Time' },
              { id: '30days', label: '30 Days' },
              { id: '14days', label: '14 Days' },
              { id: '7days', label: '7 Days' },
            ] as const
          ).map((filter) => (
            <button
              key={filter.id}
              onClick={() => setTimeFilter(filter.id)}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                timeFilter === filter.id
                  ? 'bg-[#FDFCF9] text-[#2C2C24] shadow-xs font-semibold'
                  : 'text-[#706E64] hover:text-[#2C2C24]'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Average Score Card */}
        <div className="bg-[#FDFCF9] p-5 rounded-2xl border border-[#D9D7CE] shadow-xs space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#706E64]">
            Average Mood Score
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-serif font-bold text-[#2C2C24]">
              {stats.avgScore > 0 ? stats.avgScore.toFixed(1) : '—'}
            </span>
            <span className="text-xs text-[#8A887D]">/ 5.0 scale</span>
          </div>
          <p className="text-xs text-[#5A5A40] font-medium">
            {stats.avgScore > 0 ? getScoreDescription(stats.avgScore) : 'Add entries to calculate'}
          </p>
        </div>

        {/* Positive Entries */}
        <div className="bg-[#FDFCF9] p-5 rounded-2xl border border-[#D9D7CE] shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#706E64]">
              Positive (4-5)
            </span>
            <Smile className="w-4 h-4 text-[#5A5A40]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-serif font-bold text-[#2C2C24]">
              {stats.positiveCount}
            </span>
            <span className="text-xs text-[#8A887D]">
              {stats.totalScored > 0
                ? `(${Math.round((stats.positiveCount / stats.totalScored) * 100)}%)`
                : ''}
            </span>
          </div>
          <p className="text-xs text-[#706E64]">Hopeful, energized, grateful</p>
        </div>

        {/* Neutral Entries */}
        <div className="bg-[#FDFCF9] p-5 rounded-2xl border border-[#D9D7CE] shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#706E64]">
              Balanced / Neutral (3)
            </span>
            <Meh className="w-4 h-4 text-[#706E64]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-serif font-bold text-[#2C2C24]">
              {stats.neutralCount}
            </span>
            <span className="text-xs text-[#8A887D]">
              {stats.totalScored > 0
                ? `(${Math.round((stats.neutralCount / stats.totalScored) * 100)}%)`
                : ''}
            </span>
          </div>
          <p className="text-xs text-[#706E64]">Reflective, contemplative</p>
        </div>

        {/* Heavy/Challenging Entries */}
        <div className="bg-[#FDFCF9] p-5 rounded-2xl border border-[#D9D7CE] shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#706E64]">
              Processing / Down (1-2)
            </span>
            <Frown className="w-4 h-4 text-[#8A887D]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-serif font-bold text-[#2C2C24]">
              {stats.negativeCount}
            </span>
            <span className="text-xs text-[#8A887D]">
              {stats.totalScored > 0
                ? `(${Math.round((stats.negativeCount / stats.totalScored) * 100)}%)`
                : ''}
            </span>
          </div>
          <p className="text-xs text-[#706E64]">Unpacking challenges & tension</p>
        </div>
      </div>

      {/* Main Chart Card */}
      <div className="bg-[#FDFCF9] p-6 rounded-2xl border border-[#D9D7CE] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-serif font-bold text-[#2C2C24] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#5A5A40]" />
              Mood Trajectory Over Time
            </h2>
            <p className="text-xs text-[#706E64]">
              Click on any point along the curve to inspect or edit that reflection entry
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#706E64]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#5A5A40]" />
              <span>Mood Score (1-5)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-b border-dashed border-[#8A887D]" />
              <span>Neutral Baseline (3.0)</span>
            </div>
          </div>
        </div>

        {/* Chart Canvas */}
        {chartData.length >= 2 ? (
          <div className="w-full h-72 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const entryObj = e.activePayload[0]?.payload?.entryObj;
                    if (entryObj) onSelectEntry(entryObj);
                  }
                }}
              >
                <defs>
                  <linearGradient id="naturalMoodGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isDark ? '#969871' : '#5A5A40'} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={isDark ? '#282B21' : '#EDEBE4'} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#282B21' : '#EDEBE4'} vertical={false} />
                <XAxis
                  dataKey="formattedDate"
                  tick={{ fill: isDark ? '#B8B5A7' : '#706E64', fontSize: 11 }}
                  axisLine={{ stroke: isDark ? '#383B2E' : '#D9D7CE' }}
                  tickLine={{ stroke: isDark ? '#383B2E' : '#D9D7CE' }}
                />
                <YAxis
                  domain={[1, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tick={{ fill: isDark ? '#B8B5A7' : '#706E64', fontSize: 11 }}
                  axisLine={{ stroke: isDark ? '#383B2E' : '#D9D7CE' }}
                  tickLine={{ stroke: isDark ? '#383B2E' : '#D9D7CE' }}
                />
                <ReferenceLine
                  y={3}
                  stroke={isDark ? '#868477' : '#A19F95'}
                  strokeDasharray="4 4"
                  label={{
                    value: 'Baseline',
                    position: 'insideTopRight',
                    fill: isDark ? '#B8B5A7' : '#8A887D',
                    fontSize: 10,
                  }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#FDFCF9] p-3.5 rounded-xl border border-[#D9D7CE] shadow-lg text-xs space-y-1.5 max-w-xs">
                          <div className="flex items-center justify-between gap-2 border-b border-[#EDEBE4] pb-1">
                            <span className="font-serif font-bold text-[#2C2C24] truncate">
                              {data.title}
                            </span>
                            <span className="font-mono text-[10px] text-[#8A887D]">
                              {data.fullDate}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-[#5A5A40]">Mood Score:</span>
                            <span className="px-2 py-0.5 rounded-full bg-[#EDEBE4] border border-[#D9D7CE] font-bold text-[#2C2C24]">
                              {data.score}/5 — {data.label}
                            </span>
                          </div>
                          {data.reasoning && (
                            <p className="text-[#555550] italic leading-relaxed text-[11px]">
                              &ldquo;{data.reasoning}&rdquo;
                            </p>
                          )}
                          <p className="text-[10px] text-[#5A5A40] pt-1 font-medium">
                            Click point to open entry
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke={isDark ? '#969871' : '#5A5A40'}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#naturalMoodGradient)"
                  activeDot={{
                    r: 6,
                    fill: isDark ? '#969871' : '#5A5A40',
                    stroke: isDark ? '#1E2019' : '#FDFCF9',
                    strokeWidth: 2,
                    cursor: 'pointer',
                  }}
                  dot={{
                    r: 4,
                    fill: isDark ? '#1E2019' : '#FDFCF9',
                    stroke: isDark ? '#969871' : '#5A5A40',
                    strokeWidth: 2,
                    cursor: 'pointer',
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : chartData.length === 1 ? (
          <div className="p-8 text-center bg-[#EDEBE4]/40 rounded-xl border border-[#D9D7CE] space-y-3">
            <div className="p-3 bg-[#FDFCF9] w-12 h-12 rounded-full mx-auto flex items-center justify-center text-[#5A5A40] border border-[#D9D7CE]">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-sm text-[#2C2C24]">
              1 Reflection Analyzed ({chartData[0].score}/5 — {chartData[0].label})
            </h3>
            <p className="text-xs text-[#706E64] max-w-md mx-auto">
              Write and summarize at least one more reflection with Gemini to render a complete trend curve over time.
            </p>
          </div>
        ) : (
          <div className="p-8 text-center bg-[#EDEBE4]/40 rounded-xl border border-[#D9D7CE] space-y-3">
            <div className="p-3 bg-[#FDFCF9] w-12 h-12 rounded-full mx-auto flex items-center justify-center text-[#5A5A40] border border-[#D9D7CE]">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-sm text-[#2C2C24]">
              No Analyzed Entries in this Time Range
            </h3>
            <p className="text-xs text-[#706E64] max-w-md mx-auto">
              Open your reflections in the editor and click <strong>&quot;AI Summarize &amp; Tag&quot;</strong> to generate sentiment scores and view your emotional trendline.
            </p>
            <button
              onClick={onNewEntry}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-[#5A5A40] text-[#F5F5F0] rounded-xl text-xs font-semibold hover:bg-[#4A4A30] transition-colors"
            >
              Write Reflection
            </button>
          </div>
        )}
      </div>

      {/* Scored Entries Timeline List */}
      <div className="bg-[#FDFCF9] p-6 rounded-2xl border border-[#D9D7CE] shadow-xs space-y-4">
        <h3 className="text-sm font-serif font-bold text-[#2C2C24] flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#5A5A40]" />
          Reflection Sentiment Breakdown ({entries.length} Total Entries)
        </h3>

        <div className="divide-y divide-[#EDEBE4]">
          {entries.map((entry) => {
            const hasScore = typeof entry.sentimentScore === 'number';
            const date = new Date(entry.createdAt || entry.updatedAt);

            return (
              <div
                key={entry.id}
                onClick={() => onSelectEntry(entry)}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group cursor-pointer hover:bg-[#EDEBE4]/30 px-2 rounded-xl transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-bold text-xs text-[#2C2C24] group-hover:text-[#5A5A40] transition-colors">
                      {entry.title || 'Untitled Reflection'}
                    </span>
                    <span className="text-[10px] text-[#8A887D]">
                      {date.toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    {entry.location && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#EDEBE4] text-[#5A5A40] text-[10px] font-medium border border-[#D9D7CE]">
                        <MapPin className="w-2.5 h-2.5" />
                        <span className="truncate max-w-[100px]">{entry.location.placeName}</span>
                      </span>
                    )}
                  </div>

                  {hasScore ? (
                    <p className="text-xs text-[#706E64] font-normal leading-relaxed">
                      {entry.sentimentReasoning || entry.summary || entry.content.slice(0, 120)}
                    </p>
                  ) : (
                    <p className="text-xs text-[#A19F95] italic">
                      Not analyzed with Gemini yet. Open to summarize &amp; analyze sentiment.
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                  {hasScore ? (
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-[#EDEBE4] border border-[#D9D7CE] text-[11px] font-bold text-[#2C2C24]">
                        {entry.sentimentLabel || 'Neutral'} ({entry.sentimentScore}/5)
                      </span>
                    </div>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-[#EDEBE4]/60 text-[10px] text-[#706E64] font-medium">
                      Unanalyzed
                    </span>
                  )}
                  <ArrowRight className="w-3.5 h-3.5 text-[#8A887D] group-hover:text-[#5A5A40] group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ethical AI & Non-Profiling Notice */}
      <div className="p-4 bg-[#EDEBE4] border border-[#D9D7CE] rounded-2xl flex items-start gap-3 text-xs text-[#333333]">
        <ShieldCheck className="w-5 h-5 text-[#5A5A40] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-serif font-bold text-[#2C2C24]">
            Ethical Derived-Data Guarantee &amp; Non-Profiling Policy
          </h4>
          <p className="text-[#555550] leading-relaxed">
            Sentiment scores and mood trends are descriptive self-awareness metrics stored exclusively in your private, authenticated Firestore partition (<code className="bg-[#FDFCF9] px-1 py-0.5 rounded font-mono border border-[#D9D7CE]">/users/{'{userId}'}/reflections</code>).
            In compliance with our responsible AI standards, mood scores are <strong>never</strong> used to make automated decisions, restrict application functionality, or trigger predictive behavioral profiling without your direct consent. You have full agency to adjust or delete entries at any time.
          </p>
        </div>
      </div>
    </div>
  );
};
