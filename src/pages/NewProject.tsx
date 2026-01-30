import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Upload,
  FileText,
  Loader2,
  X,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { projectsApi } from '../lib/api';
import { useStore } from '../store/useStore';
import { LANGUAGES, AI_MODELS, TRANSLATION_STYLES, PRIORITIES } from '@shared/types';
import type { ProjectPriority } from '@shared/types';

export default function NewProject() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addProject, defaultSourceLanguage, defaultTargetLanguage, defaultStyle, defaultModel } = useStore();

  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState(defaultSourceLanguage);
  const [targetLanguage, setTargetLanguage] = useState(defaultTargetLanguage);
  const [style, setStyle] = useState(defaultStyle);
  const [model, setModel] = useState(defaultModel);
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<ProjectPriority>('medium');
  const [customContext, setCustomContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    if (!validTypes.includes(selectedFile.type)) {
      toast.error('Invalid file type. Please upload PDF, DOCX, or TXT files.');
      return;
    }

    if (selectedFile.size > 100 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 100MB.');
      return;
    }

    setFile(selectedFile);
    if (!name) {
      setName(selectedFile.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name) return;

    setLoading(true);
    try {
      const project = await projectsApi.create(
        {
          name,
          sourceLanguage,
          targetLanguage,
          translationStyle: style,
          aiModel: model,
          customContext: customContext || undefined,
          dueDate: dueDate || undefined,
          priority,
        },
        file
      );

      addProject(project);
      toast.success('Project created successfully');
      navigate(`/projects/${project.id}`);
    } catch (error) {
      toast.error('Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">New Project</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Upload a document to start translating
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Upload */}
        <div>
          <label className="label">Document</label>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragOver
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-primary-400'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              className="hidden"
            />

            {file ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center gap-3"
              >
                <FileText className="w-8 h-8 text-primary-500" />
                <div className="text-left">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-slate-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </motion.div>
            ) : (
              <>
                <Upload className="w-10 h-10 mx-auto text-slate-400 mb-3" />
                <p className="text-slate-600 dark:text-slate-300">
                  Drop your file here or{' '}
                  <span className="text-primary-600 dark:text-primary-400">browse</span>
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  Supports PDF, DOCX, TXT (max 100MB)
                </p>
              </>
            )}
          </div>
        </div>

        {/* Project Name */}
        <div>
          <label htmlFor="name" className="label">
            Project Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter project name"
            className="input"
            required
          />
        </div>

        {/* Language Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="source" className="label">
              Source Language
            </label>
            <div className="relative">
              <select
                id="source"
                value={sourceLanguage}
                onChange={(e) => setSourceLanguage(e.target.value as typeof sourceLanguage)}
                className="input appearance-none pr-10"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name} ({lang.nativeName})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label htmlFor="target" className="label">
              Target Language
            </label>
            <div className="relative">
              <select
                id="target"
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value as typeof targetLanguage)}
                className="input appearance-none pr-10"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name} ({lang.nativeName})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Translation Style */}
        <div>
          <label htmlFor="style" className="label">
            Translation Style
          </label>
          <div className="relative">
            <select
              id="style"
              value={style}
              onChange={(e) => setStyle(e.target.value as typeof style)}
              className="input appearance-none pr-10"
            >
              {TRANSLATION_STYLES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} - {s.description}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* AI Model */}
        <div>
          <label htmlFor="model" className="label">
            AI Model
          </label>
          <div className="relative">
            <select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value as typeof model)}
              className="input appearance-none pr-10"
            >
              {AI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} - {m.description}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Cost: ${AI_MODELS.find((m) => m.id === model)?.inputCostPer1M}/1M input tokens,
            ${AI_MODELS.find((m) => m.id === model)?.outputCostPer1M}/1M output tokens
          </p>
        </div>

        {/* Custom Context / Instructions */}
        <div>
          <label htmlFor="customContext" className="label">
            Custom Instructions (optional)
          </label>
          <textarea
            id="customContext"
            value={customContext}
            onChange={(e) => setCustomContext(e.target.value)}
            placeholder="Add additional context for the AI translator. For example: specific terminology, preferred tone, style guidelines, subject matter context, or any special instructions..."
            rows={4}
            className="input resize-none"
          />
          <p className="text-sm text-slate-500 mt-1">
            These instructions will be included in every translation request for this project.
          </p>
        </div>

        {/* Due Date and Priority */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="dueDate" className="label">
              Due Date (optional)
            </label>
            <input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="priority" className="label">
              Priority
            </label>
            <div className="relative">
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as ProjectPriority)}
                className="input appearance-none pr-10"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!file || !name || loading}
            className="btn-primary flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Project'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
