// AuraLive Audio Engine
// Handles:
// - 16kHz PCM Microphone capture with AnalyserNode for user waveform
// - 24kHz PCM playback with gapless scheduling and AnalyserNode for AI waveform
// - Multi-language Web Speech Recognition + Gemini transcription fallback
// - Decibel / amplitude calculations for visualizers

export type VoiceState = "idle" | "listening" | "thinking" | "speaking" | "error";

export class AudioEngine {
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private micAnalyser: AnalyserNode | null = null;
  private aiAnalyser: AnalyserNode | null = null;
  private outputGainNode: GainNode | null = null;
  private fadeTimeout: any = null;
  private isFadingPlayback: boolean = false;

  // Active playing audio source nodes for cancellation on interruption
  private activeSources: AudioBufferSourceNode[] = [];
  private nextStartTime: number = 0;
  private isMuted: boolean = false;
  private isBrowserSpeaking: boolean = false;
  private browserSpeakingVolume: number = 0;
  private speechSimInterval: any = null;

  // Speech Recognition (multi-language)
  private recognition: any = null;
  private isRecognizing: boolean = false;
  private currentLanguageCode: string = "en-US";

  // Callbacks
  public onAudioChunk?: (base64Pcm16k: string) => void;
  public onUserTranscript?: (text: string, isFinal: boolean) => void;
  public onStateChange?: (state: VoiceState) => void;
  public onError?: (error: string) => void;

  constructor() {
    this.initSpeechRecognition();
  }

  // Setup multi-language Speech Recognition
  private initSpeechRecognition() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = this.currentLanguageCode;

        this.recognition.onresult = (event: any) => {
          let interim = "";
          let final = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              final += transcript;
            } else {
              interim += transcript;
            }
          }

          if (final && this.onUserTranscript) {
            this.onUserTranscript(final, true);
          } else if (interim && this.onUserTranscript) {
            this.onUserTranscript(interim, false);
          }
        };

        this.recognition.onerror = (e: any) => {
          // Ignore no-speech aborts
          if (e.error !== "no-speech" && e.error !== "aborted") {
            console.warn("[SpeechRecognition] Error:", e.error);
          }
        };

        this.recognition.onend = () => {
          if (this.isRecognizing) {
            try {
              this.recognition.start();
            } catch {
              // Ignore restart error
            }
          }
        };
      } catch (e) {
        console.warn("[SpeechRecognition] Not supported:", e);
      }
    }
  }

  public setLanguage(langCode: string) {
    this.currentLanguageCode = langCode;
    if (this.recognition) {
      this.recognition.lang = langCode;
      if (this.isRecognizing) {
        try {
          this.recognition.stop();
          setTimeout(() => {
            if (this.isRecognizing) this.recognition.start();
          }, 100);
        } catch {
          // ignore
        }
      }
    }
  }

  // Start microphone capture and input analysis
  public async startMicrophone(): Promise<boolean> {
    try {
      this.stopPlayback(); // clear any stale audio
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;

      // 16kHz for Gemini input
      this.inputAudioCtx = new AudioCtxClass({ sampleRate: 16000 });
      if (this.inputAudioCtx.state === "suspended") {
        await this.inputAudioCtx.resume();
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.micSource = this.inputAudioCtx.createMediaStreamSource(this.mediaStream);

      // Mic Analyser for Waveform
      this.micAnalyser = this.inputAudioCtx.createAnalyser();
      this.micAnalyser.fftSize = 256;
      this.micAnalyser.smoothingTimeConstant = 0.8;
      this.micSource.connect(this.micAnalyser);

      // 4096 buffer size
      this.processorNode = this.inputAudioCtx.createScriptProcessor(4096, 1, 1);
      this.micSource.connect(this.processorNode);
      this.processorNode.connect(this.inputAudioCtx.destination);

      this.processorNode.onaudioprocess = (e) => {
        if (this.isMuted) return;

        const inputData = e.inputBuffer.getChannelData(0);
        // Convert Float32 to 16-bit PCM little-endian
        const pcm16 = this.floatTo16BitPCM(inputData);
        const base64 = this.arrayBufferToBase64(pcm16.buffer);

        if (this.onAudioChunk) {
          this.onAudioChunk(base64);
        }
      };

      // Start speech recognition if supported
      if (this.recognition) {
        try {
          this.isRecognizing = true;
          this.recognition.lang = this.currentLanguageCode;
          this.recognition.start();
        } catch {
          // might be already running
        }
      }

      return true;
    } catch (err: any) {
      console.error("[AudioEngine] Error accessing microphone:", err);
      if (this.onError) {
        this.onError(err?.message || "Could not access microphone. Please allow microphone permissions.");
      }
      return false;
    }
  }

  // Stop microphone capture
  public stopMicrophone() {
    this.isRecognizing = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
    }

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }

    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    if (this.inputAudioCtx) {
      this.inputAudioCtx.close().catch(() => {});
      this.inputAudioCtx = null;
    }

    this.micAnalyser = null;
  }

  // Ensure 24kHz Audio Context for AI playback
  private ensureOutputContext() {
    if (!this.outputAudioCtx || this.outputAudioCtx.state === "closed") {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.outputAudioCtx = new AudioCtxClass({ sampleRate: 24000 });

      this.aiAnalyser = this.outputAudioCtx.createAnalyser();
      this.aiAnalyser.fftSize = 256;
      this.aiAnalyser.smoothingTimeConstant = 0.8;

      this.outputGainNode = this.outputAudioCtx.createGain();
      this.outputGainNode.gain.setValueAtTime(1.0, this.outputAudioCtx.currentTime);

      this.aiAnalyser.connect(this.outputGainNode);
      this.outputGainNode.connect(this.outputAudioCtx.destination);
    }
  }

  // Queue and play 24kHz raw PCM chunk
  public async playPcm24kChunk(base64Pcm: string) {
    try {
      this.ensureOutputContext();
      if (!this.outputAudioCtx || !this.aiAnalyser) return;

      if (this.outputAudioCtx.state === "suspended") {
        await this.outputAudioCtx.resume();
      }

      // Restore gain to 1.0 immediately if a previous fade-out was in progress
      if (this.fadeTimeout) {
        clearTimeout(this.fadeTimeout);
        this.fadeTimeout = null;
      }
      this.isFadingPlayback = false;
      if (this.outputGainNode) {
        try {
          this.outputGainNode.gain.cancelScheduledValues(this.outputAudioCtx.currentTime);
          this.outputGainNode.gain.setValueAtTime(1.0, this.outputAudioCtx.currentTime);
        } catch (_) {}
      }

      // Convert base64 to Float32Array at 24kHz
      const binaryString = atob(base64Pcm);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioBuffer = this.outputAudioCtx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      const sourceNode = this.outputAudioCtx.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(this.aiAnalyser);

      const currentTime = this.outputAudioCtx.currentTime;
      // Schedule gaplessly
      const startTime = Math.max(currentTime, this.nextStartTime);
      sourceNode.start(startTime);
      this.nextStartTime = startTime + audioBuffer.duration;

      this.activeSources.push(sourceNode);
      sourceNode.onended = () => {
        const idx = this.activeSources.indexOf(sourceNode);
        if (idx !== -1) {
          this.activeSources.splice(idx, 1);
        }
      };

      return audioBuffer.duration;
    } catch (e) {
      console.error("[AudioEngine] Error playing PCM chunk:", e);
      return 0;
    }
  }

  // Seamless browser speech synthesis fallback when API quota is exhausted
  public speakWithBrowser(
    text: string,
    voiceName = "Zephyr",
    langCode = "en-US",
    onEnd?: () => void
  ) {
    if (!("speechSynthesis" in window)) {
      if (onEnd) onEnd();
      return;
    }

    try {
      this.stopPlayback();

      // Clean markdown tags for spoken text
      const cleanText = text
        .replace(/```[\s\S]*?```/g, "Code snippet.")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/[*#_~]/g, "")
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = langCode;

      // Map voice persona to pitch and speech rate
      if (voiceName === "Puck") {
        utterance.pitch = 1.15;
        utterance.rate = 1.1;
      } else if (voiceName === "Charon") {
        utterance.pitch = 0.8;
        utterance.rate = 0.95;
      } else if (voiceName === "Kore") {
        utterance.pitch = 1.05;
        utterance.rate = 1.0;
      } else if (voiceName === "Fenrir") {
        utterance.pitch = 0.9;
        utterance.rate = 1.05;
      } else {
        utterance.pitch = 1.0;
        utterance.rate = 1.05;
      }

      // Try selecting matching voice if voices loaded
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices && availableVoices.length > 0) {
        const langPrefix = langCode.split("-")[0];
        const match = availableVoices.find(
          (v) => v.lang === langCode || v.lang.startsWith(langPrefix)
        );
        if (match) utterance.voice = match;
      }

      this.isBrowserSpeaking = true;
      this.browserSpeakingVolume = 0.45;

      // Modulate volume for visualizer
      if (this.speechSimInterval) clearInterval(this.speechSimInterval);
      this.speechSimInterval = setInterval(() => {
        if (!this.isBrowserSpeaking) {
          clearInterval(this.speechSimInterval);
          return;
        }
        this.browserSpeakingVolume = 0.35 + Math.random() * 0.35;
      }, 80);

      utterance.onend = () => {
        this.isBrowserSpeaking = false;
        this.browserSpeakingVolume = 0;
        clearInterval(this.speechSimInterval);
        if (onEnd) onEnd();
      };

      utterance.onerror = () => {
        this.isBrowserSpeaking = false;
        this.browserSpeakingVolume = 0;
        clearInterval(this.speechSimInterval);
        if (onEnd) onEnd();
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("[AudioEngine] Browser speech synthesis error:", err);
      this.isBrowserSpeaking = false;
      this.browserSpeakingVolume = 0;
      if (onEnd) onEnd();
    }
  }

  // Interruption with natural soft-fade out
  public async fadeOutPlayback(durationMs = 240): Promise<void> {
    if (this.fadeTimeout) {
      clearTimeout(this.fadeTimeout);
      this.fadeTimeout = null;
    }

    // Cancel browser speech synthesis if active
    if ("speechSynthesis" in window && this.isBrowserSpeaking) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
      this.isBrowserSpeaking = false;
      this.browserSpeakingVolume = 0;
      if (this.speechSimInterval) {
        clearInterval(this.speechSimInterval);
        this.speechSimInterval = null;
      }
    }

    if (this.outputAudioCtx && this.outputGainNode && this.activeSources.length > 0) {
      this.isFadingPlayback = true;
      const now = this.outputAudioCtx.currentTime;
      const fadeSec = Math.max(0.04, durationMs / 1000);

      try {
        this.outputGainNode.gain.cancelScheduledValues(now);
        this.outputGainNode.gain.setValueAtTime(this.outputGainNode.gain.value, now);
        this.outputGainNode.gain.linearRampToValueAtTime(0.0001, now + fadeSec);
      } catch (e) {
        console.warn("[AudioEngine] Error scheduling gain ramp:", e);
      }

      await new Promise<void>((resolve) => {
        this.fadeTimeout = setTimeout(() => {
          this.fadeTimeout = null;
          this.stopPlayback();
          resolve();
        }, durationMs);
      });
    } else {
      this.stopPlayback();
    }
  }

  // Interruption: immediate stop and cancel of queued playback
  public stopPlayback() {
    if (this.fadeTimeout) {
      clearTimeout(this.fadeTimeout);
      this.fadeTimeout = null;
    }
    this.isFadingPlayback = false;

    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    this.isBrowserSpeaking = false;
    this.browserSpeakingVolume = 0;
    if (this.speechSimInterval) {
      clearInterval(this.speechSimInterval);
      this.speechSimInterval = null;
    }

    // Reset gain node back to 1.0 for future playback
    if (this.outputGainNode && this.outputAudioCtx) {
      try {
        this.outputGainNode.gain.cancelScheduledValues(this.outputAudioCtx.currentTime);
        this.outputGainNode.gain.setValueAtTime(1.0, this.outputAudioCtx.currentTime);
      } catch (_) {}
    }

    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // ignore already stopped
      }
    }
    this.activeSources = [];
    if (this.outputAudioCtx) {
      this.nextStartTime = this.outputAudioCtx.currentTime;
    } else {
      this.nextStartTime = 0;
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  // Visualizer data methods
  public getMicWaveformData(targetArray: Uint8Array): void {
    if (this.micAnalyser && !this.isMuted) {
      this.micAnalyser.getByteTimeDomainData(targetArray as any);
    } else {
      targetArray.fill(128);
    }
  }

  public getMicFrequencyData(targetArray: Uint8Array): void {
    if (this.micAnalyser && !this.isMuted) {
      this.micAnalyser.getByteFrequencyData(targetArray as any);
    } else {
      targetArray.fill(0);
    }
  }

  public getAiWaveformData(targetArray: Uint8Array): void {
    if (this.aiAnalyser && this.activeSources.length > 0) {
      this.aiAnalyser.getByteTimeDomainData(targetArray as any);
    } else if (this.isBrowserSpeaking) {
      // Synthesize responsive oscillating wave for visualizer
      const t = Date.now() * 0.01;
      const amp = this.browserSpeakingVolume * 50;
      for (let i = 0; i < targetArray.length; i++) {
        targetArray[i] = 128 + Math.sin(i * 0.2 + t) * amp;
      }
    } else {
      targetArray.fill(128);
    }
  }

  public getAiFrequencyData(targetArray: Uint8Array): void {
    if (this.aiAnalyser && this.activeSources.length > 0) {
      this.aiAnalyser.getByteFrequencyData(targetArray as any);
    } else if (this.isBrowserSpeaking) {
      const base = Math.floor(this.browserSpeakingVolume * 220);
      for (let i = 0; i < targetArray.length; i++) {
        targetArray[i] = Math.max(0, Math.floor(base * Math.sin((i / targetArray.length) * Math.PI)));
      }
    } else {
      targetArray.fill(0);
    }
  }

  public getMicVolume(): number {
    if (!this.micAnalyser || this.isMuted) return 0;
    const array = new Uint8Array(this.micAnalyser.frequencyBinCount);
    this.micAnalyser.getByteFrequencyData(array as any);
    let sum = 0;
    for (let i = 0; i < array.length; i++) {
      sum += array[i];
    }
    return sum / (array.length * 255);
  }

  public getAiVolume(): number {
    if (this.isBrowserSpeaking) {
      return this.browserSpeakingVolume;
    }
    if (!this.aiAnalyser || this.activeSources.length === 0) return 0;
    const array = new Uint8Array(this.aiAnalyser.frequencyBinCount);
    this.aiAnalyser.getByteFrequencyData(array as any);
    let sum = 0;
    for (let i = 0; i < array.length; i++) {
      sum += array[i];
    }
    return sum / (array.length * 255);
  }

  // Format conversions
  private floatTo16BitPCM(input: Float32Array): Int16Array {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return output;
  }

  private arrayBufferToBase64(buffer: ArrayBufferLike): string {
    let binary = "";
    const bytes = new Uint8Array(buffer as ArrayBuffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  public destroy() {
    this.stopMicrophone();
    this.stopPlayback();
    if (this.outputAudioCtx) {
      this.outputAudioCtx.close().catch(() => {});
      this.outputAudioCtx = null;
    }
  }
}
