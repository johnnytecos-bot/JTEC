import React, { useState, useEffect } from "react";
import { UserBrainProfile } from "../services/aiBrain";
import { TokenMetrics, tokenTracker } from "../services/tokenTracker";
import {
  ArrowLeft,
  Settings,
  User,
  Volume2,
  Moon,
  Bell,
  Info,
  ChevronRight,
  Brain,
  ShieldCheck,
  Heart,
  Crown,
  RotateCcw,
  Clock,
  Coins,
  Zap,
  Sparkles,
  RefreshCw,
  Sliders,
  CheckCircle2,
} from "lucide-react";

interface ProfileViewProps {
  brainProfile: UserBrainProfile;
  tokens: TokenMetrics;
  modelRepliesCount: number;
  onBack: () => void;
  onOpenSettings: (section?: "voice" | "brain" | "islamic" | "tokens" | "cloud" | "appearance") => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  brainProfile,
  tokens,
  modelRepliesCount,
  onBack,
  onOpenSettings,
}) => {
  const displayName = brainProfile.userName || "Johnny";

  // Real-time ticking clock for reset countdown
  const [now, setNow] = useState(Date.now());
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate live countdown to next reset
  const nextReset = tokens?.nextResetTime || (Math.ceil(Date.now() / 86400000) * 86400000);
  const diffMs = Math.max(0, nextReset - now);
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  const formattedCountdown = `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  const remainingTokens = tokens?.remainingTokens ?? 1000000;
  const usedTokens = tokens?.totalTokensUsed ?? 0;
  const sessionQuota = tokens?.sessionQuota ?? 1000000;
  const percentUsed = Math.min(100, Math.max(0, (usedTokens / (sessionQuota || 1)) * 100));
  const percentRemaining = Math.max(0, (100 - percentUsed)).toFixed(1);

  const handleManualReset = async () => {
    if (isResetting) return;
    setIsResetting(true);
    try {
      await tokenTracker.resetTokens();
      setResetSuccessMessage("Tokens reset successfully!");
      setTimeout(() => setResetSuccessMessage(null), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 max-w-lg mx-auto w-full space-y-5 pb-24 animate-fade-in gold-wave-bg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900/60 transition"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-amber-400" />
        </button>

        <h2 className="text-base font-extrabold text-white tracking-tight">Token & Usage Center</h2>

        <button
          onClick={() => onOpenSettings("tokens")}
          className="p-2 rounded-xl text-zinc-400 hover:text-amber-400 hover:bg-zinc-900/60 transition"
          aria-label="Settings"
          title="Open Token Quota Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Real-time Token Hub Hero Card (Replaces old Profile Card) */}
      <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-b from-[#16141e]/95 via-[#100f16]/95 to-[#0b0a0e]/98 border border-amber-500/35 shadow-[0_0_35px_rgba(245,158,11,0.15)]">
        {/* Subtle decorative glow */}
        <div className="absolute -top-12 -right-12 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative space-y-4">
          {/* Top Bar inside card: Live Pulse & Instant Reset action */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 font-mono">
                Live Token Monitor
              </span>
            </div>

            <button
              onClick={handleManualReset}
              disabled={isResetting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-300 text-xs font-semibold transition active:scale-95 disabled:opacity-50"
              title="Reset Token Counter Now"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? "animate-spin" : ""}`} />
              <span>{isResetting ? "Resetting..." : "Reset Counter"}</span>
            </button>
          </div>

          {resetSuccessMessage && (
            <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{resetSuccessMessage}</span>
            </div>
          )}

          {/* Big Hero Number: Token Remaining */}
          <div className="p-4 rounded-2xl bg-black/60 border border-amber-500/25 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-400" />
                Remaining Tokens
              </span>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 font-mono">
                {percentRemaining}% Available
              </span>
            </div>

            <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 font-mono tracking-tight">
              {remainingTokens.toLocaleString()}
            </div>

            {/* Glowing Quota Progress Bar */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                <span>{usedTokens.toLocaleString()} used</span>
                <span>Quota: {sessionQuota.toLocaleString()}</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 transition-all duration-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                  style={{ width: `${percentUsed}%` }}
                />
              </div>
            </div>
          </div>

          {/* Token Time Reset Row */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-amber-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Token Time Reset</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300 uppercase">
                    Daily Cycle
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  Countdown to midnight quota refresh
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-base font-black text-amber-300 font-mono tracking-wider">
                {formattedCountdown}
              </div>
              <div className="text-[9px] text-zinc-500 font-mono">
                HH:MM:SS
              </div>
            </div>
          </div>

          {/* Token Breakdown Pills: Prompt, Candidate, Audio */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
              <div className="text-[10px] text-zinc-400 font-medium">Prompt (Input)</div>
              <div className="font-mono font-bold text-zinc-200 mt-0.5">
                {(tokens?.promptTokens ?? 0).toLocaleString()}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
              <div className="text-[10px] text-zinc-400 font-medium">AI Replies</div>
              <div className="font-mono font-bold text-amber-300 mt-0.5">
                {(tokens?.candidateTokens ?? 0).toLocaleString()}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
              <div className="text-[10px] text-zinc-400 font-medium">Spoken Audio</div>
              <div className="font-mono font-bold text-emerald-300 mt-0.5">
                {(tokens?.audioTokens ?? 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Metric Counter Boxes: Real-Time Used, Remaining, and Time Reset */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-[#121218]/85 border border-amber-500/20 text-center">
          <div className="text-base sm:text-lg font-black text-amber-300 font-mono truncate">
            {usedTokens.toLocaleString()}
          </div>
          <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mt-0.5">
            Tokens Used
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#121218]/85 border border-amber-500/20 text-center">
          <div className="text-base sm:text-lg font-black text-emerald-400 font-mono truncate">
            {remainingTokens.toLocaleString()}
          </div>
          <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mt-0.5">
            Tokens Left
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#121218]/85 border border-amber-500/20 text-center">
          <div className="text-base sm:text-lg font-black text-amber-300 font-mono">
            {formattedCountdown}
          </div>
          <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mt-0.5">
            Time Reset
          </div>
        </div>
      </div>

      {/* Settings Menu List */}
      <div className="space-y-2 pt-1">
        {/* Account / Brain Settings */}
        <button
          onClick={() => onOpenSettings("brain")}
          className="w-full p-3.5 rounded-2xl bg-[#121218]/85 hover:bg-[#181822] border border-amber-500/20 hover:border-amber-500/40 transition flex items-center justify-between group text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-100 group-hover:text-amber-300 transition">
                {displayName}'s Profile & Brain
              </div>
              <div className="text-[11px] text-zinc-400">
                Personalized memories, relationship context & identity
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-amber-400 transition shrink-0" />
        </button>

        {/* Quota & Token Budget Settings */}
        <button
          onClick={() => onOpenSettings("tokens")}
          className="w-full p-3.5 rounded-2xl bg-[#121218]/85 hover:bg-[#181822] border border-amber-500/20 hover:border-amber-500/40 transition flex items-center justify-between group text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 flex items-center justify-center shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-100 group-hover:text-yellow-300 transition">
                Token Budget & Thresholds
              </div>
              <div className="text-[11px] text-zinc-400">
                Configure session quotas and rate alerts
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-yellow-400 transition shrink-0" />
        </button>

        {/* Voice & Language */}
        <button
          onClick={() => onOpenSettings("voice")}
          className="w-full p-3.5 rounded-2xl bg-[#121218]/85 hover:bg-[#181822] border border-amber-500/20 hover:border-amber-500/40 transition flex items-center justify-between group text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-100 group-hover:text-amber-300 transition">
                Voice & Language
              </div>
              <div className="text-[11px] text-zinc-400">
                Customize Sana's voice (Kore), speed, and style
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-amber-400 transition shrink-0" />
        </button>

        {/* AI Brain & Memory */}
        <button
          onClick={() => onOpenSettings("brain")}
          className="w-full p-3.5 rounded-2xl bg-[#121218]/85 hover:bg-[#181822] border border-amber-500/20 hover:border-amber-500/40 transition flex items-center justify-between group text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-100 group-hover:text-rose-300 transition">
                AI Brain & Memory
              </div>
              <div className="text-[11px] text-zinc-400">
                Teach Sana facts and personalize wife relationship
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-rose-400 transition shrink-0" />
        </button>

        {/* Appearance */}
        <button
          onClick={() => onOpenSettings("appearance")}
          className="w-full p-3.5 rounded-2xl bg-[#121218]/85 hover:bg-[#181822] border border-amber-500/20 hover:border-amber-500/40 transition flex items-center justify-between group text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-100 group-hover:text-amber-300 transition">
                Appearance
              </div>
              <div className="text-[11px] text-zinc-400">
                Dark / Gold Theme & High Contrast
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-amber-400 transition shrink-0" />
        </button>

        {/* Islamic Reminders */}
        <button
          onClick={() => onOpenSettings("islamic")}
          className="w-full p-3.5 rounded-2xl bg-[#121218]/85 hover:bg-[#181822] border border-amber-500/20 hover:border-amber-500/40 transition flex items-center justify-between group text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 text-lg">
              🕌
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-100 group-hover:text-emerald-300 transition">
                Islamic Reminders & Faith
              </div>
              <div className="text-[11px] text-zinc-400">
                Prayer times, Quranic reflections & duas
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition shrink-0" />
        </button>

        {/* About Sana */}
        <div className="w-full p-3.5 rounded-2xl bg-[#121218]/60 border border-zinc-800 flex items-center justify-between text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 text-zinc-400 flex items-center justify-center shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-300">About Sana</div>
              <div className="text-[11px] text-zinc-500">
                Version 2.0.0 • Powered by Sana Intelligence Engine
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
            PRO ACTIVE
          </span>
        </div>
      </div>
    </div>
  );
};
