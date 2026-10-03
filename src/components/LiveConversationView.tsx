import React, { useState, useEffect, useRef } from "react";
import { AudioEngine, VoiceState } from "../services/audioEngine";
import {
  ArrowLeft,
  Settings,
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  Radio,
  Cpu,
  Sparkles,
  Waves,
  Activity,
  Layers,
} from "lucide-react";

export type LiveWaveStyle = "jarvis" | "celestial" | "quantum";

interface LiveConversationViewProps {
  onBack: () => void;
  onOpenSettings: () => void;
  voiceState: VoiceState;
  isVoiceActive: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onEndCall: () => void;
  audioEngine: AudioEngine | null;
  lastAiTranscript?: string;
  interimTranscript?: string;
  currentVoice: string;
}

export const LiveConversationView: React.FC<LiveConversationViewProps> = ({
  onBack,
  onOpenSettings,
  voiceState,
  isVoiceActive,
  isMuted,
  onToggleMute,
  onEndCall,
  audioEngine,
  lastAiTranscript,
  interimTranscript,
  currentVoice,
}) => {
  // Saved wave style preference
  const [waveStyle, setWaveStyle] = useState<LiveWaveStyle>(() => {
    const saved = localStorage.getItem("sana_live_wave_style") as LiveWaveStyle;
    return saved === "jarvis" || saved === "celestial" || saved === "quantum"
      ? saved
      : "jarvis";
  });

  const handleSelectStyle = (style: LiveWaveStyle) => {
    setWaveStyle(style);
    localStorage.setItem("sana_live_wave_style", style);
  };

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const isSpeaking = voiceState === "speaking";
  const isListening = voiceState === "listening";

  // Particle storage for celestial & jarvis modes
  const particlesRef = useRef<
    Array<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number; life: number }>
  >([]);

  // Peaks storage for quantum mode
  const peaksRef = useRef<number[]>(new Array(48).fill(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let time = 0;
    let rotation = 0;
    let smoothedVolume = 0;

    // Allocate audio analysis buffers
    const micWave = new Uint8Array(128);
    const micFreq = new Uint8Array(128);
    const aiWave = new Uint8Array(128);
    const aiFreq = new Uint8Array(128);

    // Initialize particles once
    if (particlesRef.current.length === 0) {
      for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 30 + Math.random() * 80;
        particlesRef.current.push({
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          size: 1 + Math.random() * 2.2,
          alpha: 0.2 + Math.random() * 0.7,
          life: Math.random() * 100,
        });
      }
    }

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const targetWidth = Math.floor(rect.width * dpr);
      const targetHeight = Math.floor(rect.height * dpr);

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      }

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      // Extract real-time audio metrics
      let rawVolume = 0;
      let activeFreq = micFreq;
      let activeWave = micWave;

      if (audioEngine) {
        audioEngine.getMicWaveformData(micWave);
        audioEngine.getMicFrequencyData(micFreq);
        audioEngine.getAiWaveformData(aiWave);
        audioEngine.getAiFrequencyData(aiFreq);

        const micVol = audioEngine.getMicVolume();
        const aiVol = audioEngine.getAiVolume();

        if (isSpeaking && aiVol > 0.01) {
          rawVolume = aiVol;
          activeFreq = aiFreq;
          activeWave = aiWave;
        } else if (isListening) {
          rawVolume = micVol;
          activeFreq = micFreq;
          activeWave = micWave;
        } else {
          rawVolume = Math.max(micVol, aiVol);
        }
      }

      // Smooth volume transitions with subtle idle breathing
      const idleBreathing = 0.05 + 0.03 * Math.sin(time * 2);
      const targetVol = Math.max(idleBreathing, rawVolume);
      smoothedVolume += (targetVol - smoothedVolume) * 0.15;
      const vol = smoothedVolume;

      time += 0.03;
      rotation += 0.01 + vol * 0.03;

      // =========================================================
      // STYLE 1: JARVIS HOLOGRAPHIC ARC REACTOR HUD
      // =========================================================
      if (waveStyle === "jarvis") {
        const baseRadius = Math.min(cx, cy) * 0.46;

        // 1. Futuristic HUD Outer Targeting Brackets
        ctx.save();
        ctx.strokeStyle = "rgba(245, 158, 11, 0.25)";
        ctx.lineWidth = 1.5 * dpr;
        const bSize = baseRadius * 1.35;
        const bArm = 16 * dpr;

        // Top-Left bracket
        ctx.beginPath();
        ctx.moveTo(cx - bSize + bArm, cy - bSize);
        ctx.lineTo(cx - bSize, cy - bSize);
        ctx.lineTo(cx - bSize, cy - bSize + bArm);
        ctx.stroke();

        // Top-Right bracket
        ctx.beginPath();
        ctx.moveTo(cx + bSize - bArm, cy - bSize);
        ctx.lineTo(cx + bSize, cy - bSize);
        ctx.lineTo(cx + bSize, cy - bSize + bArm);
        ctx.stroke();

        // Bottom-Left bracket
        ctx.beginPath();
        ctx.moveTo(cx - bSize + bArm, cy + bSize);
        ctx.lineTo(cx - bSize, cy + bSize);
        ctx.lineTo(cx - bSize, cy + bSize - bArm);
        ctx.stroke();

        // Bottom-Right bracket
        ctx.beginPath();
        ctx.moveTo(cx + bSize - bArm, cy + bSize);
        ctx.lineTo(cx + bSize, cy + bSize);
        ctx.lineTo(cx + bSize, cy + bSize - bArm);
        ctx.stroke();
        ctx.restore();

        // 2. Outer Dial Tick Marks (360 degrees)
        const tickCount = 60;
        ctx.save();
        for (let i = 0; i < tickCount; i++) {
          const angle = (i / tickCount) * Math.PI * 2;
          const isMajor = i % 5 === 0;
          const tickLen = (isMajor ? 9 : 4.5) * dpr;
          const r1 = baseRadius * 1.15;
          const r2 = r1 + tickLen;

          const freqVal = activeFreq[i % activeFreq.length] / 255;
          const activeTick = isSpeaking || isListening ? freqVal > 0.2 : false;

          ctx.strokeStyle = activeTick
            ? isSpeaking
              ? "rgba(245, 158, 11, 0.9)"
              : "rgba(16, 185, 129, 0.9)"
            : isMajor
            ? "rgba(217, 119, 6, 0.4)"
            : "rgba(161, 161, 170, 0.15)";
          ctx.lineWidth = (isMajor ? 1.8 : 1) * dpr;

          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
          ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
          ctx.stroke();
        }
        ctx.restore();

        // 3. Rotating Segmented HUD Arc Rings
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rotation);

        const arcRadius = baseRadius * 0.95;
        const segments = 4;
        for (let s = 0; s < segments; s++) {
          const startA = (s / segments) * Math.PI * 2;
          const endA = startA + (Math.PI * 2) / segments - 0.35;

          ctx.beginPath();
          ctx.arc(0, 0, arcRadius, startA, endA);
          ctx.strokeStyle = isSpeaking
            ? "rgba(251, 191, 36, 0.85)"
            : isListening
            ? "rgba(52, 211, 153, 0.85)"
            : "rgba(245, 158, 11, 0.4)";
          ctx.lineWidth = 2.5 * dpr;
          ctx.shadowColor = "rgba(245, 158, 11, 0.6)";
          ctx.shadowBlur = 12 * dpr;
          ctx.stroke();
        }
        ctx.restore();

        // 4. Counter-rotating Inner Segment Ring
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-rotation * 1.5);
        const innerArcRadius = baseRadius * 0.72;
        const innerSegments = 8;
        for (let s = 0; s < innerSegments; s++) {
          const startA = (s / innerSegments) * Math.PI * 2;
          const endA = startA + (Math.PI * 2) / innerSegments - 0.25;

          ctx.beginPath();
          ctx.arc(0, 0, innerArcRadius, startA, endA);
          ctx.strokeStyle = "rgba(253, 224, 71, 0.55)";
          ctx.lineWidth = 1.8 * dpr;
          ctx.stroke();
        }
        ctx.restore();

        // 5. Radial Audio Equalizer Spikes from Arc Ring
        const spikeCount = 36;
        ctx.save();
        for (let i = 0; i < spikeCount; i++) {
          const angle = (i / spikeCount) * Math.PI * 2 + rotation * 0.3;
          const freqVal = activeFreq[(i * 3) % activeFreq.length] / 255;
          const spikeLen = (4 + freqVal * (40 * dpr) + vol * (20 * dpr));

          const innerR = baseRadius * 0.52;
          const outerR = innerR + spikeLen;

          const grad = ctx.createLinearGradient(
            cx + Math.cos(angle) * innerR,
            cy + Math.sin(angle) * innerR,
            cx + Math.cos(angle) * outerR,
            cy + Math.sin(angle) * outerR
          );
          if (isSpeaking) {
            grad.addColorStop(0, "rgba(245, 158, 11, 0.2)");
            grad.addColorStop(1, "rgba(253, 224, 71, 0.95)");
          } else {
            grad.addColorStop(0, "rgba(16, 185, 129, 0.2)");
            grad.addColorStop(1, "rgba(110, 231, 183, 0.95)");
          }

          ctx.strokeStyle = grad;
          ctx.lineWidth = 2.5 * dpr;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
          ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
          ctx.stroke();
        }
        ctx.restore();

        // 6. Glowing Central Reactor Fusion Core
        const coreR = (baseRadius * 0.38) * (1 + vol * 0.35);
        const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
        if (isSpeaking) {
          coreGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
          coreGrad.addColorStop(0.3, "rgba(251, 191, 36, 0.85)");
          coreGrad.addColorStop(0.7, "rgba(217, 119, 6, 0.4)");
          coreGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        } else if (isListening) {
          coreGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
          coreGrad.addColorStop(0.3, "rgba(52, 211, 153, 0.85)");
          coreGrad.addColorStop(0.7, "rgba(5, 150, 105, 0.4)");
          coreGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        } else {
          coreGrad.addColorStop(0, "rgba(251, 191, 36, 0.8)");
          coreGrad.addColorStop(0.5, "rgba(180, 83, 9, 0.3)");
          coreGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        }

        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
        ctx.fill();

        // Center HUD Icon / Core Ring
        ctx.save();
        ctx.strokeStyle = isSpeaking ? "#fde047" : isListening ? "#6ee7b7" : "#f59e0b";
        ctx.lineWidth = 2 * dpr;
        ctx.shadowColor = "rgba(245, 158, 11, 0.8)";
        ctx.shadowBlur = 10 * dpr;
        ctx.beginPath();
        ctx.arc(cx, cy, baseRadius * 0.16, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // =========================================================
      // STYLE 2: CELESTIAL AURA BLOOM (OUR ORIGINAL LUXURY CONCEPT)
      // Fluid, multi-layered golden cosmic energy aura & floating starlight
      // =========================================================
      else if (waveStyle === "celestial") {
        const baseRadius = Math.min(cx, cy) * 0.42;

        // 1. Floating Stardust micro-particles
        ctx.save();
        particlesRef.current.forEach((p) => {
          p.x += p.vx * (1 + vol * 3);
          p.y += p.vy * (1 + vol * 3);
          p.life += 0.5;

          const dist = Math.hypot(p.x, p.y);
          if (dist > baseRadius * 1.5 || dist < 15) {
            const angle = Math.random() * Math.PI * 2;
            const newDist = baseRadius * 0.4 + Math.random() * (baseRadius * 0.6);
            p.x = Math.cos(angle) * newDist;
            p.y = Math.sin(angle) * newDist;
          }

          ctx.fillStyle = isSpeaking
            ? `rgba(253, 224, 71, ${p.alpha})`
            : `rgba(167, 243, 208, ${p.alpha})`;
          ctx.beginPath();
          ctx.arc(cx + p.x, cy + p.y, p.size * dpr, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();

        // 2. Multi-layered Harmonic Blooming Aura Ribbons
        const layerCount = 4;
        for (let l = 0; l < layerCount; l++) {
          ctx.save();
          ctx.beginPath();
          const points = 72;
          const layerSpeed = (l + 1) * 0.7;
          const layerPhase = (l * Math.PI) / 3;

          for (let i = 0; i <= points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const waveSample = activeWave[(i * 2) % activeWave.length] / 128 - 1; // -1 to 1

            // Harmonic petal equation with fluid physics
            const harmonic =
              Math.sin(angle * 4 + time * layerSpeed + layerPhase) * 16 * dpr +
              Math.cos(angle * 3 - time * 0.5) * 10 * dpr;

            const radius =
              (baseRadius * (0.65 + l * 0.14) + harmonic * (vol * 2.2 + 0.3) + waveSample * 22 * dpr);

            const px = cx + Math.cos(angle) * radius;
            const py = cy + Math.sin(angle) * radius;

            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();

          ctx.lineWidth = (2.2 - l * 0.3) * dpr;
          if (isSpeaking) {
            ctx.strokeStyle = `rgba(251, 191, 36, ${0.85 - l * 0.18})`;
            ctx.shadowColor = "rgba(245, 158, 11, 0.5)";
            ctx.shadowBlur = (15 - l * 2) * dpr;
          } else if (isListening) {
            ctx.strokeStyle = `rgba(52, 211, 153, ${0.85 - l * 0.18})`;
            ctx.shadowColor = "rgba(16, 185, 129, 0.5)";
            ctx.shadowBlur = (15 - l * 2) * dpr;
          } else {
            ctx.strokeStyle = `rgba(245, 158, 11, ${0.5 - l * 0.1})`;
            ctx.shadowBlur = 6 * dpr;
          }
          ctx.stroke();
          ctx.restore();
        }

        // 3. Central Living Liquid Core
        const coreR = (baseRadius * 0.42) * (1 + vol * 0.4);
        const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
        if (isSpeaking) {
          coreGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
          coreGrad.addColorStop(0.35, "rgba(251, 191, 36, 0.8)");
          coreGrad.addColorStop(0.7, "rgba(234, 88, 12, 0.35)");
          coreGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        } else if (isListening) {
          coreGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
          coreGrad.addColorStop(0.35, "rgba(110, 231, 183, 0.8)");
          coreGrad.addColorStop(0.7, "rgba(5, 150, 105, 0.35)");
          coreGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        } else {
          coreGrad.addColorStop(0, "rgba(251, 191, 36, 0.7)");
          coreGrad.addColorStop(0.5, "rgba(180, 83, 9, 0.25)");
          coreGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        }

        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
        ctx.fill();
      }

      // =========================================================
      // STYLE 3: QUANTUM SPECTRUM WAVE (STUDIO EQUALIZER)
      // Mirrored neon audio spectrum bars with glass reflection & oscilloscope trail
      // =========================================================
      else if (waveStyle === "quantum") {
        const barCount = 38;
        const totalWidth = Math.min(w * 0.88, 480 * dpr);
        const startX = cx - totalWidth / 2;
        const barSpacing = totalWidth / barCount;
        const barWidth = Math.max(3 * dpr, barSpacing * 0.65);
        const maxHeight = h * 0.32;

        // 1. Center Horizon Glow Line
        ctx.save();
        ctx.strokeStyle = "rgba(245, 158, 11, 0.35)";
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath();
        ctx.moveTo(startX - 15 * dpr, cy);
        ctx.lineTo(startX + totalWidth + 15 * dpr, cy);
        ctx.stroke();
        ctx.restore();

        // 2. Oscilloscope Wave Trace through center
        ctx.save();
        ctx.beginPath();
        ctx.lineWidth = 2 * dpr;
        ctx.strokeStyle = isSpeaking
          ? "rgba(253, 224, 71, 0.85)"
          : isListening
          ? "rgba(110, 231, 183, 0.85)"
          : "rgba(245, 158, 11, 0.4)";
        ctx.shadowColor = "rgba(245, 158, 11, 0.6)";
        ctx.shadowBlur = 8 * dpr;

        for (let i = 0; i < barCount; i++) {
          const waveSample = (activeWave[(i * 3) % activeWave.length] / 128 - 1);
          const x = startX + i * barSpacing + barWidth / 2;
          const y = cy + waveSample * (maxHeight * 0.45 * (vol + 0.2));
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();

        // 3. Mirrored Spectrum Equalizer Bars
        for (let i = 0; i < barCount; i++) {
          // Centered frequency indexing (bass in middle, treble on sides)
          const distFromCenter = Math.abs(i - barCount / 2) / (barCount / 2);
          const freqIndex = Math.floor((1 - distFromCenter * 0.6) * (activeFreq.length - 1));
          const freqVal = activeFreq[freqIndex] / 255;

          const barH = Math.max(4 * dpr, freqVal * maxHeight * (1 + vol * 0.5));
          const x = startX + i * barSpacing;

          // Track falling peak caps
          const currentPeak = peaksRef.current[i] || 0;
          if (barH > currentPeak) {
            peaksRef.current[i] = barH;
          } else {
            peaksRef.current[i] = Math.max(0, currentPeak - 1.5 * dpr);
          }
          const peakH = peaksRef.current[i];

          // Top Bar (Upward)
          const topGrad = ctx.createLinearGradient(x, cy, x, cy - barH);
          if (isSpeaking) {
            topGrad.addColorStop(0, "rgba(217, 119, 6, 0.4)");
            topGrad.addColorStop(0.7, "rgba(245, 158, 11, 0.85)");
            topGrad.addColorStop(1, "rgba(254, 240, 138, 0.95)");
          } else if (isListening) {
            topGrad.addColorStop(0, "rgba(5, 150, 105, 0.4)");
            topGrad.addColorStop(0.7, "rgba(16, 185, 129, 0.85)");
            topGrad.addColorStop(1, "rgba(167, 243, 208, 0.95)");
          } else {
            topGrad.addColorStop(0, "rgba(180, 83, 9, 0.2)");
            topGrad.addColorStop(1, "rgba(245, 158, 11, 0.6)");
          }

          ctx.fillStyle = topGrad;
          ctx.beginPath();
          ctx.roundRect(x, cy - barH, barWidth, barH, [3 * dpr, 3 * dpr, 0, 0]);
          ctx.fill();

          // Bottom Bar (Mirrored Glass Reflection)
          const refH = barH * 0.45;
          const refGrad = ctx.createLinearGradient(x, cy, x, cy + refH);
          refGrad.addColorStop(0, "rgba(245, 158, 11, 0.25)");
          refGrad.addColorStop(1, "rgba(245, 158, 11, 0.0)");

          ctx.fillStyle = refGrad;
          ctx.beginPath();
          ctx.roundRect(x, cy, barWidth, refH, [0, 0, 2 * dpr, 2 * dpr]);
          ctx.fill();

          // Floating Peak Cap
          if (peakH > 6 * dpr) {
            ctx.fillStyle = isSpeaking ? "#fde047" : isListening ? "#6ee7b7" : "#fbbf24";
            ctx.fillRect(x, cy - peakH - 2 * dpr, barWidth, 1.8 * dpr);
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [waveStyle, voiceState, isSpeaking, isListening, audioEngine]);

  return (
    <div className="flex-1 flex flex-col justify-between px-4 py-4 max-w-lg mx-auto w-full h-[calc(100vh-61px)] animate-fade-in gold-wave-bg relative overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="flex items-center justify-between z-10 shrink-0">
        <button
          onClick={onBack}
          className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900/60 transition"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-amber-400" />
        </button>

        <div className="text-center">
          <h2 className="text-base font-extrabold text-white tracking-tight">Live Voice Call</h2>
          <p className="text-[11px] text-amber-300/80 font-medium">Real-Time Acoustic Engine</p>
        </div>

        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl text-zinc-400 hover:text-amber-400 hover:bg-zinc-900/60 transition"
          aria-label="Voice settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* 3 Voice Wave Style Selector Pills */}
      <div className="z-10 flex items-center justify-center gap-1.5 p-1 rounded-2xl bg-zinc-950/80 border border-amber-500/25 max-w-sm mx-auto w-full shadow-lg backdrop-blur-md my-2">
        <button
          onClick={() => handleSelectStyle("jarvis")}
          className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            waveStyle === "jarvis"
              ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-md shadow-amber-500/20"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
          }`}
          title="Iron Man J.A.R.V.I.S. Arc Reactor Hologram"
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>J.A.R.V.I.S</span>
        </button>

        <button
          onClick={() => handleSelectStyle("celestial")}
          className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            waveStyle === "celestial"
              ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-md shadow-amber-500/20"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
          }`}
          title="Celestial Aura Bloom - Living starlight ribbons"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Celestial</span>
        </button>

        <button
          onClick={() => handleSelectStyle("quantum")}
          className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            waveStyle === "quantum"
              ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-md shadow-amber-500/20"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
          }`}
          title="Quantum Spectrum - Studio equalizers"
        >
          <Waves className="w-3.5 h-3.5" />
          <span>Quantum</span>
        </button>
      </div>

      {/* Center Visualizer Canvas */}
      <div className="flex-1 flex flex-col items-center justify-center relative min-h-[220px] max-h-[360px] w-full">
        <canvas
          ref={canvasRef}
          className="w-full h-full block rounded-3xl"
          style={{ width: "100%", height: "100%" }}
        />

        {/* Floating Mode HUD Tag */}
        <div className="absolute top-2 right-4 px-2.5 py-0.5 rounded-full bg-black/60 border border-amber-500/30 text-[10px] font-mono text-amber-300 backdrop-blur-md">
          {waveStyle === "jarvis" && "⚡ J.A.R.V.I.S HUD 1.0"}
          {waveStyle === "celestial" && "✨ CELESTIAL AURA"}
          {waveStyle === "quantum" && "🌊 QUANTUM SPECTRUM"}
        </div>
      </div>

      {/* Live Conversation State Text & Subtitle Caption */}
      <div className="text-center space-y-1 z-10 px-4 shrink-0 my-1">
        <div className="text-base font-extrabold text-amber-300 flex items-center justify-center gap-2">
          <span>
            {isSpeaking
              ? "j TEC is speaking..."
              : isListening
              ? "Listening to you..."
              : voiceState === "thinking"
              ? "j TEC is thinking..."
              : "j TEC is ready"}
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              isSpeaking
                ? "bg-amber-400 animate-ping"
                : isListening
                ? "bg-emerald-400 animate-ping"
                : "bg-zinc-600"
            }`}
          />
        </div>
        <p className="text-xs text-zinc-300 font-medium min-h-[2.5rem] flex items-center justify-center line-clamp-2 px-2 bg-black/40 py-1.5 rounded-xl border border-zinc-800/80">
          {interimTranscript ? (
            <span className="text-amber-200">"{interimTranscript}"</span>
          ) : lastAiTranscript ? (
            <span className="text-zinc-200">"{lastAiTranscript}"</span>
          ) : (
            <span className="text-zinc-500">Speak naturally, bro. j TEC is listening...</span>
          )}
        </p>
      </div>

      {/* Floating Action Controls */}
      <div className="space-y-3 z-10 pb-2 shrink-0">
        <div className="flex items-center justify-center gap-6">
          {/* Mute Button */}
          <button
            onClick={onToggleMute}
            className={`w-13 h-13 rounded-2xl flex items-center justify-center transition shadow-lg ${
              isMuted
                ? "bg-amber-500/20 border border-amber-400 text-amber-300"
                : "bg-[#181822] border border-zinc-800 text-zinc-300 hover:text-white"
            }`}
            title={isMuted ? "Unmute mic" : "Mute mic"}
            aria-label="Toggle mute"
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* End Call Button (Big Red Icon) */}
          <button
            onClick={onEndCall}
            className="w-16 h-16 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.5)] hover:scale-105 active:scale-95 transition"
            title="End Conversation"
            aria-label="End conversation"
          >
            <PhoneOff className="w-7 h-7 stroke-[2.5]" />
          </button>

          {/* Speaker / Settings button */}
          <button
            onClick={onOpenSettings}
            className="w-13 h-13 rounded-2xl bg-[#181822] border border-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition shadow-lg"
            title="Voice & Output Settings"
            aria-label="Voice settings"
          >
            <Volume2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
