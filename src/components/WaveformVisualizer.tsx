import React, { useEffect, useRef, useState } from "react";
import { AudioEngine } from "../services/audioEngine";
import { Activity, Mic, Volume2, Waves } from "lucide-react";

interface WaveformVisualizerProps {
  audioEngine: AudioEngine | null;
  isActive: boolean;
  voiceState: "idle" | "listening" | "thinking" | "speaking" | "error";
  mode?: "waveform" | "spectrum" | "orb";
  height?: number;
  showMeter?: boolean;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  audioEngine,
  isActive,
  voiceState,
  mode = "waveform",
  height = 96,
  showMeter = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const [decibels, setDecibels] = useState<number>(-60);
  const [volumePercent, setVolumePercent] = useState<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const fftSize = 128;
    const userTimeDomain = new Uint8Array(fftSize);
    const userFreq = new Uint8Array(fftSize);
    const aiTimeDomain = new Uint8Array(fftSize);
    const aiFreq = new Uint8Array(fftSize);

    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, width, h);

      if (!audioEngine || !isActive) {
        // Draw elegant idle baseline
        ctx.beginPath();
        ctx.strokeStyle = "rgba(156, 163, 175, 0.25)";
        ctx.lineWidth = 2;
        ctx.moveTo(0, h / 2);
        ctx.lineTo(width, h / 2);
        ctx.stroke();

        setDecibels(-60);
        setVolumePercent(0);
        animationFrameId.current = requestAnimationFrame(render);
        return;
      }

      // Collect audio data
      audioEngine.getMicWaveformData(userTimeDomain);
      audioEngine.getMicFrequencyData(userFreq);
      audioEngine.getAiWaveformData(aiTimeDomain);
      audioEngine.getAiFrequencyData(aiFreq);

      const micVol = audioEngine.getMicVolume();
      const aiVol = audioEngine.getAiVolume();
      const currentVol = Math.max(micVol, aiVol);

      // Decibel approximation
      const db = currentVol > 0.001 ? Math.round(20 * Math.log10(currentVol)) : -60;
      setDecibels(Math.max(-60, db));
      setVolumePercent(Math.min(100, Math.round(currentVol * 180)));

      phase += 0.08;

      if (mode === "spectrum") {
        // Frequency bars visualizer
        const barCount = 48;
        const barWidth = width / barCount - 2;
        const isSpeaking = voiceState === "speaking" && aiVol > 0.02;

        for (let i = 0; i < barCount; i++) {
          const index = Math.floor((i / barCount) * (fftSize / 2));
          const val = isSpeaking ? aiFreq[index] : userFreq[index];
          const barHeight = Math.max(4, (val / 255) * (h - 8));
          const x = i * (barWidth + 2);
          const y = h - barHeight;

          // Gradient
          const gradient = ctx.createLinearGradient(0, h, 0, 0);
          if (isSpeaking) {
            gradient.addColorStop(0, "#0284c7");
            gradient.addColorStop(0.5, "#38bdf8");
            gradient.addColorStop(1, "#bae6fd");
          } else {
            gradient.addColorStop(0, "#059669");
            gradient.addColorStop(0.5, "#10b981");
            gradient.addColorStop(1, "#6ee7b7");
          }

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 3);
          ctx.fill();
        }
      } else if (mode === "orb") {
        // Circular voice visualizer centered
        const centerX = width / 2;
        const centerY = h / 2;
        const baseRadius = Math.min(centerX, centerY) * 0.45;
        const dynamicRadius = baseRadius + currentVol * 45;

        // Outer glow
        const glowGrad = ctx.createRadialGradient(
          centerX,
          centerY,
          baseRadius * 0.5,
          centerX,
          centerY,
          dynamicRadius + 20
        );
        if (voiceState === "speaking") {
          glowGrad.addColorStop(0, "rgba(56, 189, 248, 0.8)");
          glowGrad.addColorStop(0.7, "rgba(56, 189, 248, 0.2)");
          glowGrad.addColorStop(1, "rgba(56, 189, 248, 0)");
        } else if (voiceState === "listening") {
          glowGrad.addColorStop(0, "rgba(16, 185, 129, 0.8)");
          glowGrad.addColorStop(0.7, "rgba(16, 185, 129, 0.2)");
          glowGrad.addColorStop(1, "rgba(16, 185, 129, 0)");
        } else {
          glowGrad.addColorStop(0, "rgba(168, 85, 247, 0.6)");
          glowGrad.addColorStop(1, "rgba(168, 85, 247, 0)");
        }

        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, dynamicRadius + 20, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing rings
        ctx.lineWidth = 3;
        ctx.strokeStyle = voiceState === "speaking" ? "#38bdf8" : "#10b981";
        ctx.beginPath();
        ctx.arc(centerX, centerY, dynamicRadius, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Continuous smooth live waveform
        const isAiSpeaking = voiceState === "speaking" && aiVol > 0.01;
        const timeData = isAiSpeaking ? aiTimeDomain : userTimeDomain;
        const color = isAiSpeaking ? "#38bdf8" : "#10b981";
        const glowColor = isAiSpeaking
          ? "rgba(56, 189, 248, 0.35)"
          : "rgba(16, 185, 129, 0.35)";

        // Waveform path
        ctx.lineWidth = 3;
        ctx.strokeStyle = color;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 12;

        ctx.beginPath();
        const sliceWidth = width / fftSize;
        let x = 0;

        for (let i = 0; i < fftSize; i++) {
          const v = timeData[i] / 128.0;
          // Apply gentle sine modulation for organic fluidity
          const ripple = Math.sin(i * 0.15 + phase) * (currentVol * 15);
          const y = (v * h) / 2 + ripple;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.lineTo(width, h / 2);
        ctx.stroke();

        // Secondary subtle harmonic wave
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = isAiSpeaking ? "rgba(56, 189, 248, 0.5)" : "rgba(16, 185, 129, 0.5)";
        ctx.shadowBlur = 0;
        ctx.beginPath();
        x = 0;
        for (let i = 0; i < fftSize; i++) {
          const v = timeData[i] / 128.0;
          const ripple = Math.cos(i * 0.15 - phase) * (currentVol * 22);
          const y = (v * h) / 2 + ripple;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();
      }

      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [audioEngine, isActive, voiceState, mode, height]);

  return (
    <div className="relative w-full rounded-2xl border border-zinc-700/60 bg-zinc-950/80 backdrop-blur-md p-4 shadow-xl overflow-hidden transition-all">
      {/* Visualizer header & status indicators */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {voiceState === "speaking" ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-semibold uppercase tracking-wider">
              <Volume2 className="w-3.5 h-3.5 animate-pulse" />
              <span>Sana Speaking</span>
            </div>
          ) : voiceState === "listening" ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-semibold uppercase tracking-wider">
              <Mic className="w-3.5 h-3.5 animate-pulse" />
              <span>Listening to You</span>
            </div>
          ) : voiceState === "thinking" ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-semibold uppercase tracking-wider">
              <Activity className="w-3.5 h-3.5 animate-spin" />
              <span>Processing...</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 text-xs font-medium">
              <Waves className="w-3.5 h-3.5" />
              <span>Audio Ready</span>
            </div>
          )}
        </div>

        {/* Real-time Decibel / Activity meter for accessibility */}
        {showMeter && (
          <div className="flex items-center gap-3 text-xs font-mono text-zinc-400">
            <span className="hidden sm:inline">Activity:</span>
            <div className="flex items-center gap-1">
              <div
                className={`h-2 w-8 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700`}
              >
                <div
                  className={`h-full transition-all duration-75 ${
                    voiceState === "speaking"
                      ? "bg-sky-400"
                      : volumePercent > 20
                      ? "bg-emerald-400"
                      : "bg-zinc-600"
                  }`}
                  style={{ width: `${volumePercent}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-zinc-300 w-12 text-right">
                {decibels > -60 ? `${decibels} dB` : "Silent"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* HTML5 Canvas Rendering */}
      <canvas
        ref={canvasRef}
        width={640}
        height={height}
        className="w-full h-auto block rounded-lg bg-black/40 border border-zinc-800/80"
        style={{ height: `${height}px` }}
        aria-label="Real-time voice audio activity visualizer"
      />
    </div>
  );
};
