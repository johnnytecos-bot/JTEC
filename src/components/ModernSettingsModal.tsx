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
  Download,
  Trash2,
  Sparkles,
  Volume2,
  Globe,
  Bell,
  ShieldCheck,
  LogOut,
  Radio,
} from "lucide-react";
import { supabaseHistory } from "../services/supabase";
import { aiBrain, UserBrainProfile } from "../services/aiBrain";
import {
  SUPPORTED_LANGUAGES,
  PREBUILT_VOICES,
  LanguageOption,
} from "../services/languages";
import { ThemeType } from "./Navbar";

export type SettingsSection =
  | "account"
  | "general"
  | "ai"
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
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection);
  const [brainProfile, setBrainProfile] = useState<UserBrainProfile>(aiBrain.getProfile());

  // Account form state
  const [name, setName] = useState(brainProfile.userName);
  const [role, setRole] = useState(brainProfile.roleOccupation);
  const [bio, setBio] = useState(brainProfile.bioSummary);
  const [accountSavedToast, setAccountSavedToast] = useState(false);

  // General state
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [sendOnEnter, setSendOnEnter] = useState(true);

  // Voice speed
  const [voiceSpeed, setVoiceSpeed] = useState<number>(brainProfile.voiceSpeed || 1.0);

  useEffect(() => {
    if (isOpen) {
      setActiveSection(initialSection);
      const p = aiBrain.getProfile();
      setBrainProfile(p);
      setName(p.userName);
      setRole(p.roleOccupation);
      setBio(p.bioSummary);
      if (p.voiceSpeed) setVoiceSpeed(p.voiceSpeed);
    }
  }, [isOpen, initialSection]);

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
    setTimeout(() => setAccountSavedToast(false), 2200);
  };

  const handleSaveVoiceSpeed = (newSpeed: number) => {
    setVoiceSpeed(newSpeed);
    aiBrain.saveProfile({ voiceSpeed: newSpeed });
    setBrainProfile(aiBrain.getProfile());
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

  const isCloudSynced = supabaseHistory.isConfigured();

  const navSections = [
    { id: "account" as const, label: "Account", icon: User },
    { id: "general" as const, label: "General", icon: Sliders },
    { id: "ai" as const, label: "AI & Voice", icon: Cpu },
    { id: "chat" as const, label: "Chat", icon: MessageSquare },
    { id: "data" as const, label: "Data Controls", icon: Database },
    { id: "about" as const, label: "About", icon: Info },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-3xl h-[88vh] max-h-[620px] bg-[#101014] border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row select-none">
        {/* Left Settings Sidebar */}
        <div className="w-full md:w-52 border-b md:border-b-0 md:border-r border-white/[0.08] bg-[#0c0c0f] p-3 flex md:flex-col justify-between shrink-0 overflow-x-auto md:overflow-visible">
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
            j TEC Assistant v2.5
          </div>
        </div>

        {/* Right Settings Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#101014] overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
            <h3 className="text-sm font-bold text-white capitalize">
              {activeSection === "ai" ? "AI & Voice Preferences" : `${activeSection} Settings`}
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
                <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-400 text-black font-black text-base flex items-center justify-center shadow-md">
                    {name ? name.charAt(0).toUpperCase() : "J"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate">{name}</div>
                    <div className="text-xs text-emerald-400 flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Authenticated Session</span>
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
                    placeholder="Tell j TEC about your work, stack, and goals..."
                    className="w-full px-3.5 py-2 bg-black/40 border border-white/[0.1] rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 leading-relaxed"
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
                      { id: "dark" as const, name: "Luxury Dark" },
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
                    <div className="text-[11px] text-zinc-400">Play audio cues on interaction</div>
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

            {/* 3. AI & VOICE */}
            {activeSection === "ai" && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-2">
                    AI Provider & Model Engine
                  </label>
                  <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.02] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Google Gemini Engine</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono font-semibold">
                        Connected
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Configured server-side on Render via <code className="text-amber-400 font-mono">GEMINI_API_KEY</code>.
                    </p>
                  </div>
                </div>

                {/* Voice Selection */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-2">
                    Voice Persona (TTS & Live Duplex)
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

                {/* Voice Speed Slider */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-zinc-300">
                      Speech Rate
                    </label>
                    <span className="text-xs font-mono text-amber-400">{voiceSpeed.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.75"
                    max="1.5"
                    step="0.05"
                    value={voiceSpeed}
                    onChange={(e) => handleSaveVoiceSpeed(parseFloat(e.target.value))}
                    className="w-full accent-amber-400"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-0.5">
                    <span>0.75x (Relaxed)</span>
                    <span>1.0x (Natural)</span>
                    <span>1.5x (Fast)</span>
                  </div>
                </div>
              </div>
            )}

            {/* 4. CHAT */}
            {activeSection === "chat" && (
              <div className="space-y-5">
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-white">Continuous AI Memory</div>
                    <div className="text-[11px] text-zinc-400">
                      Learn facts about your workflow and preferences automatically as you chat
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

                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-white">Send on Enter</div>
                    <div className="text-[11px] text-zinc-400">
                      Press Enter to send message, Shift+Enter for new line
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={sendOnEnter}
                    onChange={(e) => setSendOnEnter(e.target.checked)}
                    className="w-4 h-4 accent-amber-400 rounded"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-zinc-300">
                      Learned Facts & Memories ({brainProfile.memories.length})
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

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {brainProfile.memories.length === 0 ? (
                      <div className="py-6 text-center text-xs text-zinc-500">
                        No memories recorded yet.
                      </div>
                    ) : (
                      brainProfile.memories.map((mem) => (
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
                            className="p-1 text-zinc-600 hover:text-red-400 transition"
                            title="Delete memory"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 5. DATA CONTROLS */}
            {activeSection === "data" && (
              <div className="space-y-5">
                {/* Database Sync Status */}
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Database Storage & Sync</span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                        isCloudSynced
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-white/[0.06] text-zinc-400"
                      }`}
                    >
                      {isCloudSynced ? "Supabase Cloud Active" : "Local Browser Vault"}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    {isCloudSynced
                      ? "Connected to your configured Supabase PostgreSQL instance via environment variables. Conversations and prompt directives are synced automatically."
                      : "Conversations are safely preserved in your browser's persistent local storage. When you deploy with Supabase environment variables, cloud sync activates automatically."}
                  </p>
                </div>

                {/* Export / Clear History */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/[0.08]">
                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-2">
                    <div className="text-xs font-bold text-white">Export Conversations</div>
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
                      <p className="text-[11px] text-zinc-400">Irreversibly erase stored chat history.</p>
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
                    <div className="text-sm font-bold text-white">j TEC Assistant</div>
                    <div className="text-zinc-500 font-mono text-[11px]">Version 2.5.0 Production</div>
                  </div>
                </div>

                <p>
                  j TEC is a production-grade AI workspace powered by Google Gemini, real-time WebSocket Live Voice duplex audio, and clean Supabase database persistence.
                </p>

                <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>Frontend Hosting</span>
                    <span className="font-mono text-zinc-400">GitHub Pages</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>Backend Server</span>
                    <span className="font-mono text-amber-400">Render</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>Database</span>
                    <span className="font-mono text-emerald-400">Supabase PostgreSQL</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>Audio Engine</span>
                    <span className="font-mono text-purple-400">24kHz PCM Duplex</span>
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
