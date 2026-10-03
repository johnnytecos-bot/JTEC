import React, { useState, useEffect } from "react";
import { aiBrain, UserBrainProfile, MemoryItem, PersonaStyle } from "../services/aiBrain";
import {
  Brain,
  User,
  Sparkles,
  BookOpen,
  Plus,
  Trash2,
  Check,
  RotateCcw,
  X,
  Tag,
  Search,
  Zap,
  Briefcase,
  Heart,
  Target,
  Bookmark,
  SlidersHorizontal,
  Info,
} from "lucide-react";

interface BrainModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: () => void;
}

export const BrainModal: React.FC<BrainModalProps> = ({
  isOpen,
  onClose,
  onProfileUpdated,
}) => {
  const [profile, setProfile] = useState<UserBrainProfile>(aiBrain.getProfile());
  const [activeTab, setActiveTab] = useState<"profile" | "persona" | "memories">("profile");

  // New memory input
  const [newFact, setNewFact] = useState("");
  const [newCategory, setNewCategory] = useState<MemoryItem["category"]>("personal");
  const [memorySearch, setMemorySearch] = useState("");
  const [saveToast, setSaveToast] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setProfile(aiBrain.getProfile());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    aiBrain.saveProfile(profile);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
    if (onProfileUpdated) onProfileUpdated();
  };

  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFact.trim()) return;
    aiBrain.addMemory(newFact.trim(), newCategory);
    setProfile(aiBrain.getProfile());
    setNewFact("");
    if (onProfileUpdated) onProfileUpdated();
  };

  const handleDeleteMemory = (id: string) => {
    aiBrain.removeMemory(id);
    setProfile(aiBrain.getProfile());
    if (onProfileUpdated) onProfileUpdated();
  };

  const handleSelectPreset = (style: PersonaStyle) => {
    const updated = { ...profile, personaStyle: style };
    setProfile(updated);
    aiBrain.saveProfile(updated);
    if (onProfileUpdated) onProfileUpdated();
  };

  const filteredMemories = profile.memories.filter((m) =>
    m.fact.toLowerCase().includes(memorySearch.toLowerCase())
  );

  const categoryIcons: Record<string, React.ReactNode> = {
    work: <Briefcase className="w-3.5 h-3.5 text-sky-400" />,
    personal: <Heart className="w-3.5 h-3.5 text-pink-400" />,
    islamic: <Sparkles className="w-3.5 h-3.5 text-emerald-400" />,
    preferences: <Bookmark className="w-3.5 h-3.5 text-amber-400" />,
    goals: <Target className="w-3.5 h-3.5 text-emerald-400" />,
    architecture: <Briefcase className="w-3.5 h-3.5 text-purple-400" />,
    other: <Tag className="w-3.5 h-3.5 text-zinc-400" />,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="brain-title"
    >
      <div className="relative w-full max-w-3xl bg-zinc-900 border border-zinc-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-zinc-800 bg-zinc-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-rose-500/20 to-purple-500/20 text-rose-400 border border-rose-500/30">
              <Brain className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 id="brain-title" className="text-base font-bold text-white flex items-center gap-2">
                <span>Sana's Memory & Relationship Context</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {profile.memories.length} Memories
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Personalize who you are, how Sana responds, and what she remembers about your life and relationship
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {saveToast && (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 animate-fade-in">
                <Check className="w-3.5 h-3.5" />
                Saved!
              </span>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800/80 bg-zinc-950/40 px-6 gap-2 pt-2">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-xl transition border-b-2 ${
              activeTab === "profile"
                ? "border-purple-400 text-purple-300 bg-zinc-900"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <User className="w-4 h-4" />
            <span>My Life & Profile</span>
          </button>

          <button
            onClick={() => setActiveTab("persona")}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-xl transition border-b-2 ${
              activeTab === "persona"
                ? "border-sky-400 text-sky-300 bg-zinc-900"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Personality & Prompt</span>
          </button>

          <button
            onClick={() => setActiveTab("memories")}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-xl transition border-b-2 ${
              activeTab === "memories"
                ? "border-emerald-400 text-emerald-300 bg-zinc-900"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Memory Bank ({profile.memories.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* TAB 1: PROFILE */}
          {activeTab === "profile" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 flex items-start gap-3">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-zinc-300 leading-relaxed">
                  j TEC uses these details to speak to you personally as your tech brother and homie. He remembers your stack, your goals, and your conversation style.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    What should j TEC call you? (e.g. Johnny, bro, brother)
                  </label>
                  <input
                    type="text"
                    value={profile.userName}
                    onChange={(e) => setProfile({ ...profile, userName: e.target.value })}
                    placeholder="e.g. Johnny, bro, brother"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-sm focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Occupation, Craft, or Studies
                  </label>
                  <input
                    type="text"
                    value={profile.roleOccupation}
                    onChange={(e) => setProfile({ ...profile, roleOccupation: e.target.value })}
                    placeholder="e.g. Full-stack Developer, Designer, Student"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-sm focus:border-purple-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Location & Timezone Context
                </label>
                <input
                  type="text"
                  value={profile.location}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  placeholder="e.g. London, UK (GMT) or San Francisco, CA"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-sm focus:border-purple-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  About You & Your Current Life Chapter
                </label>
                <textarea
                  rows={3}
                  value={profile.bioSummary}
                  onChange={(e) => setProfile({ ...profile, bioSummary: e.target.value })}
                  placeholder="e.g. Building next-gen software, loves morning workouts, preparing to launch a startup, into sci-fi and tech podcasts..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-sm focus:border-purple-400 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Profile Updates</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: AI PERSONA & PROMPT */}
          {activeTab === "persona" && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-2">
                  Choose j TEC's Conversational Persona
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: "brother_chill" as PersonaStyle,
                      name: "Bro & Tech Partner",
                      desc: "Authentic, chill, human, and direct. Treats you like a real brother and homie.",
                      icon: "⚡",
                    },
                    {
                      id: "muslim_brother" as PersonaStyle,
                      name: "Muslim Brother & Companion",
                      desc: "Warm, faithful, humble. Returns Salam warmly, reminds of Barakah and deen.",
                      icon: "🕌",
                    },
                    {
                      id: "mentor_advisor" as PersonaStyle,
                      name: "Socratic Mentor & Coach",
                      desc: "Thoughtful, strategic, challenges assumptions, gives deep principled insights.",
                      icon: "🧠",
                    },
                    {
                      id: "concise_pro" as PersonaStyle,
                      name: "Ultra-Concise Pro",
                      desc: "High-signal, zero fluff. Pure facts, solutions, and code immediately.",
                      icon: "🎯",
                    },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset.id)}
                      className={`p-3.5 rounded-2xl text-left border transition ${
                        profile.personaStyle === preset.id
                          ? "bg-amber-500/10 border-amber-400 text-white shadow-md shadow-amber-500/10"
                          : "bg-zinc-950 hover:bg-zinc-800/80 border-zinc-800 text-zinc-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{preset.icon}</span>
                        <span className="font-bold text-sm">{preset.name}</span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">{preset.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Custom AI Prompt Instructions ("How j TEC Should Speak & Respond")
                </label>
                <p className="text-[11px] text-zinc-500 mb-2">
                  Add any specific guidance, habits, or topics (e.g., "Talk like a real human", "Return salam", "Keep greetings short"):
                </p>
                <textarea
                  rows={4}
                  value={profile.customInstructions}
                  onChange={(e) => setProfile({ ...profile, customInstructions: e.target.value })}
                  placeholder="e.g. Talk like a real human brother, avoid robotic greetings, match my energy, be sharp on TypeScript..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-sm focus:border-amber-400 focus:outline-none leading-relaxed font-mono"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-lg shadow-amber-500/20 transition flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Apply j TEC's Instructions</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: MEMORY BANK */}
          {activeTab === "memories" && (
            <div className="space-y-5">
              {/* Add Memory Form */}
              <form
                onSubmit={handleAddMemory}
                className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-3"
              >
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Teach Sana a Fact About Your Life & Relationship</span>
                </span>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={newFact}
                    onChange={(e) => setNewFact(e.target.value)}
                    placeholder="e.g. I prefer iced Americano, I go to the gym at 7 AM, I'm working on a voice AI app..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-sm focus:border-emerald-400 focus:outline-none"
                  />

                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as MemoryItem["category"])}
                    className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs font-semibold focus:outline-none"
                  >
                    <option value="work">💼 Work / Projects</option>
                    <option value="personal">❤️ Personal / Family</option>
                    <option value="preferences">🔖 Preferences / Taste</option>
                    <option value="goals">🎯 Goals & Ambitions</option>
                    <option value="other">📌 Other</option>
                  </select>

                  <button
                    type="submit"
                    disabled={!newFact.trim()}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-zinc-950 font-bold text-xs transition"
                  >
                    Remember
                  </button>
                </div>
              </form>

              {/* Memory Search & Auto-learn toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-500" />
                  <input
                    type="text"
                    value={memorySearch}
                    onChange={(e) => setMemorySearch(e.target.value)}
                    placeholder="Search memories..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-400">
                    <input
                      type="checkbox"
                      checked={profile.autoLearnEnabled}
                      onChange={(e) => {
                        const updated = { ...profile, autoLearnEnabled: e.target.checked };
                        setProfile(updated);
                        aiBrain.saveProfile(updated);
                      }}
                      className="rounded accent-emerald-500"
                    />
                    <span>Auto-learn new facts while talking</span>
                  </label>
                </div>
              </div>

              {/* Memory List */}
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {filteredMemories.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-2xl">
                    <BookOpen className="w-7 h-7 mx-auto mb-2 opacity-40" />
                    <p>No memories found</p>
                    <p className="text-[11px] text-zinc-600 mt-1">
                      Add a fact above so Sana remembers your life and relationship details.
                    </p>
                  </div>
                ) : (
                  filteredMemories.map((m) => (
                    <div
                      key={m.id}
                      className="group flex items-start justify-between gap-3 p-3.5 rounded-xl bg-zinc-950/70 hover:bg-zinc-950 border border-zinc-800/80 transition"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0 mt-0.5">
                          {categoryIcons[m.category] || categoryIcons.other}
                        </div>
                        <div>
                          <p className="text-xs text-zinc-200 leading-relaxed font-medium">
                            {m.fact}
                          </p>
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold font-mono">
                            {m.category}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteMemory(m.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition"
                        title="Forget this memory"
                        aria-label="Delete memory"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
