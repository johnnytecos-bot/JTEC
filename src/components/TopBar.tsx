import React, { useState, useRef, useEffect } from "react";
import {
  PanelLeft,
  PanelRight,
  Radio,
  ChevronDown,
  Sparkles,
  Share2,
  Check,
  Zap,
  Plus,
  Cpu,
  Layers,
  Database,
} from "lucide-react";

export interface ModelOption {
  id: string;
  name: string;
  badge: string;
  description: string;
  isLiveSupported: boolean;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: "gemini-2.5-flash",
    name: "j TEC 2.5 Flash",
    badge: "Fast & Smart",
    description: "High-speed reasoning, coding, and general engineering queries",
    isLiveSupported: true,
  },
  {
    id: "gemini-2.0-flash-exp",
    name: "Gemini 2.0 Live",
    badge: "Real-time Voice",
    description: "Ultra-low latency duplex voice and WebSocket streaming",
    isLiveSupported: true,
  },
  {
    id: "gemini-3.8-flash",
    name: "j TEC 3.8 Neural",
    badge: "Deep Thinker",
    description: "Advanced architecture review, code analysis, and system design",
    isLiveSupported: false,
  },
];

interface TopBarProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  isSecondaryOpen: boolean;
  onToggleSecondary: () => void;
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  onOpenLiveVoice: () => void;
  isLiveConnected: boolean;
  onNewChat: () => void;
  onShareChat: () => void;
  isSupabaseConfigured: boolean;
  activeConversationTitle?: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  isSidebarOpen,
  onToggleSidebar,
  isSecondaryOpen,
  onToggleSecondary,
  selectedModel,
  onSelectModel,
  onOpenLiveVoice,
  isLiveConnected,
  onNewChat,
  onShareChat,
  isSupabaseConfigured,
  activeConversationTitle,
}) => {
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const currentModel =
    AVAILABLE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_MODELS[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleShareClick = () => {
    onShareChat();
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  return (
    <header className="sticky top-0 z-20 h-14 w-full border-b border-white/[0.07] bg-[#09090b]/85 backdrop-blur-xl px-3 sm:px-4 flex items-center justify-between gap-2 select-none">
      {/* Left: Sidebar toggle + Model switcher */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition active:scale-95 shrink-0"
          title={isSidebarOpen ? "Collapse sidebar (Ctrl+/)" : "Expand sidebar (Ctrl+/)"}
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        <button
          onClick={onNewChat}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.06] transition shrink-0"
          title="Start new conversation"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Chat</span>
        </button>

        {/* Model Selector Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-200 hover:bg-white/[0.06] transition border border-transparent hover:border-white/[0.08]"
            title="Switch AI Model"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate max-w-[130px] sm:max-w-[180px]">
              {currentModel.name}
            </span>
            <ChevronDown
              className={`w-3 h-3 text-zinc-400 transition-transform ${
                isModelDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isModelDropdownOpen && (
            <div className="absolute left-0 mt-1.5 w-72 rounded-xl bg-[#121216] border border-white/[0.1] shadow-2xl p-1.5 z-50 animate-fade-in backdrop-blur-2xl">
              <div className="px-2.5 py-1.5 text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                Select Model
              </div>
              <div className="space-y-1">
                {AVAILABLE_MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      onSelectModel(m.id);
                      setIsModelDropdownOpen(false);
                    }}
                    className={`w-full text-left p-2 rounded-lg transition flex flex-col gap-0.5 ${
                      m.id === selectedModel
                        ? "bg-white/[0.08] text-white"
                        : "hover:bg-white/[0.04] text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{m.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono">
                        {m.badge}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400 leading-snug">
                      {m.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Truncated Active Chat Title on larger screens */}
        {activeConversationTitle && (
          <span className="hidden lg:inline-block text-xs text-zinc-400 truncate max-w-xs border-l border-white/[0.08] pl-3 ml-1">
            {activeConversationTitle}
          </span>
        )}
      </div>

      {/* Right: Live Voice CTA + Cloud Indicator + Contextual Panel Toggle */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Supabase status indicator */}
        <div
          className={`hidden md:flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-mono ${
            isSupabaseConfigured
              ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
              : "text-zinc-500 bg-white/[0.02] border border-white/[0.04]"
          }`}
          title={isSupabaseConfigured ? "Connected to Supabase Database (Auto-Saving)" : "Supabase: Local Cache"}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isSupabaseConfigured ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"
            }`}
          />
          <span>{isSupabaseConfigured ? "Cloud Synced" : "Local"}</span>
        </div>

        {/* Live Voice Button (Top prominence) */}
        <button
          onClick={onOpenLiveVoice}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95 ${
            isLiveConnected
              ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
              : "bg-white/[0.08] hover:bg-white/[0.12] text-zinc-200 border border-white/[0.08]"
          }`}
          title="Open Live Voice Conversation"
        >
          <Radio
            className={`w-3.5 h-3.5 ${
              isLiveConnected ? "animate-pulse text-black" : "text-amber-400"
            }`}
          />
          <span className="hidden xs:inline">
            {isLiveConnected ? "Live Connected" : "Live Voice"}
          </span>
        </button>

        {/* Share Button */}
        <button
          onClick={handleShareClick}
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition active:scale-95"
          title="Share Conversation"
          aria-label="Share conversation"
        >
          {copiedShare ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <Share2 className="w-4 h-4" />
          )}
        </button>

        {/* Secondary Contextual Panel Toggle */}
        <button
          onClick={onToggleSecondary}
          className={`p-2 rounded-lg transition active:scale-95 ${
            isSecondaryOpen
              ? "bg-white/[0.1] text-white"
              : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"
          }`}
          title={isSecondaryOpen ? "Hide chat actions panel" : "Show chat actions panel"}
          aria-label="Toggle chat actions"
        >
          <PanelRight className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
