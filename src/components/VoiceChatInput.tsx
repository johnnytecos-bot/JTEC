import React, { useState, useRef } from "react";
import {
  Mic,
  MicOff,
  ArrowUp,
  Square,
} from "lucide-react";
import { VoiceState } from "../services/audioEngine";
import { LanguageOption } from "../services/languages";
import { TokenMetrics } from "../services/tokenTracker";

interface VoiceChatInputProps {
  onSendMessage: (text: string) => void;
  onToggleVoice: () => void;
  isVoiceActive: boolean;
  voiceState: VoiceState;
  isMuted: boolean;
  onToggleMute: () => void;
  onInterrupt: () => void;
  onOpenOrbView?: () => void;
  currentLanguage: LanguageOption;
  visualizerMode?: "waveform" | "spectrum" | "orb";
  onCycleVisualizerMode?: () => void;
  interimTranscript?: string;
  tokens?: TokenMetrics;
  onOpenSettings?: () => void;
}

export const VoiceChatInput: React.FC<VoiceChatInputProps> = ({
  onSendMessage,
  onToggleVoice,
  isVoiceActive,
  voiceState,
  isMuted,
  onToggleMute,
  onInterrupt,
  currentLanguage,
  interimTranscript,
}) => {
  const [inputText, setInputText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const placeholderText = isVoiceActive
    ? isMuted
      ? "Microphone is muted..."
      : `j TEC is listening in ${currentLanguage.name}... (speak with him)`
    : "Type a message to j TEC...";

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInputText("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
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
    e.target.style.height = `${Math.min(140, e.target.scrollHeight)}px`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 pb-3 pt-1">
      {/* Real-time speech caption preview when mic is active */}
      {isVoiceActive && interimTranscript && (
        <div className="mb-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center gap-2 max-w-lg mx-auto shadow-sm animate-pulse">
          <Mic className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">Hearing: "{interimTranscript}"</span>
        </div>
      )}

      {/* Clean luxury input capsule: typing bar, send, and mic */}
      <div className="relative rounded-2xl bg-[#111118]/95 border border-amber-500/30 px-3 py-1.5 shadow-[0_0_25px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-500/20">
        <div className="flex items-center gap-2">
          {/* Text input area */}
          <div className="flex-1 min-w-0">
            <textarea
              ref={inputRef}
              rows={1}
              value={inputText}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholderText}
              className="w-full bg-transparent resize-none border-0 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none py-1.5 px-1 max-h-32 font-normal leading-relaxed"
              aria-label="Type a message to Sana"
            />
          </div>

          {/* Action buttons: interrupt (if speaking), mic, and send */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* If AI is speaking, allow quick interrupt */}
            {voiceState === "speaking" && (
              <button
                type="button"
                onClick={onInterrupt}
                className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition text-xs"
                title="Interrupt speech"
                aria-label="Interrupt speech"
              >
                <Square className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              </button>
            )}

            {/* Mic button */}
            <button
              type="button"
              onClick={onToggleVoice}
              className={`p-2 rounded-xl transition shrink-0 ${
                isVoiceActive
                  ? isMuted
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/50"
                    : "bg-gradient-to-tr from-amber-500 to-yellow-400 text-black font-bold shadow-md shadow-amber-500/30 animate-pulse"
                  : "text-zinc-400 hover:text-amber-300 hover:bg-zinc-800/80"
              }`}
              title={isVoiceActive ? "Turn off mic" : "Turn on mic"}
              aria-label={isVoiceActive ? "Stop microphone" : "Start microphone"}
            >
              {isVoiceActive ? (
                isMuted ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>

            {/* Send button (gold pill arrow) */}
            <button
              type="button"
              onClick={handleSend}
              disabled={!inputText.trim()}
              className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 hover:brightness-110 disabled:opacity-20 disabled:hover:brightness-100 text-black transition flex items-center justify-center font-bold shadow-md"
              aria-label="Send message"
              title="Send message"
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
