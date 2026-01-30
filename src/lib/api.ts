import type {
  Project,
  Segment,
  Glossary,
  GlossaryTerm,
  AudioSession,
  Language,
  AIModelInfo,
  TranslationStyleInfo,
  ProjectAnalytics,
  CreateProjectRequest,
} from '@shared/types';

const API_BASE = '/api';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new ApiError(response.status, error.error || 'Request failed');
  }

  // Handle no content response
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Projects API
export const projectsApi = {
  list: () => request<Project[]>('/projects'),

  get: (id: string) => request<Project>(`/projects/${id}`),

  create: async (data: CreateProjectRequest, file: File): Promise<Project> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', data.name);
    formData.append('sourceLanguage', data.sourceLanguage);
    formData.append('targetLanguage', data.targetLanguage);
    formData.append('translationStyle', data.translationStyle);
    formData.append('aiModel', data.aiModel);

    const response = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new ApiError(response.status, error.error || 'Upload failed');
    }

    return response.json();
  },

  delete: (id: string) =>
    request<void>(`/projects/${id}`, { method: 'DELETE' }),

  getSegments: (id: string) =>
    request<Segment[]>(`/projects/${id}/segments`),

  export: async (id: string): Promise<Blob> => {
    const response = await fetch(`${API_BASE}/projects/${id}/export`);
    if (!response.ok) {
      throw new ApiError(response.status, 'Export failed');
    }
    return response.blob();
  },
};

// Segments API
export const segmentsApi = {
  get: (id: string) => request<Segment>(`/segments/${id}`),

  update: (id: string, data: { targetText: string; isApproved?: boolean }) =>
    request<Segment>(`/segments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  approve: (id: string) =>
    request<Segment>(`/segments/${id}/approve`, { method: 'POST' }),

  unapprove: (id: string) =>
    request<Segment>(`/segments/${id}/unapprove`, { method: 'POST' }),
};

// Translation API
export const translationApi = {
  translateAll: async (
    projectId: string,
    options?: { glossaryId?: string; skipApproved?: boolean },
    onProgress?: (data: unknown) => void
  ): Promise<void> => {
    const response = await fetch(
      `${API_BASE}/translation/projects/${projectId}/translate-all`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options || {}),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Translation failed' }));
      throw new ApiError(response.status, error.error || 'Translation failed');
    }

    // Handle SSE stream
    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            onProgress?.(data);
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  },

  translateSegment: (id: string, options?: { aiModel?: string; style?: string }) =>
    request<{ id: string; targetText: string; status: string }>(
      `/translation/segments/${id}`,
      {
        method: 'POST',
        body: JSON.stringify(options || {}),
      }
    ),

  getSuggestions: (id: string) =>
    request<Array<{ style: string; translation: string }>>(
      `/translation/suggestions/${id}`
    ),
};

// Glossaries API
export const glossariesApi = {
  list: () => request<Glossary[]>('/glossaries'),

  get: (id: string) => request<Glossary>(`/glossaries/${id}`),

  create: (data: { name: string; sourceLanguage: string; targetLanguage: string }) =>
    request<Glossary>('/glossaries', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { name: string; sourceLanguage: string; targetLanguage: string }) =>
    request<Glossary>(`/glossaries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/glossaries/${id}`, { method: 'DELETE' }),

  getTerms: (id: string) =>
    request<GlossaryTerm[]>(`/glossaries/${id}/terms`),

  addTerm: (glossaryId: string, data: { sourceTerm: string; targetTerm: string; notes?: string }) =>
    request<GlossaryTerm>(`/glossaries/${glossaryId}/terms`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteTerm: (glossaryId: string, termId: string) =>
    request<void>(`/glossaries/${glossaryId}/terms/${termId}`, {
      method: 'DELETE',
    }),
};

// Audio API
export const audioApi = {
  listSessions: () => request<AudioSession[]>('/audio/sessions'),

  getSession: (id: string) => request<AudioSession>(`/audio/sessions/${id}`),

  transcribe: async (
    file: File,
    data: { sourceLanguage: string; targetLanguage: string; projectId?: string }
  ): Promise<AudioSession> => {
    const formData = new FormData();
    formData.append('audio', file);
    formData.append('sourceLanguage', data.sourceLanguage);
    formData.append('targetLanguage', data.targetLanguage);
    if (data.projectId) formData.append('projectId', data.projectId);

    const response = await fetch(`${API_BASE}/audio/transcribe`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Transcription failed' }));
      throw new ApiError(response.status, error.error || 'Transcription failed');
    }

    return response.json();
  },

  translateSession: (id: string) =>
    request<AudioSession>(`/audio/sessions/${id}/translate`, { method: 'POST' }),

  deleteSession: (id: string) =>
    request<void>(`/audio/sessions/${id}`, { method: 'DELETE' }),
};

// Config API
export const configApi = {
  getLanguages: () => request<Language[]>('/config/languages'),
  getModels: () => request<AIModelInfo[]>('/config/models'),
  getStyles: () => request<TranslationStyleInfo[]>('/config/styles'),
  getStats: () => request<ProjectAnalytics>('/config/stats'),
  getUsage: (days?: number) =>
    request<Array<{ date: string; tokens_input: number; tokens_output: number; cost: number }>>(
      `/config/usage${days ? `?days=${days}` : ''}`
    ),
};

export { ApiError };
