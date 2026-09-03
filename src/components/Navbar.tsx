import React from 'react';
import { BookOpen, Plus, LogOut, Shield, Sparkles, User, Cloud, TrendingUp, Edit3, Sun, Moon } from 'lucide-react';
import { UserProfile } from '../types';
import { signOutUser } from '../lib/firebase';
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
  user: UserProfile;
  activeView: 'journal' | 'trends';
  onToggleView: (view: 'journal' | 'trends') => void;
  onNewReflection: () => void;
  onOpenThreatModel: () => void;
  isSaving?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeView,
  onToggleView,
  onNewReflection,
  onOpenThreatModel,
  isSaving = false,
}) => {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <header
      id="main-navbar"
      className="sticky top-0 z-30 bg-[#FDFCF9]/95 backdrop-blur-md border-b border-[#D9D7CE] px-4 sm:px-6 py-3 flex items-center justify-between"
    >
      {/* Brand & Sync Indicator */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#5A5A40] text-[#F5F5F0] flex items-center justify-center shadow-xs">
          <BookOpen className="w-4 h-4" />
        </div>
        <div>
          <span className="font-serif font-bold text-sm tracking-tight text-[#2C2C24] block leading-none">
            Gemini Reflect
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#6B705C] animate-pulse" />
            <span className="text-[10px] text-[#706E64] font-medium flex items-center gap-1">
              <Cloud className="w-2.5 h-2.5 text-[#5A5A40]" />
              {isSaving ? 'Syncing to Firestore...' : 'Firestore Cloud Synced'}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* View switcher */}
        <div className="flex items-center bg-[#EDEBE4] p-0.5 rounded-lg border border-[#D9D7CE] text-xs">
          <button
            id="navbar-view-journal-btn"
            onClick={() => onToggleView('journal')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
              activeView === 'journal'
                ? 'bg-[#FDFCF9] text-[#2C2C24] shadow-xs font-semibold'
                : 'text-[#706E64] hover:text-[#2C2C24]'
            }`}
          >
            <Edit3 className="w-3 h-3 text-[#5A5A40]" />
            <span className="hidden sm:inline">Journal</span>
          </button>
          <button
            id="navbar-view-trends-btn"
            onClick={() => onToggleView('trends')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
              activeView === 'trends'
                ? 'bg-[#FDFCF9] text-[#2C2C24] shadow-xs font-semibold'
                : 'text-[#706E64] hover:text-[#2C2C24]'
            }`}
          >
            <TrendingUp className="w-3 h-3 text-[#5A5A40]" />
            <span className="hidden sm:inline">Mood Trends</span>
          </button>
        </div>

        <button
          id="navbar-new-reflection-btn"
          onClick={() => {
            onToggleView('journal');
            onNewReflection();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5A5A40] hover:bg-[#4A4A30] text-[#F5F5F0] text-xs font-semibold tracking-wide transition-all shadow-xs active:scale-98"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Reflection</span>
        </button>

        <button
          id="navbar-threat-model-btn"
          onClick={onOpenThreatModel}
          title="View Threat Model & Security Compliance"
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-[#D9D7CE] bg-[#EDEBE4] text-[#5A5A40] hover:text-[#2C2C24] hover:border-[#B7B7A4] text-xs font-medium transition-all shadow-xs flex items-center gap-1.5"
        >
          <Shield className="w-3.5 h-3.5 text-[#5A5A40]" />
          <span className="hidden sm:inline">Threat Model</span>
        </button>

        {/* Theme Toggle (Sun / Moon) */}
        <button
          id="navbar-theme-toggle-btn"
          onClick={toggleTheme}
          title={
            resolvedTheme === 'dark'
              ? 'Switch to Light theme'
              : 'Switch to Dark theme'
          }
          aria-label={
            resolvedTheme === 'dark' ? 'Switch to Light theme' : 'Switch to Dark theme'
          }
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-[#D9D7CE] bg-[#EDEBE4] text-[#5A5A40] hover:text-[#2C2C24] hover:border-[#B7B7A4] text-xs font-medium transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          {resolvedTheme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-[#969871]" />
              <span className="hidden sm:inline">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-[#5A5A40]" />
              <span className="hidden sm:inline">Dark</span>
            </>
          )}
        </button>

        <div className="h-4 w-px bg-[#D9D7CE] mx-0.5" />

        {/* User Info & Sign Out */}
        <div className="flex items-center gap-2">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'User'}
              className="w-7 h-7 rounded-full border border-[#D9D7CE] object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#EDEBE4] text-[#5A5A40] flex items-center justify-center text-xs font-semibold">
              <User className="w-3.5 h-3.5" />
            </div>
          )}

          <div className="hidden md:block text-left">
            <p className="text-xs font-medium text-[#2C2C24] leading-tight truncate max-w-[120px]">
              {user.displayName || user.email?.split('@')[0] || 'Member'}
            </p>
            <p className="text-[10px] text-[#8A887D] truncate max-w-[120px]">
              {user.email || 'Authenticated'}
            </p>
          </div>

          <button
            id="navbar-signout-btn"
            onClick={() => signOutUser()}
            title="Sign out of application"
            className="p-1.5 text-[#706E64] hover:text-[#2C2C24] hover:bg-[#EDEBE4] rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
