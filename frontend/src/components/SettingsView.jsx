import React, { useState, useEffect } from 'react';
import {
  Settings,
  Cpu,
  Globe,
  Sun,
  Moon,
  Shield,
  Activity,
  CheckCircle2,
  AlertCircle,
  Database,
  Layers,
  Save,
  Check,
  Zap,
  Key
} from 'lucide-react';
import { checkHealth } from '../api';

export default function SettingsView({
  isDark,
  onToggleTheme,
  userName,
  setUserName,
  availableModels,
  selectedModel,
  setSelectedModel
}) {
  const [healthStatus, setHealthStatus] = useState(null);
  const [temperature, setTemperature] = useState(0.3);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    checkHealth().then(status => setHealthStatus(status ? 'online' : 'offline'));
  }, []);

  const handleSave = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#FAF7F2] dark:bg-[#141210] overflow-y-auto px-4 md:px-10 py-8 transition-colors pb-24 lg:pb-12">
      <div className="max-w-3xl mx-auto w-full space-y-8">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#2D2621] dark:text-[#FAF7F2] flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-[#E07A5F]" />
            <span>Settings & Preferences</span>
          </h1>
          <p className="text-xs md:text-sm text-[#7A6E65] dark:text-[#A89D93]">
            Customize model endpoints, application appearance, and check backend connectivity.
          </p>
        </div>

        {/* System Health Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#201A16] border border-[#EFE8DE] dark:border-[#2C241E] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Activity className="w-5 h-5 text-[#E07A5F]" />
              <h2 className="text-sm font-semibold text-[#2D2621] dark:text-[#FAF7F2]">
                Backend & System Health
              </h2>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-semibold">
              {healthStatus === 'online' ? (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  API Connected (Port 8000)
                </span>
              ) : healthStatus === 'offline' ? (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                  API Disconnected
                </span>
              ) : (
                <span className="text-stone-400 text-xs">Checking API...</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-[#FAF7F2] dark:bg-[#191512] border border-[#EFE8DE] dark:border-[#2B231D]">
              <span className="text-[#8A7D73] text-[11px] block">Database</span>
              <span className="font-semibold text-[#2D2621] dark:text-[#FAF7F2] mt-0.5 block">SQLite WAL</span>
            </div>
            <div className="p-3 rounded-xl bg-[#FAF7F2] dark:bg-[#191512] border border-[#EFE8DE] dark:border-[#2B231D]">
              <span className="text-[#8A7D73] text-[11px] block">Vector Store</span>
              <span className="font-semibold text-[#2D2621] dark:text-[#FAF7F2] mt-0.5 block">Chroma Local</span>
            </div>
            <div className="p-3 rounded-xl bg-[#FAF7F2] dark:bg-[#191512] border border-[#EFE8DE] dark:border-[#2B231D]">
              <span className="text-[#8A7D73] text-[11px] block">Web Search Fallback</span>
              <span className="font-semibold text-[#2D2621] dark:text-[#FAF7F2] mt-0.5 block">DuckDuckGo + Tavily</span>
            </div>
          </div>
        </div>

        {/* Model Configuration */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#201A16] border border-[#EFE8DE] dark:border-[#2C241E] shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-[#E07A5F]" />
            <h2 className="text-sm font-semibold text-[#2D2621] dark:text-[#FAF7F2]">
              AI Providers & Active Model
            </h2>
          </div>

          <div className="space-y-4 pt-1">
            {/* Active Provider Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-500 text-white shrink-0 mt-0.5">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-amber-950 dark:text-amber-200">Google Gemini Direct</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 font-semibold">Active</span>
                  </div>
                  <p className="text-[11px] text-amber-900/80 dark:text-amber-300/80 mt-0.5 leading-snug">
                    Direct API with 1,500 requests/day free quota. High reliability & fast streaming.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-800 flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-stone-700 text-white shrink-0 mt-0.5">
                  <Globe className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[#2D2621] dark:text-[#FAF7F2]">OpenRouter Pool</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold">Active</span>
                  </div>
                  <p className="text-[11px] text-[#8A7D73] mt-0.5 leading-snug">
                    Aggregated multi-vendor free pool (Nemotron, Cohere). Subject to daily account limits.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#2D2621] dark:text-[#FAF7F2]">
                Selected Active Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-[#FAF7F2] dark:bg-[#181411] border border-[#E5DACD] dark:border-[#382F27] rounded-xl px-3.5 py-2.5 text-xs text-[#2D2621] dark:text-[#FAF7F2] focus:outline-none focus:border-[#E07A5F]"
              >
                {availableModels.some(m => m.provider === 'Google') && (
                  <optgroup label="⚡ Google Gemini (Direct API — High 1,500/day Limit)">
                    {availableModels
                      .filter(m => m.provider === 'Google')
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name || m.id} {m.badge ? `• ${m.badge}` : ''}
                        </option>
                      ))}
                  </optgroup>
                )}
                {availableModels.some(m => m.provider !== 'Google') && (
                  <optgroup label="🌐 OpenRouter Models (Multi-vendor Free Pool)">
                    {availableModels
                      .filter(m => m.provider !== 'Google')
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name || m.id} {m.badge ? `• ${m.badge}` : ''}
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#2D2621] dark:text-[#FAF7F2]">Temperature</span>
                <span className="font-mono text-[#8A7D73]">{temperature}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-[#E07A5F] cursor-pointer"
              />
              <span className="text-[11px] text-[#8A7D73] block">
                Lower values give more focused, deterministic responses; higher values encourage creativity.
              </span>
            </div>
          </div>
        </div>

        {/* Profile & Appearance */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#201A16] border border-[#EFE8DE] dark:border-[#2C241E] shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <Sun className="w-5 h-5 text-[#E07A5F]" />
            <h2 className="text-sm font-semibold text-[#2D2621] dark:text-[#FAF7F2]">
              User Profile & Theme
            </h2>
          </div>

          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#2D2621] dark:text-[#FAF7F2]">
                Your Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full bg-[#FAF7F2] dark:bg-[#181411] border border-[#E5DACD] dark:border-[#382F27] rounded-xl px-3.5 py-2 text-xs text-[#2D2621] dark:text-[#FAF7F2] focus:outline-none focus:border-[#E07A5F]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#2D2621] dark:text-[#FAF7F2] block">
                Color Theme
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => isDark && onToggleTheme()}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-medium cursor-pointer transition-colors ${
                    !isDark
                      ? 'border-[#E07A5F] bg-[#FAF5EE] text-[#E07A5F] font-bold'
                      : 'border-[#EFE8DE] dark:border-[#2C241E] text-stone-500'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  <span>Warm Cream (Light)</span>
                </button>

                <button
                  type="button"
                  onClick={() => !isDark && onToggleTheme()}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-medium cursor-pointer transition-colors ${
                    isDark
                      ? 'border-[#E07A5F] bg-[#2C221C] text-[#E07A5F] font-bold'
                      : 'border-[#EFE8DE] dark:border-[#2C241E] text-stone-500'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  <span>Espresso Dark</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-between pt-2">
          {savedNotice ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <Check className="w-4 h-4" />
              Preferences saved successfully!
            </span>
          ) : (
            <span />
          )}

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E07A5F] hover:bg-[#D56B50] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </div>
    </div>
  );
}
