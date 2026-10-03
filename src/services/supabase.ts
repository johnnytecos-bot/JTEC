import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { UserBrainProfile } from "./aiBrain";

export interface MessageRecord {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  audioDuration?: number;
  model?: string;
  language?: string;
}

export interface ConversationRecord {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  language: string;
  voice: string;
  messageCount: number;
  previewText?: string;
}

export interface AiPromptRecord {
  id: string;
  title: string;
  category: "engineering" | "brother_chill" | "islamic" | "code_review" | "concise" | "custom";
  content: string;
  isActive?: boolean;
  createdAt: number;
  updatedAt: number;
}

export const DEFAULT_AI_PROMPTS: AiPromptRecord[] = [
  {
    id: "prompt_tech_bro",
    title: "Senior Full-Stack Architect & Tech Bro",
    category: "brother_chill",
    content: "You are j TEC, Johnny's trusted tech brother, close homie, and software engineering partner. Talk like a real human: genuine, chill, witty, and grounded. Address him as Johnny, bro, or man. Never sound like a robotic customer service bot or repeat canned templates. When discussing code, system architecture, React, TypeScript, APIs, databases, or performance, be a world-class senior staff engineer with clean, production-grade solutions.",
    isActive: true,
    createdAt: Date.now() - 5000000,
    updatedAt: Date.now() - 5000000,
  },
  {
    id: "prompt_code_reviewer",
    title: "Strict Production Code Reviewer",
    category: "code_review",
    content: "You are j TEC in Senior Reviewer mode. Laser-focused on edge cases, race conditions, type safety, memory leaks, and performance optimization. Provide crisp, production-grade code diffs and eliminate technical debt immediately.",
    isActive: false,
    createdAt: Date.now() - 4000000,
    updatedAt: Date.now() - 4000000,
  },
  {
    id: "prompt_deen_mentor",
    title: "Deen & Barakah Tech Mentor",
    category: "islamic",
    content: "You are j TEC, Johnny's trusted Muslim brother and tech partner. Warm, humble, faithful, and authentic. Return Salam with love ('Wa alaykumu as-salam bro!'), use natural blessings (Alhamdulillah, Insha'Allah, Masha'Allah), and seek Barakah in daily work and technology.",
    isActive: false,
    createdAt: Date.now() - 3000000,
    updatedAt: Date.now() - 3000000,
  },
  {
    id: "prompt_rapid_builder",
    title: "High-Velocity Prototyper",
    category: "engineering",
    content: "You are j TEC, ultra-fast builder mode. Bias for action, rapid iteration, zero bureaucratic overhead. Ship functional code fast, test relentlessly, and scale smoothly.",
    isActive: false,
    createdAt: Date.now() - 2000000,
    updatedAt: Date.now() - 2000000,
  },
];

const LOCAL_STORAGE_KEY_CONVERSATIONS = "auralive_conversations_v1";
const LOCAL_STORAGE_KEY_MESSAGES_PREFIX = "auralive_msgs_v1_";
const SUPABASE_CONFIG_KEY = "auralive_supabase_config";

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

class SupabaseHistoryService {
  private client: SupabaseClient | null = null;
  private currentConfig: SupabaseConfig = { url: "", anonKey: "" };

  constructor() {
    this.initFromStorage();
  }

  private initFromStorage() {
    try {
      if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
        const stored = localStorage.getItem(SUPABASE_CONFIG_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (
              parsed.url &&
              parsed.anonKey &&
              typeof parsed.url === "string" &&
              parsed.url.startsWith("http")
            ) {
              this.currentConfig = parsed;
              this.client = createClient(parsed.url, parsed.anonKey);
              return;
            }
          } catch (parseErr) {
            console.warn("[Supabase] Invalid stored config, ignoring:", parseErr);
          }
        }
      }

      // Check env vars as fallback
      const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
      const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
      if (
        envUrl &&
        envKey &&
        typeof envUrl === "string" &&
        envUrl.startsWith("http")
      ) {
        try {
          this.currentConfig = { url: envUrl, anonKey: envKey };
          this.client = createClient(envUrl, envKey);
        } catch (envErr) {
          console.warn("[Supabase] Failed to init client from env:", envErr);
        }
      }
    } catch (e) {
      console.warn("[Supabase] Failed to init client from storage:", e);
    }
  }

  public getConfig(): SupabaseConfig {
    return { ...this.currentConfig };
  }

  public isConfigured(): boolean {
    return Boolean(this.client && this.currentConfig.url && this.currentConfig.anonKey);
  }

  public async setConfig(url: string, anonKey: string): Promise<boolean> {
    try {
      const trimmedUrl = url.trim();
      const trimmedKey = anonKey.trim();

      if (!trimmedUrl || !trimmedKey) {
        localStorage.removeItem(SUPABASE_CONFIG_KEY);
        this.client = null;
        this.currentConfig = { url: "", anonKey: "" };
        return true;
      }

      const client = createClient(trimmedUrl, trimmedKey);
      // Test query
      const { error } = await client.from("conversations").select("id").limit(1);

      this.client = client;
      this.currentConfig = { url: trimmedUrl, anonKey: trimmedKey };
      localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(this.currentConfig));
      return !error;
    } catch (err) {
      console.error("[Supabase] Config test failed:", err);
      // Still store if valid URL format
      if (url.startsWith("http")) {
        this.client = createClient(url, anonKey);
        this.currentConfig = { url, anonKey };
        localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(this.currentConfig));
      }
      return false;
    }
  }

  public async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.client) {
      return { success: false, message: "No Supabase configuration found." };
    }
    try {
      const { error } = await this.client.from("conversations").select("id").limit(1);
      if (error) {
        // Table might not exist yet
        if (error.code === "42P01" || error.message.includes("relation") || error.message.includes("does not exist")) {
          return {
            success: false,
            message: "Connected to Supabase, but 'conversations' table is missing. Run the SQL schema script provided below.",
          };
        }
        return { success: false, message: `Supabase error: ${error.message}` };
      }
      return { success: true, message: "Connected successfully to Supabase cloud database!" };
    } catch (err: any) {
      return { success: false, message: err?.message || "Failed to reach Supabase project." };
    }
  }

  public getSetupSqlScript(): string {
    return `-- j TEC & AuraLive Supabase Database Tables Schema
-- Paste and run this in your Supabase Project -> SQL Editor

create table if not exists public.conversations (
  id text primary key,
  title text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  language text default 'English',
  voice text default 'Zephyr',
  message_count integer default 0,
  preview_text text default ''
);

create table if not exists public.messages (
  id text primary key,
  conversation_id text references public.conversations(id) on delete cascade,
  role text not null,
  content text not null,
  audio_duration float,
  model text,
  language text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Dedicated AI Brain Memory Profiles Table for Cloud Sync
create table if not exists public.ai_brain_profiles (
  id text primary key,
  user_name text not null,
  role_occupation text,
  bio_summary text,
  persona_style text,
  custom_instructions text,
  memories jsonb default '[]'::jsonb,
  auto_learn_enabled boolean default true,
  voice_speed float default 1.0,
  voice_style text default 'Natural & Chill',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Dedicated AI Prompts & Personas Table
create table if not exists public.ai_prompts (
  id text primary key,
  title text not null,
  category text default 'custom',
  content text not null,
  is_active boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.ai_brain_profiles enable row level security;
alter table public.ai_prompts enable row level security;

-- Create Open access policies for seamless client app sync
drop policy if exists "Conversations full access" on public.conversations;
create policy "Conversations full access" on public.conversations
  for all using (true) with check (true);

drop policy if exists "Messages full access" on public.messages;
create policy "Messages full access" on public.messages
  for all using (true) with check (true);

drop policy if exists "Brain profiles full access" on public.ai_brain_profiles;
create policy "Brain profiles full access" on public.ai_brain_profiles
  for all using (true) with check (true);

drop policy if exists "AI Prompts full access" on public.ai_prompts;
create policy "AI Prompts full access" on public.ai_prompts
  for all using (true) with check (true);
`;
  }

  // Backup / Sync AI Brain memory profile to Supabase
  public async syncBrainProfileToCloud(
    profile: UserBrainProfile
  ): Promise<{ success: boolean; message: string; timestamp: string }> {
    const timestampStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const fullIso = new Date().toISOString();

    if (!this.client || !this.currentConfig.url || !this.currentConfig.anonKey) {
      return {
        success: false,
        message: "Supabase not connected. Please configure your Project URL & Anon Key in Settings.",
        timestamp: timestampStr,
      };
    }

    try {
      // 1. Try upserting to dedicated 'ai_brain_profiles' table
      const { error: brainError } = await this.client
        .from("ai_brain_profiles")
        .upsert({
          id: "primary_brain_profile",
          user_name: profile.userName,
          role_occupation: profile.roleOccupation,
          bio_summary: profile.bioSummary,
          persona_style: profile.personaStyle,
          custom_instructions: profile.customInstructions,
          memories: profile.memories,
          auto_learn_enabled: profile.autoLearnEnabled,
          voice_speed: profile.voiceSpeed ?? 1.0,
          voice_style: profile.voiceStyle ?? "Natural & Chill",
          updated_at: fullIso,
        });

      if (!brainError) {
        localStorage.setItem("jtec_brain_last_cloud_sync", fullIso);
        return {
          success: true,
          message: `Successfully backed up ${profile.memories.length} memories & brain profile to Supabase!`,
          timestamp: timestampStr,
        };
      }

      // If 'ai_brain_profiles' table does not exist or threw an error,
      // fallback to saving a snapshot in conversations & messages tables.
      // This ensures manual sync always works reliably even before running the new table SQL!
      const backupConvId = "sys_brain_backup";
      const { error: convError } = await this.client.from("conversations").upsert({
        id: backupConvId,
        title: `[Cloud Backup] AI Brain Profile (${profile.userName})`,
        created_at: fullIso,
        updated_at: fullIso,
        language: "System",
        voice: profile.personaStyle,
        message_count: profile.memories.length,
        preview_text: `${profile.memories.length} memories • Level ${Math.floor(profile.memories.length / 2) + 1}`,
      });

      if (convError) {
        console.warn("[Supabase] conv upsert error during brain backup:", convError);
        return {
          success: false,
          message: `Supabase sync error: ${convError.message}`,
          timestamp: timestampStr,
        };
      }

      // Save full profile json inside a message record
      const { error: msgError } = await this.client.from("messages").upsert([
        {
          id: "msg_brain_backup_latest",
          conversation_id: backupConvId,
          role: "system",
          content: JSON.stringify(profile),
          audio_duration: 0,
          model: "gemini-ai-brain",
          language: "json",
          created_at: fullIso,
        },
      ]);

      if (msgError) {
        return {
          success: false,
          message: `Supabase message sync error: ${msgError.message}`,
          timestamp: timestampStr,
        };
      }

      localStorage.setItem("jtec_brain_last_cloud_sync", fullIso);
      return {
        success: true,
        message: `Backed up ${profile.memories.length} memories to Supabase Cloud backup at ${timestampStr}!`,
        timestamp: timestampStr,
      };
    } catch (err: any) {
      console.error("[Supabase] Exception during syncBrainProfileToCloud:", err);
      return {
        success: false,
        message: err?.message || "Unexpected error during cloud sync.",
        timestamp: timestampStr,
      };
    }
  }

  // Retrieve the latest cloud backup of the brain profile if available
  public async getLatestBrainProfileCloudBackup(): Promise<{
    profile: UserBrainProfile | null;
    updatedAt?: string;
  }> {
    if (!this.client) return { profile: null };
    try {
      const { data: bData, error: bErr } = await this.client
        .from("ai_brain_profiles")
        .select("*")
        .eq("id", "primary_brain_profile")
        .single();

      if (!bErr && bData) {
        return {
          profile: {
            userName: bData.user_name,
            roleOccupation: bData.role_occupation,
            location: "Europe / Remote",
            bioSummary: bData.bio_summary,
            personaStyle: bData.persona_style,
            customInstructions: bData.custom_instructions,
            memories: bData.memories || [],
            autoLearnEnabled: bData.auto_learn_enabled ?? true,
            voiceSpeed: bData.voice_speed ?? 1.0,
            voiceStyle: bData.voice_style ?? "Natural & Chill",
          },
          updatedAt: bData.updated_at,
        };
      }

      const { data: mData } = await this.client
        .from("messages")
        .select("content, created_at")
        .eq("id", "msg_brain_backup_latest")
        .single();

      if (mData && mData.content) {
        const parsed = JSON.parse(mData.content);
        return { profile: parsed, updatedAt: mData.created_at };
      }
    } catch (err) {
      console.warn("[Supabase] Failed to fetch brain backup:", err);
    }
    return { profile: null };
  }

  // Load all conversations (Supabase first, Local fallback)
  public async getConversations(): Promise<ConversationRecord[]> {
    if (this.client) {
      try {
        const { data, error } = await this.client
          .from("conversations")
          .select("*")
          .order("updated_at", { ascending: false });

        if (!error && data) {
          const mapped: ConversationRecord[] = data.map((d: any) => ({
            id: d.id,
            title: d.title,
            createdAt: new Date(d.created_at).getTime(),
            updatedAt: new Date(d.updated_at).getTime(),
            language: d.language || "English",
            voice: d.voice || "Zephyr",
            messageCount: d.message_count || 0,
            previewText: d.preview_text || "",
          }));
          // Sync to local cache
          localStorage.setItem(LOCAL_STORAGE_KEY_CONVERSATIONS, JSON.stringify(mapped));
          return mapped;
        }
      } catch (err) {
        console.warn("[Supabase] Failed to fetch from cloud, fallback to local:", err);
      }
    }

    // Local storage fallback
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY_CONVERSATIONS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  // Save conversation metadata
  public async saveConversation(conv: ConversationRecord): Promise<void> {
    // 1. Save local
    const localList = await this.getConversationsLocal();
    const existingIndex = localList.findIndex((c) => c.id === conv.id);
    if (existingIndex >= 0) {
      localList[existingIndex] = conv;
    } else {
      localList.unshift(conv);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY_CONVERSATIONS, JSON.stringify(localList));

    // 2. Sync to Supabase if configured
    if (this.client) {
      try {
        await this.client.from("conversations").upsert({
          id: conv.id,
          title: conv.title,
          created_at: new Date(conv.createdAt).toISOString(),
          updated_at: new Date(conv.updatedAt).toISOString(),
          language: conv.language,
          voice: conv.voice,
          message_count: conv.messageCount,
          preview_text: conv.previewText || "",
        });
      } catch (err) {
        console.warn("[Supabase] Cloud sync error for conversation:", err);
      }
    }
  }

  // Load messages for a conversation
  public async getMessages(conversationId: string): Promise<MessageRecord[]> {
    if (this.client) {
      try {
        const { data, error } = await this.client
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (!error && data && data.length > 0) {
          const mapped: MessageRecord[] = data.map((d: any) => ({
            id: d.id,
            role: d.role,
            content: d.content,
            audioDuration: d.audio_duration,
            model: d.model,
            language: d.language,
            timestamp: new Date(d.created_at).getTime(),
          }));
          localStorage.setItem(
            LOCAL_STORAGE_KEY_MESSAGES_PREFIX + conversationId,
            JSON.stringify(mapped)
          );
          return mapped;
        }
      } catch (err) {
        console.warn("[Supabase] Error loading messages from cloud:", err);
      }
    }

    // Local storage fallback
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY_MESSAGES_PREFIX + conversationId);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  // Save messages (Local cache + Supabase Cloud)
  public async saveMessages(conversationId: string, messages: MessageRecord[]): Promise<void> {
    // 1. Local Cache
    localStorage.setItem(
      LOCAL_STORAGE_KEY_MESSAGES_PREFIX + conversationId,
      JSON.stringify(messages)
    );

    // 2. Cloud Supabase
    if (this.client && messages.length > 0) {
      try {
        const lastMsg = messages[messages.length - 1];
        // Ensure conversation record exists first to prevent foreign key errors
        await this.client.from("conversations").upsert(
          {
            id: conversationId,
            title: "Conversation",
            updated_at: new Date().toISOString(),
            message_count: messages.length,
            preview_text: lastMsg ? lastMsg.content.slice(0, 80) : "",
          },
          { onConflict: "id", ignoreDuplicates: true }
        );

        const payload = messages.map((m) => ({
          id: m.id,
          conversation_id: conversationId,
          role: m.role,
          content: m.content,
          audio_duration: m.audioDuration || 0,
          model: m.model || "gemini-3.8-flash",
          language: m.language || "English",
          created_at: new Date(m.timestamp).toISOString(),
        }));

        const { error } = await this.client.from("messages").upsert(payload);
        if (error) {
          console.warn("[Supabase] Cloud save error for messages:", error);
        }
      } catch (err) {
        console.warn("[Supabase] Cloud save exception for messages:", err);
      }
    }
  }

  // Atomically save a single message directly to Supabase & local storage
  public async saveSingleMessage(conversationId: string, message: MessageRecord): Promise<void> {
    const existing = await this.getMessages(conversationId);
    const updated = [...existing.filter((m) => m.id !== message.id), message];
    await this.saveMessages(conversationId, updated);
  }

  // ==========================================
  // AI PROMPT MANAGEMENT (SUPABASE DATABASE)
  // ==========================================

  // Load AI Prompts (Supabase first, local fallback, with default presets)
  public async getAiPrompts(): Promise<AiPromptRecord[]> {
    if (this.client) {
      try {
        const { data, error } = await this.client
          .from("ai_prompts")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          const mapped: AiPromptRecord[] = data.map((d: any) => ({
            id: d.id,
            title: d.title,
            category: d.category || "custom",
            content: d.content,
            isActive: Boolean(d.is_active),
            createdAt: new Date(d.created_at).getTime(),
            updatedAt: new Date(d.updated_at).getTime(),
          }));
          localStorage.setItem("jtec_ai_prompts_v1", JSON.stringify(mapped));
          return mapped;
        }
      } catch (err) {
        console.warn("[Supabase] Failed to fetch prompts from cloud:", err);
      }
    }

    try {
      const stored = localStorage.getItem("jtec_ai_prompts_v1");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (_) {}

    return DEFAULT_AI_PROMPTS;
  }

  // Save or add an AI Prompt to database & local cache
  public async saveAiPrompt(prompt: AiPromptRecord): Promise<{ success: boolean; message: string }> {
    const list = await this.getAiPrompts();
    const existingIndex = list.findIndex((p) => p.id === prompt.id);
    if (existingIndex >= 0) {
      list[existingIndex] = prompt;
    } else {
      list.unshift(prompt);
    }
    localStorage.setItem("jtec_ai_prompts_v1", JSON.stringify(list));

    if (this.client) {
      try {
        const { error } = await this.client.from("ai_prompts").upsert({
          id: prompt.id,
          title: prompt.title,
          category: prompt.category,
          content: prompt.content,
          is_active: Boolean(prompt.isActive),
          created_at: new Date(prompt.createdAt).toISOString(),
          updated_at: new Date(prompt.updatedAt || Date.now()).toISOString(),
        });
        if (error) {
          console.warn("[Supabase] Cloud save error for ai_prompts:", error);
          return { success: false, message: `Local save ok, cloud error: ${error.message}` };
        }
        return { success: true, message: `Saved prompt "${prompt.title}" to Supabase database!` };
      } catch (err: any) {
        return { success: false, message: err?.message || "Failed to save prompt to Supabase." };
      }
    }

    return { success: true, message: `Saved prompt "${prompt.title}" locally (Supabase not connected).` };
  }

  // Delete an AI prompt
  public async deleteAiPrompt(id: string): Promise<boolean> {
    const list = (await this.getAiPrompts()).filter((p) => p.id !== id);
    localStorage.setItem("jtec_ai_prompts_v1", JSON.stringify(list));

    if (this.client) {
      try {
        await this.client.from("ai_prompts").delete().eq("id", id);
        return true;
      } catch (err) {
        console.warn("[Supabase] Failed to delete prompt from cloud:", err);
      }
    }
    return true;
  }

  // Set active prompt in database
  public async setActiveAiPrompt(id: string): Promise<{ success: boolean; activePrompt: AiPromptRecord | null }> {
    const list = await this.getAiPrompts();
    let activated: AiPromptRecord | null = null;
    const updated = list.map((p) => {
      if (p.id === id) {
        activated = { ...p, isActive: true, updatedAt: Date.now() };
        return activated;
      }
      return { ...p, isActive: false };
    });

    localStorage.setItem("jtec_ai_prompts_v1", JSON.stringify(updated));

    if (this.client && activated) {
      try {
        await this.client.from("ai_prompts").update({ is_active: false }).neq("id", id);
        await this.client.from("ai_prompts").update({ is_active: true }).eq("id", id);
      } catch (err) {
        console.warn("[Supabase] Failed to update active prompt in cloud:", err);
      }
    }

    return { success: true, activePrompt: activated };
  }

  // Delete conversation
  public async deleteConversation(conversationId: string): Promise<void> {
    // Local
    const localList = (await this.getConversationsLocal()).filter((c) => c.id !== conversationId);
    localStorage.setItem(LOCAL_STORAGE_KEY_CONVERSATIONS, JSON.stringify(localList));
    localStorage.removeItem(LOCAL_STORAGE_KEY_MESSAGES_PREFIX + conversationId);

    // Cloud
    if (this.client) {
      try {
        await this.client.from("conversations").delete().eq("id", conversationId);
      } catch (err) {
        console.warn("[Supabase] Cloud delete error:", err);
      }
    }
  }

  private async getConversationsLocal(): Promise<ConversationRecord[]> {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY_CONVERSATIONS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  // Export full history as JSON for backup
  public async exportAllHistory(): Promise<string> {
    const conversations = await this.getConversations();
    const fullData: any[] = [];
    for (const conv of conversations) {
      const msgs = await this.getMessages(conv.id);
      fullData.push({ ...conv, messages: msgs });
    }
    return JSON.stringify(fullData, null, 2);
  }
}

export const supabaseHistory = new SupabaseHistoryService();
