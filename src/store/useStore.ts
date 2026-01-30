import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, Segment, Glossary, LanguageCode, TranslationStyle, AIModel } from '@shared/types';

interface AppState {
  // Projects
  projects: Project[];
  currentProject: Project | null;
  segments: Segment[];

  // UI State
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';

  // Settings
  defaultSourceLanguage: LanguageCode;
  defaultTargetLanguage: LanguageCode;
  defaultStyle: TranslationStyle;
  defaultModel: AIModel;

  // Actions
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  addProject: (project: Project) => void;
  removeProject: (id: string) => void;

  setSegments: (segments: Segment[]) => void;
  updateSegment: (id: string, updates: Partial<Segment>) => void;

  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  setDefaultSourceLanguage: (lang: LanguageCode) => void;
  setDefaultTargetLanguage: (lang: LanguageCode) => void;
  setDefaultStyle: (style: TranslationStyle) => void;
  setDefaultModel: (model: AIModel) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      projects: [],
      currentProject: null,
      segments: [],
      sidebarOpen: true,
      theme: 'system',
      defaultSourceLanguage: 'en',
      defaultTargetLanguage: 'bg',
      defaultStyle: 'standard',
      defaultModel: 'claude-sonnet-4-20250514',

      // Project actions
      setProjects: (projects) => set({ projects }),
      setCurrentProject: (project) => set({ currentProject: project }),
      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
          currentProject:
            state.currentProject?.id === id
              ? { ...state.currentProject, ...updates }
              : state.currentProject,
        })),
      addProject: (project) =>
        set((state) => ({ projects: [project, ...state.projects] })),
      removeProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          currentProject:
            state.currentProject?.id === id ? null : state.currentProject,
        })),

      // Segment actions
      setSegments: (segments) => set({ segments }),
      updateSegment: (id, updates) =>
        set((state) => ({
          segments: state.segments.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        })),

      // UI actions
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setTheme: (theme) => set({ theme }),

      // Settings actions
      setDefaultSourceLanguage: (lang) => set({ defaultSourceLanguage: lang }),
      setDefaultTargetLanguage: (lang) => set({ defaultTargetLanguage: lang }),
      setDefaultStyle: (style) => set({ defaultStyle: style }),
      setDefaultModel: (model) => set({ defaultModel: model }),
    }),
    {
      name: 'translatepro-storage',
      partialize: (state) => ({
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
        defaultSourceLanguage: state.defaultSourceLanguage,
        defaultTargetLanguage: state.defaultTargetLanguage,
        defaultStyle: state.defaultStyle,
        defaultModel: state.defaultModel,
      }),
    }
  )
);
