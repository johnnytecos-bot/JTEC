import React, { useEffect, useRef, useState } from "react";
import { AudioEngine, VoiceState } from "../services/audioEngine";
import {
  Mic,
  MicOff,
  Square,
  X,
  Volume2,
  Sparkles,
  MessageSquare,
  Zap,
} from "lucide-react";
import { LanguageOption } from "../services/languages";
import { TokenMetrics } from "../services/tokenTracker";

interface VoiceOrbViewProps {
  isOpen: boolean;
  onClose: () => void;
  audioEngine: AudioEngine | null;
  voiceState: VoiceState;
  isMuted: boolean;
  onToggleMute: () => void;
  onInterrupt: () => void;
  lastUserTranscript: string;
  lastAiTranscript: string;
  currentLanguage: LanguageOption;
  currentVoice: string;
  tokens?: TokenMetrics;
}

export const VoiceOrbView: React.FC<VoiceOrbViewProps> = ({
  isOpen,
  onClose,
  audioEngine,
  voiceState,
  isMuted,
  onToggleMute,
  onInterrupt,
  lastUserTranscript,
  lastAiTranscript,
  currentLanguage,
  currentVoice,
  tokens,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let time = 0;
    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      // Audio volume
      let volume = 0;
      if (audioEngine) {
        const micVol = audioEngine.getMicVolume();
        const aiVol = audioEngine.getAiVolume();
        volume = voiceState === "speaking" ? aiVol : micVol;
      }

      time += 0.03 + volume * 0.08;

      // Base radius
      const baseRadius = 70 + volume * 55;

      // Draw multi-layered organic morphing blobs like ChatGPT Voice
      const layers = [
        { radius: baseRadius + 35, alpha: 0.15, blur: 30, color: voiceState === "speaking" ? "#38bdf8" : "#10b981" },
        { radius: baseRadius + 18, alpha: 0.35, blur: 20, color: voiceState === "speaking" ? "#6366f1" : "#059669" },
        { radius: baseRadius, alpha: 0.85, blur: 10, color: voiceState === "speaking" ? "#0284c7" : "#10b981" },
      ];

      for (const layer of layers) {
        ctx.save();
        ctx.shadowColor = layer.color;
        ctx.shadowBlur = layer.blur;

        ctx.beginPath();
        const points = 32;
        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2;
          // Fluid organic oscillation
          const offset =
            Math.sin(angle * 3 + time) * (8 + volume * 25) +
            Math.cos(angle * 5 - time * 0.8) * (5 + volume * 15);
          const r = layer.radius + offset;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();

        // Iridescent radial gradient fill
        const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, layer.radius + 20);
        if (voiceState === "speaking") {
          grad.addColorStop(0, "rgba(224, 242, 254, 0.9)");
          grad.addColorStop(0.4, "rgba(56, 189, 248, 0.7)");
          grad.addColorStop(0.8, "rgba(99, 102, 241, 0.5)");
          grad.addColorStop(1, "rgba(30, 27, 75, 0)");
        } else if (voiceState === "listening") {
          grad.addColorStop(0, "rgba(209, 250, 229, 0.9)");
          grad.addColorStop(0.4, "rgba(16, 185, 129, 0.7)");
          grad.addColorStop(0.8, "rgba(5, 150, 105, 0.5)");
          grad.addColorStop(1, "rgba(6, 78, 59, 0)");
        } else {
          grad.addColorStop(0, "rgba(243, 232, 255, 0.8)");
          grad.addColorStop(0.5, "rgba(168, 85, 247, 0.5)");
          grad.addColorStop(1, "rgba(88, 28, 135, 0)");
        }

        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      }

      animFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [isOpen, audioEngine, voiceState]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-white overflow-hidden p-6 md:p-10 animate-fade-in select-none"
      role="dialog"
      aria-modal="true"
      aria-label="ChatGPT Live Voice Mode"
    >
      {/* Top Navbar */}
      <div className="flex items-center justify-between w-full max-w-4xl mx-auto z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs font-semibold backdrop-blur-md">
            <span
              className={`w-2 h-2 rounded-full ${
                voiceState === "speaking"
                  ? "bg-sky-400 animate-ping"
                  : voiceState === "listening"
                  ? "bg-emerald-400 animate-pulse"
                  : "bg-zinc-500"
              }`}
            />
            <span className="text-zinc-200">
              {voiceState === "speaking"
                ? "Sana Speaking"
                : voiceState === "listening"
                ? "Sana is Listening"
                : "Sana Connected"}
            </span>
            <span className="text-zinc-500">•</span>
            <span className="text-sky-400 font-mono">{currentVoice}</span>
          </div>
        </div>

        {/* Right side: Token counter + Exit button */}
        <div className="flex items-center gap-3">
          {tokens && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-850 text-[11px] font-mono text-zinc-300 backdrop-blur-md">
              <div className="flex items-center gap-1 text-amber-400">
                <Zap className="w-3.5 h-3.5" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <span>
                <strong className="text-emerald-400">{(tokens?.remainingTokens ?? 1000000).toLocaleString()}</strong> rem
              </span>
              <span className="text-zinc-600">•</span>
              <span>
                <strong className="text-zinc-300">{(tokens?.totalTokensUsed ?? 0).toLocaleString()}</strong> used
              </span>
            </div>
          )}

          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition"
            aria-label="Exit voice mode"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Center Area: Organic Voice Orb */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full my-auto z-10">
        {/* Dynamic ChatGPT Voice Orb */}
        <div className="relative flex items-center justify-center w-full max-w-md aspect-square my-2">
          <canvas
            ref={canvasRef}
            width={480}
            height={480}
            className="w-full h-full block rounded-full"
            aria-label="Morphing Voice Sphere"
          />
        </div>

        {/* Subtitles / Speech Captions Overlay */}
        <div className="w-full max-w-lg min-h-[90px] text-center space-y-2 px-4 transition-all">
          {voiceState === "speaking" && lastAiTranscript ? (
            <div className="animate-fade-in">
              <span className="text-[11px] font-bold text-rose-400 uppercase tracking-widest block mb-1">
                Sana ❤️
              </span>
              <p className="text-base md:text-lg font-medium text-zinc-100 leading-snug line-clamp-3">
                "{lastAiTranscript}"
              </p>
            </div>
          ) : lastUserTranscript ? (
            <div className="animate-fade-in">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest block mb-1">
                You
              </span>
              <p className="text-base md:text-lg font-medium text-zinc-200 leading-snug line-clamp-3">
                "{lastUserTranscript}"
              </p>
            </div>
          ) : (
            <p className="text-sm text-zinc-400">
              {isMuted
                ? "Microphone is muted. Tap unmute below to resume."
                : `Listening in ${currentLanguage.name}...`}
            </p>
          )}
        </div>
      </div>

      {/* Bottom Floating Control Dock */}
      <div className="flex items-center justify-center gap-4 max-w-md mx-auto w-full pb-6 z-10">
        {/* Mute Mic Button */}
        <button
          onClick={onToggleMute}
          className={`p-4 rounded-full border transition active:scale-95 shadow-xl ${
            isMuted
              ? "bg-red-500/20 text-red-400 border-red-500/50"
              : "bg-zinc-900/90 text-zinc-300 border-zinc-700 hover:bg-zinc-800"
          }`}
          title={isMuted ? "Unmute microphone" : "Mute microphone"}
          aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        {/* Interrupt / Stop Talking */}
        <button
          onClick={onInterrupt}
          className="p-5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 shadow-xl transition active:scale-95 flex items-center justify-center"
          title="Interrupt speech"
          aria-label="Interrupt speech"
        >
          <Square className="w-5 h-5 text-amber-400 fill-amber-400" />
        </button>

        {/* Switch to Chat View */}
        <button
          onClick={onClose}
          className="p-4 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 shadow-xl transition active:scale-95"
          title="Switch to chat view"
          aria-label="Switch to chat view"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
