import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Mic,
  MicOff,
  Upload,
  Loader2,
  Play,
  Square,
  FileAudio,
} from 'lucide-react';
import { toast } from 'sonner';
import { audioApi } from '../lib/api';
import { LANGUAGES } from '@shared/types';

export default function AudioTranscribe() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('bg');
  const [transcription, setTranscription] = useState('');
  const [translation, setTranslation] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  async function handleFileUpload(file: File) {
    setLoading(true);
    setTranscription('');
    setTranslation('');

    try {
      const session = await audioApi.transcribe(file, { sourceLanguage, targetLanguage });
      setSessionId(session.id);
      setTranscription(session.transcription || '');

      if (session.status === 'transcribed' && session.transcription) {
        // Auto-translate
        const translated = await audioApi.translateSession(session.id);
        setTranslation(translated.translation || '');
      }

      toast.success('Audio processed successfully');
    } catch (error) {
      toast.error('Failed to process audio');
    } finally {
      setLoading(false);
    }
  }

  async function handleTranslate() {
    if (!sessionId) return;

    setLoading(true);
    try {
      const translated = await audioApi.translateSession(sessionId);
      setTranslation(translated.translation || '');
      toast.success('Translation complete');
    } catch (error) {
      toast.error('Translation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audio Transcription</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Transcribe and translate audio files
        </p>
      </div>

      {/* Language Selection */}
      <div className="card p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Source Language</label>
            <select
              value={sourceLanguage}
              onChange={(e) => setSourceLanguage(e.target.value)}
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
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
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
      </div>

      {/* Upload Section */}
      <div className="card p-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,video/*"
          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
          className="hidden"
        />

        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary-500 transition-colors"
        >
          {loading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-12 h-12 text-primary-500 animate-spin mb-4" />
              <p className="text-slate-600 dark:text-slate-300">Processing audio...</p>
            </div>
          ) : (
            <>
              <FileAudio className="w-12 h-12 mx-auto text-slate-400 mb-4" />
              <p className="text-slate-600 dark:text-slate-300 mb-2">
                Drop an audio file here or click to browse
              </p>
              <p className="text-sm text-slate-500">
                Supports MP3, WAV, M4A, MP4, MOV (max 25MB)
              </p>
            </>
          )}
        </div>
      </div>

      {/* Results */}
      {(transcription || translation) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Transcription */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
          >
            <div className="p-4 border-b">
              <h3 className="font-semibold">Transcription</h3>
              <p className="text-sm text-slate-500">{sourceLanguage.toUpperCase()}</p>
            </div>
            <div className="p-4">
              <p className="whitespace-pre-wrap">{transcription || 'No transcription available'}</p>
            </div>
          </motion.div>

          {/* Translation */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Translation</h3>
                <p className="text-sm text-slate-500">{targetLanguage.toUpperCase()}</p>
              </div>
              {!translation && transcription && (
                <button
                  onClick={handleTranslate}
                  disabled={loading}
                  className="btn-primary text-sm"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Translate'}
                </button>
              )}
            </div>
            <div className="p-4">
              <p className="whitespace-pre-wrap">
                {translation || 'Click translate to generate translation'}
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Coming Soon: Live Recording */}
      <div className="card p-6 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary-100 dark:bg-primary-900/50 rounded-xl">
            <Mic className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 className="font-semibold">Live Recording</h3>
            <p className="text-sm text-slate-500">
              Real-time transcription from microphone coming soon
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
