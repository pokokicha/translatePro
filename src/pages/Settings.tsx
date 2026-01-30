import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Sun,
  Moon,
  Monitor,
  Globe,
  Cpu,
  Paintbrush,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '../store/useStore';
import { configApi } from '../lib/api';
import { LANGUAGES, AI_MODELS, TRANSLATION_STYLES } from '@shared/types';
import type { ProjectAnalytics } from '@shared/types';

export default function Settings() {
  const {
    theme,
    setTheme,
    defaultSourceLanguage,
    setDefaultSourceLanguage,
    defaultTargetLanguage,
    setDefaultTargetLanguage,
    defaultStyle,
    setDefaultStyle,
    defaultModel,
    setDefaultModel,
  } = useStore();

  const [stats, setStats] = useState<ProjectAnalytics | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const data = await configApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoadingStats(false);
    }
  }

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Configure your TranslatePro preferences
        </p>
      </div>

      {/* Appearance */}
      <section className="card">
        <div className="p-4 border-b">
          <h2 className="font-semibold flex items-center gap-2">
            <Paintbrush className="w-5 h-5" />
            Appearance
          </h2>
        </div>
        <div className="p-4">
          <label className="label">Theme</label>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setTheme(option.value as typeof theme)}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                  theme === option.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <option.icon className="w-5 h-5" />
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Default Languages */}
      <section className="card">
        <div className="p-4 border-b">
          <h2 className="font-semibold flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Default Languages
          </h2>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="label">Source Language</label>
            <select
              value={defaultSourceLanguage}
              onChange={(e) => setDefaultSourceLanguage(e.target.value as typeof defaultSourceLanguage)}
              className="input"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} ({lang.nativeName})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Target Language</label>
            <select
              value={defaultTargetLanguage}
              onChange={(e) => setDefaultTargetLanguage(e.target.value as typeof defaultTargetLanguage)}
              className="input"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} ({lang.nativeName})
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Translation Settings */}
      <section className="card">
        <div className="p-4 border-b">
          <h2 className="font-semibold flex items-center gap-2">
            <Cpu className="w-5 h-5" />
            Translation Defaults
          </h2>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="label">Translation Style</label>
            <select
              value={defaultStyle}
              onChange={(e) => setDefaultStyle(e.target.value as typeof defaultStyle)}
              className="input"
            >
              {TRANSLATION_STYLES.map((style) => (
                <option key={style.id} value={style.id}>
                  {style.name} - {style.description}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">AI Model</label>
            <select
              value={defaultModel}
              onChange={(e) => setDefaultModel(e.target.value as typeof defaultModel)}
              className="input"
            >
              {AI_MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} - {model.description}
                </option>
              ))}
            </select>
            <p className="text-sm text-slate-500 mt-1">
              Cost: ${AI_MODELS.find((m) => m.id === defaultModel)?.inputCostPer1M}/1M input,
              ${AI_MODELS.find((m) => m.id === defaultModel)?.outputCostPer1M}/1M output
            </p>
          </div>
        </div>
      </section>

      {/* Usage Statistics */}
      <section className="card">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Usage Statistics</h2>
        </div>
        <div className="p-4">
          {loadingStats ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 gap-4">
              <StatItem label="Total Projects" value={stats.totalProjects} />
              <StatItem label="Total Segments" value={stats.totalSegments.toLocaleString()} />
              <StatItem label="Total Words" value={stats.totalWords.toLocaleString()} />
              <StatItem label="Input Tokens" value={stats.totalTokensInput.toLocaleString()} />
              <StatItem label="Output Tokens" value={stats.totalTokensOutput.toLocaleString()} />
              <StatItem label="Total Cost" value={`$${stats.totalCost.toFixed(2)}`} />
            </div>
          ) : (
            <p className="text-slate-500 text-center py-4">No statistics available</p>
          )}
        </div>
      </section>

      {/* About */}
      <section className="card">
        <div className="p-4 border-b">
          <h2 className="font-semibold">About TranslatePro</h2>
        </div>
        <div className="p-4">
          <p className="text-slate-600 dark:text-slate-400 mb-2">
            TranslatePro v4.0 - Professional AI-powered document translation
          </p>
          <p className="text-sm text-slate-500">
            Powered by Claude AI. Supports PDF, DOCX, TXT with layout preservation.
          </p>
        </div>
      </section>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
