export interface TokenMetrics {
  promptTokens: number;
  candidateTokens: number;
  audioTokens: number;
  totalTokensUsed: number;
  sessionQuota: number;
  remainingTokens: number;
  percentageUsed: number;
  percentageRemaining: number;
  requestCount: number;
  estimatedCostUsd: number;
  alertThresholdPercent: number;
  isNearQuota: boolean;
  lastResetTime?: number;
  nextResetTime?: number;
  timestamp?: string;
}

class TokenTrackerService {
  private currentMetrics: TokenMetrics = {
    promptTokens: 0,
    candidateTokens: 0,
    audioTokens: 0,
    totalTokensUsed: 0,
    sessionQuota: 1000000,
    remainingTokens: 1000000,
    percentageUsed: 0,
    percentageRemaining: 100,
    requestCount: 0,
    estimatedCostUsd: 0,
    alertThresholdPercent: 80,
    isNearQuota: false,
    lastResetTime: Date.now(),
    nextResetTime: Date.now() + 24 * 3600 * 1000,
  };

  private listeners: Array<(metrics: TokenMetrics) => void> = [];
  private pollInterval: any = null;

  constructor() {
    this.refreshMetrics();
    // Real-time background sync every 3 seconds so UI always has live token counts
    if (typeof window !== "undefined") {
      this.pollInterval = setInterval(() => {
        this.refreshMetrics();
      }, 3000);
    }
  }

  public subscribe(listener: (metrics: TokenMetrics) => void) {
    this.listeners.push(listener);
    listener(this.currentMetrics);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.currentMetrics);
    }
  }

  public getMetrics(): TokenMetrics {
    return { ...this.currentMetrics };
  }

  public setMetrics(metrics: TokenMetrics) {
    this.currentMetrics = { ...metrics };
    this.notify();
  }

  public async refreshMetrics(): Promise<TokenMetrics> {
    try {
      const res = await fetch("/api/tokens");
      if (res.ok) {
        const data = await res.json();
        this.setMetrics(data);
        return data;
      }
    } catch (e) {
      console.warn("[TokenTracker] Failed to fetch token metrics:", e);
    }
    return this.currentMetrics;
  }

  public async updateSettings(sessionQuota: number, alertThresholdPercent: number): Promise<boolean> {
    try {
      const res = await fetch("/api/tokens/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionQuota, alertThresholdPercent }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.tokens) this.setMetrics(data.tokens);
        return true;
      }
    } catch (e) {
      console.error("[TokenTracker] Error updating quota settings:", e);
    }
    return false;
  }

  public async resetTokens(): Promise<boolean> {
    try {
      const res = await fetch("/api/tokens/reset", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.tokens) this.setMetrics(data.tokens);
        return true;
      }
    } catch (e) {
      console.error("[TokenTracker] Error resetting tokens:", e);
    }
    return false;
  }
}

export const tokenTracker = new TokenTrackerService();
