// Audio Cache & Playback Manager for Sana
// Caches synthesized speech audio so tokens are only used ONCE per message.
// Supports native Play, Pause, Resume, Seeking, and persistent IndexedDB storage.
// Strictly prevents overlapping dual-audio voices and ensures instant, error-free loading.

export interface AudioPlaybackState {
  messageId: string;
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  progress: number; // 0 to 1
  hasCachedAudio: boolean;
}

type AudioStateListener = (state: AudioPlaybackState) => void;

interface StoredAudioRecord {
  id: string;
  blob: Blob;
  duration: number;
  savedAt: number;
}

class AudioCacheManager {
  private memoryBlobUrls = new Map<string, { blobUrl: string; duration: number }>();
  private activeAudio: HTMLAudioElement | null = null;
  private currentPlayingId: string | null = null;
  private loadingId: string | null = null;
  private loadTimeout: any = null;
  private fadeInterval: any = null;
  private listeners = new Set<AudioStateListener>();
  private idb: IDBDatabase | null = null;
  private idbReady: Promise<void>;
  private audioEngine: { stopPlayback: () => void; fadeOutPlayback?: (durationMs?: number) => Promise<void> } | null = null;

  constructor() {
    this.idbReady = this.initIndexedDB();
  }

  // Register AudioEngine to ensure only ONE sound source ever plays at any time
  public registerAudioEngine(
    engine: { stopPlayback: () => void; fadeOutPlayback?: (durationMs?: number) => Promise<void> } | null
  ): void {
    this.audioEngine = engine;
  }

  // Initialize browser IndexedDB for permanent token-free audio persistence
  private async initIndexedDB(): Promise<void> {
    if (typeof window === "undefined" || !("indexedDB" in window)) return;

    return new Promise((resolve) => {
      try {
        const req = indexedDB.open("jtec_audio_vault_v2", 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains("audio_blobs")) {
            db.createObjectStore("audio_blobs", { keyPath: "id" });
          }
        };
        req.onsuccess = () => {
          this.idb = req.result;
          resolve();
        };
        req.onerror = () => {
          resolve();
        };
      } catch {
        resolve();
      }
    });
  }

  // Convert raw base64 PCM 24kHz to a standard, downloadable & playable WAV Blob URL
  public pcmBase64ToWavBlob(base64Pcm: string, sampleRate = 24000): Blob {
    const binaryString = atob(base64Pcm);
    const len = binaryString.length;
    const pcmBytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      pcmBytes[i] = binaryString.charCodeAt(i);
    }

    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const dataSize = pcmBytes.length;
    const headerSize = 44;
    const totalSize = headerSize + dataSize;

    const wavBuffer = new ArrayBuffer(totalSize);
    const view = new DataView(wavBuffer);

    // "RIFF"
    view.setUint8(0, 0x52); view.setUint8(1, 0x49); view.setUint8(2, 0x46); view.setUint8(3, 0x46);
    view.setUint32(4, 36 + dataSize, true);
    // "WAVE"
    view.setUint8(8, 0x57); view.setUint8(9, 0x41); view.setUint8(10, 0x56); view.setUint8(11, 0x45);
    // "fmt "
    view.setUint8(12, 0x66); view.setUint8(13, 0x6d); view.setUint8(14, 0x74); view.setUint8(15, 0x20);
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    // "data"
    view.setUint8(36, 0x64); view.setUint8(37, 0x61); view.setUint8(38, 0x74); view.setUint8(39, 0x61);
    view.setUint32(40, dataSize, true);

    new Uint8Array(wavBuffer, 44).set(pcmBytes);
    return new Blob([wavBuffer], { type: "audio/wav" });
  }

  public pcmBase64ToWavBlobUrl(base64Pcm: string, sampleRate = 24000): string {
    const blob = this.pcmBase64ToWavBlob(base64Pcm, sampleRate);
    return URL.createObjectURL(blob);
  }

  // Convert Data URI to lightweight browser Blob URL to prevent memory leaks and parsing stalls
  public dataUriToBlob(dataUri: string): Blob {
    try {
      const parts = dataUri.split(",");
      const mime = parts[0].match(/:(.*?);/)?.[1] || "audio/wav";
      const binary = atob(parts[1]);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new Blob([bytes], { type: mime });
    } catch {
      return new Blob([], { type: "audio/wav" });
    }
  }

  // Check if audio exists in memory or IndexedDB
  public async has(messageId: string): Promise<boolean> {
    if (this.memoryBlobUrls.has(messageId)) return true;
    await this.idbReady;
    if (!this.idb) return false;

    return new Promise((resolve) => {
      try {
        const tx = this.idb!.transaction("audio_blobs", "readonly");
        const store = tx.objectStore("audio_blobs");
        const req = store.get(messageId);
        req.onsuccess = () => resolve(!!req.result);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  // Retrieve cached audio Blob URL
  public async getAudioUrl(messageId: string): Promise<string | null> {
    const memory = this.memoryBlobUrls.get(messageId);
    if (memory) return memory.blobUrl;

    await this.idbReady;
    if (!this.idb) return null;

    return new Promise((resolve) => {
      try {
        const tx = this.idb!.transaction("audio_blobs", "readonly");
        const store = tx.objectStore("audio_blobs");
        const req = store.get(messageId);
        req.onsuccess = () => {
          if (req.result && req.result.blob) {
            const blobUrl = URL.createObjectURL(req.result.blob);
            this.memoryBlobUrls.set(messageId, {
              blobUrl,
              duration: req.result.duration || 0,
            });
            resolve(blobUrl);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  private inFlightPrefetches = new Map<string, Promise<string | null>>();

  // Lookahead Pre-fetch: Initiates audio synthesis in the background before text stream completes
  public async prefetchAudio(messageId: string, textToSynthesize: string, voice = "Zephyr"): Promise<string | null> {
    if (!textToSynthesize || !textToSynthesize.trim()) return null;

    // Check if already in memory cache or indexedDB
    const cached = await this.getAudioUrl(messageId);
    if (cached) return cached;

    // Check if a prefetch is already in-flight for this message
    const inFlight = this.inFlightPrefetches.get(messageId);
    if (inFlight) return inFlight;

    const promise = (async () => {
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: textToSynthesize,
            voice,
          }),
        });

        if (!res.ok) return null;
        const data = await res.json();
        let blobUrl: string | null = null;

        if (data.audioUrl) {
          const blob = this.dataUriToBlob(data.audioUrl);
          blobUrl = await this.setAudioBlob(messageId, blob);
        } else if (data.audio) {
          const blob = this.pcmBase64ToWavBlob(data.audio);
          blobUrl = await this.setAudioBlob(messageId, blob);
        }

        if (blobUrl) {
          // Warm up browser audio decoder ahead of time
          const warmer = new Audio();
          warmer.preload = "auto";
          warmer.src = blobUrl;
          this.broadcastState();
        }

        return blobUrl;
      } catch (err) {
        console.warn("[AudioCache] Lookahead prefetch failed:", err);
        return null;
      } finally {
        this.inFlightPrefetches.delete(messageId);
      }
    })();

    this.inFlightPrefetches.set(messageId, promise);
    return promise;
  }

  // Store audio Blob in cache
  public async setAudioBlob(messageId: string, blob: Blob, duration = 0): Promise<string> {
    const blobUrl = URL.createObjectURL(blob);
    this.memoryBlobUrls.set(messageId, { blobUrl, duration });

    await this.idbReady;
    if (this.idb) {
      try {
        const tx = this.idb.transaction("audio_blobs", "readwrite");
        const store = tx.objectStore("audio_blobs");
        const record: StoredAudioRecord = {
          id: messageId,
          blob,
          duration,
          savedAt: Date.now(),
        };
        store.put(record);
      } catch (e) {
        console.warn("[AudioCache] Failed to store in IndexedDB:", e);
      }
    }
    return blobUrl;
  }

  // Store raw string / dataUri in cache
  public async setAudioUrl(messageId: string, urlOrDataUri: string, duration = 0): Promise<void> {
    let blob: Blob;
    if (urlOrDataUri.startsWith("data:")) {
      blob = this.dataUriToBlob(urlOrDataUri);
    } else if (urlOrDataUri.startsWith("blob:")) {
      this.memoryBlobUrls.set(messageId, { blobUrl: urlOrDataUri, duration });
      return;
    } else {
      blob = this.pcmBase64ToWavBlob(urlOrDataUri);
    }
    await this.setAudioBlob(messageId, blob, duration);
  }

  // Main playback controls: Play / Pause / Resume
  public async togglePlay(messageId: string, textToSynthesize: string, voice = "Zephyr"): Promise<void> {
    // Case 1: If THIS message is currently playing -> PAUSE IT
    if (this.currentPlayingId === messageId && this.activeAudio && !this.activeAudio.paused) {
      this.activeAudio.pause();
      this.broadcastState();
      return;
    }

    // Case 2: If THIS message is currently paused -> RESUME IT (Zero network, Zero tokens)
    if (this.currentPlayingId === messageId && this.activeAudio && this.activeAudio.paused) {
      // Guarantee no other audio engine or speech synthesis is talking
      if (this.audioEngine) this.audioEngine.stopPlayback();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try { window.speechSynthesis.cancel(); } catch (_) {}
      }

      try {
        await this.activeAudio.play();
        this.broadcastState();
      } catch (e) {
        console.warn("[AudioCache] Resume play failed:", e);
        this.stopAnyPlayback();
      }
      return;
    }

    // Case 3: Start playback on a message
    // IMMEDIATELY kill ANY other audio playing anywhere (prevents simultaneous overlapping voices)
    this.stopAnyPlayback();

    this.loadingId = messageId;
    this.currentPlayingId = messageId;
    this.broadcastState();

    // Safeguard timeout: never allow infinite loading state
    if (this.loadTimeout) clearTimeout(this.loadTimeout);
    this.loadTimeout = setTimeout(() => {
      if (this.loadingId === messageId) {
        console.warn("[AudioCache] Loading timed out, resetting");
        this.loadingId = null;
        this.broadcastState();
      }
    }, 12000);

    try {
      // 1. Check local cache (0 Tokens!)
      let blobUrl = await this.getAudioUrl(messageId);

      // 1.5. If in-flight lookahead prefetch is currently running, wait for it
      if (!blobUrl && this.inFlightPrefetches.has(messageId)) {
        blobUrl = await this.inFlightPrefetches.get(messageId)!;
      }

      // 2. If not cached, prefetch and cache audio
      if (!blobUrl) {
        blobUrl = await this.prefetchAudio(messageId, textToSynthesize, voice);
      }

      if (!blobUrl) {
        throw new Error("Unable to construct audio stream");
      }

      // 3. Make extra sure background engine is stopped right before preparing
      if (this.audioEngine) this.audioEngine.stopPlayback();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try { window.speechSynthesis.cancel(); } catch (_) {}
      }

      // 4. Instantiate HTML5 Audio and pre-buffer completely before playing
      const audio = new Audio();
      audio.preload = "auto";
      audio.src = blobUrl;
      this.activeAudio = audio;
      this.currentPlayingId = messageId;

      // Attach state callbacks
      audio.onloadedmetadata = () => {
        const cached = this.memoryBlobUrls.get(messageId);
        if (cached && audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
          cached.duration = audio.duration;
        }
        this.broadcastState();
      };

      audio.ontimeupdate = () => {
        this.broadcastState();
      };

      audio.onended = () => {
        if (this.currentPlayingId === messageId) {
          this.activeAudio = null;
          this.broadcastState();
        }
      };

      audio.onerror = () => {
        console.warn("[AudioCache] Audio playback error, stopping");
        this.stopAnyPlayback();
      };

      // 5. Pre-buffer: Wait until audio is fully loaded into memory (NO GLITCHING)
      await new Promise<void>((resolve) => {
        // If already buffered enough data to play smoothly through
        if (audio.readyState >= 4) {
          resolve();
          return;
        }

        let resolved = false;
        const done = () => {
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve();
          }
        };

        const cleanup = () => {
          audio.removeEventListener("canplaythrough", done);
          audio.removeEventListener("canplay", done);
          audio.removeEventListener("loadeddata", done);
        };

        audio.addEventListener("canplaythrough", done, { once: true });
        audio.addEventListener("canplay", done, { once: true });
        audio.addEventListener("loadeddata", done, { once: true });

        // Trigger load
        try {
          audio.load();
        } catch (_) {}

        // Safety timeout so UI never hangs if event already fired
        setTimeout(done, 1500);
      });

      // Update cached duration immediately if available
      if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
        const cached = this.memoryBlobUrls.get(messageId);
        if (cached) {
          cached.duration = audio.duration;
        }
      }

      // Clear loading indicator now that audio is 100% loaded and ready to play
      this.loadingId = null;
      if (this.loadTimeout) clearTimeout(this.loadTimeout);

      // Start pristine, glitch-free audio playback
      await audio.play();
      this.broadcastState();
    } catch (err: any) {
      console.warn("[AudioCache] Failed to load/play audio:", err?.message || err);
      this.loadingId = null;
      if (this.loadTimeout) clearTimeout(this.loadTimeout);
      this.stopAnyPlayback();
    }
  }

  // Seek within the active audio
  public seek(messageId: string, timeSec: number): void {
    if (this.currentPlayingId === messageId && this.activeAudio) {
      this.activeAudio.currentTime = Math.max(0, Math.min(timeSec, this.activeAudio.duration || 0));
      this.broadcastState();
    }
  }

  // Soft fade-out for currently playing audio across all systems
  public async fadeOutAndStop(durationMs = 240): Promise<void> {
    if (this.loadTimeout) {
      clearTimeout(this.loadTimeout);
      this.loadTimeout = null;
    }
    this.loadingId = null;

    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }

    const audioToFade = this.activeAudio;
    const prevId = this.currentPlayingId;

    // 1. Soft fade HTML5 Audio element if actively playing
    if (audioToFade && !audioToFade.paused && audioToFade.volume > 0) {
      const initialVolume = audioToFade.volume;
      const steps = 12;
      const stepDuration = Math.max(10, Math.floor(durationMs / steps));
      let currentStep = 0;

      await new Promise<void>((resolve) => {
        this.fadeInterval = setInterval(() => {
          currentStep++;
          const progress = currentStep / steps;
          if (progress >= 1 || !audioToFade) {
            if (this.fadeInterval) {
              clearInterval(this.fadeInterval);
              this.fadeInterval = null;
            }
            try {
              audioToFade.volume = 0;
              audioToFade.pause();
              audioToFade.currentTime = 0;
              audioToFade.volume = 1; // Reset volume for subsequent playback
            } catch (_) {}
            resolve();
          } else {
            try {
              // Smooth quadratic decay curve for natural volume attenuation
              const factor = 1 - progress;
              audioToFade.volume = Math.max(0, Math.min(1, initialVolume * factor * factor));
            } catch (_) {
              if (this.fadeInterval) {
                clearInterval(this.fadeInterval);
                this.fadeInterval = null;
              }
              resolve();
            }
          }
        }, stepDuration);
      });

      if (this.activeAudio === audioToFade) {
        this.activeAudio = null;
      }
    } else if (audioToFade) {
      try {
        audioToFade.pause();
        audioToFade.currentTime = 0;
      } catch (_) {}
      this.activeAudio = null;
    }

    // 2. Soft fade AudioEngine PCM stream
    if (this.audioEngine) {
      try {
        if (typeof this.audioEngine.fadeOutPlayback === "function") {
          await this.audioEngine.fadeOutPlayback(durationMs);
        } else {
          this.audioEngine.stopPlayback();
        }
      } catch (_) {}
    }

    // 3. Cancel browser speech synthesis if active
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }

    this.currentPlayingId = null;
    if (prevId) {
      this.notifyState(this.getState(prevId));
    }
  }

  // Stop any active playback immediately across all systems
  public stopAnyPlayback(): void {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
    if (this.loadTimeout) {
      clearTimeout(this.loadTimeout);
      this.loadTimeout = null;
    }
    this.loadingId = null;

    if (this.activeAudio) {
      try {
        this.activeAudio.pause();
        this.activeAudio.currentTime = 0;
      } catch (_) {}
      this.activeAudio = null;
    }

    if (this.audioEngine) {
      try {
        this.audioEngine.stopPlayback();
      } catch (_) {}
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }

    const prevId = this.currentPlayingId;
    this.currentPlayingId = null;
    if (prevId) {
      this.notifyState(this.getState(prevId));
    }
  }

  // Fallback to browser speech synthesis
  private playBrowserSpeech(messageId: string, text: string): void {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      this.stopAnyPlayback();
      return;
    }

    try {
      this.stopAnyPlayback();
      const clean = text.replace(/[*#_`~]/g, "").slice(0, 1000);
      const utter = new SpeechSynthesisUtterance(clean);

      this.currentPlayingId = messageId;
      this.loadingId = null;
      this.broadcastState();

      utter.onend = () => {
        this.stopAnyPlayback();
      };
      utter.onerror = () => {
        this.stopAnyPlayback();
      };

      window.speechSynthesis.speak(utter);
    } catch {
      this.stopAnyPlayback();
    }
  }

  // Inspect state for a given message
  public getState(messageId: string): AudioPlaybackState {
    const isThisActive = this.currentPlayingId === messageId;
    const isPlaying = isThisActive && !!this.activeAudio && !this.activeAudio.paused && !this.activeAudio.ended;
    const isPaused = isThisActive && !!this.activeAudio && this.activeAudio.paused && this.activeAudio.currentTime > 0 && !this.activeAudio.ended;
    const isLoading = this.loadingId === messageId;
    const duration = isThisActive && this.activeAudio ? this.activeAudio.duration || 0 : this.memoryBlobUrls.get(messageId)?.duration || 0;
    const currentTime = isThisActive && this.activeAudio ? this.activeAudio.currentTime || 0 : 0;
    const progress = duration > 0 ? currentTime / duration : 0;
    const hasCachedAudio = this.memoryBlobUrls.has(messageId);

    return {
      messageId,
      isPlaying,
      isPaused,
      isLoading,
      currentTime,
      duration,
      progress,
      hasCachedAudio,
    };
  }

  // Subscription management
  public subscribe(listener: AudioStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private broadcastState(): void {
    if (!this.currentPlayingId && !this.loadingId) return;
    const targetId = this.currentPlayingId || this.loadingId;
    if (targetId) {
      const state = this.getState(targetId);
      this.notifyState(state);
    }
  }

  private notifyState(state: AudioPlaybackState): void {
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (err) {
        console.error("[AudioCache] Listener error:", err);
      }
    }
  }
}

export const audioCache = new AudioCacheManager();
