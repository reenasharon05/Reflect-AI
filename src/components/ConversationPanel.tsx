import React, { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import { Send, Sparkles, Brain, MessageSquare, Compass, Shield, RefreshCw, AlertCircle, User, Bot } from 'lucide-react';
import { ChatMessage, AIMode, ReflectionEntry } from '../types';

interface ConversationPanelProps {
  entry: ReflectionEntry;
  onAddMessage: (userMsg: ChatMessage, modelMsg: ChatMessage) => Promise<void>;
  isSaving: boolean;
  prefilledPrompt?: string;
  onClearPrefilledPrompt?: () => void;
}

const MODES: { id: AIMode; label: string; icon: any }[] = [
  { id: 'reflect', label: 'Reflect', icon: Compass },
  { id: 'brainstorm', label: 'Brainstorm', icon: Brain },
  { id: 'summarize', label: 'Summarize', icon: Sparkles },
  { id: 'deep_dive', label: 'Deep Dive', icon: MessageSquare },
];

export const ConversationPanel: React.FC<ConversationPanelProps> = ({
  entry,
  onAddMessage,
  isSaving,
  prefilledPrompt,
  onClearPrefilledPrompt,
}) => {
  const [inputPrompt, setInputPrompt] = useState('');
  const [selectedMode, setSelectedMode] = useState<AIMode>('reflect');
  const [isLoading, setIsLoading] = useState(false);
  const [lastModelUsed, setLastModelUsed] = useState<string>('gemini-3.6-flash');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefilledPrompt) {
      setInputPrompt(prefilledPrompt);
      if (onClearPrefilledPrompt) onClearPrefilledPrompt();
    }
  }, [prefilledPrompt, onClearPrefilledPrompt]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entry.messages, isLoading]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const promptText = inputPrompt.trim();
    if (!promptText || isLoading) return;

    setErrorMessage(null);

    const userMessage: ChatMessage = {
      id: 'msg-' + Date.now() + '-user',
      role: 'user',
      content: promptText,
      timestamp: Date.now(),
      mode: selectedMode,
    };

    // Prepare payload
    const historyPayload = (entry.messages || []).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryTitle: entry.title,
          entryContent: entry.content,
          conversationHistory: historyPayload,
          userPrompt: promptText,
          mode: selectedMode,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to get reflection response');
      }

      const data = await res.json();
      setLastModelUsed(data.modelUsed || 'gemini-3.6-flash');

      const modelMessage: ChatMessage = {
        id: 'msg-' + Date.now() + '-model',
        role: 'model',
        content: data.reply,
        timestamp: Date.now(),
        mode: selectedMode,
      };

      // Persist to Firestore
      await onAddMessage(userMessage, modelMessage);
      setInputPrompt('');
    } catch (err: any) {
      console.error('Chat error:', err);
      setErrorMessage(
        err?.message || 'Failed to generate response. Your prompt has been preserved.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const quickSuggestions = [
    'What underlying emotional pattern do you notice here?',
    'How could I reframe this situation with more self-compassion?',
    'What are 3 practical action steps based on this reflection?',
    'What question should I be asking myself right now?',
  ];

  return (
    <div
      id="conversation-panel-root"
      className="flex flex-col h-full bg-[#FDFCF9] border-l border-[#D9D7CE]"
    >
      {/* Panel Header */}
      <div className="p-4 border-b border-[#D9D7CE] flex items-center justify-between bg-[#EDEBE4]/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#5A5A40] text-[#F5F5F0] flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-serif font-bold text-[#2C2C24] flex items-center gap-1.5">
              Gemini Dialogue
              <span className="px-1.5 py-0.5 rounded bg-[#EDEBE4] border border-[#D9D7CE] text-[#5A5A40] text-[10px] font-mono font-semibold">
                {lastModelUsed}
              </span>
            </h3>
            <p className="text-[10px] text-[#706E64]">Multi-turn context-aware reflection</p>
          </div>
        </div>

        {/* Mode switcher tabs */}
        <div className="flex items-center gap-1 bg-[#EDEBE4] border border-[#D9D7CE] p-0.5 rounded-lg text-[11px]">
          {MODES.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMode(m.id)}
                className={`px-2 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                  selectedMode === m.id
                    ? 'bg-[#FDFCF9] text-[#2C2C24] shadow-xs'
                    : 'text-[#706E64] hover:text-[#2C2C24]'
                }`}
              >
                <Icon className="w-3 h-3 text-[#5A5A40]" />
                <span className="hidden sm:inline">{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F5F5F0]">
        {(!entry.messages || entry.messages.length === 0) && (
          <div className="text-center py-10 px-4 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EDEBE4] border border-[#D9D7CE] text-[#5A5A40] flex items-center justify-center mx-auto">
              <Bot className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-serif font-bold text-[#2C2C24]">Start a Reflection Conversation</h4>
              <p className="text-xs text-[#706E64] max-w-xs mx-auto leading-relaxed font-normal">
                Gemini analyzes your journal entry to provide thoughtful feedback, socratic questions, and brainstorms.
              </p>
            </div>

            {/* Quick starter chips */}
            <div className="pt-2 space-y-1.5 max-w-sm mx-auto">
              {quickSuggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInputPrompt(s);
                  }}
                  className="w-full text-left p-2.5 rounded-xl bg-[#FDFCF9] hover:bg-[#EDEBE4] border border-[#D9D7CE] text-xs text-[#4A4A30] hover:text-[#2C2C24] transition-colors flex items-center justify-between group shadow-xs"
                >
                  <span className="truncate">{s}</span>
                  <Send className="w-3 h-3 text-[#5A5A40] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        )}

        {entry.messages?.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-6 h-6 rounded-full bg-[#5A5A40] text-[#F5F5F0] flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-[#5A5A40] text-[#F5F5F0] rounded-br-xs shadow-xs'
                    : 'bg-[#FDFCF9] text-[#2C2C24] rounded-bl-xs border border-[#D9D7CE] shadow-xs'
                }`}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap font-normal">{msg.content}</p>
                ) : (
                  <div className="markdown-body space-y-2 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_strong]:font-bold [&_strong]:text-[#2C2C24] font-normal">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                )}

                <div
                  className={`text-[9px] mt-1.5 flex items-center justify-end gap-1 ${
                    isUser ? 'text-[#D9D7CE]' : 'text-[#8A887D]'
                  }`}
                >
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              {isUser && (
                <div className="w-6 h-6 rounded-full bg-[#EDEBE4] border border-[#D9D7CE] text-[#5A5A40] flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-6 h-6 rounded-full bg-[#5A5A40] text-[#F5F5F0] flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="bg-[#FDFCF9] text-[#4A4A30] rounded-2xl rounded-bl-xs p-3 border border-[#D9D7CE] text-xs flex items-center gap-2 shadow-xs">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#5A5A40]" />
              <span>Gemini is reflecting on your entry...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error alert if prompt failed */}
      {errorMessage && (
        <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 text-amber-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>
          <button
            onClick={() => handleSendMessage()}
            className="px-2 py-0.5 bg-amber-200 hover:bg-amber-300 font-semibold rounded text-[10px]"
          >
            Retry
          </button>
        </div>
      )}

      {/* Message Input Form */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 border-t border-[#D9D7CE] bg-[#FDFCF9] flex items-end gap-2"
      >
        <textarea
          id="conversation-input-textarea"
          rows={1}
          placeholder={`Ask Gemini to ${selectedMode} on your thoughts...`}
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          className="flex-1 resize-none bg-[#F5F5F0] border border-[#D9D7CE] rounded-xl px-3 py-2 text-xs text-[#2C2C24] placeholder-[#A19F95] focus:outline-hidden focus:ring-1 focus:ring-[#5A5A40] focus:bg-[#FDFCF9] transition-all max-h-24 font-normal"
        />

        <button
          id="conversation-send-btn"
          type="submit"
          disabled={!inputPrompt.trim() || isLoading}
          className="p-2.5 bg-[#5A5A40] hover:bg-[#4A4A30] text-[#F5F5F0] rounded-xl text-xs font-semibold transition-all shadow-xs active:scale-95 disabled:opacity-40"
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>
    </div>
  );
};
