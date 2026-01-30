import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Play,
  Download,
  Check,
  X,
  Loader2,
  ChevronLeft,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { projectsApi, segmentsApi, translationApi } from '../lib/api';
import { useStore } from '../store/useStore';
import type { Segment, TranslationProgress } from '@shared/types';

export default function ProjectView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentProject, setCurrentProject, segments, setSegments, updateSegment, updateProject } = useStore();

  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [progress, setProgress] = useState<TranslationProgress | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  useEffect(() => {
    if (id) loadProject(id);
  }, [id]);

  async function loadProject(projectId: string) {
    setLoading(true);
    try {
      const [project, segs] = await Promise.all([
        projectsApi.get(projectId),
        projectsApi.getSegments(projectId),
      ]);
      setCurrentProject(project);
      setSegments(segs);
    } catch (error) {
      toast.error('Failed to load project');
      navigate('/');
    } finally {
      setLoading(false);
    }
  }

  async function handleTranslateAll() {
    if (!id) return;

    setTranslating(true);
    setProgress(null);

    try {
      await translationApi.translateAll(
        id,
        { skipApproved: true },
        (data) => {
          setProgress(data as TranslationProgress);
        }
      );

      // Reload segments after translation
      const segs = await projectsApi.getSegments(id);
      setSegments(segs);
      updateProject(id, { status: 'completed', progress: 100 });
      toast.success('Translation completed');
    } catch (error) {
      toast.error('Translation failed');
    } finally {
      setTranslating(false);
      setProgress(null);
    }
  }

  async function handleExport() {
    if (!id || !currentProject) return;

    try {
      const blob = await projectsApi.export(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentProject.name}-translated.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Export failed');
    }
  }

  async function handleSegmentSave(segmentId: string) {
    try {
      const updated = await segmentsApi.update(segmentId, {
        targetText: editingText,
      });
      updateSegment(segmentId, updated);
      setSelectedSegment(null);
      toast.success('Segment updated');
    } catch (error) {
      toast.error('Failed to update segment');
    }
  }

  async function handleApprove(segmentId: string) {
    try {
      const updated = await segmentsApi.approve(segmentId);
      updateSegment(segmentId, updated);
    } catch (error) {
      toast.error('Failed to approve segment');
    }
  }

  async function handleRetranslate(segmentId: string) {
    try {
      const result = await translationApi.translateSegment(segmentId);
      updateSegment(segmentId, { targetText: result.targetText, status: 'translated' });
      toast.success('Segment retranslated');
    } catch (error) {
      toast.error('Failed to retranslate');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Project not found</p>
      </div>
    );
  }

  const approvedCount = segments.filter((s) => s.isApproved).length;
  const translatedCount = segments.filter((s) => s.targetText).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold">{currentProject.name}</h1>
          <p className="text-slate-500 dark:text-slate-400">
            {currentProject.sourceLanguage.toUpperCase()} → {currentProject.targetLanguage.toUpperCase()}
            {' • '}
            {currentProject.totalSegments} segments
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTranslateAll}
            disabled={translating}
            className="btn-primary"
          >
            {translating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Translating...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Translate All
              </>
            )}
          </button>
          <button onClick={handleExport} className="btn-secondary">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {(translating || progress) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Translation Progress</span>
            <span className="text-sm text-slate-500">
              {progress?.currentSegment || 0} / {progress?.totalSegments || currentProject.totalSegments}
            </span>
          </div>
          <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress?.progress || 0}%` }}
            />
          </div>
          {progress?.estimatedCost && (
            <p className="text-sm text-slate-500 mt-2">
              Estimated cost: ${progress.estimatedCost.toFixed(4)}
            </p>
          )}
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">Translated</p>
          <p className="text-2xl font-bold">
            {translatedCount} / {currentProject.totalSegments}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">Approved</p>
          <p className="text-2xl font-bold">
            {approvedCount} / {currentProject.totalSegments}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">Total Cost</p>
          <p className="text-2xl font-bold">${currentProject.totalCost.toFixed(4)}</p>
        </div>
      </div>

      {/* Segments List */}
      <div className="card">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Segments</h2>
        </div>

        <div className="divide-y max-h-[600px] overflow-y-auto">
          {segments.map((segment, index) => (
            <SegmentRow
              key={segment.id}
              segment={segment}
              index={index}
              isSelected={selectedSegment === segment.id}
              editingText={editingText}
              onSelect={() => {
                setSelectedSegment(segment.id);
                setEditingText(segment.targetText || '');
              }}
              onCancel={() => setSelectedSegment(null)}
              onSave={() => handleSegmentSave(segment.id)}
              onApprove={() => handleApprove(segment.id)}
              onRetranslate={() => handleRetranslate(segment.id)}
              onTextChange={setEditingText}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SegmentRow({
  segment,
  index,
  isSelected,
  editingText,
  onSelect,
  onCancel,
  onSave,
  onApprove,
  onRetranslate,
  onTextChange,
}: {
  segment: Segment;
  index: number;
  isSelected: boolean;
  editingText: string;
  onSelect: () => void;
  onCancel: () => void;
  onSave: () => void;
  onApprove: () => void;
  onRetranslate: () => void;
  onTextChange: (text: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.02 }}
      className={`p-4 ${isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
    >
      <div className="flex items-start gap-4">
        {/* Index */}
        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm font-medium">
          {index + 1}
        </div>

        {/* Content */}
        <div className="flex-1 grid grid-cols-2 gap-4">
          {/* Source */}
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Source</p>
            <p className="text-sm">{segment.sourceText}</p>
          </div>

          {/* Target */}
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Translation</p>
            {isSelected ? (
              <textarea
                value={editingText}
                onChange={(e) => onTextChange(e.target.value)}
                className="input text-sm min-h-[80px] resize-none"
                autoFocus
              />
            ) : (
              <p
                className={`text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 -m-2 rounded ${
                  !segment.targetText ? 'text-slate-400 italic' : ''
                }`}
                onClick={onSelect}
              >
                {segment.targetText || 'Click to edit...'}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {isSelected ? (
            <>
              <button
                onClick={onSave}
                className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-lg"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={onCancel}
                className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              {segment.isApproved ? (
                <span className="badge-success flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Approved
                </span>
              ) : segment.targetText ? (
                <button
                  onClick={onApprove}
                  className="btn-ghost text-xs"
                >
                  Approve
                </button>
              ) : null}
              <button
                onClick={onRetranslate}
                className="p-2 text-slate-500 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                title="Retranslate"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
