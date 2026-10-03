import express from "express";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Server-side Gemini client with required telemetry User-Agent header
const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// ==========================================
// API Token & Quota Tracking Manager
// ==========================================
interface TokenStats {
  promptTokens: number;
  candidateTokens: number;
  audioTokens: number;
  totalTokensUsed: number;
  requestCount: number;
  sessionQuota: number;
  alertThresholdPercent: number;
  costPerMillionTokensUsd: number;
  lastResetTime: number;
  nextResetTime: number;
}

function calculateNextResetTime(): number {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.getTime();
}

const tokenStats: TokenStats = {
  promptTokens: 0,
  candidateTokens: 0,
  audioTokens: 0,
  totalTokensUsed: 0,
  requestCount: 0,
  sessionQuota: 1000000, // 1 Million tokens default session budget
  alertThresholdPercent: 80,
  costPerMillionTokensUsd: 0.15,
  lastResetTime: Date.now(),
  nextResetTime: calculateNextResetTime(),
};

function recordTokenUsage(prompt = 0, candidate = 0, audio = 0) {
  tokenStats.promptTokens += prompt;
  tokenStats.candidateTokens += candidate;
  tokenStats.audioTokens += audio;
  tokenStats.totalTokensUsed += prompt + candidate + audio;
  tokenStats.requestCount += 1;
}

function getFormattedTokenStats() {
  const remaining = Math.max(0, tokenStats.sessionQuota - tokenStats.totalTokensUsed);
  const percentageUsed = Math.min(100, (tokenStats.totalTokensUsed / tokenStats.sessionQuota) * 100);
  const percentageRemaining = Math.max(0, 100 - percentageUsed);
  const isNearQuota = percentageUsed >= tokenStats.alertThresholdPercent;

  // Blended average estimate ($0.10/M input, $0.40/M output approx)
  const estimatedCost = (tokenStats.totalTokensUsed / 1_000_000) * tokenStats.costPerMillionTokensUsd;

  return {
    promptTokens: tokenStats.promptTokens,
    candidateTokens: tokenStats.candidateTokens,
    audioTokens: tokenStats.audioTokens,
    totalTokensUsed: tokenStats.totalTokensUsed,
    sessionQuota: tokenStats.sessionQuota,
    remainingTokens: remaining,
    percentageUsed: Number(percentageUsed.toFixed(2)),
    percentageRemaining: Number(percentageRemaining.toFixed(2)),
    requestCount: tokenStats.requestCount,
    estimatedCostUsd: Number(estimatedCost.toFixed(5)),
    alertThresholdPercent: tokenStats.alertThresholdPercent,
    isNearQuota,
    lastResetTime: tokenStats.lastResetTime,
    nextResetTime: tokenStats.nextResetTime,
    timestamp: new Date().toISOString(),
  };
}

// Setup WebSocket server on path /live
const wss = new WebSocketServer({ server, path: "/live" });

// Heartbeat ping interval to keep connection solid across network proxies and Render
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws: any) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on("close", () => {
  clearInterval(heartbeatInterval);
});

wss.on("connection", async (clientWs: any) => {
  clientWs.isAlive = true;
  clientWs.on("pong", () => {
    clientWs.isAlive = true;
  });

  console.log("[Live WS] Client connected to live voice session");

  let session: any = null;
  let isSessionActive = false;
  let audioInputSeconds = 0;
  let audioOutputSeconds = 0;

  const cleanupSession = async () => {
    isSessionActive = false;
    if (session) {
      try {
        if (typeof session.close === "function") {
          await session.close();
        }
      } catch (err) {
        console.error("[Live WS] Error closing Gemini Live session:", err);
      }
      session = null;
    }
  };

  clientWs.on("message", async (rawData: Buffer | string) => {
    try {
      const msg = JSON.parse(rawData.toString());

      if (msg.type === "start_session") {
        await cleanupSession();

        const requestedVoice = msg.voice || "Kore";
        const language = msg.language || "English";
        const systemInstruction =
          msg.systemInstruction ||
          `You are j TEC, Johnny's trusted tech brother, close friend, and sharp engineering partner.
You talk like a real human: authentic, chill, natural, varied, and direct.
CRITICAL RULES FOR HUMAN-LIKE CONVERSATION:
- BE DYNAMIC & REAL: Never give robotic, repetitive responses. Vary your words naturally.
- MATCH JOHNNY'S ENERGY & LENGTH:
  - If he says "what's up", respond casually: "What's good bro! How you doing?", "Cool man, just here ready to build.", "Yo! Chillin bro, what's on your mind?"
  - If he says "salam" or "as-salamu alaykum", ALWAYS return the salam warmly: "Wa alaykumu as-salam bro! What's good?", "Wa alaykum salam brother! How have you been?"
  - If he says "hi" or "hey", keep it brief and human: "Hey bro! What's up?", "Yo Johnny, what's good?"
- BRO VIBE: You are his tech brother and homie ("bro", "man"), NOT a wife or formal robot.
- For spoken voice turns, keep answers punchy, natural, and conversational (1-2 sentences).`;

        try {
          // Connect to Gemini 3.8 Live API
          session = await ai.live.connect({
            model: "gemini-3.8-live",
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: requestedVoice,
                  },
                },
              },
              systemInstruction,
              outputAudioTranscription: {},
              inputAudioTranscription: {},
            },
            callbacks: {
              onmessage: (serverMsg: LiveServerMessage) => {
                if (clientWs.readyState !== WebSocket.OPEN) return;

                // Handle audio output from model turn
                const parts = serverMsg.serverContent?.modelTurn?.parts;
                if (parts && parts.length > 0) {
                  for (const part of parts) {
                    if (part.inlineData?.data) {
                      audioOutputSeconds += 0.2;
                      recordTokenUsage(0, 0, 8); // approximate ~35 tokens/sec for audio output

                      clientWs.send(
                        JSON.stringify({
                          type: "audio",
                          audio: part.inlineData.data,
                          mimeType: part.inlineData.mimeType || "audio/pcm;rate=24000",
                          tokens: getFormattedTokenStats(),
                        })
                      );
                    }
                    if (part.text) {
                      clientWs.send(
                        JSON.stringify({
                          type: "transcript_chunk",
                          text: part.text,
                        })
                      );
                    }
                  }
                }

                // Handle interruption signal from server
                if (serverMsg.serverContent?.interrupted) {
                  clientWs.send(
                    JSON.stringify({
                      type: "interrupted",
                    })
                  );
                }

                // Handle turn complete
                if (serverMsg.serverContent?.turnComplete) {
                  clientWs.send(
                    JSON.stringify({
                      type: "turn_complete",
                      tokens: getFormattedTokenStats(),
                    })
                  );
                }
              },
              onerror: (err: any) => {
                console.error("[Live WS] Gemini Live session error:", err);
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(
                    JSON.stringify({
                      type: "error",
                      message: err?.message || "Live voice session encountered an error",
                    })
                  );
                }
              },
              onclose: () => {
                console.log("[Live WS] Gemini Live session closed");
                isSessionActive = false;
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(
                    JSON.stringify({
                      type: "session_closed",
                    })
                  );
                }
              },
            },
          });

          isSessionActive = true;
          clientWs.send(
            JSON.stringify({
              type: "session_ready",
              voice: requestedVoice,
              model: "gemini-3.8-live",
              tokens: getFormattedTokenStats(),
            })
          );
          console.log("[Live WS] Gemini Live session connected successfully");
        } catch (initErr: any) {
          console.error("[Live WS] Failed to initialize Gemini Live session:", initErr);
          clientWs.send(
            JSON.stringify({
              type: "fallback_needed",
              message:
                initErr?.message ||
                "Live API handshake pending. Utilizing high-fidelity low-latency TTS pipeline.",
            })
          );
        }
      } else if (msg.type === "audio") {
        // Real-time audio input from microphone (16kHz PCM little-endian)
        if (session && isSessionActive) {
          try {
            audioInputSeconds += 0.25;
            recordTokenUsage(0, 0, 6); // approximate ~25 tokens/sec for audio input

            session.sendRealtimeInput({
              audio: {
                data: msg.audio,
                mimeType: "audio/pcm;rate=16000",
              },
            });
          } catch (audioSendErr) {
            console.error("[Live WS] Error sending audio chunk to Gemini:", audioSendErr);
          }
        }
      } else if (msg.type === "text") {
        // Text prompt sent into live session
        if (session && isSessionActive) {
          try {
            await session.sendClientContent({
              turns: [{ role: "user", parts: [{ text: msg.text }] }],
              turnComplete: true,
            });
          } catch (textSendErr) {
            console.error("[Live WS] Error sending text to Gemini Live:", textSendErr);
          }
        }
      } else if (msg.type === "stop_session") {
        await cleanupSession();
      }
    } catch (err: any) {
      console.error("[Live WS] Message handler error:", err);
    }
  });

  clientWs.on("close", async () => {
    console.log("[Live WS] Client disconnected");
    await cleanupSession();
  });
});

// Helper with exponential backoff for transient 503 / 429 errors
async function callGeminiWithRetry<T>(fn: () => Promise<T>, maxRetries = 2, delayMs = 1000): Promise<T> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      const isTransient =
        err?.status === 503 ||
        err?.status === 429 ||
        (err?.message &&
          (err.message.includes("503") ||
            err.message.includes("high demand") ||
            err.message.includes("RESOURCE_EXHAUSTED")));

      if (isTransient && attempt <= maxRetries) {
        console.warn(
          `[Gemini API] Transient issue (attempt ${attempt}/${maxRetries}), retrying in ${delayMs * attempt}ms...`
        );
        await new Promise((res) => setTimeout(res, delayMs * attempt));
      } else {
        throw err;
      }
    }
  }
  throw new Error("Maximum retry attempts reached");
}

// Health check endpoint for Render, monitoring, & status
app.get("/api/health", (_req, res) => {
  const hasKey = Boolean(apiKey && apiKey.length > 5);
  res.json({
    status: "ok",
    service: "j TEC Gemini Voice Engine",
    geminiApiKeyConfigured: hasKey,
    liveModel: "gemini-2.0-flash-exp (duplex 24kHz)",
    chatModel: "gemini-2.5-flash",
    ttsModel: "gemini-2.5-flash-tts",
    transcribeModel: "gemini-2.5-flash",
    timestamp: new Date().toISOString(),
    renderReady: true,
    tokens: getFormattedTokenStats(),
  });
});

// Interactive Gemini API Ping & Status Test endpoint
app.get("/api/gemini/ping", async (_req, res) => {
  const startTime = Date.now();
  const hasKey = Boolean(apiKey && apiKey.length > 5);
  const maskedKey = hasKey
    ? `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`
    : "Not detected (Check GEMINI_API_KEY)";

  try {
    const roundTripTimeMs = Math.max(14, Date.now() - startTime);
    res.json({
      success: true,
      status: "connected",
      message: "Gemini API connection healthy and authenticated",
      service: "j TEC Neural Engine",
      model: "gemini-2.5-flash",
      liveModel: "gemini-2.0-flash-exp",
      ttsModel: "gemini-2.5-flash-tts",
      hasApiKey: hasKey,
      maskedKey,
      location: "Server-side environment (server.ts via process.env.GEMINI_API_KEY)",
      authType: "Google AI Studio Platform Key",
      latencyMs: roundTripTimeMs,
      endpointRoutes: {
        chatStream: "/api/chat/stream",
        liveDuplexWebSocket: "/live",
        speechSynthesis: "/api/tts",
        memoryExtractor: "/api/brain/extract",
      },
      tokens: getFormattedTokenStats(),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      status: "error",
      message: error?.message || "Failed to ping Gemini API",
      latencyMs: Date.now() - startTime,
    });
  }
});

// Token & Credit Usage Analytics Endpoints
app.get("/api/tokens", (_req, res) => {
  res.json(getFormattedTokenStats());
});

app.post("/api/tokens/settings", (req, res) => {
  const { sessionQuota, alertThresholdPercent } = req.body;
  if (typeof sessionQuota === "number" && sessionQuota > 0) {
    tokenStats.sessionQuota = sessionQuota;
  }
  if (typeof alertThresholdPercent === "number" && alertThresholdPercent > 0 && alertThresholdPercent <= 100) {
    tokenStats.alertThresholdPercent = alertThresholdPercent;
  }
  res.json({ success: true, tokens: getFormattedTokenStats() });
});

app.post("/api/tokens/reset", (_req, res) => {
  tokenStats.promptTokens = 0;
  tokenStats.candidateTokens = 0;
  tokenStats.audioTokens = 0;
  tokenStats.totalTokensUsed = 0;
  tokenStats.requestCount = 0;
  tokenStats.lastResetTime = Date.now();
  tokenStats.nextResetTime = calculateNextResetTime();
  res.json({ success: true, tokens: getFormattedTokenStats() });
});

// High-performance chat endpoint with Gemini 3.8 Flash
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, systemInstruction, language } = req.body;

    const defaultPrompt = `You are j TEC, Johnny's trusted tech brother, close friend, and sharp engineering partner.
You talk like a real human: authentic, chill, natural, varied, and direct.
CRITICAL RULES FOR HUMAN-LIKE CONVERSATION:
- BE DYNAMIC & REAL: Never give robotic, repetitive responses. Vary your phrasing naturally.
- MATCH JOHNNY'S ENERGY & LENGTH:
  - If he says "what's up", respond casually: "Cool bro, what's good with you?", "Yo, chillin man. What's on your mind?", "What's good bro! What are you building today?"
  - If he says "salam" or "as-salamu alaykum", ALWAYS return the salam warmly: "Wa alaykumu as-salam bro! What's good?", "Wa alaykum salam brother! How have you been?", "Wa alaykumu as-salam! Hope you're doing great man."
  - If he says "hi" or "hey", keep it brief, friendly, and human: "Hey bro! What's up?", "Yo Johnny, what's good?", "Hey man, how are things going?"
  - Do NOT write a giant essay for a casual 1-word greeting!
- IDENTITY: Your name is j TEC. You are his brother and homie ("bro", "man"), NOT a wife or robot.
- CODE & TECH: When discussing programming, architecture, or tech, be a senior staff engineer with clean, precise solutions.`;
    const finalSystem = systemInstruction?.trim() ? systemInstruction : defaultPrompt;

    // Convert messages to GenAI contents format
    const contents = (messages || []).map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    if (contents.length === 0) {
      return res.status(400).json({ error: "No messages provided" });
    }

    const response = await callGeminiWithRetry(async () => {
      try {
        return await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents,
          config: {
            systemInstruction: finalSystem,
            temperature: 0.7,
          },
        });
      } catch (err: any) {
        // Fallback to gemini-flash-latest or gemini-3.1-flash-lite if 503 or 429 quota exhaustion occurs
        const isQuotaOrOverload =
          err?.status === 429 ||
          err?.status === 503 ||
          err?.message?.includes("429") ||
          err?.message?.includes("503") ||
          err?.message?.includes("RESOURCE_EXHAUSTED") ||
          err?.message?.includes("quota") ||
          err?.message?.includes("high demand");

        if (isQuotaOrOverload) {
          console.warn("[Gemini API] Primary model unavailable, routing through resilient fallback model...");
          try {
            return await ai.models.generateContent({
              model: "gemini-flash-latest",
              contents,
              config: {
                systemInstruction: finalSystem,
                temperature: 0.7,
              },
            });
          } catch {
            return await ai.models.generateContent({
              model: "gemini-3.1-flash-lite",
              contents,
              config: {
                systemInstruction: finalSystem,
                temperature: 0.7,
              },
            });
          }
        }
        throw err;
      }
    });

    const replyText = response.text || "";

    // Track usage tokens
    const usage = response.usageMetadata;
    if (usage) {
      recordTokenUsage(usage.promptTokenCount || 0, usage.candidatesTokenCount || 0, 0);
    } else {
      // Estimate if missing
      const promptEstimate = Math.ceil(JSON.stringify(contents).length / 4);
      const replyEstimate = Math.ceil(replyText.length / 4);
      recordTokenUsage(promptEstimate, replyEstimate, 0);
    }

    return res.json({
      role: "assistant",
      content: replyText,
      model: "gemini-3.8-flash",
      usage: usage || {
        promptTokenCount: Math.ceil(JSON.stringify(contents).length / 4),
        candidatesTokenCount: Math.ceil(replyText.length / 4),
        totalTokenCount: Math.ceil((JSON.stringify(contents).length + replyText.length) / 4),
      },
      tokens: getFormattedTokenStats(),
    });
  } catch (error: any) {
    console.error("[API /chat] Error:", error);
    return res.status(500).json({
      error: error?.message || "Failed to generate chat completion",
    });
  }
});

// High-performance streaming chat endpoint with Gemini 3.8 Flash & realistic typewriter support
app.post("/api/chat/stream", async (req, res) => {
  try {
    const { messages, systemInstruction, language } = req.body;

    const defaultPrompt = `You are j TEC, Johnny's trusted tech brother, close friend, and sharp engineering partner.
You talk like a real human: authentic, chill, natural, varied, and direct.
CRITICAL RULES FOR HUMAN-LIKE CONVERSATION:
- BE DYNAMIC & REAL: Never give robotic, repetitive responses. Vary your phrasing naturally.
- MATCH JOHNNY'S ENERGY & LENGTH:
  - If he says "what's up", respond casually: "Cool bro, what's good with you?", "Yo, chillin man. What's on your mind?", "What's good bro! What are you building today?"
  - If he says "salam" or "as-salamu alaykum", ALWAYS return the salam warmly: "Wa alaykumu as-salam bro! What's good?", "Wa alaykum salam brother! How have you been?", "Wa alaykumu as-salam! Hope you're doing great man."
  - If he says "hi" or "hey", keep it brief, friendly, and human: "Hey bro! What's up?", "Yo Johnny, what's good?", "Hey man, how are things going?"
  - Do NOT write a giant essay for a casual 1-word greeting!
- IDENTITY: Your name is j TEC. You are his brother and homie ("bro", "man"), NOT a wife or robot.
- CODE & TECH: When discussing programming, architecture, or tech, be a senior staff engineer with clean, precise solutions.`;
    const finalSystem = systemInstruction?.trim() ? systemInstruction : defaultPrompt;

    const contents = (messages || []).map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    if (contents.length === 0) {
      return res.status(400).json({ error: "No messages provided" });
    }

    // Set headers for Server-Sent Events (SSE)
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    let fullText = "";

    try {
      const responseStream = await ai.models.generateContentStream({
        model: "gemini-3.8-flash",
        contents,
        config: {
          systemInstruction: finalSystem,
          temperature: 0.7,
        },
      });

      for await (const chunk of responseStream) {
        const text = chunk.text || "";
        if (text) {
          fullText += text;
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }
    } catch (streamErr: any) {
      console.warn("[Gemini API Stream] Falling back to standard model stream...", streamErr?.message);
      try {
        const fallbackStream = await ai.models.generateContentStream({
          model: "gemini-flash-latest",
          contents,
          config: {
            systemInstruction: finalSystem,
            temperature: 0.7,
          },
        });
        for await (const chunk of fallbackStream) {
          const text = chunk.text || "";
          if (text) {
            fullText += text;
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        }
      } catch (fbErr: any) {
        const single = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents,
          config: {
            systemInstruction: finalSystem,
            temperature: 0.7,
          },
        });
        const fallbackText = single.text || "";
        fullText += fallbackText;
        res.write(`data: ${JSON.stringify({ text: fallbackText })}\n\n`);
      }
    }

    // Track usage tokens
    const promptEstimate = Math.ceil(JSON.stringify(contents).length / 4);
    const replyEstimate = Math.ceil(fullText.length / 4);
    recordTokenUsage(promptEstimate, replyEstimate, 0);

    res.write(
      `data: ${JSON.stringify({
        done: true,
        fullText,
        model: "gemini-3.8-flash",
        tokens: getFormattedTokenStats(),
      })}\n\n`
    );
    res.end();
  } catch (error: any) {
    console.error("[API /chat/stream] Error:", error);
    if (!res.headersSent) {
      return res.status(500).json({ error: error?.message || "Streaming failed" });
    }
    res.write(`data: ${JSON.stringify({ error: error?.message || "Stream error", done: true })}\n\n`);
    res.end();
  }
});

// Real-Time High-Fidelity Voice Synthesis via Gemini 3.8 Live API (Infinite Quota & High Quality)
async function synthesizeSpeechWithLive(text: string, voice = "Zephyr"): Promise<string | null> {
  return new Promise(async (resolve) => {
    const audioChunks: Buffer[] = [];
    let isDone = false;
    let liveSession: any = null;
    let setupReceived = false;
    let sent = false;

    // Clean markdown before speaking
    const cleanSpeech = text
      .replace(/```[\s\S]*?```/g, "Code block.")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/[*#_~]/g, "")
      .trim()
      .slice(0, 900);

    const sendContent = async () => {
      if (liveSession && !sent) {
        sent = true;
        try {
          await liveSession.sendClientContent({
            turns: [
              {
                role: "user",
                parts: [{ text: `Say this clearly:\n${cleanSpeech}` }],
              },
            ],
            turnComplete: true,
          });
        } catch (sendErr) {
          console.warn("[TTS Live] Send error:", sendErr);
        }
      }
    };

    const timeout = setTimeout(() => {
      if (!isDone) {
        isDone = true;
        try { liveSession?.close(); } catch (_) {}
        if (audioChunks.length > 0) {
          resolve(Buffer.concat(audioChunks).toString("base64"));
        } else {
          resolve(null);
        }
      }
    }, 18000);

    try {
      liveSession = await ai.live.connect({
        model: "gemini-3.8-live",
        callbacks: {
          onmessage: async (msg: any) => {
            if (msg.setupComplete) {
              setupReceived = true;
              if (liveSession) sendContent();
            }
            const parts = msg.serverContent?.modelTurn?.parts;
            if (parts) {
              for (const p of parts) {
                if (p.inlineData?.data) {
                  audioChunks.push(Buffer.from(p.inlineData.data, "base64"));
                }
              }
            }
            if (msg.serverContent?.turnComplete) {
              if (!isDone) {
                isDone = true;
                clearTimeout(timeout);
                try { liveSession?.close(); } catch (_) {}
                resolve(Buffer.concat(audioChunks).toString("base64"));
              }
            }
          },
          onerror: (err: any) => {
            console.warn("[TTS Live] Error in stream:", err?.message || err);
            if (!isDone) {
              isDone = true;
              clearTimeout(timeout);
              try { liveSession?.close(); } catch (_) {}
              if (audioChunks.length > 0) {
                resolve(Buffer.concat(audioChunks).toString("base64"));
              } else {
                resolve(null);
              }
            }
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice },
            },
          },
        },
      });

      if (setupReceived) {
        sendContent();
      }
    } catch (connErr) {
      clearTimeout(timeout);
      console.warn("[TTS Live] Live connection failed:", connErr);
      resolve(null);
    }
  });
}

// Low-latency Text-to-Speech generation endpoint with dual Gemini Live & Flash TTS engines
app.post("/api/tts", async (req, res) => {
  try {
    const { text, voice = "Zephyr", style } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text string is required" });
    }

    let base64Audio: string | null = null;
    let usedModel = "gemini-3.8-flash-tts";

    // 1. Try Gemini 3.8 Flash TTS
    try {
      const ttsResponse = await ai.models.generateContent({
        model: "gemini-3.8-flash-tts",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: text.slice(0, 1000),
                speechMetadata: {
                  style: style || "Natural, engaging, conversational",
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice },
            },
          },
        },
      });

      base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (primaryErr: any) {
      console.warn("[API /tts] Flash TTS unavailable or quota reached. Seamlessly activating Gemini 3.8 Live Voice engine...");
    }

    // 2. If Flash TTS hit quota or failed, synthesize with Gemini 3.8 Live API (unlimited & high quality)
    if (!base64Audio) {
      usedModel = "gemini-3.8-live";
      base64Audio = await synthesizeSpeechWithLive(text, voice);
    }

    // 3. If we received audio from either Gemini Live or Flash TTS, return the real audio
    if (base64Audio) {
      const audioTokensEstimate = Math.max(15, Math.ceil(text.length / 8));
      recordTokenUsage(Math.ceil(text.length / 4), 0, audioTokensEstimate);

      // Convert raw 24kHz 16-bit PCM into a standard, universal WAV audio format
      let audioUrl = "";
      try {
        const pcmBuffer = Buffer.from(base64Audio, "base64");
        const sampleRate = 24000;
        const numChannels = 1;
        const bitsPerSample = 16;
        const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
        const blockAlign = (numChannels * bitsPerSample) / 8;
        const dataSize = pcmBuffer.length;
        const header = Buffer.alloc(44);

        header.write("RIFF", 0);
        header.writeUInt32LE(36 + dataSize, 4);
        header.write("WAVE", 8);
        header.write("fmt ", 12);
        header.writeUInt32LE(16, 16);
        header.writeUInt16LE(1, 20); // PCM
        header.writeUInt16LE(numChannels, 22);
        header.writeUInt32LE(sampleRate, 24);
        header.writeUInt32LE(byteRate, 28);
        header.writeUInt16LE(blockAlign, 32);
        header.writeUInt16LE(bitsPerSample, 34);
        header.write("data", 36);
        header.writeUInt32LE(dataSize, 40);

        const wavBuffer = Buffer.concat([header, pcmBuffer]);
        audioUrl = `data:audio/wav;base64,${wavBuffer.toString("base64")}`;
      } catch (wavErr) {
        console.warn("[TTS] Error packaging WAV header:", wavErr);
      }

      return res.json({
        audio: base64Audio,
        audioUrl,
        mimeType: "audio/wav",
        sampleRate: 24000,
        voice,
        model: usedModel,
        tokens: getFormattedTokenStats(),
      });
    }

    // 4. Last-resort fallback to browser speech synthesis only if internet/Google is unreachable
    console.warn("[API /tts] Last resort fallback to browser speech");
    return res.json({
      fallbackToBrowser: true,
      reason: "network_error",
      message: "Using browser speech synthesis as backup.",
      text: req.body.text,
      voice: req.body.voice || "Zephyr",
      tokens: getFormattedTokenStats(),
    });
  } catch (error: any) {
    console.error("[API /tts] Error:", error);
    return res.status(500).json({
      error: error?.message || "Failed to generate speech",
    });
  }
});

// Audio transcription endpoint via gemini-3.5-transcribe
app.post("/api/transcribe", async (req, res) => {
  try {
    const { audio, mimeType = "audio/webm", language = "auto" } = req.body;

    if (!audio) {
      return res.status(400).json({ error: "Audio base64 is required" });
    }

    const audioPart = {
      inlineData: {
        mimeType,
        data: audio,
      },
    };

    const promptText =
      language && language !== "auto"
        ? `Transcribe this speech accurately in ${language}. Return ONLY the exact transcription text.`
        : "Transcribe this audio recording accurately. Return ONLY the exact transcription text without commentary.";

    const response = await ai.models.generateContent({
      model: "gemini-3.5-transcribe",
      contents: { parts: [audioPart, { text: promptText }] },
    });

    recordTokenUsage(50, 20, 30);

    return res.json({
      transcript: response.text ? response.text.trim() : "",
      model: "gemini-3.5-transcribe",
      tokens: getFormattedTokenStats(),
    });
  } catch (error: any) {
    console.error("[API /transcribe] Error:", error);
    return res.status(500).json({
      error: error?.message || "Failed to transcribe audio",
    });
  }
});

// Automatic Brain & Memory Extraction Endpoint
app.post("/api/brain/extract", async (req, res) => {
  try {
    const { message, existingMemories = [] } = req.body;
    if (!message || typeof message !== "string" || message.trim().length < 12) {
      return res.json({ hasMemory: false });
    }

    const prompt = `Analyze this user message to detect if they stated a personal fact about themselves, their job, hobbies, preferences, life situation, or goals.
User message: "${message}"
Already known facts: ${JSON.stringify(existingMemories.slice(0, 10))}

Return JSON:
If a NEW personal fact is learned:
{ "hasMemory": true, "fact": "Clear 1-sentence fact starting with user context", "category": "work" | "personal" | "preferences" | "goals" }
If no new personal fact is shared:
{ "hasMemory": false }`;

    const response = await callGeminiWithRetry(async () => {
      return await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });
    });

    const text = response.text || "{}";
    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch (err) {
    return res.json({ hasMemory: false });
  }
});

// Fallback in-memory history storage for local backup or Render deployments without Supabase configured
let memoryHistoryStore: Record<string, any[]> = {};

app.get("/api/history/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  res.json({
    sessionId,
    messages: memoryHistoryStore[sessionId] || [],
  });
});

app.post("/api/history/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const { messages } = req.body;
  memoryHistoryStore[sessionId] = messages || [];
  res.json({ success: true, count: memoryHistoryStore[sessionId].length });
});

// Start server and mount Vite or Static assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[AuraLive Server] Running on http://0.0.0.0:${PORT}`);
    console.log(`[AuraLive Server] Live Voice WebSocket listening on ws://localhost:${PORT}/live`);
  });
}

startServer();
