# TranslatePro v4.0 - Спецификация (Част 3)

---

## 12. API Reference

### 12.1 Authentication
```typescript
// All API requests require Authorization header
headers: {
  'Authorization': 'Bearer <session_token>',
  'Content-Type': 'application/json'
}
```

### 12.2 Projects API

```typescript
// GET /api/projects
// List all projects with filtering and sorting
interface ListProjectsRequest {
  // Pagination
  page?: number;        // Default: 1
  limit?: number;       // Default: 20, Max: 100

  // Filtering
  status?: ProjectStatus;
  sourceLanguage?: LanguageCode;
  targetLanguage?: LanguageCode;

  // Sorting
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'dueDate';
  sortOrder?: 'asc' | 'desc';

  // Search
  search?: string;
}

interface ListProjectsResponse {
  projects: Project[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// GET /api/projects/:id
// Get project details with segments
interface GetProjectResponse {
  project: Project;
  segments: Segment[];
  stats: ProjectStats;
}

// POST /api/projects
// Create new project with file upload
// Content-Type: multipart/form-data
interface CreateProjectRequest {
  file: File;
  name: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  model?: AIModel;
  style?: TranslationStyle;
  context?: string;
  dueDate?: string;    // ISO date
  tmId?: string;       // Translation Memory to use
  glossaryId?: string; // Glossary to use
}

// PUT /api/projects/:id
// Update project settings
interface UpdateProjectRequest {
  name?: string;
  style?: TranslationStyle;
  context?: string;
  dueDate?: string;
  priority?: Priority;
  tmId?: string;
  glossaryId?: string;
}

// DELETE /api/projects/:id
// Delete project and all related data

// POST /api/projects/:id/duplicate
// Duplicate project
interface DuplicateProjectRequest {
  name?: string;
  includeTranslations?: boolean;
}
```

### 12.3 Translation API

```typescript
// POST /api/segments/:id/translate
// Translate single segment
interface TranslateSegmentRequest {
  model?: AIModel;     // Override project model
  style?: TranslationStyle;
  useTM?: boolean;
  forceTM?: string;    // Force specific TM entry
}

interface TranslateSegmentResponse {
  segment: Segment;
  tmMatch?: TMMatch;
  tokensUsed: TokenUsage;
  cost: number;
}

// POST /api/projects/:id/translate-all
// Translate all untranslated segments (SSE stream)
interface TranslateAllRequest {
  model?: AIModel;
  useTM?: boolean;
  skipApproved?: boolean;
}

// SSE Events:
// - progress: { completed: number, total: number, current: string }
// - segment: { segmentId: string, translatedText: string }
// - error: { segmentId: string, error: string }
// - complete: { tokensUsed: TokenUsage, cost: number }

// POST /api/projects/:id/cancel-translation
// Cancel ongoing translation

// GET /api/projects/:id/translation-status
// Get translation job status
interface TranslationStatus {
  status: 'idle' | 'translating' | 'paused' | 'cancelled';
  progress: number;
  currentSegment?: number;
  startedAt?: string;
  estimatedCompletion?: string;
}
```

### 12.4 Segments API

```typescript
// GET /api/projects/:id/segments
// Get all segments for project
interface GetSegmentsRequest {
  page?: number;
  pageNumber?: number;  // Filter by PDF page
  status?: 'all' | 'translated' | 'untranslated' | 'approved';
}

// PUT /api/segments/:id
// Update segment translation
interface UpdateSegmentRequest {
  translatedText: string;
  saveToTM?: boolean;
}

// POST /api/segments/:id/approve
// Approve segment
interface ApproveSegmentRequest {
  approved: boolean;
}

// GET /api/segments/:id/revisions
// Get revision history for segment
interface GetRevisionsResponse {
  revisions: Revision[];
}

// POST /api/segments/:id/revisions/:revisionId/restore
// Restore to previous revision
```

### 12.5 Speech-to-Text API

```typescript
// POST /api/speech/transcribe
// Transcribe audio file
// Content-Type: multipart/form-data
interface TranscribeRequest {
  audio: File;
  language?: LanguageCode | 'auto';
  prompt?: string;    // Context for better transcription
}

interface TranscribeResponse {
  sessionId: string;
  text: string;
  segments: TranscriptionSegment[];
  language: string;
  duration: number;
}

// WebSocket: /api/speech/stream
// Real-time transcription
// Events:
// - partial: { text: string }
// - final: { text: string, confidence: number }
// - error: { message: string }

// POST /api/speech/sessions/:id/to-project
// Create project from transcription
interface CreateProjectFromSpeechRequest {
  name: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  model?: AIModel;
  style?: TranslationStyle;
}
```

### 12.6 Translation Memory API

```typescript
// GET /api/tm
// List all Translation Memories

// POST /api/tm
// Create new TM
interface CreateTMRequest {
  name: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  description?: string;
  isGlobal?: boolean;
}

// POST /api/tm/:id/entries
// Add entry to TM
interface AddTMEntryRequest {
  sourceText: string;
  targetText: string;
  context?: string;
  domain?: string;
  quality?: 'machine' | 'human' | 'verified';
}

// POST /api/tm/:id/import
// Import TM from file (TMX, CSV, XLSX)
// Content-Type: multipart/form-data

// GET /api/tm/:id/export
// Export TM to file
interface ExportTMRequest {
  format: 'tmx' | 'csv' | 'xlsx' | 'json';
}

// POST /api/tm/search
// Search across TMs
interface TMSearchRequest {
  text: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  minMatch?: number;     // 0-100
  maxResults?: number;
  tmIds?: string[];      // Specific TMs to search
}
```

### 12.7 Glossary API

```typescript
// GET /api/glossaries
// List all glossaries

// POST /api/glossaries
// Create glossary
interface CreateGlossaryRequest {
  name: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  description?: string;
  isGlobal?: boolean;
}

// POST /api/glossaries/:id/terms
// Add term
interface AddGlossaryTermRequest {
  sourceTerm: string;
  targetTerm: string;
  caseSensitive?: boolean;
  exactMatch?: boolean;
  notes?: string;
  domain?: string;
}

// POST /api/glossaries/:id/import
// Import from file (CSV, XLSX, TBX)

// GET /api/glossaries/:id/export
// Export glossary
```

### 12.8 QA API

```typescript
// POST /api/projects/:id/qa/run
// Run QA checks
interface RunQARequest {
  checks?: QACheckType[];  // Specific checks, or all
  segmentIds?: string[];   // Specific segments, or all
}

interface RunQAResponse {
  report: QAReport;
}

// GET /api/projects/:id/qa/issues
// Get QA issues
interface GetQAIssuesRequest {
  severity?: 'error' | 'warning' | 'info';
  status?: 'open' | 'ignored' | 'fixed';
  checkType?: QACheckType;
}

// PUT /api/qa/issues/:id
// Update issue status
interface UpdateQAIssueRequest {
  status: 'ignored' | 'fixed';
}

// POST /api/qa/issues/:id/fix
// Apply suggested fix
```

### 12.9 Export API

```typescript
// GET /api/projects/:id/export
// Export translated document
interface ExportRequest {
  format: 'pdf' | 'docx' | 'txt';
  includeOriginal?: boolean;     // Bilingual export
  preserveLayout?: boolean;      // For PDF
  onlyApproved?: boolean;        // Only approved segments
}

// GET /api/projects/:id/preview
// Get PDF preview
interface PreviewRequest {
  page?: number;
  type?: 'original' | 'translated' | 'overlay';
}
```

### 12.10 Batch API

```typescript
// POST /api/batch
// Create batch job
// Content-Type: multipart/form-data
interface CreateBatchRequest {
  files: File[];
  settings: BatchSettings;
}

// GET /api/batch/:id
// Get batch job status

// POST /api/batch/:id/start
// Start processing

// POST /api/batch/:id/pause
// Pause processing

// POST /api/batch/:id/cancel
// Cancel batch job

// GET /api/batch/:id/download
// Download all completed files as ZIP
```

### 12.11 Analytics API

```typescript
// GET /api/analytics/summary
// Get summary statistics
interface AnalyticsSummaryRequest {
  period?: '7d' | '30d' | '90d' | 'all';
  startDate?: string;
  endDate?: string;
}

interface AnalyticsSummaryResponse {
  totalProjects: number;
  totalDocuments: number;
  totalWords: number;
  totalCost: number;
  totalTokens: { input: number; output: number };
  avgQAScore: number;
  tmMatchRate: number;
}

// GET /api/analytics/charts
// Get chart data
interface AnalyticsChartsRequest {
  chart: 'cost' | 'projects' | 'languages' | 'models' | 'styles';
  period?: string;
  groupBy?: 'day' | 'week' | 'month';
}

// GET /api/analytics/export
// Export analytics report
interface ExportAnalyticsRequest {
  format: 'pdf' | 'xlsx' | 'csv';
  type: 'summary' | 'detailed' | 'costs' | 'productivity';
  period?: string;
}
```

### 12.12 Suggestions API

```typescript
// POST /api/suggestions
// Get alternative translations
interface SuggestionsRequest {
  text: string;                 // Selected text
  context: string;              // Surrounding text
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  count?: number;               // Number of suggestions (default: 5)
}

interface SuggestionsResponse {
  suggestions: Suggestion[];
}

interface Suggestion {
  text: string;
  explanation?: string;
  confidence: number;
}

// POST /api/rephrase
// Rephrase translation
interface RephraseRequest {
  text: string;
  instruction: string;  // e.g., "make it more formal"
  targetLanguage: LanguageCode;
}
```

---

## 13. Frontend Components

### 13.1 Component Library

```
src/components/
├── ui/                       # Base UI components (Radix-based)
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Select.tsx
│   ├── Checkbox.tsx
│   ├── Switch.tsx
│   ├── Slider.tsx
│   ├── Dialog.tsx
│   ├── Dropdown.tsx
│   ├── Popover.tsx
│   ├── Tooltip.tsx
│   ├── Toast.tsx
│   ├── Progress.tsx
│   ├── Badge.tsx
│   ├── Card.tsx
│   ├── Tabs.tsx
│   ├── Accordion.tsx
│   └── ...
│
├── layout/                   # Layout components
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   ├── Footer.tsx
│   ├── PageContainer.tsx
│   └── Panel.tsx
│
├── project/                  # Project-related
│   ├── ProjectCard.tsx
│   ├── ProjectList.tsx
│   ├── ProjectGrid.tsx
│   ├── NewProjectModal.tsx
│   ├── EditProjectModal.tsx
│   └── ProjectStats.tsx
│
├── editor/                   # Translation editor
│   ├── EditorLayout.tsx
│   ├── OriginalPanel.tsx
│   ├── TranslationPanel.tsx
│   ├── SegmentRow.tsx
│   ├── SegmentEditor.tsx
│   ├── SuggestionDropdown.tsx
│   ├── PDFViewer.tsx
│   ├── PDFOverlay.tsx
│   └── EditorToolbar.tsx
│
├── tm/                       # Translation Memory
│   ├── TMPanel.tsx
│   ├── TMMatchCard.tsx
│   ├── TMSearchModal.tsx
│   └── TMImportExport.tsx
│
├── qa/                       # Quality Assurance
│   ├── QAPanel.tsx
│   ├── QAIssueCard.tsx
│   ├── QASummary.tsx
│   └── QASettings.tsx
│
├── speech/                   # Speech-to-Text
│   ├── SpeechRecorder.tsx
│   ├── Waveform.tsx
│   ├── TranscriptionView.tsx
│   └── AudioPlayer.tsx
│
├── batch/                    # Batch processing
│   ├── BatchUploader.tsx
│   ├── BatchProgress.tsx
│   ├── BatchSettings.tsx
│   └── BatchResults.tsx
│
├── analytics/                # Analytics dashboard
│   ├── AnalyticsDashboard.tsx
│   ├── StatCard.tsx
│   ├── ChartCard.tsx
│   └── ActivityFeed.tsx
│
├── glossary/                 # Glossary management
│   ├── GlossaryPanel.tsx
│   ├── GlossaryEditor.tsx
│   └── TermEditor.tsx
│
└── shared/                   # Shared components
    ├── LanguageSelector.tsx
    ├── ModelSelector.tsx
    ├── StyleSelector.tsx
    ├── FileUpload.tsx
    ├── LoadingSpinner.tsx
    ├── EmptyState.tsx
    ├── ErrorBoundary.tsx
    └── ConfirmDialog.tsx
```

### 13.2 Views Structure

```
src/views/
├── DashboardView.tsx         # Home / project list
├── EditorView.tsx            # Translation editor
├── SpeechView.tsx            # Speech-to-text
├── BatchView.tsx             # Batch processing
├── AnalyticsView.tsx         # Analytics dashboard
├── SettingsView.tsx          # Application settings
├── TMView.tsx                # Translation Memory management
├── GlossaryView.tsx          # Glossary management
└── NotFoundView.tsx          # 404 page
```

### 13.3 State Management (Zustand)

```typescript
// stores/projectStore.ts
interface ProjectStore {
  // State
  projects: Project[];
  currentProject: Project | null;
  segments: Segment[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<void>;
  createProject: (data: CreateProjectRequest) => Promise<Project>;
  updateProject: (id: string, data: UpdateProjectRequest) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
}

// stores/editorStore.ts
interface EditorStore {
  // State
  activeSegmentId: string | null;
  selectedText: TextSelection | null;
  showSuggestions: boolean;
  suggestions: Suggestion[];

  // View state
  originalZoom: number;
  translationZoom: number;
  sidePanelTab: 'tm' | 'qa' | 'revisions' | 'glossary';
  showSidePanel: boolean;

  // Actions
  setActiveSegment: (id: string | null) => void;
  selectText: (selection: TextSelection) => void;
  fetchSuggestions: (text: string, context: string) => Promise<void>;
  applyTranslation: (segmentId: string, text: string) => Promise<void>;
  approveSegment: (segmentId: string) => Promise<void>;
}

// stores/translationStore.ts
interface TranslationStore {
  // State
  isTranslating: boolean;
  progress: TranslationProgress;
  queue: string[];  // Segment IDs

  // Actions
  translateSegment: (id: string) => Promise<void>;
  translateAll: (projectId: string) => Promise<void>;
  cancelTranslation: () => void;
  pauseTranslation: () => void;
  resumeTranslation: () => void;
}

// stores/uiStore.ts
interface UIStore {
  // Theme
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  // Modals
  activeModal: string | null;
  modalData: any;
  openModal: (name: string, data?: any) => void;
  closeModal: () => void;

  // Notifications
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;

  // Layout
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}
```

---

## 14. Keyboard Shortcuts

### 14.1 Global Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `Ctrl/Cmd + N` | New Project | Anywhere |
| `Ctrl/Cmd + O` | Open Project | Anywhere |
| `Ctrl/Cmd + S` | Save Current | Editor |
| `Ctrl/Cmd + Shift + S` | Save All | Editor |
| `Ctrl/Cmd + E` | Export | Editor |
| `Ctrl/Cmd + ,` | Open Settings | Anywhere |
| `Ctrl/Cmd + /` | Show Shortcuts | Anywhere |
| `Escape` | Close Modal/Panel | Anywhere |

### 14.2 Editor Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Enter` | Translate Current Segment |
| `Ctrl/Cmd + Shift + Enter` | Translate All |
| `Ctrl/Cmd + D` | Approve Current Segment |
| `Ctrl/Cmd + Shift + D` | Unapprove Current Segment |
| `Alt + Up` | Previous Segment |
| `Alt + Down` | Next Segment |
| `Alt + Left` | Previous Page |
| `Alt + Right` | Next Page |
| `Ctrl/Cmd + F` | Find in Project |
| `Ctrl/Cmd + H` | Find and Replace |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Ctrl/Cmd + C` | Copy Selected |
| `Ctrl/Cmd + V` | Paste |
| `Tab` | Accept TM Match |
| `Shift + Tab` | Cycle TM Matches |

### 14.3 Panel Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + 1` | Show TM Panel |
| `Ctrl/Cmd + 2` | Show QA Panel |
| `Ctrl/Cmd + 3` | Show Revisions |
| `Ctrl/Cmd + 4` | Show Glossary |
| `Ctrl/Cmd + B` | Toggle Side Panel |
| `Ctrl/Cmd + \`` | Toggle Preview |

### 14.4 Speech Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space` | Start/Stop Recording |
| `Ctrl/Cmd + M` | Mute Microphone |
| `Ctrl/Cmd + P` | Play/Pause Playback |

### 14.5 Implementation

```tsx
// hooks/useKeyboardShortcuts.ts
import { useHotkeys } from 'react-hotkeys-hook';

export const useEditorShortcuts = () => {
  const { translateSegment, translateAll } = useTranslationStore();
  const { activeSegmentId, setActiveSegment } = useEditorStore();

  // Translate current
  useHotkeys('mod+enter', () => {
    if (activeSegmentId) {
      translateSegment(activeSegmentId);
    }
  }, { enableOnFormTags: true });

  // Translate all
  useHotkeys('mod+shift+enter', () => {
    translateAll();
  });

  // Navigate segments
  useHotkeys('alt+up', () => navigateToPreviousSegment());
  useHotkeys('alt+down', () => navigateToNextSegment());

  // Approve
  useHotkeys('mod+d', () => approveCurrentSegment());
};

// components/ShortcutsModal.tsx
<ShortcutsModal>
  <ShortcutGroup title="Navigation">
    <Shortcut keys={['Alt', '↑']} action="Previous segment" />
    <Shortcut keys={['Alt', '↓']} action="Next segment" />
  </ShortcutGroup>
  <ShortcutGroup title="Translation">
    <Shortcut keys={['⌘', 'Enter']} action="Translate segment" />
    <Shortcut keys={['⌘', 'Shift', 'Enter']} action="Translate all" />
  </ShortcutGroup>
  ...
</ShortcutsModal>
```

---

## 15. Accessibility (a11y)

### 15.1 WCAG 2.1 AA Compliance

| Criteria | Implementation |
|----------|----------------|
| Color Contrast | Min 4.5:1 for text, 3:1 for UI |
| Focus Visible | Visible focus ring on all interactive elements |
| Keyboard Navigation | All features accessible via keyboard |
| Screen Readers | ARIA labels, roles, live regions |
| Motion | Respect prefers-reduced-motion |
| Text Sizing | Support up to 200% zoom |

### 15.2 ARIA Implementation

```tsx
// Segment with status
<div
  role="listitem"
  aria-label={`Segment ${index}: ${original.substring(0, 50)}...`}
  aria-selected={isActive}
  aria-describedby={`segment-status-${id}`}
>
  <span id={`segment-status-${id}`} className="sr-only">
    {isApproved ? 'Approved' : isTranslated ? 'Translated' : 'Pending'}
  </span>
  ...
</div>

// Translation progress
<div
  role="progressbar"
  aria-valuenow={progress}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label="Translation progress"
>
  <span className="sr-only">{progress}% complete</span>
</div>

// Live region for notifications
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {notification.message}
</div>

// Modal
<Dialog.Root>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
    >
      <Dialog.Title id="dialog-title">New Project</Dialog.Title>
      <Dialog.Description id="dialog-description">
        Create a new translation project
      </Dialog.Description>
      ...
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

### 15.3 Focus Management

```tsx
// Trap focus in modals
import { FocusTrap } from '@radix-ui/react-focus-trap';

<FocusTrap>
  <ModalContent>
    ...
  </ModalContent>
</FocusTrap>

// Restore focus after modal closes
const previousFocus = useRef<HTMLElement | null>(null);

useEffect(() => {
  if (isOpen) {
    previousFocus.current = document.activeElement as HTMLElement;
  } else {
    previousFocus.current?.focus();
  }
}, [isOpen]);

// Skip to content link
<a href="#main-content" className="skip-link">
  Skip to main content
</a>

// Visible focus styles
.focus-visible:focus {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
}
```

### 15.4 Screen Reader Testing

```typescript
// Test matrix
const screenReaderTests = {
  NVDA: ['Chrome', 'Firefox'],
  JAWS: ['Chrome', 'Edge'],
  VoiceOver: ['Safari', 'Chrome'],
  TalkBack: ['Chrome Mobile']
};
```

---

## 16. Security

### 16.1 API Key Management

```typescript
// .env file (never committed)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...

// Server-side only
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Never expose to client
// API keys are validated on server
```

### 16.2 Input Validation

```typescript
// Using Zod for validation
import { z } from 'zod';

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(255),
  sourceLanguage: z.enum(['en', 'bg', 'de', 'fr', 'es']),
  targetLanguage: z.enum(['en', 'bg', 'de', 'fr', 'es']),
  model: z.enum(['claude-sonnet-4-20250514', 'claude-opus-4-20250514']).optional(),
  style: z.enum(['standard', 'formal', 'informal', 'technical', 'legal', 'marketing', 'literary', 'medical']).optional(),
  context: z.string().max(2000).optional(),
  dueDate: z.string().datetime().optional()
});

// Middleware
app.post('/api/projects', async (req, res) => {
  const result = CreateProjectSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  // Proceed with validated data
});
```

### 16.3 File Upload Security

```typescript
// Allowed MIME types
const ALLOWED_TYPES = {
  document: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ],
  image: [
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp'
  ],
  audio: [
    'audio/mpeg',
    'audio/wav',
    'audio/webm',
    'audio/mp4'
  ]
};

// File validation
const validateFile = (file: Express.Multer.File): ValidationResult => {
  // Check MIME type
  const allAllowed = Object.values(ALLOWED_TYPES).flat();
  if (!allAllowed.includes(file.mimetype)) {
    return { valid: false, error: 'Invalid file type' };
  }

  // Check file size
  const MAX_SIZE = 100 * 1024 * 1024; // 100MB
  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'File too large' };
  }

  // Check magic bytes (file signature)
  const signature = file.buffer.slice(0, 4);
  if (!isValidSignature(signature, file.mimetype)) {
    return { valid: false, error: 'File signature mismatch' };
  }

  return { valid: true };
};
```

### 16.4 Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

// Global rate limit
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests'
});

// Translation rate limit (more strict)
const translationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20, // 20 translations per minute
  message: 'Translation rate limit exceeded'
});

app.use('/api', globalLimiter);
app.use('/api/segments/*/translate', translationLimiter);
app.use('/api/projects/*/translate-all', translationLimiter);
```

### 16.5 Content Security

```typescript
// Helmet for security headers
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "https://api.anthropic.com", "https://api.openai.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "blob:"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: 'same-origin' }
}));
```

---

## 17. Deployment

### 17.1 Prerequisites

```bash
# System requirements
Node.js >= 20.0.0
npm >= 10.0.0

# For PDF processing
poppler-utils  # apt install poppler-utils OR brew install poppler

# For better performance
build-essential  # For native modules
```

### 17.2 Installation

```bash
# Clone repository
git clone https://github.com/your-org/translatepro.git
cd translatepro

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your API keys

# Initialize database
npm run db:init

# Build frontend
npm run build

# Start production server
npm run start
```

### 17.3 Environment Variables

```env
# Required
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-proj-...

# Server
PORT=3000
HOST=localhost
NODE_ENV=production

# Database
DATABASE_PATH=./data/translatepro.db

# File storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=104857600  # 100MB

# Defaults
DEFAULT_MODEL=claude-sonnet-4-20250514
DEFAULT_STYLE=standard

# Security
SESSION_SECRET=your-secret-key-here
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100

# Optional: Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

### 17.4 Docker Deployment

```dockerfile
# Dockerfile
FROM node:20-alpine

# Install poppler for PDF processing
RUN apk add --no-cache poppler-utils

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Build frontend
RUN npm run build

# Create data directory
RUN mkdir -p /app/data /app/uploads /app/logs

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "run", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  translatepro:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./data:/app/data
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    restart: unless-stopped
```

### 17.5 Scripts

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "nodemon --exec ts-node src/server/index.ts",
    "dev:client": "vite",
    "build": "npm run build:client && npm run build:server",
    "build:client": "vite build",
    "build:server": "tsc -p tsconfig.server.json",
    "start": "node dist/server/index.js",
    "db:init": "ts-node scripts/init-db.ts",
    "db:migrate": "ts-node scripts/migrate.ts",
    "lint": "eslint . --ext .ts,.tsx",
    "test": "vitest",
    "test:e2e": "playwright test"
  }
}
```

---

## 18. Appendix

### 18.1 Language Codes

| Code | Language | Native Name |
|------|----------|-------------|
| en | English | English |
| bg | Bulgarian | Български |
| de | German | Deutsch |
| fr | French | Français |
| es | Spanish | Español |
| it | Italian | Italiano |
| pt | Portuguese | Português |
| ru | Russian | Русский |
| zh | Chinese | 中文 |
| ja | Japanese | 日本語 |
| ko | Korean | 한국어 |
| ar | Arabic | العربية |
| hi | Hindi | हिन्दी |
| tr | Turkish | Türkçe |
| pl | Polish | Polski |
| nl | Dutch | Nederlands |
| sv | Swedish | Svenska |
| cs | Czech | Čeština |
| ro | Romanian | Română |
| uk | Ukrainian | Українська |

### 18.2 Error Codes

| Code | Message | Description |
|------|---------|-------------|
| E001 | Invalid API key | API key missing or invalid |
| E002 | Rate limit exceeded | Too many requests |
| E003 | File too large | File exceeds size limit |
| E004 | Invalid file type | Unsupported file format |
| E005 | Translation failed | AI translation error |
| E006 | Project not found | Invalid project ID |
| E007 | Segment not found | Invalid segment ID |
| E008 | Insufficient tokens | Token limit reached |
| E009 | OCR failed | Text extraction error |
| E010 | Export failed | Document generation error |

### 18.3 Version History

| Version | Date | Changes |
|---------|------|---------|
| 4.0.0 | Jan 2026 | Initial v4 release with PDF layout, Speech-to-Text, TM, QA |
| 3.1.0 | - | Previous version (reference) |

---

*Документ: TranslatePro v4.0 Technical Specification*
*Автор: Development Team*
*Последна актуализация: Януари 2026*
