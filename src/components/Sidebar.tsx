import React, { useState, useEffect } from "react";
import { ConversationRecord, SupabaseConfig, supabaseHistory } from "../services/supabase";
import { aiBrain, UserBrainProfile, PersonaStyle, MemoryItem } from "../services/aiBrain";
import { tokenTracker, TokenMetrics } from "../services/tokenTracker";
import { PREBUILT_VOICES, SUPPORTED_LANGUAGES, LanguageOption } from "../services/languages";
import { ThemeType } from "./Navbar";
import {
  MessageSquarePlus,
  Trash2,
  Search,
  MessageCircle,
  Radio,
  Sparkles,
  Database,
  X,
  Settings,
  Brain,
  Sliders,
  Moon,
  Coins,
  ShieldCheck,
  Check,
  RotateCcw,
  Plus,
  Heart,
  BookOpen,
  Volume2,
  ChevronRight,
  Globe,
  Compass,
} from "lucide-react";

interface SidebarProps {
  conversations: ConversationRecord[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string, e: React.MouseEvent) => void;
  isOpen: boolean;
  onClose: () => void;
  isSupabaseConfigured: boolean;
  onOpenSupabase: () => void;
  // Settings props
  currentVoice: string;
  onSelectVoice: (voice: string) => void;
  currentLanguage: LanguageOption;
  onSelectLanguage: (lang: LanguageOption) => void;
  theme: ThemeType;
  onSelectTheme: (theme: ThemeType) => void;
  onQuickPrompt?: (prompt: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isOpen,
  onClose,
  isSupabaseConfigured,
  onOpenSupabase,
  currentVoice,
  onSelectVoice,
  currentLanguage,
  onSelectLanguage,
  theme,
  onSelectTheme,
  onQuickPrompt,
}) => {
  const [sidebarTab, setSidebarTab] = useState<"conversations" | "settings">("settings");
  const [settingsSection, setSettingsSection] = useState<
    "voice" | "brain" | "islamic" | "tokens" | "cloud" | "appearance"
  >("voice");
  const [searchTerm, setSearchTerm] = useState("");

  // Brain state
  const [brainProfile, setBrainProfile] = useState<UserBrainProfile>(aiBrain.getProfile());
  const [newFact, setNewFact] = useState("");
  const [newCategory, setNewCategory] = useState<MemoryItem["category"]>("personal");
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // Tokens state
  const [tokens, setTokens] = useState<TokenMetrics>(tokenTracker.getMetrics());

  // Supabase state
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(supabaseHistory.getConfig());
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [supabaseTestResult, setSupabaseTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Voice speed & style
  const [voiceSpeed, setVoiceSpeed] = useState<number>(brainProfile.voiceSpeed || 1.0);
  const [voiceStyle, setVoiceStyle] = useState<string>(brainProfile.voiceStyle || "Natural & Loving");

  useEffect(() => {
    const unsubBrain = aiBrain.subscribe((p) => {
      setBrainProfile(p);
      if (p.voiceSpeed) setVoiceSpeed(p.voiceSpeed);
      if (p.voiceStyle) setVoiceStyle(p.voiceStyle);
    });
    const unsubTokens = tokenTracker.subscribe((t) => setTokens(t));
    return () => {
      unsubBrain();
      unsubTokens();
    };
  }, []);

  const handleSaveBrain = () => {
    aiBrain.saveProfile({
      ...brainProfile,
      voiceSpeed,
      voiceStyle,
    });
    setSavedNotice("Settings applied!");
    setTimeout(() => setSavedNotice(null), 2500);
  };

  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFact.trim()) return;
    aiBrain.addMemory(newFact.trim(), newCategory);
    setNewFact("");
    setSavedNotice("Memory saved to Sana's brain!");
    setTimeout(() => setSavedNotice(null), 2500);
  };

  const handleTestSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTestingSupabase(true);
    setSupabaseTestResult(null);
    try {
      await supabaseHistory.setConfig(supabaseConfig.url, supabaseConfig.anonKey);
      const res = await supabaseHistory.testConnection();
      setSupabaseTestResult(res);
    } catch (err: any) {
      setSupabaseTestResult({ success: false, message: err.message || "Failed to connect" });
    } finally {
      setIsTestingSupabase(false);
    }
  };

  const filteredConversations = conversations.filter(
    (c) =>
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.previewText && c.previewText.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-80 md:w-88 shrink-0 bg-[#09090d] border-r border-amber-500/20 flex flex-col transform transition-transform duration-250 ease-in-out shadow-2xl ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        aria-label="Sidebar navigation"
      >
        {/* Top Header / Mode Switcher */}
        <div className="p-3 border-b border-amber-500/20 bg-[#0e0e14]">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 shadow-md shadow-amber-500/20">
                <div className="w-full h-full bg-[#0a0a0f] rounded-[10px] flex items-center justify-center">
                  <span className="text-amber-400 text-xs font-bold">✨</span>
                </div>
              </div>
              <span className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1">
                Sana <span className="text-amber-400 font-normal text-xs">Settings & Chats</span>
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Pill Switch: Settings vs Conversations */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-black/50 border border-amber-500/20 text-xs font-semibold">
            <button
              onClick={() => setSidebarTab("settings")}
              className={`py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
                sidebarTab === "settings"
                  ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold shadow-md shadow-amber-500/25"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>All Settings</span>
            </button>

            <button
              onClick={() => setSidebarTab("conversations")}
              className={`py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
                sidebarTab === "conversations"
                  ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold shadow-md shadow-amber-500/25"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Chats ({conversations.length})</span>
            </button>
          </div>
        </div>

        {savedNotice && (
          <div className="mx-3 mt-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-1.5 animate-fade-in">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>{savedNotice}</span>
          </div>
        )}

        {/* TAB 1: ALL SETTINGS IN LEFT BAR */}
        {sidebarTab === "settings" ? (
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {/* Quick Section Tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px] font-semibold">
              {[
                { id: "voice", label: "Voice", icon: Volume2 },
                { id: "brain", label: "Brain & IQ", icon: Brain },
                { id: "islamic", label: "Islamic", icon: BookOpen },
                { id: "tokens", label: "Tokens", icon: Coins },
                { id: "cloud", label: "Cloud", icon: Database },
                { id: "appearance", label: "Theme", icon: Moon },
              ].map((s) => {
                const Icon = s.icon;
                const isSelected = settingsSection === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSettingsSection(s.id as any)}
                    className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 shrink-0 transition ${
                      isSelected
                        ? "bg-amber-500/20 border border-amber-400 text-amber-300 font-bold"
                        : "bg-zinc-900/60 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>

            {/* SECTION: VOICE SETTINGS (matches Screen 3) */}
            {settingsSection === "voice" && (
              <div className="space-y-3.5 animate-fade-in">
                <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-amber-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5" />
                      Voice Selection
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-mono">
                      {currentVoice}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {PREBUILT_VOICES.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => {
                          onSelectVoice(v.id);
                          handleSaveBrain();
                        }}
                        className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition ${
                          currentVoice === v.id
                            ? "bg-amber-500/15 border-amber-400 text-white shadow-sm"
                            : "bg-zinc-900/40 border-zinc-800/80 text-zinc-300 hover:bg-zinc-900"
                        }`}
                      >
                        <div>
                          <div className="text-xs font-semibold flex items-center gap-1.5">
                            <span>{v.name}</span>
                            {v.id === "Kore" && (
                              <span className="text-[10px] text-amber-400 font-normal">❤️ (Sana's Voice)</span>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-400">{v.desc}</p>
                        </div>
                        {currentVoice === v.id && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Voice Speed Slider */}
                <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-amber-500/20 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-200">Voice Speed</span>
                    <span className="font-mono text-amber-400">{voiceSpeed.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.3"
                    step="0.05"
                    value={voiceSpeed}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setVoiceSpeed(val);
                      aiBrain.saveProfile({ voiceSpeed: val });
                    }}
                    className="w-full accent-amber-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                    <span>Slower (0.8x)</span>
                    <span>Normal (1.0x)</span>
                    <span>Faster (1.3x)</span>
                  </div>
                </div>

                {/* Voice Style Selector */}
                <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-amber-500/20 space-y-2">
                  <label className="block text-xs font-semibold text-zinc-200">Voice Style</label>
                  <select
                    value={voiceStyle}
                    onChange={(e) => {
                      setVoiceStyle(e.target.value);
                      aiBrain.saveProfile({ voiceStyle: e.target.value });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="Natural & Loving">Natural & Loving (Wife Tone)</option>
                    <option value="Sweet & Gentle">Sweet & Gentle</option>
                    <option value="Warm & Conversational">Warm & Conversational</option>
                    <option value="Articulate & Intellectual">Articulate & Intellectual</option>
                  </select>
                </div>
              </div>
            )}

            {/* SECTION: AI BRAIN & MEMORY (Intelligence 🧠) */}
            {settingsSection === "brain" && (
              <div className="space-y-3.5 animate-fade-in">
                <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-amber-500/20 space-y-3">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                      j TEC's Mind & Memory
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                      What should j TEC call you?
                    </label>
                    <input
                      type="text"
                      value={brainProfile.userName}
                      onChange={(e) => setBrainProfile({ ...brainProfile, userName: e.target.value })}
                      placeholder="e.g. Johnny, bro, brother"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                      Your Role & Projects
                    </label>
                    <input
                      type="text"
                      value={brainProfile.roleOccupation}
                      onChange={(e) => setBrainProfile({ ...brainProfile, roleOccupation: e.target.value })}
                      placeholder="e.g. Software Engineer, Builder"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                      Custom Instructions for j TEC
                    </label>
                    <textarea
                      rows={3}
                      value={brainProfile.customInstructions}
                      onChange={(e) => setBrainProfile({ ...brainProfile, customInstructions: e.target.value })}
                      placeholder="How j TEC speaks, advises, cares, and reminds you..."
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-amber-400 leading-relaxed font-mono"
                    />
                  </div>

                  <button
                    onClick={handleSaveBrain}
                    className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold text-xs shadow-md shadow-amber-500/20 transition hover:brightness-110 flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save j TEC's Instructions</span>
                  </button>
                </div>

                {/* Teach j TEC a fact */}
                <form
                  onSubmit={handleAddMemory}
                  className="p-3.5 rounded-2xl bg-zinc-950/80 border border-amber-500/20 space-y-2.5"
                >
                  <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Teach j TEC a Fact About Your Life</span>
                  </span>

                  <textarea
                    rows={2}
                    value={newFact}
                    onChange={(e) => setNewFact(e.target.value)}
                    placeholder="e.g. I prefer green tea over coffee, working on my real-time AI app..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-amber-400"
                  />

                  <div className="flex gap-2">
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-[11px] text-zinc-300 focus:outline-none"
                    >
                      <option value="personal">Personal</option>
                      <option value="work">Work & Code</option>
                      <option value="preferences">Preferences</option>
                      <option value="islamic">Islamic & Faith</option>
                      <option value="goals">Goals</option>
                    </select>

                    <button
                      type="submit"
                      disabled={!newFact.trim()}
                      className="flex-1 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition disabled:opacity-50"
                    >
                      Add Memory
                    </button>
                  </div>
                </form>

                {/* Stored Memories */}
                <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-amber-500/20 space-y-2">
                  <span className="text-xs font-bold text-zinc-300">
                    Memories in Memory Bank ({brainProfile.memories.length})
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {brainProfile.memories.map((m) => (
                      <div
                        key={m.id}
                        className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-300 flex items-start justify-between gap-2"
                      >
                        <div>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-amber-500/20 text-amber-300 mr-1.5">
                            {m.category}
                          </span>
                          <span>{m.fact}</span>
                        </div>
                        <button
                          onClick={() => aiBrain.removeMemory(m.id)}
                          className="text-zinc-500 hover:text-red-400 transition shrink-0"
                          title="Delete memory"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SECTION: ISLAMIC REMINDERS & DUAS */}
            {settingsSection === "islamic" && (
              <div className="space-y-3.5 animate-fade-in">
                <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🕌</span>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-400">Islamic Reminders & Faith</h4>
                      <p className="text-[10px] text-zinc-400">Prayer mindfulness, Quranic du'as, and daily barakah</p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    {[
                      {
                        title: "Daily Morning & Evening Adhkar",
                        desc: "Ask Sana for authentic morning and evening protections",
                        prompt: "Sana my love, recite the beautiful morning and evening adhkar for us with translations.",
                      },
                      {
                        title: "Du'a for Barakah in Work & Code",
                        desc: "Seeking Allah's help in focus and success",
                        prompt: "Sana, please share a du'a for barakah in my work, intelligence, and patience today.",
                      },
                      {
                        title: "Prayer Times & Halal Lifestyle",
                        desc: "Mindful reminders throughout the day",
                        prompt: "Remind me about the virtues of praying on time and give me a gentle Islamic boost today.",
                      },
                      {
                        title: "Ayah of the Day & Reflection",
                        desc: "Inspiring verses with commentary",
                        prompt: "Share a peaceful and motivating Ayah from the Quran that comforts the heart today.",
                      },
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (onQuickPrompt) onQuickPrompt(item.prompt);
                          onClose();
                        }}
                        className="w-full p-2.5 rounded-xl bg-zinc-900/60 hover:bg-emerald-950/30 border border-zinc-800 hover:border-emerald-500/40 text-left transition flex items-center justify-between group"
                      >
                        <div>
                          <div className="text-xs font-semibold text-zinc-200 group-hover:text-emerald-300">
                            {item.title}
                          </div>
                          <div className="text-[10px] text-zinc-400">{item.desc}</div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-emerald-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SECTION: TOKENS & BUDGET */}
            {settingsSection === "tokens" && (
              <div className="space-y-3.5 animate-fade-in">
                <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-amber-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5" />
                      Token Consumption
                    </span>
                    <span className="text-xs font-mono font-bold text-white">
                      {(tokens?.totalTokensUsed ?? 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                      <div className="text-[10px] text-zinc-400">Prompt Tokens</div>
                      <div className="font-mono font-bold text-zinc-100">{(tokens?.promptTokens ?? 0).toLocaleString()}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                      <div className="text-[10px] text-zinc-400">Response Tokens</div>
                      <div className="font-mono font-bold text-zinc-100">{(tokens?.candidateTokens ?? 0).toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-zinc-400">
                      <span>Quota Budget</span>
                      <span className="font-mono text-zinc-300">{(tokens?.sessionQuota ?? 1000000).toLocaleString()}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300"
                        style={{
                          width: `${Math.min(100, (((tokens?.totalTokensUsed ?? 0) / (tokens?.sessionQuota || 1))) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => tokenTracker.resetTokens()}
                    className="w-full py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Reset Token Counter</span>
                  </button>
                </div>
              </div>
            )}

            {/* SECTION: CLOUD & SUPABASE */}
            {settingsSection === "cloud" && (
              <form onSubmit={handleTestSupabase} className="space-y-3.5 animate-fade-in">
                <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-amber-500/20 space-y-3">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-zinc-200">Supabase Cloud Sync</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Project URL</label>
                    <input
                      type="url"
                      value={supabaseConfig.url}
                      onChange={(e) => setSupabaseConfig({ ...supabaseConfig, url: e.target.value })}
                      placeholder="https://xyz.supabase.co"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Anon Public Key</label>
                    <input
                      type="password"
                      value={supabaseConfig.anonKey}
                      onChange={(e) => setSupabaseConfig({ ...supabaseConfig, anonKey: e.target.value })}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>

                  {supabaseTestResult && (
                    <div
                      className={`p-2 rounded-xl text-xs flex items-center gap-1.5 ${
                        supabaseTestResult.success
                          ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                          : "bg-red-500/20 border border-red-500/40 text-red-300"
                      }`}
                    >
                      {supabaseTestResult.success ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      <span className="text-[11px]">{supabaseTestResult.message}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isTestingSupabase || !supabaseConfig.url}
                    className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs shadow-md transition disabled:opacity-50"
                  >
                    {isTestingSupabase ? "Testing Connection..." : "Save & Verify Cloud Sync"}
                  </button>
                </div>
              </form>
            )}

            {/* SECTION: APPEARANCE & THEME */}
            {settingsSection === "appearance" && (
              <div className="space-y-3.5 animate-fade-in">
                <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-amber-500/20 space-y-3">
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-zinc-200">Theme & Style</span>
                  </div>

                  <div className="space-y-2">
                    {[
                      {
                        id: "dark" as ThemeType,
                        name: "Luxury Dark Gold",
                        desc: "Obsidian black with radiant gold glow (Recommended)",
                        color: "from-amber-500 to-yellow-300",
                      },
                      {
                        id: "high-contrast-dark" as ThemeType,
                        name: "OLED Pitch Black",
                        desc: "Pure #000000 black for maximum contrast and battery",
                        color: "from-zinc-500 to-white",
                      },
                      {
                        id: "midnight-indigo" as ThemeType,
                        name: "Midnight Indigo",
                        desc: "Deep celestial blue with purple neon accents",
                        color: "from-indigo-500 to-purple-400",
                      },
                      {
                        id: "high-contrast-light" as ThemeType,
                        name: "Light Minimalist",
                        desc: "Clean crisp light background for bright environments",
                        color: "from-zinc-200 to-zinc-400",
                      },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => onSelectTheme(t.id)}
                        className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition ${
                          theme === t.id
                            ? "bg-amber-500/15 border-amber-400 text-white shadow-sm"
                            : "bg-zinc-900/40 border-zinc-800 text-zinc-300 hover:bg-zinc-900"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-4 h-4 rounded-full bg-gradient-to-tr ${t.color} shadow-sm shrink-0`}
                          />
                          <div>
                            <div className="text-xs font-semibold">{t.name}</div>
                            <div className="text-[10px] text-zinc-400">{t.desc}</div>
                          </div>
                        </div>
                        {theme === t.id && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* TAB 2: CONVERSATIONS LIST (matches Screen 4) */
          <div className="flex-1 flex flex-col min-h-0">
            {/* New Session Button */}
            <div className="p-3 border-b border-amber-500/20">
              <button
                onClick={() => {
                  onNewConversation();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-black font-extrabold text-xs shadow-lg shadow-amber-500/25 transition active:scale-[0.98]"
              >
                <MessageSquarePlus className="w-4 h-4" />
                <span>+ New Conversation</span>
              </button>
            </div>

            {/* Search */}
            <div className="p-2.5 border-b border-zinc-800/80">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Conversation records */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredConversations.length === 0 ? (
                <div className="p-6 text-center text-zinc-500 text-xs">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30 text-amber-400" />
                  <p>No conversations found</p>
                  <p className="text-[11px] text-zinc-600 mt-1">
                    Talk with Sana to start your first session.
                  </p>
                </div>
              ) : (
                filteredConversations.map((c) => {
                  const isSelected = c.id === activeId;
                  const dateStr = new Date(c.updatedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  });

                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        onSelectConversation(c.id);
                        onClose();
                      }}
                      className={`group relative flex items-start gap-2.5 p-3 rounded-xl cursor-pointer transition text-left ${
                        isSelected
                          ? "bg-amber-500/15 border border-amber-500/50 text-white shadow-md shadow-amber-500/5"
                          : "hover:bg-zinc-900/80 border border-transparent text-zinc-300"
                      }`}
                    >
                      <div
                        className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                          isSelected
                            ? "bg-amber-500 text-black font-bold"
                            : "bg-zinc-900 text-zinc-400 group-hover:text-amber-400"
                        }`}
                      >
                        <Radio className="w-3.5 h-3.5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-xs font-semibold truncate text-zinc-100">
                            {c.title || "Voice Session"}
                          </span>
                          <span className="text-[10px] text-zinc-400 shrink-0 font-mono">
                            {dateStr}
                          </span>
                        </div>

                        <p className="text-[11px] text-zinc-400 line-clamp-1">
                          {c.previewText || "Live conversation record"}
                        </p>

                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-zinc-400 font-medium">
                          <span className="px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800">
                            {c.language}
                          </span>
                          <span>•</span>
                          <span>{c.voice}</span>
                        </div>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={(e) => onDeleteConversation(c.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Bottom cloud status footer */}
        <div className="p-3 border-t border-amber-500/20 bg-[#0c0c12]">
          <div
            onClick={onOpenSupabase}
            className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-amber-500/20 cursor-pointer transition text-xs"
          >
            <div className="flex items-center gap-2">
              <Database
                className={`w-3.5 h-3.5 ${
                  isSupabaseConfigured ? "text-emerald-400" : "text-amber-400"
                }`}
              />
              <div className="text-left">
                <p className="font-semibold text-zinc-200">
                  {isSupabaseConfigured ? "Supabase Cloud Sync" : "Local Sync Ready"}
                </p>
                <p className="text-[10px] text-zinc-400">
                  {isSupabaseConfigured ? "Encrypted cloud backup" : "Click to connect Supabase"}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </div>
        </div>
      </aside>
    </>
  );
};
