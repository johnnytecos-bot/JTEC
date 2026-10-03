import React, { useState } from "react";
import { ConversationRecord } from "../services/supabase";
import { UserBrainProfile } from "../services/aiBrain";
import {
  Plus,
  Search,
  BookOpen,
  FolderKanban,
  Radio,
  Calendar,
  Puzzle,
  MessageSquare,
  MoreHorizontal,
  Pin,
  Edit2,
  Trash2,
  Share2,
  Settings,
  PanelLeftClose,
  Check,
  X,
  Sparkles,
} from "lucide-react";

export type SidebarNavView =
  | "search"
  | "library"
  | "projects"
  | "remote"
  | "schedule"
  | "plugins"
  | null;

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: ConversationRecord[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string, e: React.MouseEvent) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onPinConversation: (id: string) => void;
  pinnedIds: string[];
  brainProfile: UserBrainProfile;
  onOpenSettings: (tab?: string) => void;
  onOpenLiveVoice: () => void;
  onOpenNavView: (view: SidebarNavView) => void;
  activeNavView: SidebarNavView;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  isOpen,
  onClose,
  conversations,
  activeId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  onPinConversation,
  pinnedIds,
  brainProfile,
  onOpenSettings,
  onOpenLiveVoice,
  onOpenNavView,
  activeNavView,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchingInline, setIsSearchingInline] = useState(false);

  const startRename = (conv: ConversationRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditingTitle(conv.title);
    setActiveMenuId(null);
  };

  const saveRename = (id: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editingTitle.trim()) {
      onRenameConversation(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    return (
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.previewText && c.previewText.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  // Sort pinned conversations to the top
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    const isAPinned = pinnedIds.includes(a.id);
    const isBPinned = pinnedIds.includes(b.id);
    if (isAPinned && !isBPinned) return -1;
    if (!isAPinned && isBPinned) return 1;
    return b.updatedAt - a.updatedAt;
  });

  const navItems = [
    { id: "search" as const, label: "Search", icon: Search },
    { id: "library" as const, label: "Library", icon: BookOpen },
    { id: "projects" as const, label: "Projects", icon: FolderKanban },
    { id: "remote" as const, label: "Remote", icon: Radio },
    { id: "schedule" as const, label: "Schedule", icon: Calendar },
    { id: "plugins" as const, label: "Plugins", icon: Puzzle },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-xs md:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 sm:w-72 bg-[#0c0c0f] border-r border-white/[0.08] flex flex-col transition-transform duration-200 ease-out select-none ${
          isOpen ? "translate-x-0" : "-translate-x-full md:-translate-x-full md:hidden"
        }`}
      >
        {/* Top Header: New Chat & Collapse */}
        <div className="p-3 border-b border-white/[0.06] flex items-center justify-between gap-2">
          <button
            onClick={() => {
              onNewConversation();
              if (window.innerWidth < 768) onClose();
            }}
            className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs font-semibold transition active:scale-98 shadow-sm"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>New Chat</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Navigation Items */}
        <div className="p-2 space-y-0.5 border-b border-white/[0.06]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNavView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === "search") {
                    setIsSearchingInline(!isSearchingInline);
                  } else if (item.id === "remote") {
                    onOpenLiveVoice();
                  } else {
                    onOpenNavView(isActive ? null : item.id);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? "bg-white/[0.09] text-white"
                    : "text-zinc-300 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    item.id === "remote" ? "text-amber-400" : "text-zinc-400"
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Inline Search Bar if toggled */}
        {isSearchingInline && (
          <div className="p-2 border-b border-white/[0.06] animate-fade-in">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                className="w-full pl-8 pr-7 py-1.5 bg-black/40 border border-white/[0.08] rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-2 text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Section: Recent Conversations */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          <div className="px-2 pb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
              Recent Conversations
            </span>
            <span className="text-[10px] font-mono text-zinc-400">
              {conversations.length}
            </span>
          </div>

          {sortedConversations.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500 px-4">
              {searchQuery ? "No chats found" : "No conversations yet. Start a new chat!"}
            </div>
          ) : (
            sortedConversations.map((conv) => {
              const isActive = conv.id === activeId;
              const isPinned = pinnedIds.includes(conv.id);
              const isEditing = editingId === conv.id;

              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    onSelectConversation(conv.id);
                    if (window.innerWidth < 768) onClose();
                  }}
                  className={`group relative flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer transition ${
                    isActive
                      ? "bg-white/[0.09] text-white font-medium"
                      : "text-zinc-300 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  {/* Left Icon & Title */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-1">
                    {isPinned ? (
                      <Pin className="w-3.5 h-3.5 text-amber-400 shrink-0 rotate-45" />
                    ) : (
                      <MessageSquare className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    )}

                    {isEditing ? (
                      <form
                        onSubmit={(e) => saveRename(conv.id, e)}
                        className="flex-1 flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          className="w-full bg-black/60 border border-amber-400 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                          autoFocus
                          onBlur={() => saveRename(conv.id)}
                        />
                        <button
                          type="submit"
                          className="p-1 hover:text-emerald-400"
                          title="Save"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </form>
                    ) : (
                      <span className="truncate flex-1">{conv.title}</span>
                    )}
                  </div>

                  {/* Right Options button (appears on hover or active) */}
                  {!isEditing && (
                    <div
                      className="relative shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === conv.id ? null : conv.id);
                        }}
                        className={`p-1 rounded-md transition ${
                          activeMenuId === conv.id
                            ? "bg-white/[0.1] text-white opacity-100"
                            : "opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-white hover:bg-white/[0.08]"
                        }`}
                        title="Chat options"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>

                      {/* Dropdown menu */}
                      {activeMenuId === conv.id && (
                        <div
                          className="absolute right-0 mt-1 w-36 rounded-xl bg-[#141418] border border-white/[0.1] shadow-2xl p-1 z-50 animate-fade-in"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              onPinConversation(conv.id);
                              setActiveMenuId(null);
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] text-zinc-300 hover:bg-white/[0.08] hover:text-white transition"
                          >
                            <Pin className="w-3 h-3 text-amber-400" />
                            <span>{isPinned ? "Unpin chat" : "Pin chat"}</span>
                          </button>

                          <button
                            onClick={(e) => startRename(conv, e)}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] text-zinc-300 hover:bg-white/[0.08] hover:text-white transition"
                          >
                            <Edit2 className="w-3 h-3 text-zinc-400" />
                            <span>Rename</span>
                          </button>

                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(
                                `${window.location.origin}/chat/${conv.id}`
                              );
                              setActiveMenuId(null);
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] text-zinc-300 hover:bg-white/[0.08] hover:text-white transition"
                          >
                            <Share2 className="w-3 h-3 text-zinc-400" />
                            <span>Share link</span>
                          </button>

                          <div className="h-px bg-white/[0.08] my-1" />

                          <button
                            onClick={(e) => {
                              onDeleteConversation(conv.id, e);
                              setActiveMenuId(null);
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] text-red-400 hover:bg-red-500/10 transition"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom User Profile & Settings Drawer */}
        <div className="p-2.5 border-t border-white/[0.06] bg-[#09090c]/90 flex items-center justify-between gap-2">
          <button
            onClick={() => onOpenSettings("account")}
            className="flex-1 flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-white/[0.06] transition text-left min-w-0"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 text-black font-black flex items-center justify-center text-xs shrink-0 shadow-sm">
              {brainProfile.userName ? brainProfile.userName.charAt(0).toUpperCase() : "J"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate">
                {brainProfile.userName || "Johnny"}
              </div>
              <div className="text-[10px] text-zinc-400 truncate">
                {brainProfile.roleOccupation || "Software Builder"}
              </div>
            </div>
          </button>

          <button
            onClick={() => onOpenSettings("general")}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
};
