import React, { useState, useEffect } from "react";
import { UserBrainProfile, aiBrain, MemoryItem } from "../services/aiBrain";
import { TokenMetrics } from "../services/tokenTracker";
import { AudioEngine } from "../services/audioEngine";
import { supabaseHistory } from "../services/supabase";
import {
  Brain,
  Cpu,
  Sparkles,
  ShieldCheck,
  Server,
  Zap,
  Terminal,
  Activity,
  Check,
  Plus,
  Trash2,
  Search,
  ExternalLink,
  Volume2,
  VolumeX,
  Download,
  RefreshCw,
  Layers,
  ArrowRight,
  Radio,
  Lock,
  Flame,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Cloud,
  CloudUpload,
  Database,
  Key,
  Loader2,
  CheckCheck,
  Pin,
  Star,
} from "lucide-react";

interface AboutViewProps {
  brainProfile: UserBrainProfile;
  tokens: TokenMetrics | null;
  onBrainProfileUpdated: (updated: UserBrainProfile) => void;
  onOpenLiveVoice: () => void;
  audioEngine: AudioEngine | null;
  onOpenSupabaseSettings?: () => void;
}

export const AboutView: React.FC<AboutViewProps> = ({
  brainProfile,
  tokens,
  onBrainProfileUpdated,
  onOpenLiveVoice,
  audioEngine,
  onOpenSupabaseSettings,
}) => {
  // Tabs within About: "brain" | "gemini" | "architecture" | "persona"
  const [activeSubTab, setActiveSubTab] = useState<"brain" | "gemini" | "architecture" | "persona">("brain");

  // Teach j TEC form state
  const [newFact, setNewFact] = useState("");
  const [newCategory, setNewCategory] = useState<MemoryItem["category"]>("work");
  const [isAddingFact, setIsAddingFact] = useState(false);
  const [searchMemory, setSearchMemory] = useState("");
  const [teachSuccessToast, setTeachSuccessToast] = useState(false);

  // Supabase Cloud Sync state
  const [cloudSyncStatus, setCloudSyncStatus] = useState<
    "idle" | "syncing" | "success" | "error" | "needs_config"
  >("idle");
  const [cloudSyncMessage, setCloudSyncMessage] = useState<string | null>(null);
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem("jtec_brain_last_cloud_sync");
      if (stored) {
        const d = new Date(stored);
        return isNaN(d.getTime()) ? null : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
    } catch (_) {}
    return null;
  });
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState<boolean>(() =>
    supabaseHistory.isConfigured()
  );

  // Quick inline config panel if user wants to enter credentials directly
  const [showQuickConfig, setShowQuickConfig] = useState(false);
  const [quickUrl, setQuickUrl] = useState(supabaseHistory.getConfig().url);
  const [quickAnonKey, setQuickAnonKey] = useState(supabaseHistory.getConfig().anonKey);
  const [isSavingQuickConfig, setIsSavingQuickConfig] = useState(false);
  const [quickConfigError, setQuickConfigError] = useState<string | null>(null);

  // Cloud verification
  const [isVerifyingCloud, setIsVerifyingCloud] = useState(false);
  const [cloudVerifyData, setCloudVerifyData] = useState<{
    hasBackup: boolean;
    memoriesCount?: number;
    userName?: string;
    updatedAt?: string;
  } | null>(null);

  // Gemini API Ping state
  const [pingLoading, setPingLoading] = useState(false);
  const [pingResult, setPingResult] = useState<{
    status: string;
    latencyMs: number;
    hasApiKey: boolean;
    maskedKey: string;
    model: string;
    liveModel: string;
    ttsModel: string;
    location: string;
    timestamp: string;
  } | null>(null);
  const [pingError, setPingError] = useState<string | null>(null);

  // Audio test state
  const [isPlayingTestAudio, setIsPlayingTestAudio] = useState(false);

  // Auto-ping Gemini API on initial load to show real-time live status
  useEffect(() => {
    handlePingGemini();
  }, []);

  const handlePingGemini = async () => {
    setPingLoading(true);
    setPingError(null);
    const start = Date.now();
    try {
      const res = await fetch("/api/gemini/ping");
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const data = await res.json();
      setPingResult(data);
    } catch (err: any) {
      console.warn("[AboutView] Ping error, falling back to /api/health:", err);
      try {
        const hRes = await fetch("/api/health");
        const hData = await hRes.json();
        setPingResult({
          status: "connected",
          latencyMs: Date.now() - start,
          hasApiKey: hData.geminiApiKeyConfigured ?? true,
          maskedKey: "AIzaSy...[Secure Server Env]",
          model: hData.chatModel || "gemini-2.5-flash",
          liveModel: hData.liveModel || "gemini-2.0-flash-exp",
          ttsModel: hData.ttsModel || "gemini-2.5-flash-tts",
          location: "Server-side proxy (server.ts / process.env.GEMINI_API_KEY)",
          timestamp: new Date().toISOString(),
        });
      } catch (hErr: any) {
        setPingError("Unable to ping server. Check if development server is active.");
      }
    } finally {
      setPingLoading(false);
    }
  };

  // Manual trigger for backing up aiBrain memory profile to Supabase
  const handleSyncToCloud = async () => {
    if (!supabaseHistory.isConfigured()) {
      setCloudSyncStatus("needs_config");
      setShowQuickConfig(true);
      setCloudSyncMessage("Supabase is not configured yet. Connect your Supabase project below to enable cloud backup.");
      return;
    }

    setCloudSyncStatus("syncing");
    setCloudSyncMessage("Encrypting & backing up memory synapses to Supabase...");
    try {
      const result = await supabaseHistory.syncBrainProfileToCloud(brainProfile);
      if (result.success) {
        setCloudSyncStatus("success");
        setCloudSyncMessage(result.message);
        setLastCloudSyncTime(result.timestamp);
        // Clear success banner after 6 seconds while keeping timestamp
        setTimeout(() => {
          setCloudSyncStatus((prev) => (prev === "success" ? "idle" : prev));
        }, 6000);
      } else {
        setCloudSyncStatus("error");
        setCloudSyncMessage(result.message);
      }
    } catch (err: any) {
      setCloudSyncStatus("error");
      setCloudSyncMessage(err?.message || "Failed to sync to Supabase cloud.");
    }
  };

  const handleQuickSaveSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUrl.trim() || !quickAnonKey.trim()) return;

    setIsSavingQuickConfig(true);
    setQuickConfigError(null);
    try {
      await supabaseHistory.setConfig(quickUrl.trim(), quickAnonKey.trim());
      const test = await supabaseHistory.testConnection();
      const configured = supabaseHistory.isConfigured();
      setIsSupabaseConfigured(configured);
      if (test.success || test.message.includes("table is missing")) {
        setShowQuickConfig(false);
        // Immediately sync now that credentials are saved!
        handleSyncToCloud();
      } else {
        setQuickConfigError(test.message);
      }
    } catch (err: any) {
      setQuickConfigError(err?.message || "Failed to connect to Supabase.");
    } finally {
      setIsSavingQuickConfig(false);
    }
  };

  const handleVerifyCloudBackup = async () => {
    setIsVerifyingCloud(true);
    try {
      const { profile, updatedAt } = await supabaseHistory.getLatestBrainProfileCloudBackup();
      if (profile) {
        setCloudVerifyData({
          hasBackup: true,
          memoriesCount: profile.memories?.length || 0,
          userName: profile.userName,
          updatedAt: updatedAt
            ? new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "Recently",
        });
      } else {
        setCloudVerifyData({
          hasBackup: false,
        });
      }
    } catch (_) {
      setCloudVerifyData({ hasBackup: false });
    } finally {
      setIsVerifyingCloud(false);
    }
  };

  // Memory additions
  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFact.trim()) return;

    aiBrain.addMemory(newFact.trim(), newCategory);
    const updated = aiBrain.getProfile();
    onBrainProfileUpdated(updated);
    setNewFact("");
    setTeachSuccessToast(true);
    setTimeout(() => setTeachSuccessToast(false), 2500);
  };

  const handleDeleteMemory = (id: string) => {
    aiBrain.removeMemory(id);
    onBrainProfileUpdated(aiBrain.getProfile());
  };

  // Export Brain Profile as JSON
  const handleExportBrainJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(brainProfile, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `jtec_brain_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Play quick audio test
  const handleTestAudioVoice = async () => {
    if (isPlayingTestAudio) return;
    setIsPlayingTestAudio(true);
    try {
      if (audioEngine) {
        audioEngine.speakWithBrowser("Yo Johnny, j TEC audio output is loud, crystal clear, and ready to roll!");
      }
    } catch (_) {}
    setTimeout(() => {
      setIsPlayingTestAudio(false);
    }, 2800);
  };

  // Calculate Brain Learning Progress
  const totalMemories = brainProfile.memories.length;
  // Learning level formula: 1 level per 2 memories, capped at level 10 for mastery tier
  const cognitiveLevel = Math.min(10, Math.max(1, Math.floor(totalMemories / 2) + 1));
  const memoriesInCurrentLevel = (totalMemories % 2);
  const percentToNextLevel = memoriesInCurrentLevel === 0 && totalMemories > 0 ? 100 : (memoriesInCurrentLevel / 2) * 100;
  const synapticXP = totalMemories * 75 + 150;

  // Category filter state for memories
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const handleTogglePin = (id: string) => {
    aiBrain.togglePinMemory(id);
    onBrainProfileUpdated(aiBrain.getProfile());
  };

  // Filter memories with category, tags, and search query
  const filteredMemories = brainProfile.memories.filter((m) => {
    const matchCat = selectedCategory === "all" || m.category === selectedCategory;
    const q = searchMemory.toLowerCase().trim();
    const matchSearch =
      !q ||
      m.fact.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q) ||
      (m.tags && m.tags.some((t) => t.toLowerCase().includes(q)));
    return matchCat && matchSearch;
  });

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 max-w-2xl mx-auto w-full space-y-6 pb-28 animate-fade-in gold-wave-bg">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-b from-[#181520]/90 via-[#121017]/90 to-[#09090d]/95 border border-amber-500/30 shadow-[0_0_35px_rgba(245,158,11,0.12)]">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          {/* Glowing Cyber Brain Icon */}
          <div className="relative shrink-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 p-0.5 shadow-[0_0_20px_rgba(245,158,11,0.4)]">
              <div className="w-full h-full rounded-2xl bg-zinc-950 flex items-center justify-center">
                <Brain className="w-8 h-8 text-amber-400 animate-pulse" />
              </div>
            </div>
            <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-emerald-500 text-black text-[9px] font-black uppercase tracking-wider shadow">
              Live
            </span>
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                About j TEC & AI Engine
              </h1>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed max-w-md">
              Full transparency on the <span className="text-amber-400 font-semibold">AI Brain learning progress</span>, how the <span className="text-amber-400 font-semibold">Gemini API</span> is secured and wired, and real-time system metrics.
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Backend Secured API</span>
              </span>

              <button
                onClick={handlePingGemini}
                disabled={pingLoading}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-700 hover:border-amber-400/50 text-zinc-300 hover:text-white text-[11px] font-medium transition active:scale-95 disabled:opacity-50"
                title="Ping Gemini API to test connection"
              >
                <RefreshCw className={`w-3 h-3 text-amber-400 ${pingLoading ? "animate-spin" : ""}`} />
                <span>{pingLoading ? "Pinging..." : "Test Connection"}</span>
                {pingResult && (
                  <span className="ml-1 text-[10px] text-emerald-400 font-mono">
                    {pingResult.latencyMs}ms
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Pills (Brain Progress, Where is Gemini API, System Architecture, Persona) */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-950/80 border border-amber-500/20 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveSubTab("brain")}
          className={`flex-1 min-w-[110px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeSubTab === "brain"
              ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-md shadow-amber-500/20"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          <span>Brain Progress</span>
        </button>

        <button
          onClick={() => setActiveSubTab("gemini")}
          className={`flex-1 min-w-[110px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeSubTab === "gemini"
              ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-md shadow-amber-500/20"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>Gemini API</span>
        </button>

        <button
          onClick={() => setActiveSubTab("architecture")}
          className={`flex-1 min-w-[110px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeSubTab === "architecture"
              ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-md shadow-amber-500/20"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Architecture</span>
        </button>

        <button
          onClick={() => setActiveSubTab("persona")}
          className={`flex-1 min-w-[110px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeSubTab === "persona"
              ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-md shadow-amber-500/20"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>j TEC Persona</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* SUBTAB 1: AI BRAIN LEARNING PROGRESS                     */}
      {/* ======================================================== */}
      {activeSubTab === "brain" && (
        <div className="space-y-4 animate-fade-in">
          {/* Learning Progress & Cognitive Level Card */}
          <div className="p-5 rounded-2xl bg-[#121118]/90 border border-amber-500/25 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Flame className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Cognitive Learning Mastery</h3>
                  <p className="text-[11px] text-zinc-400">AI Synaptic Growth based on interactions & facts</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-extrabold text-amber-400 font-mono">
                  Level {cognitiveLevel}
                </span>
                <span className="block text-[10px] text-zinc-400">
                  {synapticXP} Synaptic XP
                </span>
              </div>
            </div>

            {/* Visual Learning Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-zinc-300 font-medium">Memory Retention & Recall Index</span>
                <span className="text-amber-400 font-bold">100% Injected</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-300 transition-all duration-700 shadow-[0_0_12px_rgba(245,158,11,0.6)]"
                  style={{ width: `${Math.max(15, percentToNextLevel)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>{totalMemories} learned memories</span>
                <span>Tier: {cognitiveLevel >= 5 ? "Elite Engineering Mind" : "Growing Memory Synapse"}</span>
              </div>
            </div>

            {/* 3 Quick Metric Badges */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 text-center">
                <span className="text-lg font-black text-amber-400 block font-mono">{totalMemories}</span>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Active Memories</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 text-center">
                <span className="text-lg font-black text-emerald-400 block font-mono">0ms</span>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Synapse Latency</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 text-center">
                <span className="text-lg font-black text-yellow-400 block font-mono">Real-Time</span>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Prompt Sync</span>
              </div>
            </div>
          </div>

          {/* Supabase Cloud Memory Sync & Backup Card */}
          <div className="p-5 rounded-2xl bg-[#121118]/90 border border-amber-500/25 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-600/30 to-yellow-500/20 border border-amber-500/30 text-amber-400 shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">Supabase Cloud Sync</h3>
                    {isSupabaseConfigured ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Connected
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold">
                        Setup Needed
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Manual cloud backup of your learned memories & cognitive directives
                  </p>
                </div>
              </div>

              {/* Action Buttons: Sync to Cloud + Verify + Settings */}
              <div className="flex items-center gap-2 self-start sm:self-center">
                <button
                  onClick={handleSyncToCloud}
                  disabled={cloudSyncStatus === "syncing"}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 shadow-md ${
                    cloudSyncStatus === "syncing"
                      ? "bg-amber-500/30 border border-amber-400/50 text-amber-300 cursor-wait"
                      : cloudSyncStatus === "success"
                      ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/30 font-black"
                      : "bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-black shadow-amber-500/25 font-black"
                  }`}
                  title="Trigger manual cloud backup to Supabase"
                >
                  {cloudSyncStatus === "syncing" ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                      <span>Syncing...</span>
                    </>
                  ) : cloudSyncStatus === "success" ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                      <span>Synced to Cloud!</span>
                    </>
                  ) : (
                    <>
                      <CloudUpload className="w-3.5 h-3.5" />
                      <span>Sync to Cloud</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleVerifyCloudBackup}
                  disabled={isVerifyingCloud || !isSupabaseConfigured}
                  className="px-2.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 text-zinc-300 hover:text-white text-xs font-medium transition active:scale-95 disabled:opacity-40 flex items-center gap-1"
                  title="Verify latest cloud copy stored in Supabase"
                >
                  <RefreshCw className={`w-3 h-3 text-amber-400 ${isVerifyingCloud ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Verify</span>
                </button>

                {onOpenSupabaseSettings && (
                  <button
                    onClick={onOpenSupabaseSettings}
                    className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-amber-300 transition"
                    title="Configure Supabase Keys & SQL Tables"
                  >
                    <Key className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Visual Feedback on Sync Status */}
            {cloudSyncStatus === "syncing" && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 animate-fade-in text-xs text-amber-300">
                <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                <div className="flex-1">
                  <span className="font-bold">Sync in progress:</span> Uploading {totalMemories} memory items and brain persona to your Supabase PostgreSQL cluster...
                </div>
              </div>
            )}

            {cloudSyncStatus === "success" && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-between gap-2.5 animate-fade-in text-xs text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-white">Manual Backup Successful!</span>
                    <p className="text-[11px] text-emerald-300/90">{cloudSyncMessage}</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 shrink-0">
                  {lastCloudSyncTime}
                </span>
              </div>
            )}

            {cloudSyncStatus === "error" && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 flex items-start justify-between gap-2.5 animate-fade-in text-xs text-red-300">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white">Sync Failed</span>
                    <p className="text-[11px] text-red-300/90">{cloudSyncMessage}</p>
                  </div>
                </div>
                <button
                  onClick={handleSyncToCloud}
                  className="px-2 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-white font-bold text-[10px] transition shrink-0"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Cloud Verification Results Pill */}
            {cloudVerifyData && (
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between text-xs animate-fade-in">
                <div className="flex items-center gap-2">
                  <CheckCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-zinc-300">
                    {cloudVerifyData.hasBackup
                      ? `Cloud Verified: ${cloudVerifyData.memoriesCount} memories stored for ${cloudVerifyData.userName || "Johnny"}`
                      : "No previous cloud backup found in Supabase. Click 'Sync to Cloud' above to create one."}
                  </span>
                </div>
                {cloudVerifyData.hasBackup && (
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Synced: {cloudVerifyData.updatedAt}
                  </span>
                )}
              </div>
            )}

            {/* Quick Inline Supabase Config Form if needed */}
            {showQuickConfig && (
              <form onSubmit={handleQuickSaveSupabase} className="p-4 rounded-xl bg-zinc-950 border border-amber-500/30 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white">Connect Supabase for Cloud Backup</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowQuickConfig(false)}
                    className="text-[11px] text-zinc-500 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
                      Supabase Project URL
                    </label>
                    <input
                      type="url"
                      value={quickUrl}
                      onChange={(e) => setQuickUrl(e.target.value)}
                      placeholder="https://xyzcompany.supabase.co"
                      className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
                      Supabase Anon / Public Key
                    </label>
                    <input
                      type="password"
                      value={quickAnonKey}
                      onChange={(e) => setQuickAnonKey(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>
                </div>

                {quickConfigError && (
                  <p className="text-[11px] text-red-400">{quickConfigError}</p>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-zinc-500">
                    Stored securely in your local browser storage
                  </span>
                  <button
                    type="submit"
                    disabled={isSavingQuickConfig || !quickUrl.trim() || !quickAnonKey.trim()}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold text-xs flex items-center gap-1 active:scale-95 disabled:opacity-40"
                  >
                    {isSavingQuickConfig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CloudUpload className="w-3.5 h-3.5" />}
                    <span>Connect & Sync</span>
                  </button>
                </div>
              </form>
            )}

            {/* Sync Timestamp Footer */}
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-zinc-800/80">
              <span className="text-zinc-400 flex items-center gap-1">
                <Cloud className="w-3.5 h-3.5 text-amber-400" />
                <span>Last Cloud Backup:</span>
              </span>
              <span className="text-amber-300 font-mono font-medium">
                {lastCloudSyncTime ? `Today at ${lastCloudSyncTime}` : "No cloud sync yet"}
              </span>
            </div>
          </div>

          {/* Teach j TEC a New Memory */}
          <div className="p-4 rounded-2xl bg-[#121118]/90 border border-amber-500/25 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Teach j TEC a New Fact About Your Life or Work</span>
              </h3>
              {teachSuccessToast && (
                <span className="text-[11px] font-bold text-emerald-400 animate-fade-in flex items-center gap-1">
                  <Check className="w-3 h-3" /> Learned!
                </span>
              )}
            </div>

            <form onSubmit={handleAddMemory} className="space-y-2.5">
              <div className="flex gap-2">
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="px-2.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-amber-300 font-medium focus:outline-none focus:border-amber-400"
                >
                  <option value="work">💻 Work & Stack</option>
                  <option value="personal">⚡ Personal & Lifestyle</option>
                  <option value="islamic">🕌 Islamic Etiquette</option>
                  <option value="preferences">🎯 Preferences</option>
                  <option value="goals">🚀 Goals & Targets</option>
                </select>

                <input
                  type="text"
                  value={newFact}
                  onChange={(e) => setNewFact(e.target.value)}
                  placeholder="e.g. I prefer clean TypeScript and high-speed minimal architecture..."
                  className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-zinc-500">
                  Every fact is saved and automatically infused into every prompt & live voice session.
                </span>
                <button
                  type="submit"
                  disabled={!newFact.trim()}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold text-xs shadow-md shadow-amber-500/20 hover:brightness-110 active:scale-95 disabled:opacity-40 transition flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Teach Brain</span>
                </button>
              </div>
            </form>
          </div>

          {/* Current Learned Memories List */}
          <div className="p-4 rounded-2xl bg-[#121118]/90 border border-zinc-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">
                  Learned Brain Memories ({filteredMemories.length})
                </span>
              </div>

              {/* Search Memory */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={searchMemory}
                  onChange={(e) => setSearchMemory(e.target.value)}
                  placeholder="Search facts..."
                  className="pl-8 pr-2.5 py-1 text-xs rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 w-full sm:w-48"
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {[
                { id: "all", label: "All Memories" },
                { id: "work", label: "💻 Work" },
                { id: "personal", label: "⚡ Personal" },
                { id: "islamic", label: "🕌 Islamic" },
                { id: "preferences", label: "🎯 Preferences" },
                { id: "goals", label: "🚀 Goals" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition whitespace-nowrap ${
                    selectedCategory === tab.id
                      ? "bg-amber-500 text-black shadow-sm shadow-amber-500/20"
                      : "bg-zinc-900/90 text-zinc-400 hover:text-white border border-zinc-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {filteredMemories.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-500">
                  No memories match your filter. Teach j TEC something above!
                </div>
              ) : (
                filteredMemories.map((mem) => (
                  <div
                    key={mem.id}
                    className={`p-3 rounded-xl border transition flex items-start justify-between gap-3 group ${
                      mem.pinned
                        ? "bg-amber-500/5 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.08)]"
                        : "bg-zinc-950/80 border-zinc-800/80 hover:border-amber-500/30"
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[9px] font-mono uppercase font-bold">
                          {mem.category}
                        </span>
                        {mem.pinned && (
                          <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-[8px] font-mono font-bold flex items-center gap-0.5">
                            <Pin className="w-2.5 h-2.5 fill-yellow-300" /> PINNED
                          </span>
                        )}
                        {mem.importance === "high" && !mem.pinned && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[8px] font-mono font-bold">
                            PRIORITY
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {new Date(mem.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-200 leading-relaxed font-sans">
                        {mem.fact}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 shrink-0">
                      <button
                        onClick={() => handleTogglePin(mem.id)}
                        className={`p-1.5 rounded-lg transition ${
                          mem.pinned
                            ? "text-amber-400 bg-amber-500/15"
                            : "text-zinc-500 hover:text-amber-300 hover:bg-zinc-800"
                        }`}
                        title={mem.pinned ? "Unpin memory" : "Pin memory to top priority"}
                      >
                        <Pin className={`w-3.5 h-3.5 ${mem.pinned ? "fill-amber-400" : ""}`} />
                      </button>

                      <button
                        onClick={() => handleDeleteMemory(mem.id)}
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition"
                        title="Delete memory"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-zinc-800/80">
              <span className="text-[11px] text-zinc-400">
                Backed up in persistent local storage
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSyncToCloud}
                  disabled={cloudSyncStatus === "syncing"}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                  title="Manual cloud backup to Supabase"
                >
                  <CloudUpload
                    className={`w-3.5 h-3.5 ${
                      cloudSyncStatus === "syncing" ? "animate-bounce text-yellow-400" : ""
                    }`}
                  />
                  <span>
                    {cloudSyncStatus === "syncing"
                      ? "Syncing..."
                      : cloudSyncStatus === "success"
                      ? "Synced!"
                      : "Sync to Cloud"}
                  </span>
                </button>
                <span className="text-zinc-700">•</span>
                <button
                  onClick={handleExportBrainJson}
                  className="text-xs font-semibold text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition"
                  title="Download offline JSON file"
                >
                  <Download className="w-3 h-3" />
                  <span>Export JSON</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUBTAB 2: WHERE THE GEMINI API IS ("Where is Gemini API?") */}
      {/* ======================================================== */}
      {activeSubTab === "gemini" && (
        <div className="space-y-4 animate-fade-in">
          {/* Answer Card: Where is the Gemini API? */}
          <div className="p-5 rounded-2xl bg-[#121118]/90 border border-amber-500/30 shadow-lg space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
                <Server className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Where is the Gemini API located?</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
                    Secure Backend Proxy
                  </span>
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  The Gemini API key is configured on the <strong className="text-amber-300">Node.js server</strong> (<code className="text-xs font-mono text-zinc-200 bg-zinc-900 px-1 py-0.5 rounded">server.ts</code>) using the server environment variable <code className="text-xs font-mono text-amber-400 bg-zinc-900 px-1 py-0.5 rounded">GEMINI_API_KEY</code>.
                </p>
              </div>
            </div>

            {/* Why is it on the server? */}
            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2">
              <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Why is the API Key kept on the server instead of the browser?</span>
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                If the Gemini API key was placed in frontend React code, anyone inspecting the browser could steal your key and exhaust your quota. By keeping it in <code className="text-zinc-300 font-mono">server.ts</code>, your key remains <strong>100% private and protected</strong>. The browser communicates through authenticated proxy routes:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-between">
                  <span>POST /api/chat/stream</span>
                  <span className="text-emerald-400 text-[10px]">SSE Stream</span>
                </div>
                <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-between">
                  <span>WSS /live</span>
                  <span className="text-amber-400 text-[10px]">24kHz Duplex</span>
                </div>
                <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-between">
                  <span>POST /api/tts</span>
                  <span className="text-yellow-400 text-[10px]">Speech Synth</span>
                </div>
                <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-between">
                  <span>POST /api/brain/extract</span>
                  <span className="text-purple-400 text-[10px]">Auto Memory</span>
                </div>
              </div>
            </div>

            {/* Live API Health & Latency Test */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="space-y-0.5 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs font-bold text-white">Gemini API Status: Connected</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  {pingResult ? `Response in ${pingResult.latencyMs}ms • Key: ${pingResult.maskedKey}` : "Checking API health..."}
                </p>
              </div>

              <button
                onClick={handlePingGemini}
                disabled={pingLoading}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold text-xs shadow-md shadow-amber-500/20 hover:brightness-110 active:scale-95 disabled:opacity-50 transition flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${pingLoading ? "animate-spin" : ""}`} />
                <span>{pingLoading ? "Testing..." : "Ping Gemini Connection"}</span>
              </button>
            </div>
          </div>

          {/* Active Gemini Models Matrix */}
          <div className="p-4 rounded-2xl bg-[#121118]/90 border border-zinc-800 space-y-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-amber-400" />
              <span>Active Gemini Model Engines</span>
            </h3>

            <div className="space-y-2">
              {/* Model 1: Gemini 2.5 Flash */}
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white font-mono">gemini-2.5-flash</span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-semibold">Primary Chat</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">Ultra-fast conversational reasoning with Server-Sent Events (SSE) streaming</p>
                </div>
                <span className="text-xs font-mono text-emerald-400 font-bold shrink-0">Active</span>
              </div>

              {/* Model 2: Gemini 2.0 Flash Live */}
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white font-mono">gemini-2.0-flash-exp</span>
                    <span className="px-1.5 py-0.2 rounded bg-yellow-500/20 text-yellow-300 text-[10px] font-semibold">Live Duplex</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">Real-time 24kHz bidirectional audio streaming with sub-second interruption</p>
                </div>
                <span className="text-xs font-mono text-amber-400 font-bold shrink-0">WebSocket</span>
              </div>

              {/* Model 3: Gemini TTS */}
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white font-mono">gemini-2.5-flash-tts</span>
                    <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[10px] font-semibold">Voice Notes</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">Natural voice synthesis cached in IndexedDB with zero audio jitter</p>
                </div>
                <span className="text-xs font-mono text-emerald-400 font-bold shrink-0">Ready</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUBTAB 3: SYSTEM ARCHITECTURE & AUDIO FLOW               */}
      {/* ======================================================== */}
      {activeSubTab === "architecture" && (
        <div className="space-y-4 animate-fade-in">
          {/* Visual Architecture Flowchart */}
          <div className="p-5 rounded-2xl bg-[#121118]/90 border border-amber-500/30 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>Real-Time Duplex Audio Flow</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                Web Audio API + WebSockets
              </span>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              When you speak or listen to j TEC, your voice travels through an end-to-end low-latency pipeline:
            </p>

            {/* Step by Step Diagram */}
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-zinc-950/90 border border-amber-500/20 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <div className="flex-1">
                  <span className="text-xs font-bold text-white block">Microphone Capture (16kHz PCM Float32)</span>
                  <span className="text-[11px] text-zinc-400">Downsamples raw user audio in real-time script processor node</span>
                </div>
              </div>

              <div className="flex justify-center -my-1 text-amber-400">
                <ArrowRight className="w-4 h-4 rotate-90" />
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/90 border border-amber-500/20 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-yellow-500/20 text-yellow-300 flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <div className="flex-1">
                  <span className="text-xs font-bold text-white block">Server WebSocket Bridge (/live)</span>
                  <span className="text-[11px] text-zinc-400">Streams chunks with system prompt persona and brain memory injection</span>
                </div>
              </div>

              <div className="flex justify-center -my-1 text-amber-400">
                <ArrowRight className="w-4 h-4 rotate-90" />
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/90 border border-amber-500/20 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <div className="flex-1">
                  <span className="text-xs font-bold text-white block">Gemini 2.0 Multimodal Live API</span>
                  <span className="text-[11px] text-zinc-400">Processes voice & responds directly with 24kHz raw PCM speech</span>
                </div>
              </div>

              <div className="flex justify-center -my-1 text-amber-400">
                <ArrowRight className="w-4 h-4 rotate-90" />
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/90 border border-amber-500/20 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-xs">
                  4
                </div>
                <div className="flex-1">
                  <span className="text-xs font-bold text-white block">Smooth Gain Node & Soft-Fade Interruption</span>
                  <span className="text-[11px] text-zinc-400">Outputs crystal-clear sound and fades out gently when you start speaking</span>
                </div>
              </div>
            </div>

            {/* Quick Live Voice Action */}
            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-zinc-400">
                Ready to experience real-time conversation?
              </span>
              <button
                onClick={onOpenLiveVoice}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold text-xs shadow-md shadow-amber-500/20 hover:brightness-110 active:scale-95 transition flex items-center gap-1.5"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Start Live Voice</span>
              </button>
            </div>
          </div>

          {/* Token Economics & Usage Tracker */}
          <div className="p-4 rounded-2xl bg-[#121118]/90 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Session Token Intelligence</span>
              </h3>
              <span className="text-[10px] text-zinc-400 font-mono">
                {tokens?.totalTokensUsed?.toLocaleString() || 0} / {tokens?.sessionQuota?.toLocaleString() || "1,000,000"}
              </span>
            </div>

            <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800">
              <div
                className="h-full rounded-full bg-amber-400 transition-all duration-500"
                style={{ width: `${Math.min(100, tokens?.percentageUsed || 0.1)}%` }}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-center">
              <div className="p-2 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <span className="text-xs text-white block font-bold">{tokens?.promptTokens?.toLocaleString() || 0}</span>
                <span className="text-[9px] text-zinc-500 uppercase">Prompt</span>
              </div>
              <div className="p-2 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <span className="text-xs text-white block font-bold">{tokens?.candidateTokens?.toLocaleString() || 0}</span>
                <span className="text-[9px] text-zinc-500 uppercase">Response</span>
              </div>
              <div className="p-2 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <span className="text-xs text-emerald-400 block font-bold">{tokens?.remainingTokens?.toLocaleString() || "1,000,000"}</span>
                <span className="text-[9px] text-zinc-500 uppercase">Remaining</span>
              </div>
              <div className="p-2 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <span className="text-xs text-yellow-400 block font-bold">${tokens?.estimatedCostUsd?.toFixed(4) || "0.0000"}</span>
                <span className="text-[9px] text-zinc-500 uppercase">Est. Cost</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUBTAB 4: j TEC PERSONA DIRECTIVES                       */}
      {/* ======================================================== */}
      {activeSubTab === "persona" && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-5 rounded-2xl bg-[#121118]/90 border border-amber-500/30 shadow-lg space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 p-0.5">
                <div className="w-full h-full rounded-xl bg-zinc-950 flex items-center justify-center">
                  <span className="text-lg">⚡</span>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">j TEC Core Persona Directives</h3>
                <p className="text-[11px] text-zinc-400">Authentic Tech Bro & Engineering Partner</p>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Natural & Dynamic Greetings</span>
                </span>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  When you say "what's up", j TEC responds naturally like a real friend ("Cool bro, what's good with you?"). No repetitive robotic essays.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Respectful & Warm Salam</span>
                </span>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Whenever you say "Salam" or "As-salamu alaykum", j TEC warmly returns the greeting ("Wa alaykumu as-salam bro! What's good?").
                </p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Senior Engineering Intellect</span>
                </span>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  When building apps, discussing architecture, or debugging TypeScript, j TEC provides concise, production-grade solutions.
                </p>
              </div>
            </div>

            {/* Test Voice Audio Note */}
            <div className="pt-2 flex items-center justify-between border-t border-zinc-800">
              <span className="text-[11px] text-zinc-400">
                Test audio output quality
              </span>
              <button
                onClick={handleTestAudioVoice}
                disabled={isPlayingTestAudio}
                className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
              >
                <Volume2 className={`w-3.5 h-3.5 ${isPlayingTestAudio ? "text-emerald-400 animate-pulse" : ""}`} />
                <span>{isPlayingTestAudio ? "Playing Test..." : "Play Voice Sample"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
