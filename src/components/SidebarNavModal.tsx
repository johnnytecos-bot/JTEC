import React, { useState, useEffect } from "react";
import {
  X,
  Search,
  BookOpen,
  FolderKanban,
  Calendar,
  Puzzle,
  Sparkles,
  Database,
  Radio,
  Check,
  Plus,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { SidebarNavView } from "./AppSidebar";
import {
  supabaseHistory,
  AiPromptRecord,
  ConversationRecord,
} from "../services/supabase";
import { aiBrain } from "../services/aiBrain";

interface SidebarNavModalProps {
  view: SidebarNavView;
  onClose: () => void;
  conversations: ConversationRecord[];
  onSelectConversation: (id: string) => void;
  onNewChatWithPrompt: (prompt: string) => void;
  isSupabaseConfigured: boolean;
  onOpenSettings: (tab?: string) => void;
}

export const SidebarNavModal: React.FC<SidebarNavModalProps> = ({
  view,
  onClose,
  conversations,
  onSelectConversation,
  onNewChatWithPrompt,
  isSupabaseConfigured,
  onOpenSettings,
}) => {
  const [prompts, setPrompts] = useState<AiPromptRecord[]>([]);
  const [activePromptId, setActivePromptId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (view === "library") {
      supabaseHistory.getAiPrompts().then((list) => {
        setPrompts(list);
        const active = list.find((p) => p.isActive);
        if (active) setActivePromptId(active.id);
      });
    }
  }, [view]);

  if (!view) return null;

  const handleActivatePrompt = async (p: AiPromptRecord) => {
    await supabaseHistory.setActiveAiPrompt(p.id);
    aiBrain.saveProfile({ customInstructions: p.content, activePromptId: p.id });
    setActivePromptId(p.id);
    onNewChatWithPrompt(`[Activated: ${p.title}]\n\n${p.content}`);
    onClose();
  };

  const titles: Record<NonNullable<SidebarNavView>, { title: string; desc: string }> = {
    search: {
      title: "Global Search",
      desc: "Search through all conversations, prompts, and notes",
    },
    library: {
      title: "Prompt & Persona Library",
      desc: "Pre-configured system directives and personas stored in database",
    },
    projects: {
      title: "Workspaces & Projects",
      desc: "Organize conversations and codebases into project folders",
    },
    remote: {
      title: "Live Remote",
      desc: "Gemini Live duplex connection and real-time audio bridge",
    },
    schedule: {
      title: "Schedule & Tasks",
      desc: "Daily routines, engineering sprints, and Barakah reminders",
    },
    plugins: {
      title: "Connected Plugins & Tools",
      desc: "Extensions powering j TEC's intelligence and backend persistence",
    },
  };

  const currentInfo = titles[view as NonNullable<SidebarNavView>] || {
    title: "Navigation",
    desc: "",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl bg-[#121216] border border-white/[0.1] rounded-3xl shadow-2xl p-5 sm:p-6 overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>{currentInfo.title}</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">{currentInfo.desc}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content based on view */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* 1. LIBRARY */}
          {view === "library" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300">
                  Available Prompts ({prompts.length})
                </span>
                <button
                  onClick={() => {
                    onClose();
                    onOpenSettings("models");
                  }}
                  className="text-xs text-amber-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Manage in Database
                </button>
              </div>

              <div className="space-y-2">
                {prompts.map((p) => {
                  const isActive = p.id === activePromptId || p.isActive;
                  return (
                    <div
                      key={p.id}
                      className={`p-3 rounded-2xl border transition flex items-start justify-between gap-3 ${
                        isActive
                          ? "bg-amber-500/10 border-amber-500/40"
                          : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]"
                      }`}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            {p.title}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-400 text-[10px] font-mono">
                            {p.category}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 font-mono leading-relaxed line-clamp-2">
                          {p.content}
                        </p>
                      </div>

                      <button
                        onClick={() => handleActivatePrompt(p)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition active:scale-95 ${
                          isActive
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-white/[0.08] hover:bg-amber-500 hover:text-black text-amber-300"
                        }`}
                      >
                        {isActive ? "Active ✓" : "Use Prompt"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. PROJECTS */}
          {view === "projects" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    name: "Realtime AI Voice Workspace",
                    chatsCount: conversations.length,
                    tag: "Production",
                    desc: "Gemini 2.0 Live WebSockets with 24kHz audio",
                  },
                  {
                    name: "Supabase & Database Architecture",
                    chatsCount: 3,
                    tag: "Database",
                    desc: "PostgreSQL tables, foreign keys, RLS security rules",
                  },
                  {
                    name: "TypeScript Full-Stack Engine",
                    chatsCount: 2,
                    tag: "Backend",
                    desc: "Express server, streaming SSE, token optimization",
                  },
                  {
                    name: "Daily Deen & Life Mentorship",
                    chatsCount: 4,
                    tag: "Personal",
                    desc: "Barakah in tech, morning focus, continuous growth",
                  },
                ].map((proj, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">
                        {proj.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono">
                        {proj.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400">{proj.desc}</p>
                    <div className="text-[10px] text-zinc-500 font-mono pt-1">
                      {proj.chatsCount} conversations linked
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. SCHEDULE */}
          {view === "schedule" && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span>Engineering Routine & High Focus</span>
                </div>
                <div className="space-y-2 text-xs text-zinc-300">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/[0.06]">
                    <span>08:30 AM · Morning Deen, Salam & Focus Prayer</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Routine</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/[0.06]">
                    <span>10:00 AM · Deep Architecture & Code Review</span>
                    <span className="text-[10px] text-amber-400 font-mono">Sprint</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/[0.06]">
                    <span>02:00 PM · Live Voice Sync with j TEC</span>
                    <span className="text-[10px] text-purple-400 font-mono">Audio Sync</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. PLUGINS */}
          {view === "plugins" && (
            <div className="space-y-3">
              {[
                {
                  name: "Supabase PostgreSQL Database",
                  status: isSupabaseConfigured ? "Connected" : "Config Available",
                  active: isSupabaseConfigured,
                  desc: "Cloud sync for all messages, conversations, and custom prompts.",
                },
                {
                  name: "Gemini 2.0 Live Audio WebSocket",
                  status: "Active (Port 3000 /live)",
                  active: true,
                  desc: "24kHz bidirectional duplex audio with low-latency interruption.",
                },
                {
                  name: "Continuous Cognitive Memory Engine",
                  status: "Active (Local + Cloud)",
                  active: true,
                  desc: "Auto-extracts facts, preferences, and stack details into AI memory.",
                },
                {
                  name: "Token Telemetry & Quota Guard",
                  status: "Active (1M Token Budget)",
                  active: true,
                  desc: "Real-time prompt, candidate, and audio token usage tracking.",
                },
              ].map((plug, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Puzzle className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-white">
                        {plug.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400">{plug.desc}</p>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold shrink-0 ${
                      plug.active
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {plug.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 5. SEARCH */}
          {view === "search" && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search in all conversations..."
                  className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/[0.1] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {conversations
                  .filter(
                    (c) =>
                      !searchQuery ||
                      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (c.previewText &&
                        c.previewText.toLowerCase().includes(searchQuery.toLowerCase()))
                  )
                  .map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => {
                        onSelectConversation(conv.id);
                        onClose();
                      }}
                      className="w-full p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] text-left transition flex items-center justify-between"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="text-xs font-semibold text-white truncate">
                          {conv.title}
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate">
                          {conv.previewText || "Conversation session"}
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
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
