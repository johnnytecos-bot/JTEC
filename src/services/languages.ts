export interface LanguageOption {
  code: string; // e.g. en-US, es-ES
  iso: string; // e.g. en, es
  name: string;
  nativeName: string;
  flag: string;
  greeting: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en-US", iso: "en", name: "English (US)", nativeName: "English", flag: "🇺🇸", greeting: "Hello! How can I help you today?" },
  { code: "en-GB", iso: "en", name: "English (UK)", nativeName: "English (UK)", flag: "🇬🇧", greeting: "Cheerio! What would you like to explore?" },
  { code: "es-ES", iso: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸", greeting: "¡Hola! ¿En qué puedo ayudarte hoy?" },
  { code: "fr-FR", iso: "fr", name: "French", nativeName: "Français", flag: "🇫🇷", greeting: "Bonjour ! Comment puis-je vous aider ?" },
  { code: "de-DE", iso: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪", greeting: "Hallo! Wie kann ich dir heute helfen?" },
  { code: "ja-JP", iso: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵", greeting: "こんにちは！何かお手伝いできることはありますか？" },
  { code: "zh-CN", iso: "zh", name: "Mandarin Chinese (Simplified)", nativeName: "简体中文", flag: "🇨🇳", greeting: "你好！今天有什么我可以帮你的？" },
  { code: "zh-TW", iso: "zh", name: "Traditional Chinese", nativeName: "繁體中文", flag: "🇹🇼", greeting: "你好！今天有什麼我可以協助你的？" },
  { code: "ar-SA", iso: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦", greeting: "مرحباً! كيف يمكنني مساعدتك اليوم؟" },
  { code: "hi-IN", iso: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳", greeting: "नमस्ते! आज मैं आपकी क्या सहायता कर सकता हूँ?" },
  { code: "pt-BR", iso: "pt", name: "Portuguese (Brazil)", nativeName: "Português", flag: "🇧🇷", greeting: "Olá! Como posso te ajudar hoje?" },
  { code: "it-IT", iso: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹", greeting: "Ciao! Come posso esserti utile oggi?" },
  { code: "ko-KR", iso: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷", greeting: "안녕하세요! 오늘 무엇을 도와드릴까요?" },
  { code: "ru-RU", iso: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺", greeting: "Привет! Чем я могу помочь тебе сегодня?" },
  { code: "nl-NL", iso: "nl", name: "Dutch", nativeName: "Nederlands", flag: "🇳🇱", greeting: "Hallo! Waarmee kan ik je vandaag helpen?" },
  { code: "tr-TR", iso: "tr", name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷", greeting: "Merhaba! Bugün size nasıl yardımcı olabilirim?" },
  { code: "pl-PL", iso: "pl", name: "Polish", nativeName: "Polski", flag: "🇵🇱", greeting: "Cześć! W czym mogę Ci dzisiaj pomóc?" },
  { code: "vi-VN", iso: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", flag: "🇻🇳", greeting: "Xin chào! Tôi có thể giúp gì cho bạn hôm nay?" },
  { code: "id-ID", iso: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", flag: "🇮🇩", greeting: "Halo! Ada yang bisa saya bantu hari ini?" },
  { code: "sv-SE", iso: "sv", name: "Swedish", nativeName: "Svenska", flag: "🇸🇪", greeting: "Hej! Hur kan jag hjälpa dig idag?" },
];

export const PREBUILT_VOICES = [
  { id: "Kore", name: "Kore", desc: "Gentle, warm, loving & calm (Sana's Voice)", gender: "Female" },
  { id: "Zephyr", name: "Zephyr", desc: "Articulate, expressive & sweet", gender: "Female" },
  { id: "Puck", name: "Puck", desc: "Youthful, energetic, engaging", gender: "Neutral" },
  { id: "Charon", name: "Charon", desc: "Deep, resonant, authoritative", gender: "Male" },
  { id: "Fenrir", name: "Fenrir", desc: "Crisp, confident, expressive", gender: "Male" },
];
