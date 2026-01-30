# TranslatePro v4.0 - Спецификация (Част 2)

---

## 6. Translation Engine

### 6.1 AI Модели

| Модел | API ID | Input | Output | Случаи на употреба |
|-------|--------|-------|--------|-------------------|
| Claude Sonnet 4 | claude-sonnet-4-20250514 | $3/1M | $15/1M | Стандартен превод, бързина |
| Claude Opus 4 | claude-opus-4-20250514 | $15/1M | $75/1M | Критични документи, най-високо качество |
| Claude Haiku | claude-3-5-haiku-20241022 | $0.25/1M | $1.25/1M | Preview, suggestions, QA |

### 6.2 Стилове на Превод

```typescript
const translationStyles = {
  standard: {
    id: 'standard',
    name: 'Standard',
    description: 'Balanced translation preserving original tone',
    icon: 'FileText',
    prompt: `Translate the following text naturally while preserving the original tone,
             meaning, and style. Maintain paragraph structure.`,
    temperature: 0.3,
    color: '#6366f1'
  },

  formal: {
    id: 'formal',
    name: 'Formal / Business',
    description: 'Professional language for business documents',
    icon: 'Briefcase',
    prompt: `Translate using formal, professional language suitable for business
             communication. Use appropriate honorifics and formal structures.`,
    temperature: 0.2,
    color: '#0891b2'
  },

  informal: {
    id: 'informal',
    name: 'Informal / Casual',
    description: 'Conversational, friendly tone',
    icon: 'MessageCircle',
    prompt: `Translate using conversational, friendly language.
             Use contractions and casual expressions where appropriate.`,
    temperature: 0.5,
    color: '#f59e0b'
  },

  technical: {
    id: 'technical',
    name: 'Technical / Scientific',
    description: 'Precise terminology for technical documents',
    icon: 'Cpu',
    prompt: `Translate with precise technical terminology. Maintain accuracy of
             specialized terms. Keep technical jargon consistent throughout.`,
    temperature: 0.1,
    color: '#10b981'
  },

  legal: {
    id: 'legal',
    name: 'Legal',
    description: 'Formal legal language with precise terminology',
    icon: 'Scale',
    prompt: `Translate using formal legal language with precise legal terminology.
             Maintain the exact legal meaning and avoid ambiguity.`,
    temperature: 0.1,
    color: '#8b5cf6'
  },

  marketing: {
    id: 'marketing',
    name: 'Marketing / Creative',
    description: 'Engaging, persuasive language',
    icon: 'Megaphone',
    prompt: `Translate with engaging, persuasive language suitable for marketing.
             Adapt cultural references appropriately. Maintain brand voice.`,
    temperature: 0.6,
    color: '#ec4899'
  },

  literary: {
    id: 'literary',
    name: 'Literary / Creative',
    description: 'Artistic translation preserving literary style',
    icon: 'BookOpen',
    prompt: `Translate preserving literary style, metaphors, and artistic expression.
             Maintain the author's voice and creative intent.`,
    temperature: 0.7,
    color: '#f43f5e'
  },

  medical: {
    id: 'medical',
    name: 'Medical',
    description: 'Accurate medical terminology',
    icon: 'Heart',
    prompt: `Translate with accurate medical terminology. Maintain clinical precision.
             Use standard medical nomenclature.`,
    temperature: 0.1,
    color: '#ef4444'
  },

  academic: {
    id: 'academic',
    name: 'Academic',
    description: 'Scholarly language for research papers',
    icon: 'GraduationCap',
    prompt: `Translate using scholarly, academic language suitable for research papers.
             Maintain formal academic conventions and citation styles.`,
    temperature: 0.2,
    color: '#3b82f6'
  },

  subtitle: {
    id: 'subtitle',
    name: 'Subtitles',
    description: 'Concise translations for video subtitles',
    icon: 'Film',
    prompt: `Translate for subtitles. Keep translations concise and readable.
             Adapt length to fit typical subtitle timing constraints.`,
    temperature: 0.3,
    color: '#64748b'
  }
};
```

### 6.3 Translation Request

```typescript
interface TranslationRequest {
  // Required
  text: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;

  // Options
  style: TranslationStyle;
  model: AIModel;
  context?: string;              // User-provided context
  glossary?: GlossaryTerm[];     // Terms to preserve
  previousSegments?: Segment[];  // For document context

  // TM Integration
  useTM?: boolean;
  tmThreshold?: number;          // 0-100, minimum match %

  // Advanced
  preserveFormatting?: boolean;
  preserveNumbers?: boolean;
  preserveNames?: boolean;
}

interface TranslationResponse {
  translatedText: string;
  tokensInput: number;
  tokensOutput: number;
  cost: number;

  // TM matches used
  tmMatches?: TMMatch[];

  // Confidence
  confidence: number;  // 0-1

  // Alternatives
  alternatives?: string[];
}
```

### 6.4 Prompt Template

```typescript
const buildTranslationPrompt = (request: TranslationRequest): string => `
You are a professional translator specializing in ${getLanguageName(request.sourceLanguage)}
to ${getLanguageName(request.targetLanguage)} translation.

${request.style.prompt}

${request.context ? `Context: ${request.context}` : ''}

${request.glossary?.length ? `
Glossary (always use these exact translations):
${request.glossary.map(t => `- "${t.source}" → "${t.target}"`).join('\n')}
` : ''}

${request.previousSegments?.length ? `
Previous translated segments for context:
${request.previousSegments.slice(-3).map(s => `- ${s.translatedText}`).join('\n')}
` : ''}

Translate the following text:
---
${request.text}
---

Provide only the translation, without explanations or notes.
`;
```

---

## 7. Translation Memory (TM)

### 7.1 Концепция

Translation Memory съхранява предишни преводи и ги предлага като съвпадения при нови преводи, за да:
- Осигури консистентност
- Намали разходите
- Ускори превода

### 7.2 Типове Съвпадения

| Тип | Match % | Описание | Действие |
|-----|---------|----------|----------|
| Exact (100%) | 100% | Идентичен текст | Автоматично приложен |
| Fuzzy High | 85-99% | Много подобен | Предложен с highlight |
| Fuzzy Medium | 70-84% | Подобен | Предложен |
| Fuzzy Low | 50-69% | Частично подобен | Показан в списък |
| No Match | <50% | Няма съвпадение | Нов превод |

### 7.3 Data Structure

```typescript
interface TranslationMemory {
  id: string;
  name: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  entries: TMEntry[];
  metadata: TMMetadata;
}

interface TMEntry {
  id: string;
  sourceText: string;
  targetText: string;

  // Normalized versions for matching
  sourceNormalized: string;

  // Context
  context?: string;
  domain?: string;  // legal, medical, technical...

  // Quality
  quality: 'machine' | 'human' | 'verified';
  usageCount: number;
  lastUsed: Date;

  // Origin
  projectId?: string;
  createdBy: string;
  createdAt: Date;
}

interface TMMatch {
  entry: TMEntry;
  matchPercentage: number;
  matchType: 'exact' | 'fuzzy';
  differences?: TextDifference[];  // Показва разликите
}

interface TextDifference {
  type: 'added' | 'removed' | 'changed';
  position: number;
  originalText: string;
  newText?: string;
}
```

### 7.4 Matching Algorithm

```typescript
class TMMatchingEngine {
  // Главен алгоритъм за търсене
  findMatches(
    sourceText: string,
    tm: TranslationMemory,
    options: MatchOptions
  ): TMMatch[] {
    const normalized = this.normalize(sourceText);
    const candidates: TMMatch[] = [];

    for (const entry of tm.entries) {
      // 1. Бърза проверка за exact match
      if (entry.sourceNormalized === normalized) {
        candidates.push({
          entry,
          matchPercentage: 100,
          matchType: 'exact'
        });
        continue;
      }

      // 2. Fuzzy matching с Levenshtein distance
      const similarity = this.calculateSimilarity(
        normalized,
        entry.sourceNormalized
      );

      if (similarity >= options.minThreshold) {
        candidates.push({
          entry,
          matchPercentage: Math.round(similarity * 100),
          matchType: 'fuzzy',
          differences: this.getDifferences(sourceText, entry.sourceText)
        });
      }
    }

    // Сортиране по процент, после по качество
    return candidates
      .sort((a, b) => {
        if (b.matchPercentage !== a.matchPercentage) {
          return b.matchPercentage - a.matchPercentage;
        }
        return this.qualityScore(b.entry) - this.qualityScore(a.entry);
      })
      .slice(0, options.maxResults || 5);
  }

  // Нормализация на текст
  private normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')  // Remove diacritics
      .replace(/[^\w\s]/g, ' ')          // Remove punctuation
      .replace(/\s+/g, ' ')              // Normalize whitespace
      .trim();
  }

  // Similarity с Levenshtein
  private calculateSimilarity(a: string, b: string): number {
    const distance = levenshteinDistance(a, b);
    const maxLength = Math.max(a.length, b.length);
    return 1 - (distance / maxLength);
  }
}
```

### 7.5 TM UI Component

```tsx
<TMPanel>
  {/* Header */}
  <TMHeader>
    <h3>Translation Memory</h3>
    <Badge>{tm.entries.length} entries</Badge>
  </TMHeader>

  {/* Matches for current segment */}
  <TMMatches>
    {matches.map(match => (
      <TMMatchCard
        key={match.entry.id}
        match={match}
        onApply={() => applyTMMatch(match)}
      >
        <MatchPercentage value={match.matchPercentage} />
        <SourceText>{match.entry.sourceText}</SourceText>
        <TargetText>{match.entry.targetText}</TargetText>
        {match.differences && (
          <DifferenceHighlight differences={match.differences} />
        )}
        <MatchMeta>
          Quality: {match.entry.quality}
          Used: {match.entry.usageCount} times
        </MatchMeta>
      </TMMatchCard>
    ))}
  </TMMatches>

  {/* No matches state */}
  {matches.length === 0 && (
    <EmptyState>
      No matches found in Translation Memory
    </EmptyState>
  )}
</TMPanel>
```

### 7.6 Import/Export

```typescript
// Поддържани формати
type TMFormat = 'tmx' | 'csv' | 'xlsx' | 'json';

interface TMExporter {
  export(tm: TranslationMemory, format: TMFormat): Buffer;
}

interface TMImporter {
  import(file: Buffer, format: TMFormat): TranslationMemory;

  // TMX е стандартен формат за TM
  importTMX(file: Buffer): TranslationMemory;
}

// TMX Example
`<?xml version="1.0" encoding="UTF-8"?>
<tmx version="1.4">
  <header srclang="en" adminlang="en" datatype="plaintext"/>
  <body>
    <tu>
      <tuv xml:lang="en">
        <seg>Hello, world!</seg>
      </tuv>
      <tuv xml:lang="bg">
        <seg>Здравей, свят!</seg>
      </tuv>
    </tu>
  </body>
</tmx>`
```

---

## 8. Quality Assurance (QA)

### 8.1 QA Checks

| Check | Описание | Severity |
|-------|----------|----------|
| Missing Translation | Сегмент без превод | Error |
| Length Difference | Превод >50% по-дълъг/къс | Warning |
| Number Mismatch | Различни числа в оригинал/превод | Error |
| Punctuation Mismatch | Различна крайна пунктуация | Warning |
| Tag Mismatch | Различни HTML/XML тагове | Error |
| Repeated Words | Повторени думи | Warning |
| Untranslated Text | Оригинален текст в превода | Warning |
| Terminology | Несъответствие с glossary | Error |
| Spelling | Правописни грешки | Warning |
| Consistency | Същият термин, различни преводи | Warning |
| Whitespace | Проблеми с интервали | Info |
| Capitalization | Проблеми с главни букви | Info |

### 8.2 QA Engine

```typescript
interface QAEngine {
  runChecks(project: Project): QAReport;
  runCheckForSegment(segment: Segment): QAIssue[];
}

interface QAReport {
  projectId: string;
  timestamp: Date;
  summary: QASummary;
  issues: QAIssue[];
}

interface QASummary {
  totalSegments: number;
  segmentsWithIssues: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  score: number;  // 0-100
}

interface QAIssue {
  id: string;
  segmentId: string;
  segmentIndex: number;

  checkType: QACheckType;
  severity: 'error' | 'warning' | 'info';

  message: string;
  details?: string;

  // Location in text
  sourcePosition?: TextRange;
  targetPosition?: TextRange;

  // Suggestions
  suggestions?: string[];

  // Status
  status: 'open' | 'ignored' | 'fixed';
  ignoredBy?: string;
  ignoredAt?: Date;
}

interface TextRange {
  start: number;
  end: number;
}
```

### 8.3 QA Configuration

```typescript
interface QAConfig {
  // Enable/disable checks
  checks: {
    missingTranslation: boolean;
    lengthDifference: boolean;
    numberMismatch: boolean;
    punctuationMismatch: boolean;
    tagMismatch: boolean;
    repeatedWords: boolean;
    untranslatedText: boolean;
    terminology: boolean;
    spelling: boolean;
    consistency: boolean;
    whitespace: boolean;
    capitalization: boolean;
  };

  // Thresholds
  thresholds: {
    lengthDifferencePercent: number;  // Default: 50
    repeatedWordsMin: number;         // Default: 3
  };

  // Terminology
  enforceGlossary: boolean;
  glossaryId?: string;

  // Languages for spelling
  spellingLanguages: LanguageCode[];
}
```

### 8.4 QA UI Component

```tsx
<QAPanel>
  {/* Summary */}
  <QASummary>
    <QAScore value={report.summary.score} />
    <QAStats>
      <Stat label="Errors" value={report.summary.errorCount} color="red" />
      <Stat label="Warnings" value={report.summary.warningCount} color="yellow" />
      <Stat label="Info" value={report.summary.infoCount} color="blue" />
    </QAStats>
  </QASummary>

  {/* Filters */}
  <QAFilters>
    <FilterChip active={filter === 'all'}>All</FilterChip>
    <FilterChip active={filter === 'error'}>Errors</FilterChip>
    <FilterChip active={filter === 'warning'}>Warnings</FilterChip>
    <FilterChip active={filter === 'open'}>Open</FilterChip>
  </QAFilters>

  {/* Issues List */}
  <QAIssuesList>
    {issues.map(issue => (
      <QAIssueCard
        key={issue.id}
        issue={issue}
        onNavigate={() => navigateToSegment(issue.segmentId)}
        onIgnore={() => ignoreIssue(issue.id)}
        onFix={() => applyFix(issue)}
      >
        <IssueSeverity severity={issue.severity} />
        <IssueType>{issue.checkType}</IssueType>
        <IssueMessage>{issue.message}</IssueMessage>
        {issue.suggestions && (
          <IssueSuggestions suggestions={issue.suggestions} />
        )}
      </QAIssueCard>
    ))}
  </QAIssuesList>

  {/* Run QA Button */}
  <Button onClick={runQA} icon={<CheckIcon />}>
    Run QA Checks
  </Button>
</QAPanel>
```

---

## 9. Batch Processing

### 9.1 Функционалност

- Upload на множество файлове (до 50)
- Паралелна обработка
- Единни настройки или per-file
- Progress tracking
- Групов експорт

### 9.2 Batch Job Structure

```typescript
interface BatchJob {
  id: string;
  name: string;
  status: BatchStatus;

  // Files
  files: BatchFile[];
  totalFiles: number;
  completedFiles: number;

  // Settings
  settings: BatchSettings;

  // Progress
  progress: number;  // 0-100
  currentFile?: string;

  // Timing
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedTimeRemaining?: number;  // seconds

  // Results
  results?: BatchResult[];
  errors?: BatchError[];
}

interface BatchFile {
  id: string;
  filename: string;
  size: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  projectId?: string;  // Created project
  error?: string;
}

interface BatchSettings {
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  model: AIModel;
  style: TranslationStyle;
  context?: string;

  // Processing options
  parallelism: number;       // 1-5 concurrent files
  autoTranslate: boolean;    // Start translation immediately
  useTM: boolean;
  runQA: boolean;

  // Export
  autoExport: boolean;
  exportFormat: 'pdf' | 'docx' | 'txt';
}

type BatchStatus =
  | 'created'
  | 'uploading'
  | 'processing'
  | 'translating'
  | 'completed'
  | 'error'
  | 'cancelled';
```

### 9.3 Batch Upload UI

```tsx
<BatchUploader>
  {/* Drag & Drop Zone */}
  <DropZone
    onDrop={handleFiles}
    accept={SUPPORTED_FORMATS}
    maxFiles={50}
  >
    <UploadIcon />
    <p>Drag & drop files here</p>
    <p>or click to browse</p>
    <p className="text-sm text-muted">
      PDF, DOCX, TXT, Images • Up to 50 files • 100MB each
    </p>
  </DropZone>

  {/* File List */}
  <FileList>
    {files.map(file => (
      <FileItem key={file.id}>
        <FileIcon type={file.type} />
        <FileName>{file.name}</FileName>
        <FileSize>{formatSize(file.size)}</FileSize>
        <FileStatus status={file.status} />
        <RemoveButton onClick={() => removeFile(file.id)} />
      </FileItem>
    ))}
  </FileList>

  {/* Batch Settings */}
  <BatchSettingsForm>
    <LanguageSelector
      label="Source Language"
      value={settings.sourceLanguage}
      onChange={...}
    />
    <LanguageSelector
      label="Target Language"
      value={settings.targetLanguage}
      onChange={...}
    />
    <ModelSelector value={settings.model} onChange={...} />
    <StyleSelector value={settings.style} onChange={...} />

    <Checkbox
      label="Auto-translate after upload"
      checked={settings.autoTranslate}
      onChange={...}
    />
    <Checkbox
      label="Use Translation Memory"
      checked={settings.useTM}
      onChange={...}
    />
    <Checkbox
      label="Run QA checks"
      checked={settings.runQA}
      onChange={...}
    />
  </BatchSettingsForm>

  {/* Start Button */}
  <Button
    size="lg"
    onClick={startBatch}
    disabled={files.length === 0}
  >
    Start Batch Processing ({files.length} files)
  </Button>
</BatchUploader>
```

### 9.4 Batch Progress UI

```tsx
<BatchProgress job={job}>
  {/* Overall Progress */}
  <ProgressHeader>
    <h2>{job.name}</h2>
    <Badge status={job.status}>{job.status}</Badge>
  </ProgressHeader>

  <OverallProgress>
    <ProgressBar value={job.progress} />
    <ProgressText>
      {job.completedFiles} of {job.totalFiles} files completed
    </ProgressText>
    {job.estimatedTimeRemaining && (
      <TimeRemaining>
        ~{formatDuration(job.estimatedTimeRemaining)} remaining
      </TimeRemaining>
    )}
  </OverallProgress>

  {/* Per-file Progress */}
  <FileProgressList>
    {job.files.map(file => (
      <FileProgress key={file.id} file={file}>
        <FileIcon type={file.type} />
        <FileName>{file.filename}</FileName>
        <ProgressBar value={file.progress} size="sm" />
        <FileStatusBadge status={file.status} />
      </FileProgress>
    ))}
  </FileProgressList>

  {/* Actions */}
  <BatchActions>
    {job.status === 'processing' && (
      <Button variant="secondary" onClick={pauseBatch}>
        Pause
      </Button>
    )}
    {job.status === 'completed' && (
      <Button onClick={downloadAll}>
        Download All
      </Button>
    )}
  </BatchActions>
</BatchProgress>
```

---

## 10. Analytics Dashboard

### 10.1 Метрики

| Метрика | Описание | Визуализация |
|---------|----------|--------------|
| Total Projects | Брой проекти | Number card |
| Documents Translated | Брой преведени документи | Number card |
| Total Words | Общ брой думи | Number card |
| Total Cost | Обща цена | Number card |
| Tokens Used | Input/Output токени | Pie chart |
| Cost Over Time | Разходи по дни/седмици | Line chart |
| Projects by Status | Статус на проекти | Donut chart |
| Language Pairs | Най-използвани двойки | Bar chart |
| Model Usage | Използване по модел | Bar chart |
| Style Usage | Използване по стил | Bar chart |
| Avg Translation Time | Средно време за превод | Number card |
| TM Match Rate | Процент TM съвпадения | Gauge |
| QA Score Trend | Тренд на QA резултат | Line chart |

### 10.2 Dashboard Layout

```tsx
<AnalyticsDashboard>
  {/* Period Selector */}
  <PeriodSelector>
    <PeriodButton active={period === '7d'}>7 Days</PeriodButton>
    <PeriodButton active={period === '30d'}>30 Days</PeriodButton>
    <PeriodButton active={period === '90d'}>90 Days</PeriodButton>
    <PeriodButton active={period === 'all'}>All Time</PeriodButton>
    <DateRangePicker value={customRange} onChange={...} />
  </PeriodSelector>

  {/* Summary Cards */}
  <StatsGrid columns={4}>
    <StatCard
      title="Total Projects"
      value={stats.totalProjects}
      change={+12}
      changeLabel="vs last period"
      icon={<FolderIcon />}
    />
    <StatCard
      title="Words Translated"
      value={formatNumber(stats.totalWords)}
      change={+8.5}
      icon={<FileTextIcon />}
    />
    <StatCard
      title="Total Cost"
      value={formatCurrency(stats.totalCost)}
      change={-5.2}
      icon={<DollarIcon />}
    />
    <StatCard
      title="Avg. QA Score"
      value={`${stats.avgQAScore}%`}
      change={+3.1}
      icon={<CheckCircleIcon />}
    />
  </StatsGrid>

  {/* Charts Row 1 */}
  <ChartsGrid columns={2}>
    <ChartCard title="Cost Over Time">
      <LineChart data={costData} />
    </ChartCard>
    <ChartCard title="Projects by Status">
      <DonutChart data={statusData} />
    </ChartCard>
  </ChartsGrid>

  {/* Charts Row 2 */}
  <ChartsGrid columns={3}>
    <ChartCard title="Language Pairs">
      <BarChart data={languageData} />
    </ChartCard>
    <ChartCard title="Model Usage">
      <BarChart data={modelData} />
    </ChartCard>
    <ChartCard title="Token Distribution">
      <PieChart data={tokenData} />
    </ChartCard>
  </ChartsGrid>

  {/* Recent Activity */}
  <ActivityFeed>
    <h3>Recent Activity</h3>
    {activities.map(activity => (
      <ActivityItem key={activity.id}>
        <ActivityIcon type={activity.type} />
        <ActivityContent>
          <p>{activity.description}</p>
          <time>{formatRelative(activity.timestamp)}</time>
        </ActivityContent>
      </ActivityItem>
    ))}
  </ActivityFeed>
</AnalyticsDashboard>
```

### 10.3 Export Reports

```typescript
interface ReportExporter {
  // Формати
  formats: ['pdf', 'xlsx', 'csv'];

  // Типове репорти
  reports: {
    summary: 'Обобщен доклад за периода',
    detailed: 'Детайлен доклад по проекти',
    costs: 'Доклад за разходите',
    productivity: 'Доклад за продуктивността'
  };
}
```

---

## 11. База Данни

### 11.1 Пълна Schema

```sql
-- ========================================
-- PROJECTS
-- ========================================
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,

    -- Languages
    source_language TEXT NOT NULL,
    target_language TEXT NOT NULL,

    -- Settings
    model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
    style TEXT NOT NULL DEFAULT 'standard',
    context TEXT,

    -- Deadlines
    due_date TEXT,
    priority TEXT DEFAULT 'normal', -- low, normal, high, urgent

    -- File info
    original_filename TEXT,
    original_file_data BLOB,
    original_file_type TEXT, -- pdf, docx, txt, image, audio
    layout_data TEXT, -- JSON с PDF layout

    -- Statistics
    total_segments INTEGER DEFAULT 0,
    translated_segments INTEGER DEFAULT 0,
    approved_segments INTEGER DEFAULT 0,
    total_words INTEGER DEFAULT 0,
    total_tokens_input INTEGER DEFAULT 0,
    total_tokens_output INTEGER DEFAULT 0,
    total_cost REAL DEFAULT 0,

    -- Status
    status TEXT DEFAULT 'draft', -- draft, translating, review, completed, archived
    qa_score INTEGER,

    -- Timestamps
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT,

    -- TM
    tm_id TEXT,

    FOREIGN KEY (tm_id) REFERENCES translation_memories(id)
);

-- ========================================
-- SEGMENTS
-- ========================================
CREATE TABLE segments (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    segment_index INTEGER NOT NULL,
    page_number INTEGER DEFAULT 1,

    -- Type
    segment_type TEXT DEFAULT 'paragraph', -- paragraph, heading, list_item, caption, table_cell

    -- Content
    original_text TEXT NOT NULL,
    translated_text TEXT,

    -- PDF Layout (JSON)
    position_data TEXT, -- {x, y, width, height}
    style_data TEXT,    -- {fontFamily, fontSize, fontWeight, color, textAlign, ...}

    -- Word alignment (JSON)
    word_alignment TEXT,

    -- Statistics
    word_count INTEGER DEFAULT 0,
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,

    -- Status
    is_translated INTEGER DEFAULT 0,
    is_approved INTEGER DEFAULT 0,
    is_locked INTEGER DEFAULT 0,

    -- TM
    tm_match_id TEXT,
    tm_match_percent INTEGER,

    -- QA
    has_qa_issues INTEGER DEFAULT 0,

    -- Timestamps
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    translated_at TEXT,
    approved_at TEXT,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- ========================================
-- REVISIONS (Version History)
-- ========================================
CREATE TABLE revisions (
    id TEXT PRIMARY KEY,
    segment_id TEXT NOT NULL,

    -- Content
    previous_text TEXT,
    new_text TEXT NOT NULL,

    -- Metadata
    change_type TEXT DEFAULT 'edit', -- edit, translate, tm_apply, qa_fix, restore
    changed_by TEXT DEFAULT 'user',

    -- Timestamps
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (segment_id) REFERENCES segments(id) ON DELETE CASCADE
);

-- ========================================
-- IMAGES (Embedded in PDFs)
-- ========================================
CREATE TABLE images (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    page_number INTEGER NOT NULL,

    -- Position
    position_x REAL NOT NULL,
    position_y REAL NOT NULL,
    width REAL NOT NULL,
    height REAL NOT NULL,
    rotation REAL DEFAULT 0,

    -- Data
    image_data BLOB NOT NULL,
    mime_type TEXT NOT NULL,

    -- Timestamps
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- ========================================
-- TRANSLATION MEMORY
-- ========================================
CREATE TABLE translation_memories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,

    -- Languages
    source_language TEXT NOT NULL,
    target_language TEXT NOT NULL,

    -- Settings
    is_global INTEGER DEFAULT 0,

    -- Statistics
    entry_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tm_entries (
    id TEXT PRIMARY KEY,
    tm_id TEXT NOT NULL,

    -- Content
    source_text TEXT NOT NULL,
    target_text TEXT NOT NULL,
    source_normalized TEXT NOT NULL, -- For matching

    -- Context
    context TEXT,
    domain TEXT,

    -- Quality
    quality TEXT DEFAULT 'machine', -- machine, human, verified
    usage_count INTEGER DEFAULT 0,

    -- Origin
    project_id TEXT,

    -- Timestamps
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_used_at TEXT,

    FOREIGN KEY (tm_id) REFERENCES translation_memories(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- ========================================
-- GLOSSARIES
-- ========================================
CREATE TABLE glossaries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,

    -- Languages
    source_language TEXT NOT NULL,
    target_language TEXT NOT NULL,

    -- Settings
    is_global INTEGER DEFAULT 0,
    enforce_in_qa INTEGER DEFAULT 1,

    -- Statistics
    term_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE glossary_terms (
    id TEXT PRIMARY KEY,
    glossary_id TEXT NOT NULL,

    -- Content
    source_term TEXT NOT NULL,
    target_term TEXT NOT NULL,

    -- Options
    case_sensitive INTEGER DEFAULT 0,
    exact_match INTEGER DEFAULT 0,

    -- Metadata
    notes TEXT,
    domain TEXT,

    -- Timestamps
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (glossary_id) REFERENCES glossaries(id) ON DELETE CASCADE
);

-- ========================================
-- QA ISSUES
-- ========================================
CREATE TABLE qa_issues (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    segment_id TEXT NOT NULL,

    -- Issue details
    check_type TEXT NOT NULL,
    severity TEXT NOT NULL, -- error, warning, info
    message TEXT NOT NULL,
    details TEXT,

    -- Position
    source_position TEXT, -- JSON: {start, end}
    target_position TEXT, -- JSON: {start, end}

    -- Suggestions (JSON array)
    suggestions TEXT,

    -- Status
    status TEXT DEFAULT 'open', -- open, ignored, fixed
    ignored_by TEXT,
    ignored_at TEXT,
    fixed_at TEXT,

    -- Timestamps
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (segment_id) REFERENCES segments(id) ON DELETE CASCADE
);

-- ========================================
-- AUDIO SESSIONS (Speech-to-Text)
-- ========================================
CREATE TABLE audio_sessions (
    id TEXT PRIMARY KEY,
    project_id TEXT,

    -- Audio data
    audio_data BLOB,
    audio_format TEXT, -- mp3, wav, webm
    duration REAL, -- seconds

    -- Transcription
    transcription TEXT,
    segments_json TEXT, -- JSON array with timestamps

    -- Settings
    language TEXT,
    provider TEXT DEFAULT 'whisper', -- whisper, browser

    -- Status
    status TEXT DEFAULT 'pending', -- pending, processing, completed, error
    error_message TEXT,

    -- Timestamps
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    processed_at TEXT,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- ========================================
-- BATCH JOBS
-- ========================================
CREATE TABLE batch_jobs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,

    -- Settings (JSON)
    settings TEXT NOT NULL,

    -- Status
    status TEXT DEFAULT 'created',
    total_files INTEGER DEFAULT 0,
    completed_files INTEGER DEFAULT 0,
    progress REAL DEFAULT 0,

    -- Timestamps
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    started_at TEXT,
    completed_at TEXT
);

CREATE TABLE batch_files (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,

    -- File info
    filename TEXT NOT NULL,
    file_size INTEGER,
    file_data BLOB,

    -- Status
    status TEXT DEFAULT 'pending',
    progress REAL DEFAULT 0,
    error_message TEXT,

    -- Result
    project_id TEXT,

    -- Timestamps
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    processed_at TEXT,

    FOREIGN KEY (batch_id) REFERENCES batch_jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- ========================================
-- SETTINGS
-- ========================================
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- INDEXES
-- ========================================
CREATE INDEX idx_segments_project ON segments(project_id);
CREATE INDEX idx_segments_page ON segments(project_id, page_number);
CREATE INDEX idx_segments_status ON segments(project_id, is_translated, is_approved);
CREATE INDEX idx_revisions_segment ON revisions(segment_id);
CREATE INDEX idx_images_project ON images(project_id, page_number);
CREATE INDEX idx_tm_entries_tm ON tm_entries(tm_id);
CREATE INDEX idx_tm_entries_source ON tm_entries(source_normalized);
CREATE INDEX idx_glossary_terms ON glossary_terms(glossary_id);
CREATE INDEX idx_qa_issues_project ON qa_issues(project_id);
CREATE INDEX idx_qa_issues_segment ON qa_issues(segment_id);
CREATE INDEX idx_batch_files ON batch_files(batch_id);
```

---

*Продължава в Част 3...*
