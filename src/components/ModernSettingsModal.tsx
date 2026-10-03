import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Sliders,
  Cpu,
  MessageSquare,
  Database,
  Info,
  Check,
  CheckCircle2,
  XCircle,
  Copy,
  Download,
  Trash2,
  Sparkles,
  RotateCcw,
  Volume2,
  Globe,
  Bell,
  Shield,
  Plus,
  Loader2,
  ExternalLink,
  Lock,
} from "lucide-react";
import { tokenTracker, TokenMetrics } from "../services/tokenTracker";
import {
  supabaseHistory,
  SupabaseConfig,
  AiPromptRecord,
} from "../services/supabase";
import { aiBrain, UserBrainProfile, MemoryItem } from "../services/aiBrain";
import {
  SUPPORTED_LANGUAGES,
  PREBUILT_VOICES,
  LanguageOption,
} from "../services/languages";
import { ThemeType } from "./Navbar";

export type SettingsSection =
  | "account"
  | "general"
  | "models"
  | "chat"
  | "data"
  | "about";

interface ModernSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSection?: SettingsSection;
  currentVoice: string;
  onSelectVoice: (voice: string) => void;
  currentLanguage: LanguageOption;
  onSelectLanguage: (lang: LanguageOption) => void;
  theme: ThemeType;
  onSelectTheme: (theme: ThemeType) => void;
  onClearAllHistory?: () => void;
  onSupabaseStatusChange?: () => void;
}

export const ModernSettingsModal: React.FC<ModernSettingsModalProps> = ({
  isOpen,
  onClose,
  initialSection = "general",
  currentVoice,
  onSelectVoice,
  currentLanguage,
  onSelectLanguage,
  theme,
  onSelectTheme,
  onClearAllHistory,
  onSupabaseStatusChange,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection);
  const [brainProfile, setBrainProfile] = useState<UserBrainProfile>(aiBrain.getProfile());

  // Account editing form state
  const [name, setName] = useState(brainProfile.userName);
  const [role, setRole] = useState(brainProfile.roleOccupation);
  const [bio, setBio] = useState(brainProfile.bioSummary);
  const [accountSavedToast, setAccountSavedToast] = useState(false);

  // Tokens state
  const [tokens, setTokens] = useState<TokenMetrics>(tokenTracker.getMetrics());

  // Supabase state
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>({
    url: "",
    anonKey: "",
  });
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [supabaseTestResult, setSupabaseTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // AI Prompts state
  const [prompts, setPrompts] = useState<AiPromptRecord[]>([]);
  const [newPromptTitle, setNewPromptTitle] = useState("");
  const [newPromptCategory, setNewPromptCategory] =
    useState<AiPromptRecord["category"]>("engineering");
  const [newPromptContent, setNewPromptContent] = useState("");
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [promptMessage, setPromptMessage] = useState<string | null>(null);
  const [activePromptId, setActivePromptId] = useState("");

  // Notifications toggle
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // SQL Script copy state
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveSection(initialSection);
      const p = aiBrain.getProfile();
      setBrainProfile(p);
      setName(p.userName);
      setRole(p.roleOccupation);
      setBio(p.bioSummary);
      setSupabaseConfig(supabaseHistory.getConfig());
      loadPrompts();
      tokenTracker.refreshMetrics().then((m) => setTokens(m));
    }
  }, [isOpen, initialSection]);

  const loadPrompts = async () => {
    const list = await supabaseHistory.getAiPrompts();
    setPrompts(list);
    const active = list.find((p) => p.isActive);
    if (active) setActivePromptId(active.id);
  };

  if (!isOpen) return null;

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    aiBrain.saveProfile({
      userName: name.trim() || "Johnny",
      roleOccupation: role.trim(),
      bioSummary: bio.trim(),
    });
    setBrainProfile(aiBrain.getProfile());
    setAccountSavedToast(true);
    setTimeout(() => setAccountSavedToast(false), 2500);
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
      setSupabaseTestResult({
        success: false,
        message: err?.message || "Failed to connect to Supabase.",
      });
    } finally {
      setIsTestingSupabase(false);
    }
  };

  const handleAddPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromptTitle.trim() || !newPromptContent.trim()) return;

    setIsSavingPrompt(true);
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
      await supabaseHistory.saveAiPrompt(newRecord);
      setNewPromptTitle("");
      setNewPromptContent("");
      setPromptMessage("Prompt saved to database!");
      await loadPrompts();
      setTimeout(() => setPromptMessage(null), 3000);
    } finally {
      setIsSavingPrompt(false);
    }
  };

  const handleSetActivePrompt = async (p: AiPromptRecord) => {
    await supabaseHistory.setActiveAiPrompt(p.id);
    aiBrain.saveProfile({ customInstructions: p.content, activePromptId: p.id });
    setActivePromptId(p.id);
    await loadPrompts();
  };

  const handleExportJson = async () => {
    const jsonStr = await supabaseHistory.exportAllHistory();
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jtec_chat_history_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const navSections = [
    { id: "account" as const, label: "Account", icon: User },
    { id: "general" as const, label: "General", icon: Sliders },
    { id: "models" as const, label: "AI & Models", icon: Cpu },
    { id: "chat" as const, label: "Chat & Memories", icon: MessageSquare },
    { id: "data" as const, label: "Data Controls", icon: Database },
    { id: "about" as const, label: "About", icon: Info },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-4xl h-[90vh] max-h-[680px] bg-[#101014] border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        {/* Left Settings Navigation */}
        <div className="w-full md:w-56 border-b md:border-b-0 md:border-r border-white/[0.08] bg-[#0c0c0f] p-3 flex md:flex-col justify-between shrink-0 overflow-x-auto md:overflow-visible">
          <div className="space-y-1 flex-1 flex md:flex-col gap-1 md:gap-0">
            <div className="hidden md:block px-3 py-2 text-xs font-bold text-white tracking-wide">
              Settings
            </div>
            {navSections.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition whitespace-nowrap ${
                    isActive
                      ? "bg-white/[0.1] text-white"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{sec.label}</span>
                </button>
              );
            })}
          </div>

          <div className="hidden md:block px-3 py-2 text-[10px] text-zinc-500 font-mono">
            j TEC Assistant v2.4
          </div>
        </div>

        {/* Right Settings Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#101014] overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
            <h3 className="text-sm font-bold text-white capitalize">
              {activeSection === "models"
                ? "AI & Models Configuration"
                : `${activeSection} Settings`}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition"
              aria-label="Close settings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Section Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* 1. ACCOUNT */}
            {activeSection === "account" && (
              <form onSubmit={handleSaveAccount} className="space-y-4 max-w-lg">
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-400 text-black font-black text-base flex items-center justify-center">
                    {name ? name.charAt(0).toUpperCase() : "J"}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{name}</div>
                    <div className="text-xs text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Authenticated & Ready
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-black/40 border border-white/[0.1] rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Occupation / Role
                  </label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3.5 py-2 bg-black/40 border border-white/[0.1] rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Bio & Context for AI
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full px-3.5 py-2 bg-black/40 border border-white/[0.1] rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-white text-black font-bold text-xs rounded-xl hover:bg-zinc-200 transition active:scale-95 shadow-sm"
                  >
                    Save Changes
                  </button>
                  {accountSavedToast && (
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 animate-fade-in">
                      <Check className="w-3.5 h-3.5" /> Saved!
                    </span>
                  )}
                </div>
              </form>
            )}

            {/* 2. GENERAL */}
            {activeSection === "general" && (
              <div className="space-y-5 max-w-lg">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-2">
                    Theme / Appearance
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "dark" as const, name: "Luxury Dark (Default)" },
                      { id: "midnight-indigo" as const, name: "Midnight Indigo" },
                      { id: "high-contrast-dark" as const, name: "High Contrast Dark" },
                      { id: "cyberpunk-neon" as const, name: "Cyberpunk Neon" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => onSelectTheme(t.id)}
                        className={`p-3 rounded-xl border text-left text-xs transition ${
                          theme === t.id
                            ? "bg-white/[0.1] border-amber-400 text-white font-semibold"
                            : "bg-white/[0.02] border-white/[0.08] text-zinc-400 hover:text-white"
                        }`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-2">
                    Spoken & Chat Language
                  </label>
                  <select
                    value={currentLanguage.code}
                    onChange={(e) => {
                      const found = SUPPORTED_LANGUAGES.find(
                        (l) => l.code === e.target.value
                      );
                      if (found) onSelectLanguage(found);
                    }}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.1] rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code} className="bg-zinc-900">
                        {l.flag} {l.name} ({l.nativeName})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-white">Audio Feedback</div>
                    <div className="text-[11px] text-zinc-400">Play subtle click & response cues</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                    className="w-4 h-4 accent-amber-400 rounded"
                  />
                </div>
              </div>
            )}

            {/* 3. AI / MODELS */}
            {activeSection === "models" && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-2">
                    Default AI Model Engine
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-3.5 rounded-2xl border border-amber-400/40 bg-amber-500/[0.05]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white">Gemini 2.5 Flash</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-mono">ACTIVE</span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Ultra-fast streaming with token-efficient reasoning and full Live duplex compatibility.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white">Gemini 2.0 Live Voice</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">VOICE</span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Dedicated 24kHz PCM bidirectional audio bridge over WebSockets.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Voice Selection */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-2">
                    Voice Persona (TTS & Live)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PREBUILT_VOICES.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => onSelectVoice(v.id)}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          currentVoice === v.id
                            ? "bg-amber-500/10 border-amber-400 text-white font-semibold"
                            : "bg-white/[0.02] border-white/[0.08] text-zinc-300 hover:text-white"
                        }`}
                      >
                        <div className="text-xs">{v.name}</div>
                        <div className="text-[10px] text-zinc-500 line-clamp-1">{v.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Prompts Database Section */}
                <div className="pt-2 border-t border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">
                        AI Prompts & Instructions Database
                      </h4>
                      <p className="text-[11px] text-zinc-400">
                        Custom personas and directives persisted in Supabase
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleAddPrompt} className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5 text-amber-400" /> Add New Prompt to DB
                      </span>
                      {promptMessage && (
                        <span className="text-[11px] text-emerald-400 font-semibold">{promptMessage}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={newPromptTitle}
                        onChange={(e) => setNewPromptTitle(e.target.value)}
                        placeholder="Prompt Title (e.g. Senior Backend Architect)"
                        className="px-3 py-1.5 bg-black/40 border border-white/[0.1] rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                      />
                      <select
                        value={newPromptCategory}
                        onChange={(e) => setNewPromptCategory(e.target.value as any)}
                        className="px-3 py-1.5 bg-black/40 border border-white/[0.1] rounded-lg text-xs text-amber-300 focus:outline-none focus:border-amber-400"
                      >
                        <option value="engineering">💻 Engineering</option>
                        <option value="brother_chill">⚡ Tech Bro</option>
                        <option value="islamic">🕌 Islamic</option>
                        <option value="code_review">🛡️ Code Review</option>
                        <option value="concise">🎯 Concise</option>
                      </select>
                    </div>
                    <textarea
                      rows={2}
                      value={newPromptContent}
                      onChange={(e) => setNewPromptContent(e.target.value)}
                      placeholder="Prompt instructions & directives..."
                      className="w-full px-3 py-1.5 bg-black/40 border border-white/[0.1] rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 font-mono"
                    />
                    <button
                      type="submit"
                      disabled={isSavingPrompt || !newPromptTitle.trim()}
                      className="px-3 py-1.5 bg-amber-500 text-black font-bold text-xs rounded-lg hover:bg-amber-400 transition disabled:opacity-50"
                    >
                      Save Prompt to Database
                    </button>
                  </form>

                  {/* Saved Prompts list */}
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {prompts.map((p) => {
                      const isActive = p.id === activePromptId || p.isActive;
                      return (
                        <div
                          key={p.id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                            isActive
                              ? "bg-amber-500/10 border-amber-500/50"
                              : "bg-white/[0.02] border-white/[0.06]"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-white truncate">{p.title}</span>
                              {isActive && (
                                <span className="text-[9px] font-mono text-emerald-400 font-bold">ACTIVE</span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-400 truncate">{p.content}</p>
                          </div>
                          <button
                            onClick={() => handleSetActivePrompt(p)}
                            disabled={isActive}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 ${
                              isActive
                                ? "text-emerald-400 bg-emerald-500/10"
                                : "text-amber-400 hover:bg-white/[0.06]"
                            }`}
                          >
                            {isActive ? "Active" : "Activate"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 4. CHAT & MEMORIES */}
            {activeSection === "chat" && (
              <div className="space-y-5">
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-white">Continuous AI Memory (Auto-Learn)</div>
                    <div className="text-[11px] text-zinc-400">
                      Seamlessly detect personal facts, goals, and technical stacks as you talk
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={brainProfile.autoLearnEnabled}
                    onChange={(e) => {
                      aiBrain.saveProfile({ autoLearnEnabled: e.target.checked });
                      setBrainProfile(aiBrain.getProfile());
                    }}
                    className="w-4 h-4 accent-amber-400 rounded"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-zinc-300">
                      Active Brain Memories ({brainProfile.memories.length})
                    </span>
                    <button
                      onClick={() => {
                        aiBrain.resetToDefaults();
                        setBrainProfile(aiBrain.getProfile());
                      }}
                      className="text-[11px] text-zinc-500 hover:text-red-400 transition"
                    >
                      Reset Memories
                    </button>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {brainProfile.memories.map((mem) => (
                      <div
                        key={mem.id}
                        className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-start justify-between gap-2"
                      >
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <span className="text-[9px] uppercase font-mono text-amber-400 font-bold">
                            {mem.category}
                          </span>
                          <p className="text-xs text-zinc-200 leading-relaxed">{mem.fact}</p>
                        </div>
                        <button
                          onClick={() => {
                            aiBrain.removeMemory(mem.id);
                            setBrainProfile(aiBrain.getProfile());
                          }}
                          className="p-1 text-zinc-600 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 5. DATA CONTROLS */}
            {activeSection === "data" && (
              <div className="space-y-5">
                {/* Supabase Connection */}
                <form onSubmit={handleSaveSupabase} className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Supabase Cloud Integration</span>
                    </h4>
                    <span className="text-[10px] font-mono text-zinc-500">PostgreSQL</span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">Project URL</label>
                    <input
                      type="url"
                      placeholder="https://xyz.supabase.co"
                      value={supabaseConfig.url}
                      onChange={(e) =>
                        setSupabaseConfig({ ...supabaseConfig, url: e.target.value })
                      }
                      className="w-full px-3 py-1.5 bg-black/40 border border-white/[0.1] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">Anon / Public Key</label>
                    <input
                      type="password"
                      placeholder="eyJhbGciOi..."
                      value={supabaseConfig.anonKey}
                      onChange={(e) =>
                        setSupabaseConfig({ ...supabaseConfig, anonKey: e.target.value })
                      }
                      className="w-full px-3 py-1.5 bg-black/40 border border-white/[0.1] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                    />
                  </div>

                  {supabaseTestResult && (
                    <div
                      className={`p-2.5 rounded-xl text-xs ${
                        supabaseTestResult.success
                          ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                          : "bg-red-500/10 text-red-300 border border-red-500/30"
                      }`}
                    >
                      {supabaseTestResult.message}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isTestingSupabase}
                    className="px-3.5 py-1.5 bg-emerald-500 text-black font-bold text-xs rounded-xl hover:bg-emerald-400 transition"
                  >
                    {isTestingSupabase ? "Testing..." : "Save & Connect"}
                  </button>
                </form>

                {/* Export / Clear */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/[0.08]">
                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-2">
                    <div className="text-xs font-bold text-white">Export Chat History</div>
                    <p className="text-[11px] text-zinc-400">Download complete session records in JSON format.</p>
                    <button
                      onClick={handleExportJson}
                      className="px-3 py-1.5 bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> Export JSON
                    </button>
                  </div>

                  {onClearAllHistory && (
                    <div className="p-3.5 rounded-2xl bg-red-500/[0.04] border border-red-500/20 space-y-2">
                      <div className="text-xs font-bold text-red-400">Clear All Conversations</div>
                      <p className="text-[11px] text-zinc-400">Irreversibly delete stored local chat history.</p>
                      <button
                        onClick={() => {
                          if (confirm("Are you sure you want to clear all conversation history?")) {
                            onClearAllHistory();
                          }
                        }}
                        className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Clear History
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6. ABOUT */}
            {activeSection === "about" && (
              <div className="space-y-4 max-w-lg text-xs leading-relaxed text-zinc-400">
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black">
                    ⚡
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">j TEC AI Studio Workspace</div>
                    <div className="text-zinc-500 font-mono text-[11px]">Version 2.4.0 Production</div>
                  </div>
                </div>

                <p>
                  j TEC is Johnny's dedicated real-time AI assistant and full-stack engineering companion. Built on Google Gemini 2.5 Flash, WebSocket bidirectional Live Voice, and Supabase cloud persistence.
                </p>

                <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>Engine</span>
                    <span className="font-mono text-amber-400">Gemini 2.5 + Live 2.0</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>Database</span>
                    <span className="font-mono text-emerald-400">Supabase PostgreSQL</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>Architecture</span>
                    <span className="font-mono text-zinc-400">React + Vite + Express WS</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
