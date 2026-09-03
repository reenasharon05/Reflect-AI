import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Sparkles, ShieldCheck, Database, ArrowRight, BrainCircuit, Lock, HeartHandshake, Sun, Moon } from 'lucide-react';
import { signInWithGoogle } from '../lib/firebase';
import { useTheme } from '../context/ThemeContext';

interface LandingPageProps {
  onOpenThreatModel: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenThreatModel }) => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Sign-in error:', err);
      // Friendly message for popup close or network
      if (err?.code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed. Please try again.');
      } else {
        setError(err?.message || 'Failed to sign in with Google. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="landing-page-root" className="min-h-screen bg-[#F5F5F0] text-[#333333] flex flex-col justify-between">
      {/* Top Bar */}
      <header className="max-w-6xl w-full mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#5A5A40] text-[#F5F5F0] flex items-center justify-center shadow-sm">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="font-serif font-bold text-xl tracking-tight text-[#2C2C24] block leading-tight">
              Gemini Reflect
            </span>
            <span className="text-[11px] font-medium text-[#706E64] tracking-wider uppercase">
              Mindful AI Reflection Journal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="landing-threat-model-btn"
            onClick={onOpenThreatModel}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#D9D7CE] bg-[#FDFCF9] text-[#5A5A40] hover:text-[#2C2C24] hover:border-[#B7B7A4] text-xs font-medium transition-all shadow-xs"
          >
            <ShieldCheck className="w-4 h-4 text-[#5A5A40]" />
            Security Model
          </button>

          {/* Theme Toggle (Sun / Moon) */}
          <button
            id="landing-theme-toggle-btn"
            onClick={toggleTheme}
            title={
              resolvedTheme === 'dark'
                ? 'Switch to Light theme'
                : 'Switch to Dark theme'
            }
            aria-label={
              resolvedTheme === 'dark' ? 'Switch to Light theme' : 'Switch to Dark theme'
            }
            className="p-2 rounded-xl border border-[#D9D7CE] bg-[#FDFCF9] text-[#5A5A40] hover:text-[#2C2C24] hover:border-[#B7B7A4] text-xs font-medium transition-all shadow-xs flex items-center justify-center cursor-pointer"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-4 h-4 text-[#969871]" />
            ) : (
              <Moon className="w-4 h-4 text-[#5A5A40]" />
            )}
          </button>

          <button
            id="landing-top-signin-btn"
            onClick={handleSignIn}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5A5A40] hover:bg-[#4A4A30] text-[#F5F5F0] text-xs font-semibold tracking-wide transition-all shadow-sm active:scale-98 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Connecting...
              </span>
            ) : (
              <>
                <span>Sign In with Google</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl w-full mx-auto px-6 py-12 flex-1 flex flex-col justify-center items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6 max-w-2xl"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#EDEBE4] border border-[#D9D7CE] text-[#5A5A40] text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-[#5A5A40]" />
            <span>Powered by Gemini 3.6 Flash & Cloud Firestore</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl font-serif font-bold text-[#2C2C24] tracking-tight leading-[1.2]">
            A quiet sanctuary for mindful thought and conscious reflection.
          </h1>

          {/* Subheading */}
          <p className="text-base sm:text-lg text-[#555550] leading-relaxed max-w-xl mx-auto font-normal">
            Write uninhibited reflections, explore Socratic dialogues with Gemini AI, and automatically synthesize core themes—all secured in your isolated Firestore database.
          </p>

          {/* Error Message if any */}
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl max-w-md mx-auto">
              {error}
            </div>
          )}

          {/* CTA Box */}
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              id="landing-hero-signin-btn"
              onClick={handleSignIn}
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-7 py-3.5 rounded-xl bg-[#5A5A40] hover:bg-[#4A4A30] text-[#F5F5F0] text-sm font-semibold tracking-wide shadow-md transition-all active:scale-98 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating with Google...
                </span>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Sign in with Google to Begin</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-[#7A786E]">
            Zero password storage • Private user-bound Firestore isolation
          </p>
        </motion.div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl w-full mt-16 text-left">
          <div className="p-6 rounded-2xl bg-[#FDFCF9] border border-[#D9D7CE] shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-[#EDEBE4] text-[#5A5A40] flex items-center justify-center mb-3">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-serif font-bold text-[#2C2C24] mb-1">Multi-Turn Gemini Dialogue</h3>
            <p className="text-xs text-[#555550] leading-relaxed">
              Engage in rich, contextual back-and-forth reflections. Gemini remembers your previous turns to guide your self-inquiry.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#FDFCF9] border border-[#D9D7CE] shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-[#EDEBE4] text-[#5A5A40] flex items-center justify-center mb-3">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-serif font-bold text-[#2C2C24] mb-1">Strict User Isolation</h3>
            <p className="text-xs text-[#555550] leading-relaxed">
              Every journal entry and conversation is scoped to your verified UID in Cloud Firestore. No cross-user access is permitted.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#FDFCF9] border border-[#D9D7CE] shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-[#EDEBE4] text-[#5A5A40] flex items-center justify-center mb-3">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-serif font-bold text-[#2C2C24] mb-1">AI Summaries & Brainstorms</h3>
            <p className="text-xs text-[#555550] leading-relaxed">
              Generate structured takeaways, automatic theme tags, and Socratic brainstorming questions with resilient model fallback.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto px-6 py-6 border-t border-[#D9D7CE] flex flex-col sm:flex-row items-center justify-between text-xs text-[#7A786E] gap-3">
        <div className="flex items-center gap-2">
          <span className="font-serif">Gemini Reflect & Journal</span>
          <span>•</span>
          <span>Google AI Studio Build</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            id="landing-footer-security-btn"
            onClick={onOpenThreatModel}
            className="hover:text-[#2C2C24] transition-colors flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#5A5A40]" />
            Security & Threat Model
          </button>
        </div>
      </footer>
    </div>
  );
};
