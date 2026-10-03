import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  X,
  Sparkles,
  Radio,
  Minimize2,
  Activity,
  Layers,
} from "lucide-react";
import { AudioEngine, VoiceState } from "../services/audioEngine";

interface ModernLiveVoiceViewProps {
  onBackToChat: () => void;
  onEndCall: () => void;
  voiceState: VoiceState;
  isVoiceActive: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  audioEngine: AudioEngine | null;
  lastAiTranscript?: string;
  interimTranscript?: string;
  currentVoice: string;
}

export const ModernLiveVoiceView: React.FC<ModernLiveVoiceViewProps> = ({
  onBackToChat,
  onEndCall,
  voiceState,
  isVoiceActive,
  isMuted,
  onToggleMute,
  audioEngine,
  lastAiTranscript,
  interimTranscript,
  currentVoice,
}) => {
  const [visualMode, setVisualMode] = useState<"orb" | "waveform" | "spectrum">("orb");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Canvas visualizer loop using real audio frequency data from AudioEngine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let time = 0;
    const freqData = new Uint8Array(128);
    const timeData = new Uint8Array(128);

    const render = () => {
      time += 0.03;
      const width = (canvas.width = canvas.offsetWidth * window.devicePixelRatio);
      const height = (canvas.height = canvas.offsetHeight * window.devicePixelRatio);
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // Extract real audio levels
      let avgLevel = 0;
      if (audioEngine) {
        if (voiceState === "speaking") {
          audioEngine.getAiFrequencyData(freqData);
          avgLevel = freqData.reduce((acc, v) => acc + v, 0) / freqData.length / 255;
        } else if (!isMuted) {
          audioEngine.getMicFrequencyData(freqData);
          avgLevel = freqData.reduce((acc, v) => acc + v, 0) / freqData.length / 255;
        }
      }

      // Base radius with responsive pulse
      const baseRadius = Math.min(width, height) * 0.22;
      const dynamicRadius = baseRadius + avgLevel * (baseRadius * 0.65);

      if (visualMode === "orb") {
        // Mode 1: Luxury Fluid Morphing Orb
        // Outer aura glow
        const glowRadius = dynamicRadius * 1.5;
        const glowGrad = ctx.createRadialGradient(
          centerX,
          centerY,
          dynamicRadius * 0.4,
          centerX,
          centerY,
          glowRadius
        );

        if (voiceState === "speaking") {
          glowGrad.addColorStop(0, "rgba(245, 158, 11, 0.45)");
          glowGrad.addColorStop(0.5, "rgba(234, 88, 12, 0.2)");
          glowGrad.addColorStop(1, "rgba(245, 158, 11, 0)");
        } else if (voiceState === "listening") {
          glowGrad.addColorStop(0, "rgba(16, 185, 129, 0.4)");
          glowGrad.addColorStop(0.5, "rgba(5, 150, 105, 0.15)");
          glowGrad.addColorStop(1, "rgba(16, 185, 129, 0)");
        } else {
          glowGrad.addColorStop(0, "rgba(245, 158, 11, 0.25)");
          glowGrad.addColorStop(1, "rgba(245, 158, 11, 0)");
        }

        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Fluid morphing wave rings
        const points = 64;
        ctx.beginPath();
        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2;
          const waveFreq = voiceState === "speaking" ? 6 : 4;
          const waveAmp = (voiceState === "speaking" ? 18 : 6) + avgLevel * 30;
          const waveOffset = Math.sin(angle * waveFreq + time * 3) * waveAmp;
          const r = dynamicRadius + waveOffset;
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();

        const orbGrad = ctx.createRadialGradient(
          centerX - dynamicRadius * 0.3,
          centerY - dynamicRadius * 0.3,
          dynamicRadius * 0.1,
          centerX,
          centerY,
          dynamicRadius
        );

        if (voiceState === "speaking") {
          orbGrad.addColorStop(0, "#fde68a");
          orbGrad.addColorStop(0.5, "#f59e0b");
          orbGrad.addColorStop(1, "#b45309");
        } else if (voiceState === "listening") {
          orbGrad.addColorStop(0, "#a7f3d0");
          orbGrad.addColorStop(0.5, "#10b981");
          orbGrad.addColorStop(1, "#047857");
        } else {
          orbGrad.addColorStop(0, "#fef3c7");
          orbGrad.addColorStop(0.7, "#d97706");
          orbGrad.addColorStop(1, "#78350f");
        }

        ctx.fillStyle = orbGrad;
        ctx.fill();

        // Inner core sparkle
        ctx.beginPath();
        ctx.arc(
          centerX - dynamicRadius * 0.25,
          centerY - dynamicRadius * 0.25,
          dynamicRadius * 0.2,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.fill();
      } else if (visualMode === "waveform") {
        // Mode 2: Concentric Waveform
        const bars = 48;
        for (let i = 0; i < bars; i++) {
          const angle = (i / bars) * Math.PI * 2;
          const rawHeight = freqData[i % freqData.length] || 0;
          const barHeight = (rawHeight / 255) * 60 + 10;

          const x1 = centerX + Math.cos(angle) * (baseRadius * 0.7);
          const y1 = centerY + Math.sin(angle) * (baseRadius * 0.7);
          const x2 = centerX + Math.cos(angle) * (baseRadius * 0.7 + barHeight);
          const y2 = centerY + Math.sin(angle) * (baseRadius * 0.7 + barHeight);

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.lineWidth = 4 * window.devicePixelRatio;
          ctx.strokeStyle =
            voiceState === "speaking" ? "#f59e0b" : "#10b981";
          ctx.lineCap = "round";
          ctx.stroke();
        }
      } else {
        // Mode 3: Spectrum horizontal bars
        const barCount = 36;
        const totalW = width * 0.65;
        const barWidth = totalW / barCount - 4;
        const startX = (width - totalW) / 2;

        for (let i = 0; i < barCount; i++) {
          const val = freqData[i % freqData.length] || 0;
          const h = (val / 255) * (height * 0.25) + 6;
          const x = startX + i * (barWidth + 4);
          const y = centerY - h / 2;

          ctx.fillStyle =
            voiceState === "speaking" ? "#f59e0b" : "#10b981";
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, h, 6);
          ctx.fill();
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [audioEngine, voiceState, isMuted, visualMode]);

  const stateText = isMuted
    ? "Microphone Muted"
    : voiceState === "speaking"
    ? "j TEC is speaking..."
    : voiceState === "listening"
    ? "Listening to you..."
    : voiceState === "thinking"
    ? "Thinking..."
    : "Live Voice Ready";

  return (
    <div className="fixed inset-0 z-50 bg-[#07070a] flex flex-col justify-between select-none animate-fade-in overflow-hidden">
      {/* Ambient background atmosphere glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[140px] transition-colors duration-700 ${
            voiceState === "speaking"
              ? "bg-amber-500/15"
              : voiceState === "listening"
              ? "bg-emerald-500/15"
              : "bg-white/[0.04]"
          }`}
        />
      </div>

      {/* Top Bar Navigation */}
      <div className="relative z-10 p-4 sm:p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToChat}
            className="p-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white transition active:scale-95 flex items-center gap-2 text-xs font-semibold"
            title="Minimize to chat while keeping voice active"
          >
            <Minimize2 className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Chat</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs font-medium text-zinc-300">
            <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Gemini 2.0 Live Duplex</span>
            <span className="text-zinc-500 font-mono">·</span>
            <span className="text-amber-300 font-mono capitalize">{currentVoice}</span>
          </div>
        </div>

        {/* Visualizer Mode selector */}
        <div className="flex items-center gap-1 bg-white/[0.05] p-1 rounded-xl border border-white/[0.08]">
          <button
            onClick={() => setVisualMode("orb")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
              visualMode === "orb" ? "bg-white/[0.15] text-white" : "text-zinc-400"
            }`}
          >
            Orb
          </button>
          <button
            onClick={() => setVisualMode("waveform")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
              visualMode === "waveform" ? "bg-white/[0.15] text-white" : "text-zinc-400"
            }`}
          >
            Wave
          </button>
          <button
            onClick={() => setVisualMode("spectrum")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
              visualMode === "spectrum" ? "bg-white/[0.15] text-white" : "text-zinc-400"
            }`}
          >
            Bars
          </button>
        </div>
      </div>

      {/* Center Interactive Visualization Canvas */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center min-h-0 px-4">
        <canvas ref={canvasRef} className="w-full h-full max-h-[380px] max-w-[500px]" />

        {/* Current State Text */}
        <div className="mt-4 flex flex-col items-center gap-1 text-center">
          <span className="text-base sm:text-lg font-bold text-white tracking-wide">
            {stateText}
          </span>
          <span className="text-xs text-zinc-500 max-w-sm">
            Speak naturally. Interrupt anytime by speaking over.
          </span>
        </div>

        {/* Real-time caption transcript box */}
        {(interimTranscript || lastAiTranscript) && (
          <div className="mt-6 max-w-xl w-full px-4 py-3 rounded-2xl bg-black/50 border border-white/[0.08] backdrop-blur-md text-xs leading-relaxed text-zinc-300 text-center max-h-24 overflow-y-auto">
            {interimTranscript ? (
              <span className="text-emerald-400 font-medium">"{interimTranscript}"</span>
            ) : (
              <span className="text-zinc-300">{lastAiTranscript}</span>
            )}
          </div>
        )}
      </div>

      {/* Bottom Control Dock */}
      <div className="relative z-10 p-6 sm:p-8 flex items-center justify-center gap-4">
        {/* Mute button */}
        <button
          onClick={onToggleMute}
          className={`p-4 rounded-full transition active:scale-95 shadow-xl ${
            isMuted
              ? "bg-red-500/20 text-red-400 border border-red-500/40"
              : "bg-white/[0.08] text-white hover:bg-white/[0.14] border border-white/[0.1]"
          }`}
          title={isMuted ? "Unmute microphone" : "Mute microphone"}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        {/* End Call Button */}
        <button
          onClick={onEndCall}
          className="p-5 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold transition active:scale-95 shadow-2xl shadow-red-600/40"
          title="End Live Voice conversation"
        >
          <PhoneOff className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
};
