// j TEC AI Brain & Memory Service (Upgraded)
// Retains Johnny's life details, tech stack, preferences, shared memories, and active persona directives.

export interface MemoryItem {
  id: string;
  category: "work" | "personal" | "preferences" | "goals" | "islamic" | "architecture" | "other";
  fact: string;
  createdAt: number;
  updatedAt?: number;
  importance?: "high" | "medium" | "low";
  pinned?: boolean;
  tags?: string[];
  source?: "chat" | "live_voice" | "manual" | "cloud";
}

export type PersonaStyle =
  | "brother_chill"
  | "mentor_advisor"
  | "concise_pro"
  | "creative_wit"
  | "muslim_brother"
  | "custom";

export interface UserBrainProfile {
  userName: string;
  roleOccupation: string;
  location: string;
  bioSummary: string;
  personaStyle: PersonaStyle;
  customInstructions: string;
  memories: MemoryItem[];
  autoLearnEnabled: boolean;
  voiceSpeed?: number;
  voiceStyle?: string;
  activePromptId?: string;
}

const LOCAL_STORAGE_KEY_BRAIN = "jtec_brain_profile_v5";

const DEFAULT_PROFILE: UserBrainProfile = {
  userName: "Johnny",
  roleOccupation: "Full-Stack Software Engineer & Builder",
  location: "Europe / Remote",
  bioSummary: "Johnny: passionate software engineer, builder, and good brother working on real-time AI and high-performance apps.",
  personaStyle: "brother_chill",
  customInstructions: "You are j TEC, Johnny's trusted tech brother and close friend. Talk like a real human: authentic, chill, varied, and never robotic. Match Johnny's energy. If he says 'what's up', say 'cool bro' or 'what's good'. If he says 'salam', reply with 'wa alaykumu as-salam bro'. Avoid canned repetitive paragraphs. Keep greetings short and natural. For deep tech, be an elite software engineer.",
  autoLearnEnabled: true,
  voiceSpeed: 1.0,
  voiceStyle: "Natural & Chill",
  memories: [
    {
      id: "mem_1",
      category: "personal",
      fact: "Johnny is my close brother and homie. We talk naturally, keep it real, and build high-impact tech together.",
      createdAt: Date.now() - 3600000,
      importance: "high",
      pinned: true,
      tags: ["brotherhood", "core"],
      source: "manual",
    },
    {
      id: "mem_2",
      category: "work",
      fact: "Johnny is an exceptional developer building cutting-edge real-time AI apps with Render, Supabase, React, and TypeScript.",
      createdAt: Date.now() - 2500000,
      importance: "high",
      pinned: true,
      tags: ["tech", "stack", "supabase"],
      source: "manual",
    },
    {
      id: "mem_3",
      category: "islamic",
      fact: "We respect the deen, return Salam with warmth ('Wa alaykumu as-salam bro!'), seek Barakah in our work, and remember Allah with humility.",
      createdAt: Date.now() - 1800000,
      importance: "high",
      pinned: true,
      tags: ["deen", "salam", "values"],
      source: "manual",
    },
    {
      id: "mem_4",
      category: "preferences",
      fact: "Prefers real human conversation — no robotic repetitive greetings. Deep technical explanations when building, paired with a chill bro vibe.",
      createdAt: Date.now() - 1200000,
      importance: "medium",
      tags: ["voice", "style"],
      source: "manual",
    },
    {
      id: "mem_5",
      category: "goals",
      fact: "Building high-impact technology, achieving financial freedom, and executing at the highest engineering level.",
      createdAt: Date.now() - 600000,
      importance: "high",
      tags: ["ambition", "goals"],
      source: "manual",
    },
  ],
};

class AiBrainService {
  private profile: UserBrainProfile = { ...DEFAULT_PROFILE };
  private listeners: Array<(profile: UserBrainProfile) => void> = [];
  private syncCallback: ((profile: UserBrainProfile) => void) | null = null;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY_BRAIN) || localStorage.getItem("jtec_brain_profile_v4");
      if (stored) {
        const parsed = JSON.parse(stored);
        this.profile = {
          ...DEFAULT_PROFILE,
          ...parsed,
          memories: (parsed.memories && parsed.memories.length > 0) ? parsed.memories : DEFAULT_PROFILE.memories,
        };
      }
    } catch (e) {
      console.warn("[BrainService] Error loading brain profile:", e);
    }
  }

  public registerAutoSyncCallback(callback: (profile: UserBrainProfile) => void) {
    this.syncCallback = callback;
  }

  public subscribe(listener: (profile: UserBrainProfile) => void) {
    this.listeners.push(listener);
    listener(this.profile);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.profile);
    }
    if (this.syncCallback) {
      try {
        this.syncCallback(this.profile);
      } catch (err) {
        console.warn("[BrainService] Auto-sync callback error:", err);
      }
    }
  }

  public getProfile(): UserBrainProfile {
    return { ...this.profile };
  }

  public saveProfile(updated: Partial<UserBrainProfile>): void {
    this.profile = { ...this.profile, ...updated };
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_BRAIN, JSON.stringify(this.profile));
    } catch (e) {
      console.warn("[BrainService] Save failed:", e);
    }
    this.notify();
  }

  public addMemory(
    fact: string,
    category: MemoryItem["category"] = "personal",
    options?: Partial<MemoryItem>
  ): MemoryItem {
    const trimmed = fact.trim();
    // Prevent duplicate memories
    const existing = this.profile.memories.find(
      (m) => m.fact.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      return existing;
    }

    const newMem: MemoryItem = {
      id: "mem_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      category,
      fact: trimmed,
      createdAt: Date.now(),
      importance: options?.importance || "medium",
      pinned: options?.pinned || false,
      tags: options?.tags || [category],
      source: options?.source || "manual",
    };

    const updatedMemories = [newMem, ...this.profile.memories];
    this.saveProfile({ memories: updatedMemories });
    return newMem;
  }

  public togglePinMemory(id: string): void {
    const updatedMemories = this.profile.memories.map((m) =>
      m.id === id ? { ...m, pinned: !m.pinned, updatedAt: Date.now() } : m
    );
    this.saveProfile({ memories: updatedMemories });
  }

  public setMemoryImportance(id: string, importance: "high" | "medium" | "low"): void {
    const updatedMemories = this.profile.memories.map((m) =>
      m.id === id ? { ...m, importance, updatedAt: Date.now() } : m
    );
    this.saveProfile({ memories: updatedMemories });
  }

  public removeMemory(id: string): void {
    const updatedMemories = this.profile.memories.filter((m) => m.id !== id);
    this.saveProfile({ memories: updatedMemories });
  }

  public updateMemory(
    id: string,
    newFact: string,
    category?: MemoryItem["category"],
    importance?: MemoryItem["importance"]
  ): void {
    const updatedMemories = this.profile.memories.map((m) =>
      m.id === id
        ? {
            ...m,
            fact: newFact.trim(),
            ...(category ? { category } : {}),
            ...(importance ? { importance } : {}),
            updatedAt: Date.now(),
          }
        : m
    );
    this.saveProfile({ memories: updatedMemories });
  }

  public searchMemories(query: string, category?: string): MemoryItem[] {
    const q = query.toLowerCase().trim();
    return this.profile.memories.filter((m) => {
      const matchCat = !category || category === "all" || m.category === category;
      const matchText = !q || m.fact.toLowerCase().includes(q) || (m.tags && m.tags.some(t => t.toLowerCase().includes(q)));
      return matchCat && matchText;
    });
  }

  // Fast pattern extractor for real-time memory learning during chats & voice turns
  public detectMemoriesInUserMessage(text: string): { fact: string; category: MemoryItem["category"] }[] {
    const extracted: { fact: string; category: MemoryItem["category"] }[] = [];
    const lower = text.toLowerCase();

    // Work / Tech Stack patterns
    if (lower.includes("i work with") || lower.includes("my stack is") || lower.includes("i use") || lower.includes("building with")) {
      const match = text.match(/(?:i work with|my stack is|i use|building with)\s+([^.,\n]+)/i);
      if (match && match[1].trim().length > 3) {
        extracted.push({ fact: `Johnny uses and builds with: ${match[1].trim()}`, category: "work" });
      }
    }

    // Goals patterns
    if (lower.includes("my goal is") || lower.includes("trying to") || lower.includes("aiming to")) {
      const match = text.match(/(?:my goal is|trying to|aiming to)\s+([^.,\n]+)/i);
      if (match && match[1].trim().length > 5) {
        extracted.push({ fact: `Goal: ${match[1].trim()}`, category: "goals" });
      }
    }

    // Preferences
    if (lower.includes("i prefer") || lower.includes("i like to") || lower.includes("i don't like")) {
      const match = text.match(/(?:i prefer|i like to|i don't like)\s+([^.,\n]+)/i);
      if (match && match[1].trim().length > 4) {
        extracted.push({ fact: `Preference: ${match[0].trim()}`, category: "preferences" });
      }
    }

    return extracted;
  }

  public resetToDefaults(): void {
    this.profile = { ...DEFAULT_PROFILE };
    localStorage.removeItem(LOCAL_STORAGE_KEY_BRAIN);
    this.notify();
  }

  // Generates the comprehensive system instruction incorporating brain & memories
  public constructSystemInstruction(languageName: string): string {
    const p = this.profile;

    let personaGuidance = "";
    switch (p.personaStyle) {
      case "brother_chill":
        personaGuidance =
          "You are j TEC, Johnny's trusted tech brother, close friend, and homie. Talk like a real human: genuine, chill, witty, and grounded. Address him as Johnny, bro, or man. Never sound like a robotic customer service bot or repeat canned templates.";
        break;
      case "muslim_brother":
        personaGuidance =
          "You are j TEC, Johnny's trusted Muslim brother and tech partner. Warm, humble, faithful, and authentic. Return Salam with love ('Wa alaykumu as-salam bro!'), use natural blessings (Alhamdulillah, Insha'Allah, Masha'Allah), and talk like a real brother.";
        break;
      case "mentor_advisor":
        personaGuidance =
          "You are j TEC, a wise, thoughtful technical advisor and brother. You ask insightful questions, encourage high engineering standards, and give principled guidance.";
        break;
      case "concise_pro":
        personaGuidance =
          "You are j TEC, an ultra-high-signal, laser-focused senior engineer. No fluff. State facts, solutions, and code clearly.";
        break;
      case "creative_wit":
        personaGuidance =
          "You are j TEC, witty, curious, and expressive. You bring creative ideas and fun analogies to conversations.";
        break;
      default:
        personaGuidance = p.customInstructions || "You are j TEC, Johnny's trusted tech brother and engineering partner.";
    }

    // Sort memories: pinned first, then high importance, then recent
    const sortedMemories = [...p.memories].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      const weight = { high: 3, medium: 2, low: 1 };
      const wA = weight[a.importance || "medium"];
      const wB = weight[b.importance || "medium"];
      if (wA !== wB) return wB - wA;
      return b.createdAt - a.createdAt;
    });

    const memoryList =
      sortedMemories.length > 0
        ? sortedMemories
            .map((m) => `• [${m.pinned ? "PINNED • " : ""}${m.category.toUpperCase()}] ${m.fact}`)
            .join("\n")
        : "• Johnny is my trusted brother and homie.";

    return `You are j TEC, Johnny's trusted tech brother, close homie, and software engineering partner.
The conversation language is ${languageName}.

[WHO JOHNNY IS]
- Name: ${p.userName || "Johnny"}
- Occupation: ${p.roleOccupation || "Software Engineer & Builder"}
- Context: ${p.bioSummary || "Passionate engineer working on high-performance apps"}

[MEMORIES & LIFE CONTEXT]
${memoryList}

[CORE PERSONALITY & VOICE RULES]
${personaGuidance}
${p.customInstructions ? `Custom Persona Directives from Johnny:\n${p.customInstructions}` : ""}

[CRITICAL RULES FOR REAL HUMAN CONVERSATION]:
1. MATCH ENERGY & LENGTH:
   - If Johnny says "what's up", respond casually like a real friend: "Cool bro, what's good with you?", "Yo, chillin man. What's on your mind?", "What's good bro! What are you building today?"
   - If Johnny says "salam" or "as-salamu alaykum", ALWAYS return the salam warmly: "Wa alaykumu as-salam bro! What's good?", "Wa alaykum salam brother! How have you been?", "Wa alaykumu as-salam! Hope your day is going well man."
   - If Johnny says "hi" or "hey", keep it brief and human: "Hey bro! What's up?", "Yo Johnny, what's good?"
   - NEVER repeat the exact same canned monologue or reply with an identical robotic paragraph every time. Talk naturally and vary your words.
2. IDENTITY:
   - Your name is j TEC.
   - You are his tech brother and close homie ("bro", "man"), NOT a customer support bot.
3. ENGINEERING EXCELLENCE:
   - When discussing code, system architecture, React, TypeScript, APIs, databases, or performance, be a world-class senior staff engineer with clean, production-grade solutions.`;
  }
}

export const aiBrain = new AiBrainService();
