# j TEC: Next-Generation Real-Time AI Workspace & Live Voice

A production-grade AI chat application and bidirectional live voice assistant built with **React 19**, **TypeScript**, **Express**, **WebSocket Duplex Audio**, **Google Gemini 2.5/2.0 Live APIs**, and **Supabase PostgreSQL**.

---

## 🏗 Architecture Overview

```text
┌───────────────────────────────┐
│   GitHub Pages (Frontend)     │
│   • React 19 + Vite SPA       │
│   • ChatGPT-style interface   │
│   • AudioEngine (24kHz PCM)   │
└───────────────┬───────────────┘
                │
                │ HTTPS REST & WSS (/live)
                ▼
┌───────────────────────────────┐
│    Render Web Service         │
│   • Express backend           │
│   • Live WebSocket duplex     │
│   • SSE Chat streaming        │
└───────┬───────────────┬───────┘
        │               │
        │ API Key       │ Service Role / Anon
        ▼               ▼
┌───────────────┐ ┌───────────────┐
│ Google Gemini │ │   Supabase    │
│ Flash & Live  │ │  PostgreSQL   │
└───────────────┘ └───────────────┘
```

- **Frontend (GitHub Pages)**: Static single-page application communicating via HTTPS and WebSockets to the Render backend. Zero secrets in frontend bundles.
- **Backend (Render)**: Node.js Express server handling Gemini API calls, token tracking, text streaming (`/api/chat/stream`), text-to-speech synthesis (`/api/tts`), and low-latency bidirectional Live Voice audio bridge (`/live`).
- **Database (Supabase)**: Persistent storage for conversations, message history, cognitive memories, and custom AI prompt libraries.

---

## 🚀 1. Local Development

### Prerequisites
- Node.js 20+ installed
- Google Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### Quick Start
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Configure local environment variables:
   ```bash
   cp .env.example .env
   ```
   Add your `GEMINI_API_KEY` into `.env`.

3. Start the unified development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser. Both the React frontend and Express backend with WebSocket support run together.

---

## 🔐 2. Environment Variables Reference

| Variable | Environment | Required | Description |
| :--- | :--- | :---: | :--- |
| `GEMINI_API_KEY` | Render Backend | **Yes** | Primary Google Gemini API key for streaming & voice |
| `GOOGLE_API_KEY` | Render Backend | Optional | Alias fallback for Gemini API key |
| `PORT` | Render Backend | Auto | Assigned automatically by Render (defaults to 3000) |
| `FRONTEND_URL` | Render Backend | Recommended | Your GitHub Pages domain (e.g., `https://username.github.io`) for CORS security |
| `SUPABASE_URL` | Render / Frontend | Optional | Your Supabase project URL (`https://xyz.supabase.co`) |
| `SUPABASE_ANON_KEY` | Render / Frontend | Optional | Public anonymous key for client operations |
| `SUPABASE_SERVICE_ROLE_KEY` | Render Backend | Optional | Private server-side key for database migrations (NEVER expose to frontend) |
| `VITE_API_URL` | GitHub Pages Build | **Yes (Prod)** | Full public URL of your Render backend (e.g., `https://jtec-backend.onrender.com`) |

---

## 🗄 3. Supabase Database Setup

When you are ready to connect your own Supabase database:

1. Create a project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase Dashboard.
3. Open `supabase-schema.sql` from this repository, copy its entire contents, and click **Run**.
   - This creates the `conversations`, `messages`, `ai_brain_profiles`, and `ai_prompts` tables with Row Level Security (RLS) policies and seeds initial high-performance prompts.
4. Copy your **Project URL** and **anon public key** from **Project Settings -> API**.
5. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in your Render backend and/or GitHub build secrets.

*Note: If Supabase credentials are not provided, the application automatically uses encrypted local browser storage so the app works seamlessly offline.*

---

## ☁️ 4. Deploying Backend to Render

1. Log in to [render.com](https://render.com).
2. Click **New +** -> **Web Service** and connect your GitHub repository.
3. Choose the following settings:
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Plan**: Free or Starter
4. Under **Environment Variables**, add:
   - `GEMINI_API_KEY` = `your_gemini_api_key`
   - `NODE_ENV` = `production`
   - `FRONTEND_URL` = `https://<your-github-username>.github.io`
   - `SUPABASE_URL` = `https://<your-project>.supabase.co` (optional)
   - `SUPABASE_ANON_KEY` = `your_anon_key` (optional)
5. Click **Deploy Web Service**.
6. Once deployed, note your Render service URL (e.g., `https://jtec-backend.onrender.com`).

---

## 📦 5. Deploying Frontend to GitHub Pages

1. In your GitHub repository, go to **Settings** -> **Secrets and variables** -> **Actions**.
2. Add a repository secret or variable:
   - `VITE_API_URL` = `https://jtec-backend.onrender.com` (your Render backend URL)
3. Build the static production bundle:
   ```bash
   VITE_API_URL="https://jtec-backend.onrender.com" npm run build
   ```
4. Deploy the contents of the `dist/` directory to GitHub Pages:
   - You can use the standard GitHub Actions workflow (`deploy-pages`) or publish the `dist` directory to the `gh-pages` branch.
5. In your repository **Settings** -> **Pages**, set Source to GitHub Actions or `gh-pages` branch.

---

## 🎙 6. Real-Time Live Voice Duplex

The Live Voice system connects via WebSockets to `/live`:
- **Audio Capture**: 16kHz PCM microphone stream with noise suppression.
- **Audio Output**: 24kHz PCM bidirectional audio received from Gemini Live API and played through Web Audio API.
- **Instant Interruption**: Speaking while j TEC is responding softly fades playback within 200ms and yields to your speech.
- **Visualizer**: Real-time canvas reacting to true audio frequency data with 3 selectable modes: Fluid Orb, Circular Waveform, and Frequency Bars.

---

## 🛡 Security Best Practices

- **Zero Hardcoded Secrets**: All API keys and secrets reside in server-side environment variables.
- **CORS Protection**: Render backend enforces origin checking via `FRONTEND_URL`.
- **Database Safety**: Supabase service-role keys are strictly server-side and never bundled into frontend static JavaScript.
