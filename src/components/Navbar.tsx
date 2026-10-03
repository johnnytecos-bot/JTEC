import React from "react";
import {
  Menu,
  Radio,
  Sliders,
  Sparkles,
  Zap,
  Volume2,
  Brain,
} from "lucide-react";
import { SUPPORTED_LANGUAGES, PREBUILT_VOICES, LanguageOption } from "../services/languages";
import { TokenMetrics } from "../services/tokenTracker";

export type ThemeType = "dark" | "high-contrast-dark" | "high-contrast-light" | "midnight-indigo" | "cyberpunk-neon";

interface NavbarProps {
  currentLanguage: LanguageOption;
  onSelectLanguage: (lang: LanguageOption) => void;
  currentVoice: string;
  onSelectVoice: (voice: string) => void;
  theme: ThemeType;
  onSelectTheme: (theme: ThemeType) => void;
  onOpenSettings: (tab?: "tokens" | "supabase" | "voice" | "appearance") => void;
  onOpenBrain: () => void;
  brainMemoryCount: number;
  isLiveConnected: boolean;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  tokens: TokenMetrics | null;
  isSupabaseConfigured?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentLanguage,
  onSelectLanguage,
  currentVoice,
  onSelectVoice,
  theme,
  onSelectTheme,
  onOpenSettings,
  onOpenBrain,
  brainMemoryCount,
  isLiveConnected,
  onToggleSidebar,
  isSidebarOpen,
  tokens,
  isSupabaseConfigured,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-amber-500/20 bg-[#09090d]/90 backdrop-blur-xl px-4 py-2.5 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Hamburger menu (opens All Settings in left bar) and Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-amber-400 hover:text-white hover:bg-zinc-800/80 transition active:scale-95"
            aria-label="Open settings and conversations"
            title="All Settings & Conversations (Left Bar)"
          >
            <Menu className="w-5 h-5 stroke-[2.5]" />
          </button>

          <div className="flex items-center gap-2.5">
            {/* Golden Soundwave Icon (lll) from screenshot */}
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 text-black shadow-md shadow-amber-500/30 font-black p-0.5">
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
              </div>
              {isLiveConnected && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-zinc-950" />
              )}
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black tracking-tight text-white flex items-center gap-1">
                  <span>j TEC</span>
                  <span className="text-amber-400 text-xs font-normal">⚡</span>
                </span>
              </div>
              <span className="text-[10px] text-zinc-400 font-medium leading-none">
                Your AI Tech Bro & Companion
              </span>
            </div>
          </div>
        </div>

        {/* Center: Live status indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/80 border border-amber-500/20 text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              isLiveConnected ? "bg-emerald-400 animate-ping" : "bg-amber-500/80"
            }`}
          />
          <span className="text-zinc-300 font-medium">
            {isLiveConnected ? "j TEC Live Connected" : "j TEC Voice Ready"}
          </span>
        </div>

        {/* Right: Gold Pro Badge (from screenshot) & Memory quick action */}
        <div className="flex items-center gap-2">
          {/* Supabase Cloud Status Pill */}
          <button
            onClick={() => onOpenSettings("supabase")}
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[10px] font-mono font-medium transition active:scale-95 ${
              isSupabaseConfigured
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-amber-300 hover:border-amber-500/30"
            }`}
            title={
              isSupabaseConfigured
                ? "Supabase Database Connected: Every conversation and prompt saves to cloud"
                : "Connect Supabase Database to save conversations & prompts"
            }
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isSupabaseConfigured ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
              }`}
            />
            <span>{isSupabaseConfigured ? "Supabase Cloud" : "Connect Supabase"}</span>
          </button>

          {/* AI Memory Quick Pill */}
          <button
            onClick={onOpenBrain}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold transition active:scale-95"
            title="j TEC's Memories & Brain Context"
          >
            <Brain className="w-3.5 h-3.5 text-amber-400" />
            <span>Memories</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-200 text-[10px] font-mono font-bold">
              {brainMemoryCount}
            </span>
          </button>

          {/* Quick Language */}
          <div className="relative group hidden sm:block">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-zinc-900/80 border border-amber-500/20 text-zinc-300 text-xs font-medium cursor-pointer">
              <span>{currentLanguage.flag}</span>
              <span className="text-[11px]">{currentLanguage.name}</span>
              <select
                value={currentLanguage.code}
                onChange={(e) => {
                  const target = SUPPORTED_LANGUAGES.find((l) => l.code === e.target.value);
                  if (target) onSelectLanguage(target);
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                aria-label="Select language"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code} className="bg-zinc-900 text-white">
                    {l.flag} {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Gold Pro Badge (exact match to screenshot) */}
          <button
            onClick={onToggleSidebar}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-600/20 border border-amber-400/50 text-amber-300 text-xs font-bold shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:border-amber-300 transition active:scale-95"
            title="j TEC Pro Active • Open Settings in Left Bar"
          >
            <span className="text-sm">👑</span>
            <span>Pro</span>
          </button>
        </div>
      </div>
    </header>
  );
};
