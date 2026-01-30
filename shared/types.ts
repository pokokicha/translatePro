// ===========================================
// TranslatePro v4.0 - Shared Types
// ===========================================

// Supported Languages
export type LanguageCode = 'en' | 'bg' | 'de' | 'fr' | 'es';

export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
}

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
];

// Translation Styles
export type TranslationStyle =
  | 'standard'
  | 'formal'
  | 'informal'
  | 'technical'
  | 'legal'
  | 'marketing'
  | 'literary'
  | 'medical'
  | 'academic'
  | 'conversational';

export interface TranslationStyleInfo {
  id: TranslationStyle;
  name: string;
  description: string;
}

export const TRANSLATION_STYLES: TranslationStyleInfo[] = [
  { id: 'standard', name: 'Standard', description: 'Natural, balanced translation' },
  { id: 'formal', name: 'Formal/Business', description: 'Professional, corporate tone' },
  { id: 'informal', name: 'Informal/Casual', description: 'Conversational, friendly tone' },
  { id: 'technical', name: 'Technical/Scientific', description: 'Precise terminology, scientific accuracy' },
  { id: 'legal', name: 'Legal', description: 'Formal legal language, precise terms' },
  { id: 'marketing', name: 'Marketing/Creative', description: 'Persuasive, engaging copy' },
  { id: 'literary', name: 'Literary/Creative', description: 'Artistic, stylistic preservation' },
  { id: 'medical', name: 'Medical', description: 'Clinical precision, medical terminology' },
  { id: 'academic', name: 'Academic', description: 'Scholarly, research-oriented' },
  { id: 'conversational', name: 'Conversational', description: 'Natural dialogue, spoken style' },
];

// AI Models
export type AIModel = 'claude-sonnet-4-20250514' | 'claude-opus-4-20250514' | 'claude-3-5-haiku-20241022';

export interface AIModelInfo {
  id: AIModel;
  name: string;
  description: string;
  inputCostPer1M: number;
  outputCostPer1M: number;
}

export const AI_MODELS: AIModelInfo[] = [
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    description: 'Fast, high-quality translations',
    inputCostPer1M: 3,
    outputCostPer1M: 15,
  },
  {
    id: 'claude-opus-4-20250514',
    name: 'Claude Opus 4',
    description: 'Highest quality, complex documents',
    inputCostPer1M: 15,
    outputCostPer1M: 75,
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    description: 'Quick preview translations',
    inputCostPer1M: 0.8,
    outputCostPer1M: 4,
  },
];

// Project Status
export type ProjectStatus = 'pending' | 'processing' | 'completed' | 'error';

// Project Priority
export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface PriorityInfo {
  id: ProjectPriority;
  name: string;
  color: string;
}

export const PRIORITIES: PriorityInfo[] = [
  { id: 'low', name: 'Low', color: 'slate' },
  { id: 'medium', name: 'Medium', color: 'blue' },
  { id: 'high', name: 'High', color: 'orange' },
  { id: 'urgent', name: 'Urgent', color: 'red' },
];

// Segment Status
export type SegmentStatus = 'pending' | 'translating' | 'translated' | 'approved' | 'error';

// PDF Text Element with positioning
export interface PDFTextElement {
  id: string;
  pageNumber: number;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  style: {
    fontFamily: string;
    fontSize: number;
    fontWeight: 'normal' | 'bold';
    fontStyle: 'normal' | 'italic';
    color: string;
    textAlign: 'left' | 'center' | 'right';
    lineHeight: number;
  };
  content: {
    original: string;
    translated?: string;
  };
}

// PDF Image with positioning
export interface PDFImage {
  id: string;
  pageNumber: number;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  data: string; // Base64
  format: 'jpeg' | 'png';
}

// Project
export interface Project {
  id: string;
  name: string;
  fileName: string;
  fileType: 'pdf' | 'docx' | 'txt';
  fileSize: number;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  translationStyle: TranslationStyle;
  aiModel: AIModel;
  status: ProjectStatus;
  progress: number;
  totalSegments: number;
  translatedSegments: number;
  approvedSegments: number;
  tokensInput: number;
  tokensOutput: number;
  totalCost: number;
  dueDate: string | null;
  priority: ProjectPriority;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// Segment (translation unit)
export interface Segment {
  id: string;
  projectId: string;
  index: number;
  pageNumber: number;
  sourceText: string;
  targetText: string | null;
  status: SegmentStatus;
  positionData: PDFTextElement['position'] | null;
  styleData: PDFTextElement['style'] | null;
  isApproved: boolean;
  matchPercentage: number | null; // TM match
  tokensInput: number;
  tokensOutput: number;
  createdAt: string;
  updatedAt: string;
}

// Revision (history)
export interface Revision {
  id: string;
  segmentId: string;
  previousText: string;
  newText: string;
  source: 'ai' | 'user' | 'tm';
  createdAt: string;
}

// Audio Session
export interface AudioSession {
  id: string;
  projectId: string | null;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  audioType: 'recording' | 'file';
  duration: number;
  transcription: string | null;
  translation: string | null;
  segments: AudioSegment[];
  status: 'processing' | 'transcribed' | 'translated' | 'error';
  createdAt: string;
}

export interface AudioSegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  translation?: string;
  confidence: number;
}

// Glossary
export interface Glossary {
  id: string;
  name: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  termsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GlossaryTerm {
  id: string;
  glossaryId: string;
  sourceTerm: string;
  targetTerm: string;
  notes: string | null;
  createdAt: string;
}

// API Request/Response types
export interface CreateProjectRequest {
  name: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  translationStyle: TranslationStyle;
  aiModel: AIModel;
  dueDate?: string;
  priority?: ProjectPriority;
  tags?: string[];
}

export interface TranslateAllRequest {
  glossaryId?: string;
  skipApproved?: boolean;
}

export interface TranslationProgress {
  projectId: string;
  status: ProjectStatus;
  progress: number;
  currentSegment: number;
  totalSegments: number;
  tokensUsed: number;
  estimatedCost: number;
}

export interface UpdateSegmentRequest {
  targetText: string;
  isApproved?: boolean;
}

// QA Check Results
export interface QACheck {
  id: string;
  type: 'numbers' | 'punctuation' | 'terminology' | 'length' | 'formatting' | 'tags';
  severity: 'error' | 'warning' | 'info';
  message: string;
  segmentId: string;
  position?: { start: number; end: number };
}

// Analytics
export interface ProjectAnalytics {
  totalProjects: number;
  totalSegments: number;
  totalWords: number;
  totalTokensInput: number;
  totalTokensOutput: number;
  totalCost: number;
  completionRate: number;
  averageProjectSize: number;
}

// WebSocket Events
export interface WSEvents {
  'translation:start': { projectId: string };
  'translation:progress': TranslationProgress;
  'translation:segment': { segmentId: string; targetText: string };
  'translation:complete': { projectId: string };
  'translation:error': { projectId: string; error: string };
}
