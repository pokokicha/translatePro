# TranslatePro v4.0 - Пълна Техническа Спецификация

## 1. Визия и Цели

### 1.1 Визия
TranslatePro v4.0 е професионална платформа за превод на документи от следващо поколение, която:
- **Запазва перфектно оригиналния формат** на документи (layout, стилове, изображения)
- **Интегрира Speech-to-Text** за диктовка и аудио превод
- **Използва Claude AI** за висококачествен превод
- Предоставя **интуитивен, модерен интерфейс**

### 1.2 Ключови Подобрения спрямо v3.1
| Област | v3.1 | v4.0 |
|--------|------|------|
| PDF Layout | Текст само | Пълно запазване на формат, позиции, шрифтове |
| Изображения в PDF | Губят се | Запазват се на оригиналните позиции |
| Speech-to-Text | Няма | Whisper API + Browser API |
| Realtime Preview | Няма | Live preview на преведен документ |
| Batch Processing | Ограничен | Множество документи паралелно |

---

## 2. Архитектура

### 2.1 Системна Архитектура
```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Editor    │  │  Preview    │  │   Voice Recording UI    │ │
│  │  Component  │  │  Component  │  │      Component          │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Backend (Node.js/Express)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ Translation │  │    PDF      │  │   Speech-to-Text        │ │
│  │   Service   │  │  Processor  │  │      Service            │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │     OCR     │  │   Export    │  │      Queue              │ │
│  │   Service   │  │   Service   │  │      Manager            │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      External Services                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  Claude AI  │  │   Whisper   │  │     pdf-lib /           │ │
│  │     API     │  │     API     │  │     pdf2json            │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Database (SQLite/PostgreSQL)                  │
│  projects │ segments │ revisions │ audio_transcripts │ images   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Технологичен Стек

#### Backend
| Компонент | Технология | Версия | Цел |
|-----------|------------|--------|-----|
| Runtime | Node.js | 20+ | JavaScript сървър |
| Framework | Express.js | 4.x | HTTP API |
| Database | SQLite | 3.x | Локално съхранение |
| PDF Parse | pdf-lib | 1.x | Четене/писане на PDF с layout |
| PDF Layout | pdf2json | 2.x | Извличане на позиции и стилове |
| OCR | Tesseract.js | 5.x | Browser-side OCR |
| AI | @anthropic-ai/sdk | latest | Claude API |
| Speech | OpenAI Whisper API | latest | Транскрипция на аудио |
| Queue | Bull | 4.x | Job queue за дълги операции |
| WebSocket | Socket.io | 4.x | Real-time updates |

#### Frontend
| Компонент | Технология | Версия | Цел |
|-----------|------------|--------|-----|
| Framework | React | 18.x | UI библиотека |
| State | Zustand | 4.x | State management |
| Styling | Tailwind CSS | 3.x | Стилизация |
| PDF Viewer | react-pdf | 7.x | Преглед на PDF |
| Editor | Monaco Editor | latest | Текстов редактор |
| Audio | MediaRecorder API | native | Запис на глас |

---

## 3. Основни Модули

### 3.1 PDF Layout Preservation System

#### 3.1.1 Процес на обработка
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Upload PDF  │────▶│  Extract     │────▶│   Parse      │
│              │     │  Structure   │     │   Elements   │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Generate    │◀────│  Position    │◀────│  Translate   │
│  Output PDF  │     │  Text        │     │  Text Blocks │
└──────────────┘     └──────────────┘     └──────────────┘
```

#### 3.1.2 Извличане на Layout информация
За всеки текстов елемент в PDF се запазва:

```typescript
interface PDFTextElement {
  // Позиция
  x: number;           // X координата (pts от ляво)
  y: number;           // Y координата (pts от горе)
  width: number;       // Ширина на text box
  height: number;      // Височина на text box

  // Стил
  fontFamily: string;  // Име на шрифта
  fontSize: number;    // Размер в points
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string;       // Hex цвят

  // Съдържание
  originalText: string;
  translatedText?: string;

  // Метаданни
  pageNumber: number;
  elementIndex: number;
  lineHeight: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';
}
```

#### 3.1.3 Запазване на изображения
```typescript
interface PDFImage {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  imageData: Buffer;    // Оригинални image данни
  mimeType: string;     // image/png, image/jpeg
  rotation?: number;    // Ротация в градуси
}
```

#### 3.1.4 Алгоритъм за реконструкция
1. **Зареждане** на оригиналния PDF с pdf-lib
2. **Извличане** на всички текстови елементи с позиции чрез pdf2json
3. **Групиране** на текстове в логически блокове (параграфи, заглавия)
4. **Превод** на всеки блок с Claude AI
5. **Адаптиране** на шрифта ако преводът е по-дълъг/къс:
   - Намаляване на font size до минимум 70% от оригинала
   - Увеличаване на text box ако е необходимо
   - Пренасяне на нови редове при нужда
6. **Поставяне** на преведения текст на същите координати
7. **Запазване** на всички изображения на оригиналните позиции
8. **Експорт** като нов PDF

### 3.2 Speech-to-Text Module

#### 3.2.1 Поддържани входове
| Вход | Формат | Макс. дължина |
|------|--------|---------------|
| Микрофон (live) | WebM/Opus | 5 минути на запис |
| Аудио файл | MP3, WAV, M4A, WEBM | 25 MB |
| Видео файл | MP4, MOV | 100 MB (извлича се аудио) |

#### 3.2.2 Архитектура на Speech модула
```typescript
interface SpeechToTextConfig {
  provider: 'whisper' | 'browser';  // Whisper API или Web Speech API
  language: 'en' | 'bg' | 'de' | 'auto';
  model?: 'whisper-1';  // За Whisper API
}

interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  language: string;
  duration: number;
}

interface TranscriptionSegment {
  start: number;      // Начало в секунди
  end: number;        // Край в секунди
  text: string;       // Текст на сегмента
  confidence: number; // 0-1
}
```

#### 3.2.3 Работен процес
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Record/Upload  │────▶│   Transcribe    │────▶│  Create         │
│     Audio       │     │   (Whisper)     │     │  Project        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Export as      │◀────│   Translate     │◀────│  Segment        │
│  Document       │     │   Text          │     │  Text           │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 3.3 Translation Engine

#### 3.3.1 AI Модели
| Модел | API ID | Input цена | Output цена | Случаи на употреба |
|-------|--------|------------|-------------|-------------------|
| Claude Sonnet 4 | claude-sonnet-4-20250514 | $3/1M | $15/1M | Стандартен превод |
| Claude Opus 4 | claude-opus-4-20250514 | $15/1M | $75/1M | Критични документи |
| Claude Haiku | claude-haiku (когато е наличен) | $0.25/1M | $1.25/1M | Бърз preview |

#### 3.3.2 Стилове на превод
```typescript
const translationStyles = {
  standard: {
    name: 'Standard',
    prompt: 'Translate naturally while preserving the original tone and meaning.',
    temperature: 0.3
  },
  formal: {
    name: 'Formal / Business',
    prompt: 'Use formal, professional language suitable for business communication.',
    temperature: 0.2
  },
  informal: {
    name: 'Informal / Casual',
    prompt: 'Use conversational, friendly language.',
    temperature: 0.5
  },
  technical: {
    name: 'Technical / Scientific',
    prompt: 'Use precise technical terminology. Maintain accuracy of specialized terms.',
    temperature: 0.1
  },
  legal: {
    name: 'Legal',
    prompt: 'Use formal legal language with precise terminology. Maintain legal accuracy.',
    temperature: 0.1
  },
  marketing: {
    name: 'Marketing / Creative',
    prompt: 'Use engaging, persuasive language. Adapt cultural references appropriately.',
    temperature: 0.6
  },
  literary: {
    name: 'Literary / Creative',
    prompt: 'Preserve literary style, metaphors, and artistic expression.',
    temperature: 0.7
  },
  medical: {
    name: 'Medical',
    prompt: 'Use accurate medical terminology. Maintain clinical precision.',
    temperature: 0.1
  }
};
```

#### 3.3.3 Context-Aware Translation
```typescript
interface TranslationRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  style: string;
  context?: string;           // Потребителски контекст
  glossary?: GlossaryTerm[];  // Персонализиран речник
  previousSegments?: string[]; // За контекст от документа
}

interface GlossaryTerm {
  source: string;
  target: string;
  caseSensitive: boolean;
}
```

---

## 4. База Данни

### 4.1 ER Диаграма
```
┌─────────────────┐       ┌─────────────────┐
│    projects     │       │    segments     │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │───┐   │ id (PK)         │
│ name            │   │   │ project_id (FK) │◀──┐
│ source_language │   └──▶│ segment_index   │   │
│ target_language │       │ segment_type    │   │
│ model           │       │ original_text   │   │
│ style           │       │ translated_text │   │
│ context         │       │ position_data   │   │
│ due_date        │       │ style_data      │   │
│ original_file   │       │ is_approved     │   │
│ layout_data     │       │ tokens_used     │   │
│ created_at      │       │ created_at      │   │
│ updated_at      │       └─────────────────┘   │
└─────────────────┘                             │
                                                │
┌─────────────────┐       ┌─────────────────┐   │
│   revisions     │       │     images      │   │
├─────────────────┤       ├─────────────────┤   │
│ id (PK)         │       │ id (PK)         │   │
│ segment_id (FK) │       │ project_id (FK) │───┘
│ previous_text   │       │ page_number     │
│ new_text        │       │ position_data   │
│ created_at      │       │ image_data      │
└─────────────────┘       │ mime_type       │
                          └─────────────────┘

┌─────────────────┐       ┌─────────────────┐
│ audio_sessions  │       │   glossaries    │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ project_id (FK) │       │ project_id (FK) │
│ audio_data      │       │ source_term     │
│ transcription   │       │ target_term     │
│ duration        │       │ created_at      │
│ language        │       └─────────────────┘
│ created_at      │
└─────────────────┘
```

### 4.2 SQL Schema
```sql
-- Проекти
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    source_language TEXT NOT NULL,
    target_language TEXT NOT NULL,
    model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
    style TEXT NOT NULL DEFAULT 'standard',
    context TEXT,
    due_date TEXT,
    original_filename TEXT,
    original_file_data BLOB,
    layout_data TEXT,  -- JSON с пълната layout информация
    total_tokens_input INTEGER DEFAULT 0,
    total_tokens_output INTEGER DEFAULT 0,
    total_cost REAL DEFAULT 0,
    status TEXT DEFAULT 'draft', -- draft, translating, completed
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Сегменти
CREATE TABLE segments (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    segment_index INTEGER NOT NULL,
    page_number INTEGER DEFAULT 1,
    segment_type TEXT DEFAULT 'paragraph', -- paragraph, heading, list_item, caption
    original_text TEXT NOT NULL,
    translated_text TEXT,
    position_data TEXT, -- JSON: {x, y, width, height}
    style_data TEXT,    -- JSON: {fontFamily, fontSize, fontWeight, color, ...}
    word_alignment TEXT, -- JSON за word alignment
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    is_approved INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Ревизии
CREATE TABLE revisions (
    id TEXT PRIMARY KEY,
    segment_id TEXT NOT NULL,
    previous_text TEXT,
    new_text TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (segment_id) REFERENCES segments(id) ON DELETE CASCADE
);

-- Изображения
CREATE TABLE images (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    page_number INTEGER NOT NULL,
    position_x REAL NOT NULL,
    position_y REAL NOT NULL,
    width REAL NOT NULL,
    height REAL NOT NULL,
    image_data BLOB NOT NULL,
    mime_type TEXT NOT NULL,
    rotation REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Аудио сесии
CREATE TABLE audio_sessions (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    audio_data BLOB,
    transcription TEXT,
    segments_json TEXT, -- JSON array от timestamped сегменти
    duration REAL,
    language TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- Речници (Glossaries)
CREATE TABLE glossaries (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    name TEXT,
    source_language TEXT NOT NULL,
    target_language TEXT NOT NULL,
    is_global INTEGER DEFAULT 0, -- 1 = глобален речник
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE glossary_terms (
    id TEXT PRIMARY KEY,
    glossary_id TEXT NOT NULL,
    source_term TEXT NOT NULL,
    target_term TEXT NOT NULL,
    case_sensitive INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (glossary_id) REFERENCES glossaries(id) ON DELETE CASCADE
);

-- Индекси за производителност
CREATE INDEX idx_segments_project ON segments(project_id);
CREATE INDEX idx_segments_page ON segments(project_id, page_number);
CREATE INDEX idx_revisions_segment ON revisions(segment_id);
CREATE INDEX idx_images_project ON images(project_id);
CREATE INDEX idx_glossary_terms_glossary ON glossary_terms(glossary_id);
```

---

## 5. API Endpoints

### 5.1 Проекти
| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/projects` | Списък с всички проекти |
| GET | `/api/projects/:id` | Детайли за проект |
| POST | `/api/projects` | Създаване на проект (с файл) |
| PUT | `/api/projects/:id` | Актуализиране на проект |
| DELETE | `/api/projects/:id` | Изтриване на проект |
| GET | `/api/projects/:id/preview` | PDF preview на превода |
| GET | `/api/projects/:id/export` | Експорт (pdf/docx/txt) |

### 5.2 Сегменти
| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/projects/:id/segments` | Всички сегменти на проект |
| GET | `/api/segments/:id` | Детайли за сегмент |
| PUT | `/api/segments/:id` | Актуализиране на сегмент |
| POST | `/api/segments/:id/translate` | Превод на един сегмент |
| POST | `/api/segments/:id/approve` | Одобрение на сегмент |

### 5.3 Масов превод
| Method | Endpoint | Описание |
|--------|----------|----------|
| POST | `/api/projects/:id/translate-all` | Превод на всички (SSE stream) |
| GET | `/api/projects/:id/translation-status` | Статус на превода |
| POST | `/api/projects/:id/cancel-translation` | Спиране на превода |

### 5.4 Speech-to-Text
| Method | Endpoint | Описание |
|--------|----------|----------|
| POST | `/api/speech/transcribe` | Транскрипция на аудио файл |
| POST | `/api/speech/stream` | Real-time транскрипция (WebSocket) |
| GET | `/api/speech/sessions` | История на аудио сесиите |
| POST | `/api/speech/sessions/:id/to-project` | Създаване на проект от транскрипция |

### 5.5 Предложения и Синоними
| Method | Endpoint | Описание |
|--------|----------|----------|
| POST | `/api/suggestions` | Алтернативни преводи за селекция |
| POST | `/api/rephrase` | Перифразиране на текст |

### 5.6 Речници
| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/glossaries` | Всички речници |
| POST | `/api/glossaries` | Създаване на речник |
| POST | `/api/glossaries/:id/terms` | Добавяне на термин |
| DELETE | `/api/glossaries/:id/terms/:termId` | Изтриване на термин |

### 5.7 Конфигурация
| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/models` | Налични AI модели |
| GET | `/api/styles` | Стилове на превод |
| GET | `/api/languages` | Поддържани езици |
| POST | `/api/estimate` | Оценка на цена преди превод |

---

## 6. Frontend Компоненти

### 6.1 Основни Views
```
App
├── DashboardView
│   ├── ProjectList (Grid/List)
│   ├── QuickStats
│   └── RecentActivity
│
├── EditorView
│   ├── Toolbar
│   │   ├── TranslateAllButton
│   │   ├── ExportDropdown
│   │   ├── StyleSelector
│   │   └── ProgressIndicator
│   │
│   ├── DocumentPanel (side-by-side)
│   │   ├── OriginalDocument
│   │   │   ├── PDFViewer (с overlay за текст)
│   │   │   └── SegmentHighlights
│   │   │
│   │   └── TranslatedDocument
│   │       ├── EditableSegments
│   │       ├── SuggestionDropdown
│   │       └── ApprovalIndicators
│   │
│   ├── SidePanel
│   │   ├── RevisionHistory
│   │   ├── GlossaryPanel
│   │   └── SegmentDetails
│   │
│   └── StatusBar
│       ├── TokenUsage
│       ├── CostEstimate
│       └── Progress
│
├── SpeechView
│   ├── RecordingControls
│   ├── WaveformDisplay
│   ├── TranscriptionEditor
│   └── ExportOptions
│
└── SettingsView
    ├── APIConfiguration
    ├── DefaultPreferences
    └── GlossaryManager
```

### 6.2 UI Flows

#### Flow 1: PDF Translation with Layout Preservation
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Upload    │────▶│   Preview   │────▶│   Edit      │
│    PDF      │     │   Layout    │     │  Settings   │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
        ┌──────────────────────────────────────┘
        ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Translate  │────▶│   Review    │────▶│   Export    │
│    All      │     │   & Edit    │     │  with Layout│
└─────────────┘     └─────────────┘     └─────────────┘
```

#### Flow 2: Speech-to-Text Translation
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Record    │────▶│ Transcribe  │────▶│   Edit      │
│   Audio     │     │  (Whisper)  │     │   Text      │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
        ┌──────────────────────────────────────┘
        ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Create    │────▶│  Translate  │────▶│   Export    │
│  Project    │     │             │     │ (PDF/DOCX)  │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## 7. Real-time Features

### 7.1 Server-Sent Events (SSE)
```typescript
// Translate All Progress
interface TranslationProgress {
  type: 'progress' | 'segment_complete' | 'error' | 'complete';
  projectId: string;
  segmentId?: string;
  segmentIndex?: number;
  totalSegments: number;
  completedSegments: number;
  currentSegmentText?: string;
  translatedText?: string;
  tokensUsed?: number;
  error?: string;
}
```

### 7.2 WebSocket Events
```typescript
// Speech-to-Text Real-time
interface SpeechEvent {
  type: 'transcription_partial' | 'transcription_final' | 'error';
  text: string;
  isFinal: boolean;
  confidence?: number;
  timestamp?: number;
}
```

---

## 8. Лимити и Ограничения

| Параметър | Стойност | Забележка |
|-----------|----------|-----------|
| Макс. размер на файл | 100 MB | За PDF, DOCX, изображения |
| Макс. страници за PDF | 50 | За пълна layout обработка |
| Макс. аудио дължина | 30 минути | За Whisper API |
| Макс. аудио файл | 25 MB | Whisper API лимит |
| Макс. сегменти на проект | 1000 | За производителност |
| Макс. текст за suggestions | 200 символа | За бързина |
| OCR резолюция | 200 DPI | Баланс качество/размер |
| Concurrent translations | 3 | На проект |

---

## 9. Поддържани Езици

### 9.1 Превод
| Код | Език | Посоки |
|-----|------|--------|
| EN | English | EN↔BG, EN↔DE, EN↔FR, EN↔ES |
| BG | Bulgarian | BG↔EN, BG↔DE |
| DE | German | DE↔EN, DE↔BG |
| FR | French | FR↔EN |
| ES | Spanish | ES↔EN |

### 9.2 Speech-to-Text
| Код | Език | Whisper Support |
|-----|------|-----------------|
| EN | English | ✅ |
| BG | Bulgarian | ✅ |
| DE | German | ✅ |
| FR | French | ✅ |
| ES | Spanish | ✅ |

---

## 10. Сигурност

### 10.1 API Ключове
- Claude API key се съхранява в `.env` файл (не в код)
- OpenAI API key (за Whisper) - същото
- Ключовете НЕ се изпращат към клиента

### 10.2 File Validation
```typescript
const allowedMimeTypes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'audio/mpeg',
  'audio/wav',
  'audio/webm',
  'video/mp4'
];

const maxFileSizes = {
  document: 100 * 1024 * 1024,  // 100 MB
  audio: 25 * 1024 * 1024,       // 25 MB
  image: 20 * 1024 * 1024        // 20 MB
};
```

### 10.3 Rate Limiting
- 100 requests/minute per IP
- 10 concurrent translation jobs per user

---

## 11. Deployment

### 11.1 Локална Инсталация
```bash
# Prerequisites
node >= 20.0.0
npm >= 10.0.0
poppler-utils (за PDF processing)

# Installation
git clone <repo>
cd translatepro
npm install
cp .env.example .env
# Edit .env with API keys
npm run dev
```

### 11.2 Environment Variables
```env
# Required
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...       # За Whisper (опционално)

# Optional
PORT=3000
DATABASE_PATH=./data/translatepro.db
MAX_FILE_SIZE=104857600
DEFAULT_MODEL=claude-sonnet-4-20250514
```

---

## 12. Бъдещи Подобрения (Roadmap)

### v4.1
- [ ] Batch processing на множество документи
- [ ] Team collaboration features
- [ ] Translation memory (TM)

### v4.2
- [ ] Plugin система за custom processors
- [ ] CAT tool интеграция (SDL Trados, memoQ)
- [ ] Terminology extraction

### v5.0
- [ ] Cloud deployment option
- [ ] Multi-user support
- [ ] API за външни интеграции

---

## 13. Оценка на Разходи

### 13.1 Примерни Сценарии

| Сценарий | Страници | Думи | Модел | Прибл. цена |
|----------|----------|------|-------|-------------|
| Договор | 10 | 3,000 | Sonnet | ~$0.15 |
| Техн. документ | 50 | 15,000 | Sonnet | ~$0.75 |
| Книга (глава) | 30 | 10,000 | Opus | ~$2.50 |
| Аудио (10 мин) | - | 1,500 | Whisper | ~$0.06 |

### 13.2 Формула
```
Cost = (input_tokens × input_price) + (output_tokens × output_price)

Примерно:
- 1 страница ≈ 500 думи ≈ 750 tokens
- Output обикновено ≈ 1.2× input (за превод)
```

---

*Версия: 4.0-draft*
*Последна актуализация: Януари 2026*
