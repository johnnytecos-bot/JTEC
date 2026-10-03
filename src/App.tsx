import React, { useState, useEffect, useRef } from "react";
import { TopBar, AVAILABLE_MODELS } from "./components/TopBar";
import { AppSidebar, SidebarNavView } from "./components/AppSidebar";
import { SecondarySidebar } from "./components/SecondarySidebar";
import { ModernChatArea } from "./components/ModernChatArea";
import { ModernLiveVoiceView } from "./components/ModernLiveVoiceView";
import {
  ModernSettingsModal,
  SettingsSection,
} from "./components/ModernSettingsModal";
import { SidebarNavModal } from "./components/SidebarNavModal";
import { AudioEngine, VoiceState } from "./services/audioEngine";
import {
  supabaseHistory,
  ConversationRecord,
  MessageRecord,
} from "./services/supabase";
import {
  SUPPORTED_LANGUAGES,
  PREBUILT_VOICES,
  LanguageOption,
} from "./services/languages";
import { tokenTracker, TokenMetrics } from "./services/tokenTracker";
import { aiBrain, UserBrainProfile } from "./services/aiBrain";
import { audioCache } from "./services/audioCache";
import { ThemeType } from "./components/Navbar";
import { getApiUrl, getLiveWebSocketUrl } from "./services/apiConfig";

export default function App() {
  // Application & Conversation State
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState<LanguageOption>(
    SUPPORTED_LANGUAGES[0]
  );
  const [currentVoice, setCurrentVoice] = useState<string>(PREBUILT_VOICES[0].id);
  const [theme, setTheme] = useState<ThemeType>("dark");
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.5-flash");

  // Pinned conversations
  const [pinnedConversationIds, setPinnedConversationIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("jtec_pinned_convs");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // UI Panels & Modals State
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1024;
    }
    return true;
  });
  const [isSecondaryOpen, setIsSecondaryOpen] = useState<boolean>(false);
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("general");
  const [activeNavView, setActiveNavView] = useState<SidebarNavView>(null);
  const [inChatSearchQuery, setInChatSearchQuery] = useState<string>("");

  // Voice & Audio Engine State
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const [lastUserTranscript, setLastUserTranscript] = useState<string>("");
  const [lastAiTranscript, setLastAiTranscript] = useState<string>("");
  const [audioErrorMessage, setAudioErrorMessage] = useState<string | null>(null);

  // Telemetry & Brain Context
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState<boolean>(false);
  const [tokens, setTokens] = useState<TokenMetrics>(tokenTracker.getMetrics());
  const [brainProfile, setBrainProfile] = useState<UserBrainProfile>(aiBrain.getProfile());
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  // References
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const isVoiceActiveRef = useRef<boolean>(false);
  const typewriterTimerRef = useRef<any>(null);
  const voiceStateRef = useRef<VoiceState>(voiceState);
  const isInterruptingRef = useRef<boolean>(false);
  const handleInterruptRef = useRef<(fadeDurationMs?: number) => Promise<void>>(
    () => Promise.resolve()
  );
  const liveTurnAccumulatorRef = useRef<string>("");
  isVoiceActiveRef.current = isVoiceActive;
  voiceStateRef.current = voiceState;

  // Initialize theme, token tracker, brain, audio engine, and load conversations
  useEffect(() => {
    // 1. Theme
    const savedTheme =
      (localStorage.getItem("auralive_theme") as ThemeType) || "dark";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);

    // 2. Token Tracker Subscription
    const unsubTokens = tokenTracker.subscribe((m) => {
      setTokens(m);
    });

    // 3. AI Brain Subscription & Cloud Auto-Sync
    const unsubBrain = aiBrain.subscribe((p) => {
      setBrainProfile(p);
    });
    aiBrain.registerAutoSyncCallback((profile) => {
      if (supabaseHistory.isConfigured()) {
        supabaseHistory.syncBrainProfileToCloud(profile).catch((err) => {
          console.warn("[App] Cloud sync error:", err);
        });
      }
    });

    // 4. Audio Engine
    const engine = new AudioEngine();
    audioEngineRef.current = engine;
    audioCache.registerAudioEngine(engine);

    // Mic streaming callback -> send to WebSocket
    engine.onAudioChunk = (base64Pcm16k) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "audio",
            audio: base64Pcm16k,
          })
        );
      }
    };

    // User speech recognition transcript
    engine.onUserTranscript = (text, isFinal) => {
      setInterimTranscript(text);
      if (text.trim().length > 0 && voiceStateRef.current === "speaking") {
        handleInterruptRef.current(220);
      }
      if (isFinal && text.trim().length > 1) {
        setLastUserTranscript(text.trim());
        handleUserSpeechCommit(text.trim());
        setInterimTranscript("");
      }
    };

    engine.onError = (errMsg) => {
      console.warn("[AudioEngine Error]:", errMsg);
      setAudioErrorMessage(errMsg);
      setVoiceState("error");
    };

    // 5. Supabase status & conversations
    checkSupabaseAndLoadConversations();

    return () => {
      unsubTokens();
      unsubBrain();
      if (wsRef.current) wsRef.current.close();
      if (audioEngineRef.current) audioEngineRef.current.destroy();
    };
  }, []);

  // Theme change
  const handleSelectTheme = (newTheme: ThemeType) => {
    setTheme(newTheme);
    localStorage.setItem("auralive_theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  // Load conversations from Supabase / Local storage
  const checkSupabaseAndLoadConversations = async () => {
    const configured = supabaseHistory.isConfigured();
    setIsSupabaseConfigured(configured);

    const list = await supabaseHistory.getConversations();
    setConversations(list);

    if (list.length > 0 && !activeConversationId) {
      selectConversation(list[0].id);
    } else if (list.length === 0) {
      createNewConversation();
    }
  };

  // Select a conversation
  const selectConversation = async (id: string) => {
    setActiveConversationId(id);
    const msgs = await supabaseHistory.getMessages(id);
    setMessages(msgs);
  };

  // Create new conversation
  const createNewConversation = async () => {
    const newId = "conv_" + Date.now();
    const newConv: ConversationRecord = {
      id: newId,
      title: `Conversation ${conversations.length + 1}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      language: currentLanguage.name,
      voice: currentVoice,
      messageCount: 0,
      previewText: "New session started",
    };

    await supabaseHistory.saveConversation(newConv);
    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newId);
    setMessages([]);
  };

  // Delete conversation
  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabaseHistory.deleteConversation(id);
    const updated = conversations.filter((c) => c.id !== id);
    setConversations(updated);

    if (activeConversationId === id) {
      if (updated.length > 0) {
        selectConversation(updated[0].id);
      } else {
        createNewConversation();
      }
    }
  };

  // Rename conversation
  const handleRenameConversation = async (id: string, newTitle: string) => {
    const activeConv = conversations.find((c) => c.id === id);
    if (!activeConv) return;
    const updatedConv: ConversationRecord = {
      ...activeConv,
      title: newTitle,
      updatedAt: Date.now(),
    };
    await supabaseHistory.saveConversation(updatedConv);
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? updatedConv : c))
    );
  };

  // Pin/Unpin conversation
  const handleTogglePinConversation = (id: string) => {
    setPinnedConversationIds((prev) => {
      const next = prev.includes(id) ? prev.filter((p) => p !== id) : [id, ...prev];
      localStorage.setItem("jtec_pinned_convs", JSON.stringify(next));
      return next;
    });
  };

  // Save current messages to active conversation
  const persistMessages = async (updatedMsgs: MessageRecord[]) => {
    if (!activeConversationId) return;
    setMessages(updatedMsgs);

    await supabaseHistory.saveMessages(activeConversationId, updatedMsgs);

    const activeConv = conversations.find((c) => c.id === activeConversationId);
    if (activeConv) {
      const lastMsg = updatedMsgs[updatedMsgs.length - 1];
      const updatedConv: ConversationRecord = {
        ...activeConv,
        updatedAt: Date.now(),
        messageCount: updatedMsgs.length,
        previewText: lastMsg ? lastMsg.content.slice(0, 70) : activeConv.previewText,
      };
      await supabaseHistory.saveConversation(updatedConv);
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConversationId ? updatedConv : c))
      );
    }
  };

  // Start or Stop Real-Time Live Voice
  const handleToggleVoice = async () => {
    if (isVoiceActive) {
      stopVoiceSession();
    } else {
      await startVoiceSession();
    }
  };

  const startVoiceSession = async () => {
    if (!audioEngineRef.current) return;

    setAudioErrorMessage(null);
    setVoiceState("thinking");
    const micStarted = await audioEngineRef.current.startMicrophone();
    if (!micStarted) {
      setIsVoiceActive(false);
      return;
    }

    setIsVoiceActive(true);
    setVoiceState("listening");
    connectLiveWebSocket();
  };

  const stopVoiceSession = () => {
    setIsVoiceActive(false);
    setVoiceState("idle");

    if (audioEngineRef.current) {
      audioEngineRef.current.stopMicrophone();
      audioEngineRef.current.stopPlayback();
    }

    if (wsRef.current) {
      try {
        wsRef.current.send(JSON.stringify({ type: "stop_session" }));
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
    setIsLiveConnected(false);
  };

  // Connect WebSocket to Gemini 2.0 Live API bridge
  const connectLiveWebSocket = () => {
    try {
      const wsUrl = getLiveWebSocketUrl();
      const ws = new WebSocket(wsUrl);

      const systemInstruction = aiBrain.constructSystemInstruction(
        currentLanguage.name
      );

      ws.onopen = () => {
        console.log(
          "[Live WS] WebSocket opened with Brain Persona for:",
          brainProfile.userName
        );
        ws.send(
          JSON.stringify({
            type: "start_session",
            voice: currentVoice,
            language: currentLanguage.name,
            systemInstruction,
          })
        );
      };

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.tokens) {
            tokenTracker.setMetrics(msg.tokens);
          }

          if (msg.type === "session_ready") {
            setIsLiveConnected(true);
            setVoiceState("listening");
          } else if (msg.type === "audio") {
            setVoiceState("speaking");
            if (audioEngineRef.current) {
              await audioEngineRef.current.playPcm24kChunk(msg.audio);
            }
          } else if (msg.type === "transcript_chunk") {
            setLastAiTranscript((prev) => prev + " " + msg.text);
            liveTurnAccumulatorRef.current =
              (liveTurnAccumulatorRef.current || "") + " " + msg.text;
          } else if (msg.type === "interrupted") {
            handleInterruptRef.current(200);
            liveTurnAccumulatorRef.current = "";
          } else if (msg.type === "turn_complete") {
            setVoiceState("listening");
            const completeReply = (liveTurnAccumulatorRef.current || "").trim();
            if (completeReply && activeConversationId) {
              const liveAssistantMsg: MessageRecord = {
                id: "msg_live_" + Date.now(),
                role: "assistant",
                content: completeReply,
                timestamp: Date.now(),
                model: "gemini-2.0-flash-exp",
                language: currentLanguage.code,
              };
              liveTurnAccumulatorRef.current = "";
              setMessages((prev) => {
                const nextList = [...prev, liveAssistantMsg];
                supabaseHistory.saveMessages(activeConversationId, nextList);
                return nextList;
              });
            }
          } else if (msg.type === "fallback_needed") {
            console.log("[Live WS] Notice:", msg.message);
          }
        } catch (e) {
          console.error("[Live WS] Error handling message:", e);
        }
      };

      ws.onclose = () => {
        setIsLiveConnected(false);
        if (isVoiceActiveRef.current) {
          setVoiceState("listening");
        }
      };

      ws.onerror = (err) => {
        console.warn("[Live WS] WebSocket error:", err);
      };

      wsRef.current = ws;
    } catch (e) {
      console.error("[Live WS] Connection failed:", e);
    }
  };

  // User speech committed from speech recognition or text
  const handleUserSpeechCommit = async (speechText: string) => {
    if (!speechText.trim()) return;

    const userMsg: MessageRecord = {
      id: "msg_" + Date.now(),
      role: "user",
      content: speechText,
      timestamp: Date.now(),
      language: currentLanguage.code,
    };

    const newMsgs = [...messages, userMsg];
    persistMessages(newMsgs);

    if (
      wsRef.current &&
      wsRef.current.readyState === WebSocket.OPEN &&
      isLiveConnected
    ) {
      wsRef.current.send(
        JSON.stringify({
          type: "text",
          text: speechText,
        })
      );
      setVoiceState("thinking");
      extractMemoryFromInput(speechText);
    } else {
      await handleRestChatCompletion(speechText, newMsgs);
    }
  };

  // Text message sent from chat box
  const handleSendMessage = async (text: string) => {
    handleInterrupt(180);

    const userMsg: MessageRecord = {
      id: "msg_" + Date.now(),
      role: "user",
      content: text,
      timestamp: Date.now(),
      language: currentLanguage.code,
    };

    const newMsgs = [...messages, userMsg];
    persistMessages(newMsgs);

    if (
      wsRef.current &&
      wsRef.current.readyState === WebSocket.OPEN &&
      isLiveConnected
    ) {
      wsRef.current.send(
        JSON.stringify({
          type: "text",
          text,
        })
      );
      setVoiceState("thinking");
      extractMemoryFromInput(text);
    } else {
      await handleRestChatCompletion(text, newMsgs);
    }
  };

  // Ambient Memory Extractor
  const extractMemoryFromInput = (input: string) => {
    if (!brainProfile.autoLearnEnabled || input.length < 8) return;

    const instant = aiBrain.detectMemoriesInUserMessage(input);
    if (instant.length > 0) {
      for (const item of instant) {
        aiBrain.addMemory(item.fact, item.category, {
          source: "chat",
          importance: "high",
        });
      }
    }

    fetch(getApiUrl("/api/brain/extract"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: input,
        existingMemories: brainProfile.memories.map((m) => m.fact),
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.hasMemory && data.fact) {
          aiBrain.addMemory(data.fact, data.category || "personal", {
            source: "chat",
          });
        }
      })
      .catch(() => {});
  };

  // Helper to play synthesized assistant voice reply
  const playAssistantVoice = async (text: string, messageId?: string) => {
    audioCache.stopAnyPlayback();
    if (!isVoiceActiveRef.current) {
      setVoiceState("idle");
      return;
    }
    setVoiceState("speaking");
    try {
      const ttsRes = await fetch(getApiUrl("/api/tts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice: currentVoice,
          language: currentLanguage.name,
          messageId,
        }),
      });

      if (!ttsRes.ok) throw new Error("TTS failed");
      const ttsData = await ttsRes.json();

      if (ttsData.audioData && audioEngineRef.current && isVoiceActiveRef.current) {
        await audioEngineRef.current.playPcm24kChunk(ttsData.audioData);
      }
    } catch (e) {
      console.warn("[TTS Playback] Fallback or error:", e);
    } finally {
      if (isVoiceActiveRef.current) {
        setVoiceState("listening");
      } else {
        setVoiceState("idle");
      }
    }
  };

  // Soft interrupt handler
  const handleInterrupt = async (fadeDurationMs = 200) => {
    if (isInterruptingRef.current) return;
    isInterruptingRef.current = true;

    audioCache.stopAnyPlayback();

    if (typewriterTimerRef.current) {
      clearTimeout(typewriterTimerRef.current);
      typewriterTimerRef.current = null;
    }

    if (audioEngineRef.current) {
      await audioEngineRef.current.fadeOutPlayback(fadeDurationMs);
    }

    if (
      wsRef.current &&
      wsRef.current.readyState === WebSocket.OPEN &&
      isLiveConnected
    ) {
      try {
        wsRef.current.send(JSON.stringify({ type: "client_interrupted" }));
      } catch (_) {}
    }

    if (isVoiceActiveRef.current) {
      setVoiceState("listening");
    } else {
      setVoiceState("idle");
    }

    setTimeout(() => {
      isInterruptingRef.current = false;
    }, fadeDurationMs + 50);
  };
  handleInterruptRef.current = handleInterrupt;

  // Toggle Mute
  const handleToggleMute = () => {
    if (!audioEngineRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioEngineRef.current.setMute(nextMuted);
    if (nextMuted && voiceState === "listening") {
      setVoiceState("idle");
    } else if (!nextMuted && isVoiceActive) {
      setVoiceState("listening");
    }
  };

  // Rest Chat Completion with smooth typewriter streaming
  const handleRestChatCompletion = async (
    userText: string,
    currentHistory: MessageRecord[]
  ) => {
    setVoiceState("thinking");
    const assistantMsgId = "msg_" + (Date.now() + 1);

    const placeholderMsg: MessageRecord = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      model: selectedModel,
      language: currentLanguage.code,
    };

    setMessages([...currentHistory, placeholderMsg]);
    setStreamingMessageId(assistantMsgId);

    const enrichedSystemPrompt = aiBrain.constructSystemInstruction(
      currentLanguage.name
    );

    let targetFullText = "";
    let displayedText = "";
    let isStreamDone = false;
    let isTypewriterActive = false;

    if (typewriterTimerRef.current) {
      clearTimeout(typewriterTimerRef.current);
      typewriterTimerRef.current = null;
    }

    const typewriterLoop = () => {
      if (displayedText.length < targetFullText.length) {
        const diff = targetFullText.length - displayedText.length;
        const burst = diff > 40 ? 5 : diff > 20 ? 3 : diff > 8 ? 2 : 1;
        displayedText = targetFullText.slice(0, displayedText.length + burst);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId ? { ...m, content: displayedText } : m
          )
        );

        const lastChar = displayedText[displayedText.length - 1];
        let delay = 20;
        if (lastChar === "." || lastChar === "!" || lastChar === "?") {
          delay = 90;
        } else if (lastChar === "," || lastChar === ";") {
          delay = 45;
        }
        typewriterTimerRef.current = setTimeout(typewriterLoop, delay);
      } else if (isStreamDone) {
        finalizeAssistantReply(targetFullText);
      } else {
        typewriterTimerRef.current = setTimeout(typewriterLoop, 25);
      }
    };

    const startTypewriterIfNeeded = () => {
      if (!isTypewriterActive) {
        isTypewriterActive = true;
        setVoiceState("speaking");
        typewriterLoop();
      }
    };

    const finalizeAssistantReply = (finalText: string) => {
      setStreamingMessageId(null);
      const finalMsg: MessageRecord = {
        id: assistantMsgId,
        role: "assistant",
        content: finalText,
        timestamp: Date.now(),
        model: selectedModel,
        language: currentLanguage.code,
      };

      const finalizedMessages = [...currentHistory, finalMsg];
      persistMessages(finalizedMessages);
      setLastAiTranscript(finalText);

      playAssistantVoice(finalText, assistantMsgId);
    };

    try {
      const res = await fetch(getApiUrl("/api/chat/stream"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: currentHistory.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          language: currentLanguage.name,
          systemInstruction: enrichedSystemPrompt,
          model: selectedModel,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Stream connection failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const jsonStr = trimmed.slice(6);
          if (jsonStr === "[DONE]") {
            isStreamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.tokens) {
              tokenTracker.setMetrics(parsed.tokens);
            }
            if (parsed.text) {
              targetFullText += parsed.text;
              startTypewriterIfNeeded();
            }
          } catch (_) {}
        }
      }

      isStreamDone = true;
      if (!isTypewriterActive) {
        startTypewriterIfNeeded();
      }
    } catch (err: any) {
      console.error("[Stream Error]:", err);
      setStreamingMessageId(null);
      setVoiceState("idle");
      const errorMsg: MessageRecord = {
        id: assistantMsgId,
        role: "assistant",
        content:
          "I ran into an issue reaching the AI service. Please check your connection or try again in a moment.",
        timestamp: Date.now(),
        model: selectedModel,
        language: currentLanguage.code,
      };
      persistMessages([...currentHistory, errorMsg]);
    }
  };

  const handleRegenerateLastMessage = async (lastUserText: string) => {
    // Drop last assistant response if present
    const trimmedMsgs = messages.filter(
      (m, i) => !(i === messages.length - 1 && m.role === "assistant")
    );
    await handleRestChatCompletion(lastUserText, trimmedMsgs);
  };

  const activeConv =
    conversations.find((c) => c.id === activeConversationId) || null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090b] text-white select-none">
      {/* 1. Left Collapsible ChatGPT-style Sidebar */}
      <AppSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        conversations={conversations}
        activeId={activeConversationId}
        onSelectConversation={selectConversation}
        onNewConversation={createNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onPinConversation={handleTogglePinConversation}
        pinnedIds={pinnedConversationIds}
        brainProfile={brainProfile}
        onOpenSettings={(sec) => {
          setSettingsSection((sec as SettingsSection) || "general");
          setIsSettingsOpen(true);
        }}
        onOpenLiveVoice={() => {
          setIsLiveVoiceOpen(true);
          if (!isVoiceActive) handleToggleVoice();
        }}
        onOpenNavView={(view) => setActiveNavView(view)}
        activeNavView={activeNavView}
      />

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Modern Top Bar */}
        <TopBar
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSecondaryOpen={isSecondaryOpen}
          onToggleSecondary={() => setIsSecondaryOpen(!isSecondaryOpen)}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          onOpenLiveVoice={() => {
            setIsLiveVoiceOpen(true);
            if (!isVoiceActive) handleToggleVoice();
          }}
          isLiveConnected={isLiveConnected}
          onNewChat={createNewConversation}
          onShareChat={() => {
            navigator.clipboard.writeText(window.location.href);
          }}
          isSupabaseConfigured={isSupabaseConfigured}
          activeConversationTitle={activeConv?.title}
        />

        {/* Center Chat Area + Contextual Secondary Sidebar */}
        <div className="flex-1 flex min-w-0 h-[calc(100vh-56px)] overflow-hidden relative">
          <ModernChatArea
            messages={messages}
            onSendMessage={handleSendMessage}
            onRegenerateMessage={handleRegenerateLastMessage}
            streamingMessageId={streamingMessageId}
            voiceState={voiceState}
            isVoiceActive={isVoiceActive}
            onToggleVoice={handleToggleVoice}
            onOpenLiveVoice={() => {
              setIsLiveVoiceOpen(true);
              if (!isVoiceActive) handleToggleVoice();
            }}
            onInterrupt={handleInterrupt}
            interimTranscript={interimTranscript}
            brainProfile={brainProfile}
            currentLanguage={currentLanguage}
            currentVoice={currentVoice}
            audioEngine={audioEngineRef.current}
            searchFilterQuery={inChatSearchQuery}
            audioErrorMessage={audioErrorMessage}
            onDismissAudioError={() => setAudioErrorMessage(null)}
          />

          {/* Secondary Contextual Panel */}
          <SecondarySidebar
            isOpen={isSecondaryOpen}
            onClose={() => setIsSecondaryOpen(false)}
            activeConversation={activeConv}
            messages={messages}
            isPinned={
              activeConversationId
                ? pinnedConversationIds.includes(activeConversationId)
                : false
            }
            onTogglePin={() => {
              if (activeConversationId) {
                handleTogglePinConversation(activeConversationId);
              }
            }}
            onSearchInChat={setInChatSearchQuery}
            searchQuery={inChatSearchQuery}
            onFileUpload={(files) => {
              const fileNames = Array.from(files).map((f) => f.name).join(", ");
              handleSendMessage(`[Uploaded context files: ${fileNames}]`);
            }}
            tokens={tokens}
            onOpenLiveVoice={() => {
              setIsLiveVoiceOpen(true);
              if (!isVoiceActive) handleToggleVoice();
            }}
          />
        </div>
      </div>

      {/* 3. Full-Screen Modern Live Voice View */}
      {isLiveVoiceOpen && (
        <ModernLiveVoiceView
          onBackToChat={() => setIsLiveVoiceOpen(false)}
          onEndCall={() => {
            if (isVoiceActive) handleToggleVoice();
            setIsLiveVoiceOpen(false);
            setAudioErrorMessage(null);
          }}
          voiceState={voiceState}
          isVoiceActive={isVoiceActive}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          audioEngine={audioEngineRef.current}
          lastAiTranscript={lastAiTranscript}
          interimTranscript={interimTranscript}
          currentVoice={currentVoice}
          errorMessage={audioErrorMessage}
          onRetryMic={handleToggleVoice}
        />
      )}

      {/* 4. Comprehensive Modern Settings Modal */}
      <ModernSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialSection={settingsSection}
        currentVoice={currentVoice}
        onSelectVoice={setCurrentVoice}
        currentLanguage={currentLanguage}
        onSelectLanguage={setCurrentLanguage}
        theme={theme}
        onSelectTheme={handleSelectTheme}
        onClearAllHistory={() => {
          setConversations([]);
          setMessages([]);
          localStorage.removeItem("auralive_conversations_v1");
          createNewConversation();
        }}
        onSupabaseStatusChange={checkSupabaseAndLoadConversations}
      />

      {/* 5. Navigation Items Dialog (Library, Projects, Schedule, Plugins, Search) */}
      <SidebarNavModal
        view={activeNavView}
        onClose={() => setActiveNavView(null)}
        conversations={conversations}
        onSelectConversation={(id) => {
          selectConversation(id);
          setActiveNavView(null);
        }}
        onNewChatWithPrompt={(promptText) => {
          createNewConversation();
          handleSendMessage(promptText);
        }}
        isSupabaseConfigured={isSupabaseConfigured}
        onOpenSettings={(sec) => {
          setSettingsSection((sec as SettingsSection) || "models");
          setIsSettingsOpen(true);
        }}
      />
    </div>
  );
}
