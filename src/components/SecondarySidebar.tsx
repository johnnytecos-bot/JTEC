import React, { useState } from "react";
import {
  X,
  Share2,
  Pin,
  FolderPlus,
  UploadCloud,
  Search,
  Check,
  Copy,
  FileText,
  Layers,
  Cpu,
  Shield,
  Activity,
  Calendar,
  Sparkles,
  Info,
} from "lucide-react";
import { ConversationRecord, MessageRecord } from "../services/supabase";
import { TokenMetrics } from "../services/tokenTracker";

interface SecondarySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeConversation: ConversationRecord | null;
  messages: MessageRecord[];
  isPinned: boolean;
  onTogglePin: () => void;
  onSearchInChat: (query: string) => void;
  searchQuery: string;
  onFileUpload: (files: FileList) => void;
  tokens: TokenMetrics | null;
  onOpenLiveVoice: () => void;
}

export const SecondarySidebar: React.FC<SecondarySidebarProps> = ({
  isOpen,
  onClose,
  activeConversation,
  messages,
  isPinned,
  onTogglePin,
  onSearchInChat,
  searchQuery,
  onFileUpload,
  tokens,
  onOpenLiveVoice,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [assignedProject, setAssignedProject] = useState<string>("Default Project");
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [uploadedFilesList, setUploadedFilesList] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyTranscript = () => {
    const markdown = messages
      .map((m) => `**${m.role === "user" ? "User" : "j TEC"}**: ${m.content}`)
      .join("\n\n");
    navigator.clipboard.writeText(markdown);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files);
      const names = Array.from(e.target.files).map((f) => f.name);
      setUploadedFilesList((prev) => [...prev, ...names]);
    }
  };

  const projects = [
    "Default Project",
    "Realtime Voice App",
    "Supabase & DB Systems",
    "Full-Stack Architecture",
    "Daily Deen & Lifestyle",
  ];

  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs lg:hidden"
        aria-hidden="true"
      />

      {/* Panel container */}
      <aside
        className="fixed lg:static inset-y-0 right-0 z-40 w-72 sm:w-80 bg-[#0c0c10] border-l border-white/[0.08] flex flex-col shadow-2xl lg:shadow-none animate-slide-left select-none overflow-hidden"
      >
        {/* Header */}
        <div className="p-3.5 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-white tracking-wide">
              Chat Actions & Context
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition"
            title="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onTogglePin}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-95 ${
                isPinned
                  ? "bg-amber-500/10 border-amber-500/40 text-amber-400"
                  : "bg-white/[0.03] border-white/[0.08] text-zinc-300 hover:bg-white/[0.06]"
              }`}
            >
              <Pin className={`w-3.5 h-3.5 ${isPinned ? "rotate-45 fill-amber-400" : ""}`} />
              <span>{isPinned ? "Pinned" : "Pin Chat"}</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="p-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-xs font-semibold text-zinc-300 flex items-center justify-center gap-2 transition active:scale-95"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </>
              )}
            </button>
          </div>

          {/* Find in Conversation */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Search className="w-3 h-3 text-amber-400" />
              <span>Find in Conversation</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchInChat(e.target.value)}
                placeholder="Search words in this chat..."
                className="w-full px-3 py-2 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchInChat("")}
                  className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Add to Project */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <FolderPlus className="w-3 h-3 text-amber-400" />
              <span>Add to Project</span>
            </label>
            <div className="relative">
              <button
                onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.15] rounded-xl text-xs text-zinc-200 flex items-center justify-between text-left transition"
              >
                <span className="truncate">{assignedProject}</span>
                <span className="text-[10px] text-zinc-400">Change</span>
              </button>

              {isProjectDropdownOpen && (
                <div className="absolute left-0 mt-1 w-full rounded-xl bg-[#141418] border border-white/[0.1] shadow-2xl p-1 z-30 animate-fade-in">
                  {projects.map((proj) => (
                    <button
                      key={proj}
                      onClick={() => {
                        setAssignedProject(proj);
                        setIsProjectDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition ${
                        proj === assignedProject
                          ? "bg-amber-500/15 text-amber-300 font-semibold"
                          : "text-zinc-300 hover:bg-white/[0.06]"
                      }`}
                    >
                      {proj}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Upload Files to Context */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <UploadCloud className="w-3 h-3 text-amber-400" />
              <span>Upload Context Files</span>
            </label>

            <label className="block p-4 border border-dashed border-white/[0.12] hover:border-amber-400/40 rounded-2xl bg-white/[0.02] text-center cursor-pointer transition group">
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <UploadCloud className="w-6 h-6 text-zinc-500 group-hover:text-amber-400 mx-auto mb-1.5 transition" />
              <div className="text-xs font-semibold text-zinc-300 group-hover:text-white">
                Drop files or browse
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">
                PDF, TXT, MD, Code, Images
              </div>
            </label>

            {uploadedFilesList.length > 0 && (
              <div className="space-y-1 pt-1">
                <span className="text-[10px] text-zinc-400 font-mono">
                  Attached Files ({uploadedFilesList.length})
                </span>
                <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                  {uploadedFilesList.map((fileName, idx) => (
                    <div
                      key={idx}
                      className="px-2 py-1 bg-white/[0.04] border border-white/[0.06] rounded-lg text-[11px] text-zinc-300 flex items-center justify-between"
                    >
                      <span className="truncate flex-1">{fileName}</span>
                      <button
                        onClick={() =>
                          setUploadedFilesList((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                        className="text-zinc-500 hover:text-red-400 ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Export Options */}
          <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
              Export
            </span>
            <button
              onClick={handleCopyTranscript}
              className="w-full py-2 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-xs font-medium text-zinc-200 flex items-center justify-between transition"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                <span>Copy Full Markdown</span>
              </span>
              {copiedMarkdown ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-zinc-500" />
              )}
            </button>
          </div>

          {/* Conversation Metadata & Tokens */}
          <div className="pt-2 border-t border-white/[0.06] space-y-2">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-3 h-3 text-amber-400" />
              <span>Session Telemetry</span>
            </span>

            <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] space-y-2 text-xs">
              <div className="flex items-center justify-between text-zinc-400">
                <span>Total Messages</span>
                <span className="text-white font-mono">{messages.length}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Model Engine</span>
                <span className="text-amber-400 font-mono text-[11px]">
                  Gemini 2.5 Flash
                </span>
              </div>
              {tokens && (
                <>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Tokens Consumed</span>
                    <span className="text-white font-mono">
                      {tokens.totalTokensUsed.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Quota Remaining</span>
                    <span className="text-emerald-400 font-mono">
                      {tokens.percentageRemaining}%
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
