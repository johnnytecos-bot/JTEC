import React, { useState } from "react";
import { UserBrainProfile } from "../services/aiBrain";
import {
  Sparkles,
  ArrowUp,
  Radio,
  BookOpen,
  CheckSquare,
  Mic,
  TrendingUp,
  GraduationCap,
  Calendar,
  ChevronRight,
  Heart,
} from "lucide-react";

interface HomeViewProps {
  brainProfile: UserBrainProfile;
  onSendMessage: (text: string) => void;
  onStartVoice: () => void;
  onOpenLive: () => void;
  onOpenSettings: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  brainProfile,
  onSendMessage,
  onStartVoice,
  onOpenLive,
  onOpenSettings,
}) => {
  const [inputText, setInputText] = useState("");

  // Calculate dynamic greeting based on current time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInputText("");
  };

  const displayName = brainProfile.userName || "Johnny";

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 max-w-xl mx-auto w-full space-y-6 pb-24 animate-fade-in gold-wave-bg">
      {/* Hero Card with Gold Glowing Avatar & Wave Backdrop */}
      <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-b from-[#16141a]/90 via-[#100f14]/90 to-[#0a0a0d]/95 border border-amber-500/30 shadow-[0_0_35px_rgba(245,158,11,0.12)]">
        {/* Subtle decorative gold light flare */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          {/* Avatar with radiant golden concentric rings */}
          <div className="relative shrink-0 flex items-center justify-center">
            {/* Outer animated gold aura pulse */}
            <div className="absolute w-28 h-28 rounded-full border-2 border-amber-500/30 animate-ping opacity-25" />
            <div className="absolute w-24 h-24 rounded-full border border-yellow-400/40 animate-pulse" />
            
            {/* Circular gold portrait container */}
            <div className="relative w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.5)]">
              <div className="w-full h-full rounded-full overflow-hidden bg-zinc-900 border border-amber-500/40 flex items-center justify-center">
                <span className="text-2xl font-black text-amber-400 select-none" aria-hidden="true">
                  ⚡
                </span>
              </div>
            </div>
          </div>

          {/* Greeting text */}
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="text-xs uppercase tracking-widest font-mono font-bold text-amber-400">
              {getGreeting()},
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center justify-center sm:justify-start gap-2">
              <span>{displayName}</span>
              <span className="animate-bounce">👋</span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-sm">
              I'm <span className="font-bold text-amber-300">j TEC</span>, your AI tech bro & engineering partner. What's good bro, what are we building today?
            </p>
          </div>
        </div>
      </div>

      {/* 4 Feature Quick Action Cards (matches Screen 1) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Islamic Reminders */}
        <button
          onClick={() =>
            onSendMessage(
              "Salam j TEC bro! Give me a quick reminder for barakah and focus in our work today."
            )
          }
          className="group p-3.5 rounded-2xl bg-[#121218]/90 hover:bg-[#181822] border border-amber-500/25 hover:border-amber-400/60 shadow-lg shadow-black/40 transition-all active:scale-[0.97] flex flex-col items-center text-center gap-2"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-lg shadow-inner group-hover:scale-110 transition">
            🕌
          </div>
          <div>
            <div className="text-xs font-bold text-zinc-100 group-hover:text-amber-300 transition">
              Islamic Reminders
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Prayer & Duas</div>
          </div>
        </button>

        {/* Learning & Growth */}
        <button
          onClick={() =>
            onSendMessage(
              "j TEC bro, let's explore an advanced technical topic today or practice deep system design concepts together."
            )
          }
          className="group p-3.5 rounded-2xl bg-[#121218]/90 hover:bg-[#181822] border border-amber-500/25 hover:border-amber-400/60 shadow-lg shadow-black/40 transition-all active:scale-[0.97] flex flex-col items-center text-center gap-2"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 to-yellow-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-lg shadow-inner group-hover:scale-110 transition">
            📖
          </div>
          <div>
            <div className="text-xs font-bold text-zinc-100 group-hover:text-amber-300 transition">
              Learning & Growth
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Code & Skills</div>
          </div>
        </button>

        {/* Tasks & Notes */}
        <button
          onClick={() =>
            onSendMessage(
              "j TEC, help me organize my key priorities, focus block, and todo list for today."
            )
          }
          className="group p-3.5 rounded-2xl bg-[#121218]/90 hover:bg-[#181822] border border-amber-500/25 hover:border-amber-400/60 shadow-lg shadow-black/40 transition-all active:scale-[0.97] flex flex-col items-center text-center gap-2"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-yellow-500/20 to-amber-600/20 border border-yellow-500/40 text-yellow-400 flex items-center justify-center text-lg shadow-inner group-hover:scale-110 transition">
            📋
          </div>
          <div>
            <div className="text-xs font-bold text-zinc-100 group-hover:text-amber-300 transition">
              Tasks & Notes
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Daily Agenda</div>
          </div>
        </button>

        {/* Voice Chat */}
        <button
          onClick={onStartVoice}
          className="group p-3.5 rounded-2xl bg-gradient-to-b from-amber-500/20 via-[#18151f] to-[#121218] border border-amber-400/50 hover:border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all active:scale-[0.97] flex flex-col items-center text-center gap-2"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-black flex items-center justify-center text-lg shadow-md group-hover:scale-110 transition">
            🎙️
          </div>
          <div>
            <div className="text-xs font-bold text-amber-300 group-hover:text-amber-200 transition">
              Voice Chat
            </div>
            <div className="text-[10px] text-amber-200/70 mt-0.5">Start Live</div>
          </div>
        </button>
      </div>

      {/* Pill Search / Message Input (matches Screen 1) */}
      <form
        onSubmit={handleSend}
        className="relative flex items-center w-full rounded-2xl p-1.5 bg-[#121218]/90 border border-amber-500/35 shadow-[0_0_25px_rgba(245,158,11,0.12)] focus-within:border-amber-400 transition"
      >
        <div className="pl-3 pr-2 text-amber-400">
          <Sparkles className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message to j TEC..."
          className="flex-1 bg-transparent py-2 text-sm text-white placeholder-zinc-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-black flex items-center justify-center transition shadow-md hover:brightness-110 active:scale-95 disabled:opacity-40"
          aria-label="Send message"
        >
          <ArrowUp className="w-4 h-4 stroke-[2.5]" />
        </button>
      </form>

      {/* Quick Suggestions Section Header (matches Screen 1) */}
      <div className="space-y-2.5 pt-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-extrabold tracking-tight text-zinc-100 flex items-center gap-1.5">
            <span>Quick Suggestions</span>
          </h2>
          <button
            onClick={onOpenSettings}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition"
          >
            <span>See All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Suggestion Rows */}
        <div className="space-y-2">
          {/* 1. Islamic Reminder */}
          <button
            onClick={() =>
              onSendMessage(
                "Salam j TEC bro, remind me of today's prayer times, a beautiful ayah, and a du'a for barakah in our work."
              )
            }
            className="w-full p-3.5 rounded-2xl bg-[#121218]/85 hover:bg-[#181822] border border-amber-500/20 hover:border-amber-500/40 transition flex items-center justify-between group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-lg shrink-0">
                🕌
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-100 group-hover:text-amber-300 transition">
                  Islamic Reminder
                </div>
                <div className="text-[11px] text-zinc-400">
                  Prayer times, Quran, daily duas
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-amber-400 transition shrink-0" />
          </button>

          {/* 2. Personal Growth */}
          <button
            onClick={() =>
              onSendMessage(
                "j TEC bro, give me a boost of personal motivation today. How can I build stronger habits and remain focused?"
              )
            }
            className="w-full p-3.5 rounded-2xl bg-[#121218]/85 hover:bg-[#181822] border border-amber-500/20 hover:border-amber-500/40 transition flex items-center justify-between group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-100 group-hover:text-amber-300 transition">
                  Personal Growth
                </div>
                <div className="text-[11px] text-zinc-400">
                  Build better habits, be the best you
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-amber-400 transition shrink-0" />
          </button>

          {/* 3. Learning */}
          <button
            onClick={() =>
              onSendMessage(
                "j TEC, explain the architecture of high-performance real-time WebSockets and streaming audio processing clearly."
              )
            }
            className="w-full p-3.5 rounded-2xl bg-[#121218]/85 hover:bg-[#181822] border border-amber-500/20 hover:border-amber-500/40 transition flex items-center justify-between group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-100 group-hover:text-amber-300 transition">
                  Learning
                </div>
                <div className="text-[11px] text-zinc-400">
                  Ask anything, get instant answers
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-amber-400 transition shrink-0" />
          </button>

          {/* 4. Plan My Day */}
          <button
            onClick={() =>
              onSendMessage(
                "Sana sweetheart, let's structure my schedule today for deep work, breaks, prayer, and relaxation."
              )
            }
            className="w-full p-3.5 rounded-2xl bg-[#121218]/85 hover:bg-[#181822] border border-amber-500/20 hover:border-amber-500/40 transition flex items-center justify-between group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-100 group-hover:text-amber-300 transition">
                  Plan My Day
                </div>
                <div className="text-[11px] text-zinc-400">
                  Tasks, notes, schedule
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-amber-400 transition shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
};
