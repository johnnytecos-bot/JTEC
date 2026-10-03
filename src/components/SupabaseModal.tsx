import React, { useState, useEffect } from "react";
import { supabaseHistory, SupabaseConfig } from "../services/supabase";
import {
  Database,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ExternalLink,
  Download,
  Upload,
  RefreshCw,
  X,
  ShieldCheck,
  Server,
} from "lucide-react";

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncStatusChange?: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  onSyncStatusChange,
}) => {
  const [config, setConfig] = useState<SupabaseConfig>({ url: "", anonKey: "" });
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [activeTab, setActiveTab] = useState<"credentials" | "sql" | "backup">("credentials");

  useEffect(() => {
    if (isOpen) {
      setConfig(supabaseHistory.getConfig());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);

    try {
      const ok = await supabaseHistory.setConfig(config.url, config.anonKey);
      const test = await supabaseHistory.testConnection();
      setTestResult(test);
      if (onSyncStatusChange) onSyncStatusChange();
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || "Failed to configure Supabase." });
    } finally {
      setIsTesting(false);
    }
  };

  const handleClear = async () => {
    await supabaseHistory.setConfig("", "");
    setConfig({ url: "", anonKey: "" });
    setTestResult({
      success: true,
      message: "Cleared Supabase credentials. Reverted to Local Cloud Storage mode.",
    });
    if (onSyncStatusChange) onSyncStatusChange();
  };

  const copySql = () => {
    navigator.clipboard.writeText(supabaseHistory.getSetupSqlScript());
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleExport = async () => {
    const data = await supabaseHistory.exportAllHistory();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auralive-history-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="supabase-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 id="supabase-modal-title" className="text-lg font-bold text-white">
                Cloud Database & History Sync
              </h2>
              <p className="text-xs text-zinc-400">
                Powered by Supabase for seamless cross-device chat sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-zinc-800 bg-zinc-900 px-6 pt-2 gap-4">
          <button
            onClick={() => setActiveTab("credentials")}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === "credentials"
                ? "border-emerald-400 text-emerald-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Supabase Credentials
          </button>
          <button
            onClick={() => setActiveTab("sql")}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === "sql"
                ? "border-emerald-400 text-emerald-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            SQL Table Setup Script
          </button>
          <button
            onClick={() => setActiveTab("backup")}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === "backup"
                ? "border-emerald-400 text-emerald-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Export & Render Info
          </button>
        </div>

        {/* Modal body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {activeTab === "credentials" && (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="rounded-xl bg-zinc-950/70 border border-zinc-800 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Cloud Persistence Ready</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Enter your Supabase project credentials below to automatically save and sync all voice sessions, messages, and audio transcripts. If left blank, AuraLive automatically uses persistent browser storage.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Supabase Project URL
                </label>
                <input
                  type="url"
                  placeholder="https://xyzcompany.supabase.co"
                  value={config.url}
                  onChange={(e) => setConfig({ ...config, url: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-sm focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Supabase Anon / Public Key
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={config.anonKey}
                  onChange={(e) => setConfig({ ...config, anonKey: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-sm focus:border-emerald-400 focus:outline-none"
                />
              </div>

              {testResult && (
                <div
                  className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                    testResult.success
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : "bg-red-500/10 border-red-500/30 text-red-300"
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs text-zinc-400 hover:text-red-400 transition"
                >
                  Reset to Local Storage
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isTesting}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold transition disabled:opacity-50"
                  >
                    {isTesting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Testing Connection...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Save & Connect</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}

          {activeTab === "sql" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-300 font-medium">
                  Run this schema in your Supabase SQL Editor:
                </span>
                <button
                  onClick={copySql}
                  className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? "Copied SQL!" : "Copy SQL Script"}</span>
                </button>
              </div>
              <pre className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-64 leading-relaxed">
                {supabaseHistory.getSetupSqlScript()}
              </pre>
            </div>
          )}

          {activeTab === "backup" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-sky-400">
                  <Server className="w-4 h-4" />
                  <span>Render Backend Deployment</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  AuraLive is configured with a native Express full-stack server and WebSocket bridge on port 3000. It includes a ready-to-deploy <code className="text-zinc-200">render.yaml</code> file for 1-click deployment on Render.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Export Conversation History</h4>
                  <p className="text-[11px] text-zinc-400">
                    Download all saved conversations and voice sessions as a JSON backup
                  </p>
                </div>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export JSON</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
