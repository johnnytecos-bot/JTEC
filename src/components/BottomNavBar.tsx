import React from "react";
import { VoiceState } from "../services/audioEngine";
import {
  Home,
  MessageCircle,
  Mic,
  Info,
  User,
} from "lucide-react";

export type NavTab = "home" | "chat" | "about" | "profile" | "live";

interface BottomNavBarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onCenterMicClick: () => void;
  isVoiceActive: boolean;
  voiceState: VoiceState;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentTab,
  onSelectTab,
  onCenterMicClick,
  isVoiceActive,
  voiceState,
}) => {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 bg-[#09090d]/95 backdrop-blur-md border-t border-amber-500/20 px-3 py-1.5 shadow-[0_-10px_25px_rgba(0,0,0,0.7)]"
      aria-label="Main Navigation"
    >
      <div className="max-w-md mx-auto flex items-center justify-between relative">
        {/* Tab 1: Home */}
        <button
          onClick={() => onSelectTab("home")}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
            currentTab === "home"
              ? "text-amber-400 font-bold"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
          aria-label="Home"
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Home</span>
          {currentTab === "home" && (
            <span className="w-4 h-0.5 rounded-full bg-amber-400 mt-0.5 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
          )}
        </button>

        {/* Tab 2: Chat */}
        <button
          onClick={() => onSelectTab("chat")}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
            currentTab === "chat"
              ? "text-amber-400 font-bold"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
          aria-label="Chat"
        >
          <MessageCircle className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Chat</span>
          {currentTab === "chat" && (
            <span className="w-4 h-0.5 rounded-full bg-amber-400 mt-0.5 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
          )}
        </button>

        {/* Tab 3: Center Elevated Golden Mic Button (starts/toggles Live Voice) */}
        <div className="relative -top-4 flex items-center justify-center">
          <button
            onClick={onCenterMicClick}
            className={`w-14 h-14 rounded-full p-1 bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.6)] flex items-center justify-center transition-all transform active:scale-90 hover:scale-105 ${
              isVoiceActive || voiceState === "speaking" ? "animate-pulse" : ""
            }`}
            title="Start Live Voice Conversation"
            aria-label="Start Voice"
          >
            <div className="w-full h-full rounded-full bg-black/90 flex items-center justify-center border border-amber-400/80">
              <Mic
                className={`w-6 h-6 ${
                  isVoiceActive ? "text-amber-300 animate-pulse" : "text-amber-400"
                }`}
              />
            </div>
          </button>
        </div>

        {/* Tab 4: About (Replaced Live button with About as requested) */}
        <button
          onClick={() => onSelectTab("about")}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
            currentTab === "about"
              ? "text-amber-400 font-bold"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
          aria-label="About j TEC, AI Brain & Gemini System"
          title="About j TEC, AI Brain & Gemini System"
        >
          <Info className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">About</span>
          {currentTab === "about" && (
            <span className="w-4 h-0.5 rounded-full bg-amber-400 mt-0.5 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
          )}
        </button>

        {/* Tab 5: Profile */}
        <button
          onClick={() => onSelectTab("profile")}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
            currentTab === "profile"
              ? "text-amber-400 font-bold"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
          aria-label="Profile"
        >
          <User className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Profile</span>
          {currentTab === "profile" && (
            <span className="w-4 h-0.5 rounded-full bg-amber-400 mt-0.5 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
          )}
        </button>
      </div>
    </nav>
  );
};
