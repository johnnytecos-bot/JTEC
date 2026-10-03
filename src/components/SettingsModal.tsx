import React, { useState, useEffect } from "react";
import { tokenTracker, TokenMetrics } from "../services/tokenTracker";
import { supabaseHistory, SupabaseConfig, AiPromptRecord } from "../services/supabase";
import { aiBrain } from "../services/aiBrain";
import {
  Coins,
  Database,
  Volume2,
  Sliders,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  RotateCcw,
  Download,
  AlertTriangle,
  Zap,
  Sparkles,
  X,
  ShieldCheck,
  Server,
  Layers,
  Plus,
  Trash2,
  CheckCheck,
  Loader2,
} from "lucide-react";
import { PREBUILT_VOICES, SUPPORTED_LANGUAGES, LanguageOption } from "../services/languages";
import { ThemeType } from "./Navbar";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVoice: string;
  onSelectVoice: (voice: string) => void;
  currentLanguage: LanguageOption;
  onSelectLanguage: (lang: LanguageOption) => void;
  theme: ThemeType;
  onSelectTheme: (theme: ThemeType) => void;
  onSupabaseStatusChange?: () => void;
  initialTab?: "tokens" | "supabase" | "prompts" | "voice" | "appearance";
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentVoice,
  onSelectVoice,
  currentLanguage,
  onSelectLanguage,
  theme,
  onSelectTheme,
  onSupabaseStatusChange,
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<"tokens" | "supabase" | "prompts" | "voice" | "appearance">(initialTab || "tokens");
  const [tokens, setTokens] = useState<TokenMetrics>(tokenTracker.getMetrics());
  const [quotaBudget, setQuotaBudget] = useState<number>(1000000);
  const [alertThreshold, setAlertThreshold] = useState<number>(80);
  const [isResetting, setIsResetting] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>({ url: "", anonKey: "" });
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [supabaseTestResult, setSupabaseTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // AI Prompts state
  const [prompts, setPrompts] = useState<AiPromptRecord[]>([]);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const [newPromptTitle, setNewPromptTitle] = useState("");
  const [newPromptCategory, setNewPromptCategory] = useState<AiPromptRecord["category"]>("engineering");
  const [newPromptContent, setNewPromptContent] = useState("");
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [promptSaveMessage, setPromptSaveMessage] = useState<{ success: boolean; text: string } | null>(null);
  const [activePromptId, setActivePromptId] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
      tokenTracker.refreshMetrics().then((m) => {
        setTokens(m);
        setQuotaBudget(m.sessionQuota);
        setAlertThreshold(m.alertThresholdPercent);
      });
      setSupabaseConfig(supabaseHistory.getConfig());
      setSupabaseTestResult(null);
      loadPrompts();
    }
  }, [isOpen]);

  const loadPrompts = async () => {
    setIsLoadingPrompts(true);
    try {
      const list = await supabaseHistory.getAiPrompts();
      setPrompts(list);
      const active = list.find((p) => p.isActive);
      if (active) setActivePromptId(active.id);
    } catch (_) {}
    finally {
      setIsLoadingPrompts(false);
    }
  };

  const handleAddPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromptTitle.trim() || !newPromptContent.trim()) return;

    setIsSavingPrompt(true);
    setPromptSaveMessage(null);
    try {
      const newRecord: AiPromptRecord = {
        id: "prompt_" + Date.now(),
        title: newPromptTitle.trim(),
        category: newPromptCategory,
        content: newPromptContent.trim(),
        isActive: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const res = await supabaseHistory.saveAiPrompt(newRecord);
      setPromptSaveMessage({ success: res.success, text: res.message });
      setNewPromptTitle("");
      setNewPromptContent("");
      await loadPrompts();
      setTimeout(() => setPromptSaveMessage(null), 4000);
    } catch (err: any) {
      setPromptSaveMessage({ success: false, text: err?.message || "Failed to save prompt." });
    } finally {
      setIsSavingPrompt(false);
    }
  };

  const handleSetActivePrompt = async (prompt: AiPromptRecord) => {
    const res = await supabaseHistory.setActiveAiPrompt(prompt.id);
    if (res.success) {
      setActivePromptId(prompt.id);
      aiBrain.saveProfile({ customInstructions: prompt.content, activePromptId: prompt.id });
      await loadPrompts();
    }
  };

  const handleDeletePrompt = async (id: string) => {
    await supabaseHistory.deleteAiPrompt(id);
    await loadPrompts();
  };

  useEffect(() => {
    const unsub = tokenTracker.subscribe((m) => {
      setTokens(m);
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleUpdateQuota = async (newQuota: number) => {
    setQuotaBudget(newQuota);
    await tokenTracker.updateSettings(newQuota, alertThreshold);
  };

  const handleUpdateThreshold = async (newThreshold: number) => {
    setAlertThreshold(newThreshold);
    await tokenTracker.updateSettings(quotaBudget, newThreshold);
  };

  const handleResetTokens = async () => {
    setIsResetting(true);
    await tokenTracker.resetTokens();
    setIsResetting(false);
  };

  const handleSaveSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTestingSupabase(true);
    setSupabaseTestResult(null);
    try {
      await supabaseHistory.setConfig(supabaseConfig.url, supabaseConfig.anonKey);
      const res = await supabaseHistory.testConnection();
      setSupabaseTestResult(res);
      if (onSupabaseStatusChange) onSupabaseStatusChange();
    } catch (err: any) {
      setSupabaseTestResult({ success: false, message: err?.message || "Failed to reach Supabase" });
    } finally {
      setIsTestingSupabase(false);
    }
  };

  const handleClearSupabase = async () => {
    await supabaseHistory.setConfig("", "");
    setSupabaseConfig({ url: "", anonKey: "" });
    setSupabaseTestResult({
      success: true,
      message: "Reset to Local Storage mode.",
    });
    if (onSupabaseStatusChange) onSupabaseStatusChange();
  };

  const copySql = () => {
    navigator.clipboard.writeText(supabaseHistory.getSetupSqlScript());
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleExportJson = async () => {
    const data = await supabaseHistory.exportAllHistory();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auralive-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div className="relative w-full max-w-3xl bg-zinc-900 border border-zinc-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-zinc-800 bg-zinc-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 text-sky-400 border border-sky-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 id="settings-title" className="text-base font-bold text-white flex items-center gap-2">
                <span>System & Voice Settings</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live Active
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                API credit token quota, cloud sync, and voice model configuration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800/80 bg-zinc-950/40 px-6 gap-2 pt-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("tokens")}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-xl transition border-b-2 ${
              activeTab === "tokens"
                ? "border-sky-400 text-sky-400 bg-zinc-900"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>API Credit & Tokens</span>
          </button>

          <button
            onClick={() => setActiveTab("supabase")}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-xl transition border-b-2 ${
              activeTab === "supabase"
                ? "border-emerald-400 text-emerald-400 bg-zinc-900"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Supabase Cloud DB</span>
          </button>

          <button
            onClick={() => setActiveTab("prompts")}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-xl transition border-b-2 ${
              activeTab === "prompts"
                ? "border-amber-400 text-amber-400 bg-zinc-900"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Prompts (Database)</span>
          </button>

          <button
            onClick={() => setActiveTab("voice")}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-xl transition border-b-2 ${
              activeTab === "voice"
                ? "border-indigo-400 text-indigo-400 bg-zinc-900"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>Voice & Audio</span>
          </button>

          <button
            onClick={() => setActiveTab("appearance")}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-xl transition border-b-2 ${
              activeTab === "appearance"
                ? "border-amber-400 text-amber-400 bg-zinc-900"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Themes & Contrast</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* TAB: API CREDIT & TOKENS */}
          {activeTab === "tokens" && (
            <div className="space-y-6">
              {/* Primary Gauge Banner */}
              <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">API Token Credit Remaining</h3>
                      <p className="text-[11px] text-zinc-400">
                        Real-time token consumption across Live Voice & Chat calls
                      </p>
                    </div>
                  </div>

                  <span className="text-sm font-extrabold font-mono text-sky-400">
                    {tokens.percentageRemaining}% Remaining
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="h-3 w-full rounded-full bg-zinc-800/90 overflow-hidden p-0.5 border border-zinc-700/80">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        tokens.isNearQuota
                          ? "bg-red-500"
                          : tokens.percentageUsed > 50
                          ? "bg-amber-400"
                          : "bg-gradient-to-r from-sky-400 to-emerald-400"
                      }`}
                      style={{ width: `${Math.max(2, tokens.percentageRemaining)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-zinc-400 font-mono">
                    <span>
                      Tokens Used: <strong className="text-zinc-200">{(tokens?.totalTokensUsed ?? 0).toLocaleString()}</strong>
                    </span>
                    <span>
                      Remaining: <strong className="text-sky-300">{(tokens?.remainingTokens ?? 1000000).toLocaleString()}</strong> / {(tokens?.sessionQuota ?? 1000000).toLocaleString()}
                    </span>
                  </div>
                </div>

                {tokens?.isNearQuota && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Token usage has exceeded {tokens?.alertThresholdPercent ?? 80}% of your session quota budget.</span>
                  </div>
                )}
              </div>

              {/* 4 Detail Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">
                    Input / Prompt
                  </span>
                  <span className="text-base font-extrabold font-mono text-zinc-100">
                    {(tokens?.promptTokens ?? 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">tokens</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">
                    Model Replies
                  </span>
                  <span className="text-base font-extrabold font-mono text-sky-300">
                    {(tokens?.candidateTokens ?? 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">tokens</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">
                    Spoken Audio
                  </span>
                  <span className="text-base font-extrabold font-mono text-emerald-300">
                    {(tokens?.audioTokens ?? 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">audio tokens</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">
                    Est. Cost
                  </span>
                  <span className="text-base font-extrabold font-mono text-amber-300">
                    ${tokens.estimatedCostUsd}
                  </span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">{tokens.requestCount} requests</span>
                </div>
              </div>

              {/* Quota Budget Configurator */}
              <div className="p-5 rounded-2xl bg-zinc-950/60 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">Session Token Budget Quota</h4>
                    <p className="text-[11px] text-zinc-400">
                      Set your desired target threshold for this session
                    </p>
                  </div>
                  <button
                    onClick={handleResetTokens}
                    disabled={isResetting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? "animate-spin" : ""}`} />
                    <span>Reset Counter</span>
                  </button>
                </div>

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-2">
                  {[250000, 500000, 1000000, 2000000, 5000000].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => handleUpdateQuota(amount)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition font-mono ${
                        quotaBudget === amount
                          ? "bg-sky-500 text-zinc-950 font-bold"
                          : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800"
                      }`}
                    >
                      {amount >= 1000000 ? `${amount / 1000000}M Tokens` : `${amount / 1000}k Tokens`}
                    </button>
                  ))}
                </div>

                {/* Alert Threshold Slider */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs text-zinc-300">
                    <span>Warning Alert Threshold:</span>
                    <strong className="text-amber-400 font-mono">{alertThreshold}%</strong>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="95"
                    step="5"
                    value={alertThreshold}
                    onChange={(e) => handleUpdateThreshold(Number(e.target.value))}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB: SUPABASE CLOUD SYNC */}
          {activeTab === "supabase" && (
            <div className="space-y-4">
              <form onSubmit={handleSaveSupabase} className="space-y-4">
                <div className="rounded-2xl bg-zinc-950/80 border border-zinc-800 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Supabase Cloud Database Integration</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Connect your Supabase project to synchronize conversation history, audio metadata, and messages in the cloud across all your devices.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Supabase Project URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://xyzproject.supabase.co"
                    value={supabaseConfig.url}
                    onChange={(e) => setSupabaseConfig({ ...supabaseConfig, url: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-sm focus:border-emerald-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Supabase Anon / Public Key
                  </label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={supabaseConfig.anonKey}
                    onChange={(e) => setSupabaseConfig({ ...supabaseConfig, anonKey: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-sm focus:border-emerald-400 focus:outline-none"
                  />
                </div>

                {supabaseTestResult && (
                  <div
                    className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                      supabaseTestResult.success
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                        : "bg-red-500/10 border-red-500/30 text-red-300"
                    }`}
                  >
                    {supabaseTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <span>{supabaseTestResult.message}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleClearSupabase}
                    className="text-xs text-zinc-400 hover:text-red-400 transition"
                  >
                    Reset to Local Storage
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={isTestingSupabase}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold transition disabled:opacity-50"
                    >
                      {isTestingSupabase ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                          <span>Testing Connection...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Save & Test Supabase</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>

              {/* SQL Schema Snippet */}
              <div className="pt-2 space-y-2 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-300">
                    Required Database Tables:
                  </span>
                  <button
                    onClick={copySql}
                    className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? "Copied SQL!" : "Copy SQL Script"}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-400 max-h-36 overflow-x-auto">
                  {supabaseHistory.getSetupSqlScript()}
                </pre>
              </div>

              {/* Export JSON */}
              <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Export All Chat & Voice Sessions</h4>
                  <p className="text-[11px] text-zinc-400">Download your full history as JSON backup</p>
                </div>
                <button
                  onClick={handleExportJson}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download JSON</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB: AI PROMPTS & DIRECTIVES (DATABASE PERSISTENCE) */}
          {activeTab === "prompts" && (
            <div className="space-y-5 animate-fade-in">
              <div className="rounded-2xl bg-zinc-950/80 border border-amber-500/25 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                    <Sparkles className="w-4 h-4" />
                    <span>AI System Prompts & Database Library</span>
                  </div>
                  {supabaseHistory.isConfigured() ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Supabase Cloud Sync
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px] font-mono font-bold">
                      Local Mode
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Store custom AI personas, instructions, and engineering rules directly in your Supabase database (<code className="text-[11px] text-amber-300 font-mono">ai_prompts</code> table). Activate any prompt to instantly shape j TEC's reasoning across Chat and Live Voice.
                </p>
              </div>

              {/* Add New Prompt to Database Form */}
              <form onSubmit={handleAddPrompt} className="p-4 rounded-2xl bg-[#121118]/90 border border-amber-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Add New AI Prompt to Database</span>
                  </h4>
                  {promptSaveMessage && (
                    <span className={`text-[11px] font-bold animate-fade-in flex items-center gap-1 ${promptSaveMessage.success ? "text-emerald-400" : "text-red-400"}`}>
                      {promptSaveMessage.success ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      <span>{promptSaveMessage.text}</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
                      Prompt Title
                    </label>
                    <input
                      type="text"
                      value={newPromptTitle}
                      onChange={(e) => setNewPromptTitle(e.target.value)}
                      placeholder="e.g. Senior Backend Architect"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
                      Category Tag
                    </label>
                    <select
                      value={newPromptCategory}
                      onChange={(e) => setNewPromptCategory(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-amber-300 font-medium focus:outline-none focus:border-amber-400"
                    >
                      <option value="engineering">💻 Engineering & Stack</option>
                      <option value="brother_chill">⚡ Tech Bro & Casual</option>
                      <option value="islamic">🕌 Islamic & Barakah</option>
                      <option value="code_review">🛡️ Strict Code Reviewer</option>
                      <option value="concise">🎯 Laser Concise</option>
                      <option value="custom">✨ Custom Persona</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
                    Directives & System Instructions
                  </label>
                  <textarea
                    value={newPromptContent}
                    onChange={(e) => setNewPromptContent(e.target.value)}
                    rows={3}
                    placeholder="Enter instructions, tone of voice, formatting rules, or code preferences..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 font-mono resize-y"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-zinc-500">
                    Saves permanently to Supabase cloud and syncs across devices
                  </span>
                  <button
                    type="submit"
                    disabled={isSavingPrompt || !newPromptTitle.trim() || !newPromptContent.trim()}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold text-xs shadow-md shadow-amber-500/20 hover:brightness-110 active:scale-95 disabled:opacity-40 transition flex items-center gap-1.5"
                  >
                    {isSavingPrompt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                    <span>Save Prompt to Database</span>
                  </button>
                </div>
              </form>

              {/* Saved Prompts in Database Library */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Database Prompts ({prompts.length})</span>
                  </span>
                  <button
                    onClick={loadPrompts}
                    disabled={isLoadingPrompts}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
                  >
                    <RotateCcw className={`w-3 h-3 ${isLoadingPrompts ? "animate-spin" : ""}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {prompts.map((p) => {
                    const isActive = p.id === activePromptId || p.isActive;
                    return (
                      <div
                        key={p.id}
                        className={`p-3.5 rounded-xl border transition flex flex-col gap-2 ${
                          isActive
                            ? "bg-amber-500/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                            : "bg-zinc-950/80 border-zinc-800 hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white tracking-tight">
                                {p.title}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-700 text-zinc-400 text-[9px] uppercase font-mono font-semibold">
                                {p.category}
                              </span>
                              {isActive && (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] uppercase font-mono font-bold flex items-center gap-1">
                                  <CheckCheck className="w-3 h-3" /> ACTIVE PROMPT
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-300 font-mono leading-relaxed line-clamp-2">
                              {p.content}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {!isActive ? (
                              <button
                                onClick={() => handleSetActivePrompt(p)}
                                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-amber-500 hover:text-black text-amber-300 text-[11px] font-bold transition active:scale-95"
                                title="Activate this prompt for chat and Live voice"
                              >
                                Activate
                              </button>
                            ) : (
                              <span className="text-[11px] text-emerald-400 font-bold px-2 py-1">
                                Active ✓
                              </span>
                            )}
                            <button
                              onClick={() => handleDeletePrompt(p.id)}
                              className="p-1 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition"
                              title="Delete from database"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB: VOICE & AUDIO */}
          {activeTab === "voice" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-2">
                  Sana Voice Persona
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PREBUILT_VOICES.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => onSelectVoice(v.id)}
                      className={`p-3 rounded-xl text-left border transition ${
                        currentVoice === v.id
                          ? "bg-indigo-500/10 border-indigo-500 text-white"
                          : "bg-zinc-950 hover:bg-zinc-800/80 border-zinc-800 text-zinc-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm">{v.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-400">
                          {v.gender}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">{v.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-2">
                  Default Speech Recognition Language
                </label>
                <select
                  value={currentLanguage.code}
                  onChange={(e) => {
                    const l = SUPPORTED_LANGUAGES.find((x) => x.code === e.target.value);
                    if (l) onSelectLanguage(l);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-sm focus:border-indigo-400 focus:outline-none"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code} className="bg-zinc-900 text-white">
                      {lang.flag} {lang.name} ({lang.nativeName})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* TAB: THEMES & CONTRAST */}
          {activeTab === "appearance" && (
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                Accessible Color Palette & Contrast Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: "dark", name: "Standard Dark", desc: "Balanced dark theme for all screens", badge: "Default" },
                  { id: "high-contrast-dark", name: "High Contrast OLED Dark", desc: "Pure #000000 obsidian with crisp neon blue accents (WCAG AAA)", badge: "Highest Contrast" },
                  { id: "high-contrast-light", name: "High Contrast Solar Light", desc: "Bright white canvas with deep ink typography", badge: "Light" },
                  { id: "midnight-indigo", name: "Midnight Indigo", desc: "Deep cosmic blue and violet tones", badge: "Refined" },
                  { id: "cyberpunk-neon", name: "Cyberpunk High Contrast", desc: "Vibrant yellow & cyan accents against black", badge: "Vibrant" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onSelectTheme(t.id as ThemeType)}
                    className={`p-3.5 rounded-2xl text-left border transition ${
                      theme === t.id
                        ? "bg-amber-500/10 border-amber-400 text-white shadow-lg shadow-amber-500/10"
                        : "bg-zinc-950 hover:bg-zinc-800/80 border-zinc-800 text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm">{t.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400">
                        {t.badge}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
