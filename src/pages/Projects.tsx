import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Edit2,
  ExternalLink,
  X,
  ChevronDown,
  Flag,
} from 'lucide-react';
import { format, formatDistanceToNow, isPast, isToday } from 'date-fns';
import { toast } from 'sonner';
import { projectsApi, ProjectsListParams } from '../lib/api';
import { LANGUAGES, PRIORITIES } from '@shared/types';
import type { Project, ProjectPriority, ProjectStatus } from '@shared/types';

const statusConfig: Record<ProjectStatus, { icon: typeof Clock; color: string; bg: string; label: string }> = {
  pending: { icon: Clock, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-700', label: 'Pending' },
  processing: { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/50', label: 'Processing' },
  completed: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/50', label: 'Completed' },
  error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/50', label: 'Error' },
};

const priorityConfig: Record<ProjectPriority, { color: string; bg: string }> = {
  low: { color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-700' },
  medium: { color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/50' },
  high: { color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/50' },
  urgent: { color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/50' },
};

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sourceLanguage, setSourceLanguage] = useState<string>('all');
  const [targetLanguage, setTargetLanguage] = useState<string>('all');

  // Sorting
  const [sortBy, setSortBy] = useState<ProjectsListParams['sortBy']>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Edit modal
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  useEffect(() => {
    loadProjects();
  }, [search, statusFilter, priorityFilter, sourceLanguage, targetLanguage, sortBy, sortOrder, page]);

  async function loadProjects() {
    setLoading(true);
    try {
      const params: ProjectsListParams = {
        sortBy,
        sortOrder,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      };

      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (sourceLanguage !== 'all') params.sourceLanguage = sourceLanguage;
      if (targetLanguage !== 'all') params.targetLanguage = targetLanguage;

      const response = await projectsApi.list(params);
      setProjects(response.projects);
      setTotal(response.total);
    } catch (error) {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this project?')) return;

    setDeleting(id);
    try {
      await projectsApi.delete(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setTotal((prev) => prev - 1);
      toast.success('Project deleted');
    } catch (error) {
      toast.error('Failed to delete project');
    } finally {
      setDeleting(null);
    }
  }

  async function handleUpdateProject(id: string, updates: Partial<Project>) {
    try {
      const updated = await projectsApi.update(id, {
        name: updates.name,
        dueDate: updates.dueDate,
        priority: updates.priority,
        tags: updates.tags?.join(','),
      });
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setEditingProject(null);
      toast.success('Project updated');
    } catch (error) {
      toast.error('Failed to update project');
    }
  }

  const toggleSort = (column: ProjectsListParams['sortBy']) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-slate-500 dark:text-slate-400">
            {total} project{total !== 1 ? 's' : ''} total
          </p>
        </div>
        <Link to="/projects/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          New Project
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Filter dropdowns */}
          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-auto"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="error">Error</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="input w-auto"
            >
              <option value="all">All Priority</option>
              {PRIORITIES.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <select
              value={sourceLanguage}
              onChange={(e) => setSourceLanguage(e.target.value)}
              className="input w-auto"
            >
              <option value="all">Source Lang</option>
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>

            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="input w-auto"
            >
              <option value="all">Target Lang</option>
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>

            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [col, ord] = e.target.value.split('-');
                setSortBy(col as ProjectsListParams['sortBy']);
                setSortOrder(ord as 'asc' | 'desc');
              }}
              className="input w-auto"
            >
              <option value="created_at-desc">Newest First</option>
              <option value="created_at-asc">Oldest First</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="due_date-asc">Due Date (Soon)</option>
              <option value="due_date-desc">Due Date (Later)</option>
              <option value="priority-desc">Priority (High)</option>
              <option value="priority-asc">Priority (Low)</option>
              <option value="progress-desc">Progress (High)</option>
              <option value="progress-asc">Progress (Low)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Projects Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : projects.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-slate-500">No projects found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50 dark:bg-slate-700/50">
                    <th className="text-left p-4 font-medium">Project</th>
                    <th className="text-left p-4 font-medium">Languages</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Priority</th>
                    <th className="text-left p-4 font-medium">Due Date</th>
                    <th className="text-left p-4 font-medium">Progress</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {projects.map((project, index) => (
                    <ProjectRow
                      key={project.id}
                      project={project}
                      index={index}
                      onDelete={() => handleDelete(project.id)}
                      onEdit={() => setEditingProject(project)}
                      deleting={deleting === project.id}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <p className="text-sm text-slate-500">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="btn-secondary text-sm"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages}
                    className="btn-secondary text-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingProject && (
          <EditProjectModal
            project={editingProject}
            onClose={() => setEditingProject(null)}
            onSave={(updates) => handleUpdateProject(editingProject.id, updates)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ProjectRow({
  project,
  index,
  onDelete,
  onEdit,
  deleting,
}: {
  project: Project;
  index: number;
  onDelete: () => void;
  onEdit: () => void;
  deleting: boolean;
}) {
  const status = statusConfig[project.status];
  const StatusIcon = status.icon;
  const priority = priorityConfig[project.priority];

  const isOverdue = project.dueDate && isPast(new Date(project.dueDate)) && !isToday(new Date(project.dueDate));

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.02 }}
      className="hover:bg-slate-50 dark:hover:bg-slate-700/50"
    >
      <td className="p-4">
        <Link
          to={`/projects/${project.id}`}
          className="font-medium hover:text-primary-600 dark:hover:text-primary-400"
        >
          {project.name}
        </Link>
        <p className="text-sm text-slate-500">{project.fileName}</p>
        {project.tags.length > 0 && (
          <div className="flex gap-1 mt-1">
            {project.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
                {tag}
              </span>
            ))}
            {project.tags.length > 3 && (
              <span className="text-xs text-slate-500">+{project.tags.length - 3}</span>
            )}
          </div>
        )}
      </td>

      <td className="p-4">
        <span className="text-sm">
          {project.sourceLanguage.toUpperCase()} → {project.targetLanguage.toUpperCase()}
        </span>
      </td>

      <td className="p-4">
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
          <StatusIcon className={`w-3 h-3 ${project.status === 'processing' ? 'animate-spin' : ''}`} />
          {status.label}
        </span>
      </td>

      <td className="p-4">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${priority.bg} ${priority.color}`}>
          <Flag className="w-3 h-3" />
          {PRIORITIES.find((p) => p.id === project.priority)?.name}
        </span>
      </td>

      <td className="p-4">
        {project.dueDate ? (
          <div className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(project.dueDate), 'MMM d, yyyy')}
            </div>
            <span className="text-xs text-slate-500">
              {isOverdue ? 'Overdue' : formatDistanceToNow(new Date(project.dueDate), { addSuffix: true })}
            </span>
          </div>
        ) : (
          <span className="text-slate-400 text-sm">No due date</span>
        )}
      </td>

      <td className="p-4">
        <div className="w-24">
          <div className="flex items-center justify-between text-xs mb-1">
            <span>{project.translatedSegments}/{project.totalSegments}</span>
            <span>{project.progress.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 transition-all duration-300"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>
      </td>

      <td className="p-4">
        <div className="flex items-center justify-end gap-1">
          <Link
            to={`/projects/${project.id}`}
            className="p-2 text-slate-500 hover:text-primary-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            title="Open"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
          <button
            onClick={onEdit}
            className="p-2 text-slate-500 hover:text-primary-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="p-2 text-slate-500 hover:text-red-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
            title="Delete"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      </td>
    </motion.tr>
  );
}

function EditProjectModal({
  project,
  onClose,
  onSave,
}: {
  project: Project;
  onClose: () => void;
  onSave: (updates: Partial<Project>) => void;
}) {
  const [name, setName] = useState(project.name);
  const [dueDate, setDueDate] = useState(project.dueDate || '');
  const [priority, setPriority] = useState<ProjectPriority>(project.priority);
  const [tagsInput, setTagsInput] = useState(project.tags.join(', '));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      name,
      dueDate: dueDate || null,
      priority,
      tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
    });
    setSaving(false);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md card p-6 z-50"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Edit Project</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="label">Due Date</label>
            <input
              type="date"
              value={dueDate ? dueDate.split('T')[0] : ''}
              onChange={(e) => setDueDate(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="label">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as ProjectPriority)}
              className="input"
            >
              {PRIORITIES.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Tags (comma-separated)</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="marketing, urgent, Q1"
              className="input"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving || !name} className="btn-primary flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
