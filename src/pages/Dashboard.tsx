import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  ExternalLink,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { projectsApi, configApi } from '../lib/api';
import { useStore } from '../store/useStore';
import type { Project, ProjectAnalytics } from '@shared/types';

const statusConfig = {
  pending: { icon: Clock, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-700' },
  processing: { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/50', animate: true },
  completed: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/50' },
  error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/50' },
};

export default function Dashboard() {
  const { projects, setProjects, removeProject } = useStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ProjectAnalytics | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [projectsData, statsData] = await Promise.all([
        projectsApi.list(),
        configApi.getStats(),
      ]);
      setProjects(projectsData);
      setStats(statsData);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this project?')) return;

    setDeleting(id);
    try {
      await projectsApi.delete(id);
      removeProject(id);
      toast.success('Project deleted');
    } catch (error) {
      toast.error('Failed to delete project');
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Manage your translation projects
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Projects"
            value={stats.totalProjects}
            icon={FileText}
          />
          <StatCard
            title="Total Segments"
            value={stats.totalSegments.toLocaleString()}
            icon={TrendingUp}
          />
          <StatCard
            title="Completion Rate"
            value={`${stats.completionRate.toFixed(1)}%`}
            icon={CheckCircle}
          />
          <StatCard
            title="Total Cost"
            value={`$${stats.totalCost.toFixed(2)}`}
            icon={TrendingUp}
          />
        </div>
      )}

      {/* Projects List */}
      <div className="card">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Recent Projects</h2>
        </div>

        {projects.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-medium mb-2">No projects yet</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              Create your first translation project to get started
            </p>
            <Link to="/projects/new" className="btn-primary">
              Create Project
            </Link>
          </div>
        ) : (
          <div className="divide-y">
            {projects.map((project, index) => (
              <ProjectRow
                key={project.id}
                project={project}
                index={index}
                onDelete={() => handleDelete(project.id)}
                deleting={deleting === project.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-4"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className="p-2 bg-primary-50 dark:bg-primary-900/50 rounded-lg">
          <Icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        </div>
      </div>
    </motion.div>
  );
}

function ProjectRow({
  project,
  index,
  onDelete,
  deleting,
}: {
  project: Project;
  index: number;
  onDelete: () => void;
  deleting: boolean;
}) {
  const status = statusConfig[project.status];
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
    >
      <div className={`p-2 rounded-lg ${status.bg}`}>
        <StatusIcon
          className={`w-5 h-5 ${status.color} ${status.animate ? 'animate-spin' : ''}`}
        />
      </div>

      <div className="flex-1 min-w-0">
        <Link
          to={`/projects/${project.id}`}
          className="font-medium hover:text-primary-600 dark:hover:text-primary-400"
        >
          {project.name}
        </Link>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span>{project.fileName}</span>
          <span>•</span>
          <span>
            {project.sourceLanguage.toUpperCase()} → {project.targetLanguage.toUpperCase()}
          </span>
          <span>•</span>
          <span>{format(new Date(project.createdAt), 'MMM d, yyyy')}</span>
        </div>
      </div>

      {/* Progress */}
      <div className="hidden md:flex items-center gap-4 w-48">
        <div className="flex-1">
          <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 transition-all duration-300"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>
        <span className="text-sm text-slate-500 dark:text-slate-400 w-12 text-right">
          {project.progress.toFixed(0)}%
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Link
          to={`/projects/${project.id}`}
          className="p-2 text-slate-500 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <ExternalLink className="w-4 h-4" />
        </Link>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="p-2 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
        >
          {deleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      </div>
    </motion.div>
  );
}
