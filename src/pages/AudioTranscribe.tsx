import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Mic,
  MicOff,
  Upload,
  Loader2,
  Play,
  Square,
  FileAudio,
  Circle,
  Pause,
} from 'lucide-react';
import { toast } from 'sonner';
import { audioApi } from '../lib/api';
import { LANGUAGES } from '@shared/types';

export default function AudioTranscribe() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('bg');
  const [transcription, setTranscription] = useState('');
  const [translation, setTranslation] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Timer for recording duration
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, isPaused]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  async function requestMicPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setHasPermission(true);
      return true;
    } catch (error) {
      setHasPermission(false);
      toast.error('Microphone access denied. Please allow microphone access in your browser settings.');
      return false;
    }
  }

  async function startRecording() {
    const permitted = await requestMicPermission();
    if (!permitted) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      // Determine best supported format
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg',
      ];
      const supportedType = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: supportedType,
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Create audio blob
        const audioBlob = new Blob(audioChunksRef.current, { type: supportedType || 'audio/webm' });

        // Determine file extension
        let extension = 'webm';
        if (supportedType.includes('mp4')) extension = 'mp4';
        else if (supportedType.includes('ogg')) extension = 'ogg';

        const audioFile = new File([audioBlob], `recording-${Date.now()}.${extension}`, {
          type: supportedType || 'audio/webm',
        });

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        // Process the recording
        await handleFileUpload(audioFile);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second

      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      setTranscription('');
      setTranslation('');
      setSessionId(null);

      toast.success('Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Failed to start recording');
    }
  }

  function pauseRecording() {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        toast.success('Recording resumed');
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        toast.success('Recording paused');
      }
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      toast.success('Recording stopped, processing...');
    }
  }

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

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audio Transcription</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Transcribe and translate audio files or record from microphone
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
              disabled={isRecording}
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
              disabled={isRecording}
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

      {/* Recording Section */}
      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className={`p-3 rounded-xl ${isRecording ? 'bg-red-100 dark:bg-red-900/50' : 'bg-primary-100 dark:bg-primary-900/50'}`}>
            <Mic className={`w-6 h-6 ${isRecording ? 'text-red-600 dark:text-red-400' : 'text-primary-600 dark:text-primary-400'}`} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Live Recording</h3>
            <p className="text-sm text-slate-500">
              Record audio directly from your microphone
            </p>
          </div>
          {hasPermission === false && (
            <span className="text-sm text-red-500">Microphone access denied</span>
          )}
        </div>

        {/* Recording Controls */}
        <div className="flex items-center justify-center gap-4">
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors disabled:opacity-50"
            >
              <Circle className="w-4 h-4 fill-current" />
              Start Recording
            </button>
          ) : (
            <>
              {/* Recording Timer */}
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-full">
                <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`} />
                <span className="font-mono text-lg">{formatTime(recordingTime)}</span>
              </div>

              {/* Pause Button */}
              <button
                onClick={pauseRecording}
                className={`p-3 rounded-full transition-colors ${
                  isPaused
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                }`}
                title={isPaused ? 'Resume' : 'Pause'}
              >
                {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
              </button>

              {/* Stop Button */}
              <button
                onClick={stopRecording}
                className="p-3 bg-slate-600 hover:bg-slate-700 text-white rounded-full transition-colors"
                title="Stop"
              >
                <Square className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {isRecording && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-sm text-slate-500 mt-4"
          >
            {isPaused ? 'Recording paused. Click play to resume.' : 'Speak clearly into your microphone...'}
          </motion.p>
        )}
      </div>

      {/* File Upload Section */}
      <div className="card p-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,video/*"
          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
          className="hidden"
        />

        <div
          onClick={() => !isRecording && !loading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            isRecording || loading
              ? 'border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed'
              : 'cursor-pointer hover:border-primary-500'
          }`}
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
                Or drop an audio file here / click to browse
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
    </div>
  );
}
