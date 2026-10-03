import React, { useState, useRef, useEffect } from "react";
import { MessageRecord } from "../services/supabase";
import { UserBrainProfile } from "../services/aiBrain";
import { AudioEngine, VoiceState } from "../services/audioEngine";
import { LanguageOption } from "../services/languages";
import {
  ArrowUp,
  Paperclip,
  Radio,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  Volume2,
  VolumeX,
  ThumbsUp,
  ThumbsDown,
  X,
  Square,
  Mic,
  Code2,
  Database,
  Brain,
  Layers,
  FileText,
  AlertCircle,
} from "lucide-react";
import { audioCache } from "../services/audioCache";
import { getApiUrl } from "../services/apiConfig";

interface ModernChatAreaProps {
  messages: MessageRecord[];
  onSendMessage: (text: string) => void;
  onRegenerateMessage?: (lastUserMsgText: string) => void;
  streamingMessageId: string | null;
  voiceState: VoiceState;
  isVoiceActive: boolean;
  onToggleVoice: () => void;
  onOpenLiveVoice: () => void;
  onInterrupt: () => void;
  interimTranscript?: string;
  brainProfile: UserBrainProfile;
  currentLanguage: LanguageOption;
  currentVoice: string;
  audioEngine: AudioEngine | null;
  searchFilterQuery?: string;
}

export const ModernChatArea: React.FC<ModernChatAreaProps> = ({
  messages,
  onSendMessage,
  onRegenerateMessage,
  streamingMessageId,
  voiceState,
  isVoiceActive,
  onToggleVoice,
  onOpenLiveVoice,
  onInterrupt,
  interimTranscript,
  brainProfile,
  currentLanguage,
  currentVoice,
  audioEngine,
  searchFilterQuery = "",
}) => {
  const [inputText, setInputText] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const [ratingMap, setRatingMap] = useState<Record<string, "up" | "down">>({});

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessageId, voiceState]);

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed && attachedFiles.length === 0) return;

    let fullPrompt = trimmed;
    if (attachedFiles.length > 0) {
      const fileNames = attachedFiles.map((f) => f.name).join(", ");
      fullPrompt = trimmed
        ? `[Attached files: ${fileNames}]\n\n${trimmed}`
        : `[Shared file(s): ${fileNames}]`;
    }

    onSendMessage(fullPrompt);
    setInputText("");
    setAttachedFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(180, e.target.scrollHeight)}px`;
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setAttachedFiles((prev) => [...prev, ...files]);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handlePlayVoice = async (id: string, text: string) => {
    if (playingMsgId === id) {
      audioCache.stopAnyPlayback();
      setPlayingMsgId(null);
      return;
    }

    try {
      setPlayingMsgId(id);
      const res = await fetch(getApiUrl("/api/tts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: currentVoice }),
      });
      if (!res.ok) throw new Error("TTS failed");
      const data = await res.json();
      if (data.audioData && audioEngine) {
        await audioEngine.playPcm24kChunk(data.audioData);
      }
    } catch (_) {
      // ignore
    } finally {
      setTimeout(() => setPlayingMsgId(null), 4000);
    }
  };

  // Filter messages if search active
  const displayedMessages = searchFilterQuery.trim()
    ? messages.filter((m) =>
        m.content.toLowerCase().includes(searchFilterQuery.toLowerCase())
      )
    : messages;

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative bg-[#09090b]">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-8 py-6 space-y-6">
        {displayedMessages.length === 0 ? (
          /* Empty State Welcome Hero */
          <div className="max-w-2xl mx-auto min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-8 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center mb-5 shadow-sm">
              <Sparkles className="w-7 h-7 text-amber-400" />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">
              What can I help you build today, {brainProfile.userName}?
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md mb-8 leading-relaxed">
              j TEC is your real-time AI partner with persistent Supabase memory, code intelligence, and live duplex voice.
            </p>

            {/* Quick Prompt Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
              {[
                {
                  icon: Code2,
                  title: "Code Architecture",
                  prompt:
                    "Review our TypeScript app architecture for high performance and clean patterns.",
                },
                {
                  icon: Database,
                  title: "Supabase & Database",
                  prompt:
                    "Help me design a scalable Supabase schema with PostgreSQL Row Level Security.",
                },
                {
                  icon: Brain,
                  title: "Brain & Context Check",
                  prompt:
                    "Yo j TEC, what's good? Summarize our active goals, stack, and learned memories.",
                },
                {
                  icon: Sparkles,
                  title: "Daily Barakah & Deen",
                  prompt:
                    "Salam bro! Share a powerful reminder for Barakah and focus in our engineering work.",
                },
              ].map((card, i) => {
                const CardIcon = card.icon;
                return (
                  <button
                    key={i}
                    onClick={() => onSendMessage(card.prompt)}
                    className="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/[0.15] transition text-left flex flex-col gap-1 active:scale-98 group"
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 group-hover:text-white">
                      <CardIcon className="w-3.5 h-3.5 text-amber-400" />
                      <span>{card.title}</span>
                    </div>
                    <span className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                      {card.prompt}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Conversation Messages Feed */
          <div className="max-w-3xl mx-auto space-y-6">
            {displayedMessages.map((msg, idx) => {
              const isUser = msg.role === "user";
              const isStreaming = msg.id === streamingMessageId;

              return (
                <div
                  key={msg.id || idx}
                  className={`group flex gap-3 sm:gap-4 ${
                    isUser ? "justify-end" : "justify-start"
                  } animate-fade-in`}
                >
                  {/* Assistant Avatar */}
                  {!isUser && (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/[0.08] border border-white/[0.1] text-amber-400 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}

                  {/* Message Bubble & Content */}
                  <div
                    className={`max-w-[88%] sm:max-w-[82%] ${
                      isUser
                        ? "bg-white/[0.09] text-white px-4 py-2.5 rounded-2xl rounded-tr-sm border border-white/[0.08]"
                        : "text-zinc-200 space-y-2 flex-1 min-w-0"
                    }`}
                  >
                    {/* Content rendering */}
                    <div className="text-xs sm:text-[13px] leading-relaxed break-words font-sans">
                      <RenderMessageContent text={msg.content} />
                    </div>

                    {/* AI Message Action Toolbar (Copy, TTS listen, Feedback) */}
                    {!isUser && !isStreaming && (
                      <div className="flex items-center gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition"
                          title="Copy response"
                        >
                          {copiedMsgId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          onClick={() => handlePlayVoice(msg.id, msg.content)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition"
                          title={playingMsgId === msg.id ? "Stop voice" : "Read aloud"}
                        >
                          {playingMsgId === msg.id ? (
                            <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          onClick={() =>
                            setRatingMap((prev) => ({
                              ...prev,
                              [msg.id]: prev[msg.id] === "up" ? undefined! : "up",
                            }))
                          }
                          className={`p-1.5 rounded-lg transition ${
                            ratingMap[msg.id] === "up"
                              ? "text-emerald-400 bg-emerald-500/10"
                              : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"
                          }`}
                          title="Good response"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() =>
                            setRatingMap((prev) => ({
                              ...prev,
                              [msg.id]: prev[msg.id] === "down" ? undefined! : "down",
                            }))
                          }
                          className={`p-1.5 rounded-lg transition ${
                            ratingMap[msg.id] === "down"
                              ? "text-red-400 bg-red-500/10"
                              : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"
                          }`}
                          title="Bad response"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>

                        {onRegenerateMessage && idx === displayedMessages.length - 1 && (
                          <button
                            onClick={() => {
                              const lastUserMsg = [...messages]
                                .reverse()
                                .find((m) => m.role === "user");
                              if (lastUserMsg) onRegenerateMessage(lastUserMsg.content);
                            }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition"
                            title="Regenerate response"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Thinking / Streaming Indicator */}
            {voiceState === "thinking" && !streamingMessageId && (
              <div className="flex items-center gap-3 animate-fade-in pl-1">
                <div className="w-7 h-7 rounded-full bg-white/[0.08] text-amber-400 flex items-center justify-center shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Large Modern Chat Input Bar */}
      <div className="shrink-0 p-3 sm:p-4 bg-gradient-to-t from-[#09090b] via-[#09090b]/95 to-transparent">
        <div className="max-w-3xl mx-auto">
          {/* Active Hearing Caption Preview if mic is running */}
          {isVoiceActive && interimTranscript && (
            <div className="mb-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center gap-2 max-w-md mx-auto animate-pulse">
              <Mic className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="truncate">Hearing: "{interimTranscript}"</span>
            </div>
          )}

          {/* Attached files pills */}
          {attachedFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {attachedFiles.map((file, i) => (
                <div
                  key={i}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/[0.1] text-[11px] text-zinc-200 flex items-center gap-1.5"
                >
                  <FileText className="w-3 h-3 text-amber-400" />
                  <span className="max-w-[140px] truncate">{file.name}</span>
                  <button
                    onClick={() =>
                      setAttachedFiles((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    className="text-zinc-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Main Input Dock */}
          <div className="relative rounded-2xl bg-[#141418] border border-white/[0.1] focus-within:border-white/[0.22] focus-within:ring-1 focus-within:ring-white/[0.12] p-2 transition shadow-xl">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder={`Ask j TEC anything in ${currentLanguage.name}...`}
              className="w-full bg-transparent resize-none border-0 text-white placeholder-zinc-500 text-xs sm:text-sm focus:outline-none px-2 py-1 max-h-36 font-normal leading-relaxed"
            />

            {/* Input bottom controls: File upload, Web search/Context, Live Voice, Send button */}
            <div className="flex items-center justify-between pt-1 px-1">
              {/* Left Action Buttons */}
              <div className="flex items-center gap-1">
                {/* File Attachment */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileAttach}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition"
                  title="Attach files (code, documents, images)"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Live Voice Button in Dock */}
                <button
                  type="button"
                  onClick={onOpenLiveVoice}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.06] transition"
                  title="Talk with j TEC Live (Full-Screen Voice)"
                >
                  <Radio className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Voice Mode</span>
                </button>
              </div>

              {/* Right Action: Send Button */}
              <div className="flex items-center gap-1.5">
                {voiceState === "speaking" && (
                  <button
                    type="button"
                    onClick={onInterrupt}
                    className="p-2 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition text-xs"
                    title="Stop speaking"
                  >
                    <Square className="w-3.5 h-3.5 fill-amber-400" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!inputText.trim() && attachedFiles.length === 0}
                  className={`p-2 rounded-xl transition active:scale-95 ${
                    inputText.trim() || attachedFiles.length > 0
                      ? "bg-white text-black shadow-md hover:bg-zinc-200"
                      : "bg-white/[0.06] text-zinc-500 cursor-not-allowed"
                  }`}
                  title="Send message (Enter)"
                >
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="text-[10px] text-zinc-500 text-center mt-2 font-mono">
            j TEC can make mistakes. Verify critical code and data.
          </div>
        </div>
      </div>
    </div>
  );
};

// Markdown-like message formatter supporting code blocks, copy code button, bold, inline code
function RenderMessageContent({ text }: { text: string }) {
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);

  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let blockIdx = 0;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const textBefore = text.slice(lastIndex, match.index);
    if (textBefore) {
      parts.push(renderParagraphs(textBefore, `text-${blockIdx}`));
    }

    const lang = match[1] || "code";
    const code = match[2];
    const currentIdx = blockIdx;

    parts.push(
      <div
        key={`code-${currentIdx}`}
        className="my-3 rounded-2xl bg-[#0e0e12] border border-white/[0.08] overflow-hidden shadow-lg"
      >
        <div className="flex items-center justify-between px-3.5 py-1.5 bg-white/[0.03] border-b border-white/[0.06] text-[11px] font-mono text-zinc-400">
          <span className="uppercase tracking-wider font-semibold text-zinc-300">
            {lang}
          </span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(code);
              setCopiedCodeIdx(currentIdx);
              setTimeout(() => setCopiedCodeIdx(null), 2000);
            }}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg hover:bg-white/[0.06] text-zinc-300 hover:text-white transition"
          >
            {copiedCodeIdx === currentIdx ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>
        <pre className="p-3.5 text-xs font-mono text-zinc-200 overflow-x-auto leading-relaxed">
          <code>{code}</code>
        </pre>
      </div>
    );

    lastIndex = match.index + match[0].length;
    blockIdx++;
  }

  const remainingText = text.slice(lastIndex);
  if (remainingText) {
    parts.push(renderParagraphs(remainingText, `text-end`));
  }

  return <div className="space-y-2">{parts}</div>;
}

function renderParagraphs(text: string, keyPrefix: string) {
  const lines = text.split("\n");
  return (
    <div key={keyPrefix} className="space-y-1.5">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1.5" />;

        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-amber-400 font-bold">•</span>
              <span>{renderInline(trimmed.slice(2))}</span>
            </div>
          );
        }

        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-amber-400 font-mono text-xs font-bold">
                {numMatch[1]}.
              </span>
              <span>{renderInline(numMatch[2])}</span>
            </div>
          );
        }

        return <div key={idx}>{renderInline(trimmed)}</div>;
      })}
    </div>
  );
}

function renderInline(text: string) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded bg-white/[0.08] text-amber-300 font-mono text-[11px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
