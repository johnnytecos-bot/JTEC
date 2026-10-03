import React, { useState, useEffect } from "react";
import { MessageRecord } from "../services/supabase";
import {
  Volume2,
  Copy,
  Check,
  Sparkles,
  User,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Play,
  Pause,
  RotateCcw,
} from "lucide-react";
import { AudioEngine } from "../services/audioEngine";
import { audioCache, AudioPlaybackState } from "../services/audioCache";

interface ChatMessageProps {
  message: MessageRecord;
  currentVoice?: string;
  audioEngine?: AudioEngine | null;
  isStreaming?: boolean;
}

function formatAudioTime(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

// Markdown-like text renderer supporting code blocks, inline code, bold, lists
function FormattedContent({ text }: { text: string }) {
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);

  // Split by code blocks ```lang ... ```
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
        className="my-3 rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden shadow-lg"
      >
        <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/90 border-b border-zinc-800 text-[11px] font-mono text-zinc-400">
          <span className="uppercase tracking-wider font-semibold text-zinc-300">{lang}</span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(code);
              setCopiedCodeIdx(currentIdx);
              setTimeout(() => setCopiedCodeIdx(null), 2000);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition"
          >
            {copiedCodeIdx === currentIdx ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>
        <pre className="p-4 text-xs font-mono text-zinc-200 overflow-x-auto leading-relaxed">
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

        // Bullet point
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-sky-400 font-bold">•</span>
              <span>{renderInlineFormatting(trimmed.slice(2))}</span>
            </div>
          );
        }

        // Numbered list
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="font-mono text-sky-400 font-semibold text-xs shrink-0 mt-0.5">
                {numMatch[1]}.
              </span>
              <span>{renderInlineFormatting(numMatch[2])}</span>
            </div>
          );
        }

        // Header ###
        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={idx} className="text-sm font-bold text-white pt-1">
              {renderInlineFormatting(trimmed.slice(4))}
            </h4>
          );
        }

        return <p key={idx}>{renderInlineFormatting(trimmed)}</p>;
      })}
    </div>
  );
}

function renderInlineFormatting(text: string): React.ReactNode {
  // Inline code `code`
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded-md bg-zinc-800 text-sky-300 font-mono text-[12px] border border-zinc-700/60"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  currentVoice,
  audioEngine,
  isStreaming = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [audioState, setAudioState] = useState<AudioPlaybackState>(() =>
    audioCache.getState(message.id)
  );

  const isUser = message.role === "user";

  // Subscribe to audioCache events for this message
  useEffect(() => {
    // Initial sync
    setAudioState(audioCache.getState(message.id));

    // Check if audio already exists in persistent IndexedDB storage
    audioCache.has(message.id).then((isCached) => {
      if (isCached) {
        setAudioState((prev) => ({ ...prev, hasCachedAudio: true }));
      }
    });

    const unsubscribe = audioCache.subscribe((state) => {
      if (state.messageId === message.id) {
        setAudioState(state);
      } else {
        // If another message started playing, reset this one's active playing/paused state
        setAudioState((prev) =>
          prev.isPlaying || prev.isPaused
            ? { ...prev, isPlaying: false, isPaused: false }
            : prev
        );
      }
    });

    return unsubscribe;
  }, [message.id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Toggle Play / Pause / Resume with zero tokens on replay
  const handleToggleAudio = async () => {
    await audioCache.togglePlay(message.id, message.content, currentVoice || "Zephyr");
  };

  // Restart playback from beginning (0 tokens)
  const handleRestartAudio = () => {
    audioCache.seek(message.id, 0);
  };

  const timeFormatted = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`w-full py-4 transition-colors animate-message-enter ${
        isUser ? "bg-transparent" : "bg-[#0c0c12]/80 border-y border-amber-500/15"
      }`}
    >
      <div className="max-w-3xl mx-auto px-4 flex items-start gap-3.5">
        {/* Avatar */}
        {isUser ? (
          <div className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 shadow-md bg-zinc-800 text-amber-400 border border-amber-500/30">
            <User className="w-4 h-4" />
          </div>
        ) : (
          <div
            className={`relative w-8 h-8 rounded-full p-0.5 bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 shadow-md shrink-0 ${
              isStreaming ? "ring-2 ring-amber-400/50 animate-pulse" : ""
            }`}
          >
            <div className="w-full h-full rounded-full overflow-hidden bg-zinc-900 border border-amber-500/40 flex items-center justify-center">
              <span className="text-xs font-black text-amber-400 select-none">⚡</span>
            </div>
          </div>
        )}

        {/* Content Column */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Sender & Timestamp Header */}
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-400">
            {isUser ? (
              <span className="text-zinc-200 font-semibold">You</span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-bold">j TEC</span>
                {isStreaming ? (
                  <span className="flex items-center gap-1 text-[10px] text-amber-300 font-medium bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full animate-pulse font-mono">
                    <Sparkles className="w-2.5 h-2.5 animate-spin text-amber-400" />
                    <span>typing...</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-400 font-normal">⚡ Tech Bro & Companion</span>
                )}
              </div>
            )}
            <span className="font-mono text-[10px] text-zinc-500">{timeFormatted}</span>
          </div>

          {/* PINNED AUDIO VOICE BAR ON TOP (j TEC's voice player placed at top of message) */}
          {!isUser && !isStreaming && (
            <div className="p-2 sm:p-2.5 rounded-2xl bg-zinc-950/85 border border-amber-500/25 shadow-md flex items-center justify-between gap-2.5 w-full overflow-hidden backdrop-blur-md">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {/* Round Play/Pause/Resume Button */}
                <button
                  onClick={handleToggleAudio}
                  disabled={audioState.isLoading}
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all shadow-md active:scale-95 ${
                    audioState.isPlaying
                      ? "bg-gradient-to-tr from-amber-500 to-yellow-400 text-black shadow-amber-500/30 scale-105"
                      : audioState.isPaused
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                      : audioState.hasCachedAudio
                      ? "bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/30"
                      : "bg-[#181822] hover:bg-zinc-800 text-amber-400 border border-zinc-800 hover:border-amber-500/40"
                  }`}
                  title={
                    audioState.isPlaying
                      ? "Pause voice"
                      : audioState.isPaused
                      ? "Resume voice (0 tokens used)"
                      : audioState.hasCachedAudio
                      ? "Play cached voice (0 tokens used)"
                      : "Listen to j TEC (loads audio once)"
                  }
                  aria-label={audioState.isPlaying ? "Pause voice" : "Play voice"}
                >
                  {audioState.isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  ) : audioState.isPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </button>

                {/* Voice Status & Duration Info */}
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200 truncate">
                    <span className="truncate">
                      {audioState.isLoading
                        ? "Loading voice..."
                        : audioState.isPlaying
                        ? "Playing j TEC's voice"
                        : audioState.isPaused
                        ? "Voice paused"
                        : "j TEC Voice Note"}
                    </span>
                    {audioState.isPlaying && (
                      <span className="flex items-end gap-0.5 h-3 shrink-0">
                        <span className="w-0.5 h-full bg-amber-400 animate-pulse" />
                        <span className="w-0.5 h-2/3 bg-amber-400 animate-pulse [animation-delay:0.15s]" />
                        <span className="w-0.5 h-4/5 bg-amber-400 animate-pulse [animation-delay:0.3s]" />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
                    <span>
                      {audioState.duration > 0
                        ? `${formatAudioTime(audioState.currentTime)} / ${formatAudioTime(audioState.duration)}`
                        : audioState.hasCachedAudio
                        ? "Cached • 0 tokens"
                        : "Tap to listen"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Scrubber & Quick Restart */}
              <div className="flex items-center gap-2 shrink-0">
                {audioState.duration > 0 && (
                  <input
                    type="range"
                    min={0}
                    max={audioState.duration || 100}
                    step={0.1}
                    value={audioState.currentTime}
                    onChange={(e) => audioCache.seek(message.id, parseFloat(e.target.value))}
                    className="w-16 sm:w-24 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    title="Seek audio position"
                  />
                )}

                {audioState.duration > 0 && (
                  <button
                    onClick={handleRestartAudio}
                    className="p-1 rounded-lg text-zinc-400 hover:text-amber-300 hover:bg-zinc-800/80 transition"
                    title="Restart from beginning (0 tokens)"
                    aria-label="Restart audio"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}

                {audioState.hasCachedAudio && (
                  <span
                    className="text-[9px] uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-sans font-bold border border-emerald-500/30"
                    title="Cached permanently in memory & IndexedDB — replays use 0 tokens"
                  >
                    Saved
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Formatted Text Body with Typewriter streaming effect */}
          <div className="text-[14px] text-zinc-100 leading-relaxed font-normal selection:bg-amber-500/30 selection:text-white">
            {isStreaming && !message.content ? (
              <div className="flex items-center gap-2 text-zinc-400 text-xs py-1.5 animate-pulse">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <span className="text-amber-300/80 text-xs font-mono">j TEC is thinking...</span>
              </div>
            ) : (
              <>
                <FormattedContent text={message.content} />
                {isStreaming && (
                  <span
                    className="inline-block w-2 h-4 ml-1 align-middle bg-gradient-to-t from-amber-400 via-yellow-300 to-amber-500 rounded-[1px] animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.9)]"
                    aria-hidden="true"
                  />
                )}
              </>
            )}
          </div>

          {/* Bottom Action Bar (Clean and lightweight) */}
          {!isStreaming && (
            <div className="flex items-center gap-2 pt-1 text-xs text-zinc-400 animate-fade-in">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
                title="Copy message"
                aria-label="Copy message"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span className="text-[11px] font-medium">{copied ? "Copied" : "Copy"}</span>
              </button>

              {!isUser && (
                <div className="flex items-center gap-1 pl-1 border-l border-zinc-800">
                  <button
                    onClick={() => setFeedback(feedback === "up" ? null : "up")}
                    className={`p-1 rounded-md hover:bg-zinc-800 transition ${
                      feedback === "up" ? "text-amber-400" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                    aria-label="Good response"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setFeedback(feedback === "down" ? null : "down")}
                    className={`p-1 rounded-md hover:bg-zinc-800 transition ${
                      feedback === "down" ? "text-red-400" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                    aria-label="Poor response"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
