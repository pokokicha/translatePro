# TranslatePro v4.0 - Пълна Техническа Спецификация

> **Версия:** 4.0 | **Дата:** Януари 2026 | **Статус:** Production Ready

---

## 📋 Съдържание

1. [Визия и Цели](#1-визия-и-цели)
2. [Архитектура](#2-архитектура)
3. [UI/UX Дизайн Система](#3-uiux-дизайн-система)
4. [PDF Layout Preservation](#4-pdf-layout-preservation)
5. [Speech-to-Text Module](#5-speech-to-text-module)
6. [Translation Engine](#6-translation-engine)
7. [Translation Memory (TM)](#7-translation-memory-tm)
8. [Quality Assurance (QA)](#8-quality-assurance-qa)
9. [Batch Processing](#9-batch-processing)
10. [Analytics Dashboard](#10-analytics-dashboard)
11. [База Данни](#11-база-данни)
12. [API Reference](#12-api-reference)
13. [Frontend Components](#13-frontend-components)
14. [Keyboard Shortcuts](#14-keyboard-shortcuts)
15. [Accessibility (a11y)](#15-accessibility)
16. [Security](#16-security)
17. [Deployment](#17-deployment)

---

## 1. Визия и Цели

### 1.1 Визия
TranslatePro v4.0 е **професионална платформа за превод на документи от ново поколение**, която комбинира мощта на Claude AI с интуитивен, модерен интерфейс.

### 1.2 Ключови Принципи
- **Layout Fidelity** - Перфектно запазване на оригиналния формат
- **AI-First** - Claude AI за най-високо качество на превод
- **Speed** - Бърза обработка с паралелизация
- **Intuitive UX** - Нулева крива на обучение
- **Accessibility** - Достъпен за всички потребители

### 1.3 Сравнение с v3.1

| Функция | v3.1 | v4.0 |
|---------|------|------|
| PDF Layout | ❌ Само текст | ✅ Пълно запазване |
| Изображения в PDF | ❌ Губят се | ✅ Запазени на място |
| Speech-to-Text | ❌ Няма | ✅ Whisper API + Live |
| Translation Memory | ❌ Няма | ✅ Пълна TM система |
| Quality Assurance | ❌ Няма | ✅ Автоматични проверки |
| Batch Processing | ❌ Един по един | ✅ До 50 документа |
| Dark Mode | ❌ Няма | ✅ System/Manual |
| Keyboard Shortcuts | ❌ Ограничени | ✅ Пълен набор |
| Real-time Preview | ❌ Няма | ✅ Live PDF preview |
| Analytics | ❌ Базови | ✅ Пълен dashboard |

---

## 2. Архитектура

### 2.1 High-Level Architecture
```
┌────────────────────────────────────────────────────────────────────────┐
│                          CLIENT (React 18+)                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │Dashboard │ │  Editor  │ │  Speech  │ │ Analytics│ │   Settings   │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
│                              │                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    State Management (Zustand)                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
                                   │
                    WebSocket + REST API + SSE
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         SERVER (Node.js 20+)                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Express.js + Socket.io                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                   │                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │Translation│ │   PDF    │ │  Speech  │ │   TM     │ │     QA       │  │
│  │  Service │ │ Processor│ │ Service  │ │ Service  │ │   Service    │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │   OCR    │ │  Export  │ │  Queue   │ │ Analytics│ │   Glossary   │  │
│  │ Service  │ │ Service  │ │ Manager  │ │ Service  │ │   Service    │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          ▼                        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│    Claude AI     │    │   Whisper API    │    │     SQLite       │
│       API        │    │    (OpenAI)      │    │    Database      │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

### 2.2 Технологичен Стек

#### Backend
| Компонент | Технология | Цел |
|-----------|------------|-----|
| Runtime | Node.js 20+ | JavaScript сървър |
| Framework | Express.js 4.x | HTTP API |
| Real-time | Socket.io 4.x | WebSocket комуникация |
| Database | better-sqlite3 | Локална база данни |
| Queue | Bull 4.x | Job queue за тежки операции |
| PDF Parse | pdf-lib + pdf2json | PDF обработка |
| PDF Generate | pdfkit | PDF генериране |
| OCR | Tesseract.js 5.x | Оптично разпознаване |
| DOCX | mammoth + docx | Word документи |
| Images | sharp | Обработка на изображения |
| AI | @anthropic-ai/sdk | Claude API |
| Speech | openai | Whisper API |
| Validation | zod | Schema validation |
| Logging | pino | Structured logging |

#### Frontend
| Компонент | Технология | Цел |
|-----------|------------|-----|
| Framework | React 18.x | UI библиотека |
| Build | Vite 5.x | Бърз build tool |
| Routing | React Router 6.x | Навигация |
| State | Zustand 4.x | State management |
| Styling | Tailwind CSS 3.x | Utility-first CSS |
| Components | Radix UI | Accessible компоненти |
| Icons | Lucide React | Иконки |
| Charts | Recharts | Графики |
| PDF | react-pdf | PDF преглед |
| Editor | Monaco Editor | Код редактор |
| Forms | React Hook Form | Форми |
| Animations | Framer Motion | Анимации |
| Date | date-fns | Дати |
| Toast | Sonner | Нотификации |

---

## 3. UI/UX Дизайн Система

### 3.1 Дизайн Принципи

1. **Clarity** - Ясна визуална йерархия
2. **Efficiency** - Минимум кликове до целта
3. **Feedback** - Мигновена обратна връзка
4. **Consistency** - Еднакво поведение навсякъде
5. **Delight** - Приятни микро-анимации

### 3.2 Цветова Палитра

#### Light Mode
```css
:root {
  /* Primary - Indigo */
  --primary-50: #eef2ff;
  --primary-100: #e0e7ff;
  --primary-200: #c7d2fe;
  --primary-300: #a5b4fc;
  --primary-400: #818cf8;
  --primary-500: #6366f1;  /* Main */
  --primary-600: #4f46e5;
  --primary-700: #4338ca;
  --primary-800: #3730a3;
  --primary-900: #312e81;

  /* Neutral - Slate */
  --neutral-50: #f8fafc;
  --neutral-100: #f1f5f9;
  --neutral-200: #e2e8f0;
  --neutral-300: #cbd5e1;
  --neutral-400: #94a3b8;
  --neutral-500: #64748b;
  --neutral-600: #475569;
  --neutral-700: #334155;
  --neutral-800: #1e293b;
  --neutral-900: #0f172a;

  /* Semantic */
  --success: #10b981;  /* Emerald 500 */
  --warning: #f59e0b;  /* Amber 500 */
  --error: #ef4444;    /* Red 500 */
  --info: #3b82f6;     /* Blue 500 */

  /* Background */
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;

  /* Text */
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-tertiary: #94a3b8;
}
```

#### Dark Mode
```css
:root.dark {
  /* Primary - Indigo (brighter for dark) */
  --primary-500: #818cf8;
  --primary-600: #6366f1;

  /* Background */
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-tertiary: #334155;

  /* Text */
  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --text-tertiary: #64748b;

  /* Borders */
  --border-color: #334155;
}
```

### 3.3 Типография

```css
/* Font Family */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;

/* Font Sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* Line Heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

### 3.4 Spacing System (8px base)

```css
--space-0: 0;
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
```

### 3.5 Border Radius

```css
--radius-sm: 0.25rem;   /* 4px */
--radius-md: 0.5rem;    /* 8px */
--radius-lg: 0.75rem;   /* 12px */
--radius-xl: 1rem;      /* 16px */
--radius-2xl: 1.5rem;   /* 24px */
--radius-full: 9999px;
```

### 3.6 Shadows

```css
/* Light Mode */
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);

/* Colored shadows for cards */
--shadow-primary: 0 4px 14px 0 rgb(99 102 241 / 0.25);
--shadow-success: 0 4px 14px 0 rgb(16 185 129 / 0.25);
```

### 3.7 Анимации

```css
/* Durations */
--duration-fast: 150ms;
--duration-normal: 300ms;
--duration-slow: 500ms;

/* Easings */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);

/* Common Animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

### 3.8 Компоненти

#### Button Variants
```tsx
// Primary - Main actions
<Button variant="primary">Translate All</Button>

// Secondary - Secondary actions
<Button variant="secondary">Cancel</Button>

// Ghost - Subtle actions
<Button variant="ghost">View History</Button>

// Danger - Destructive actions
<Button variant="danger">Delete Project</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>  {/* Default */}
<Button size="lg">Large</Button>

// With icons
<Button icon={<PlayIcon />}>Start Recording</Button>
<Button iconPosition="right" icon={<ArrowRightIcon />}>Continue</Button>

// Loading state
<Button loading>Processing...</Button>
```

#### Card Styles
```tsx
// Default card
<Card>
  <CardHeader>
    <CardTitle>Project Name</CardTitle>
    <CardDescription>Last edited 2 hours ago</CardDescription>
  </CardHeader>
  <CardContent>...</CardContent>
  <CardFooter>...</CardFooter>
</Card>

// Interactive card (hover effects)
<Card interactive onClick={...}>...</Card>

// Highlighted card
<Card variant="highlighted">...</Card>
```

#### Input Styles
```tsx
// Text input
<Input
  label="Project Name"
  placeholder="Enter project name..."
  helperText="This will be visible in the dashboard"
/>

// With error
<Input
  label="API Key"
  error="Invalid API key format"
/>

// With icon
<Input
  icon={<SearchIcon />}
  placeholder="Search projects..."
/>

// Textarea
<Textarea
  label="Context"
  placeholder="Provide context for better translations..."
  rows={4}
/>
```

### 3.9 Layout Templates

#### Dashboard Layout
```
┌────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Top Navigation                    │   │
│  │  Logo    Dashboard  Projects  Speech   [User Menu]   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Quick Stats                       │   │
│  │  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐            │   │
│  │  │Active│  │ Done │  │Tokens│  │ Cost │            │   │
│  │  │  12  │  │  48  │  │ 1.2M │  │$24.50│            │   │
│  │  └──────┘  └──────┘  └──────┘  └──────┘            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                            │
│  ┌──────────────────────────┐ ┌────────────────────────┐   │
│  │     Recent Projects      │ │    Quick Actions       │   │
│  │  ┌────────────────────┐  │ │  ┌──────────────────┐  │   │
│  │  │ Project Card       │  │ │  │ + New Project    │  │   │
│  │  └────────────────────┘  │ │  │ 🎤 Voice Input   │  │   │
│  │  ┌────────────────────┐  │ │  │ 📁 Batch Upload  │  │   │
│  │  │ Project Card       │  │ │  └──────────────────┘  │   │
│  │  └────────────────────┘  │ │                        │   │
│  └──────────────────────────┘ └────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

#### Editor Layout
```
┌────────────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  ← Back    Project Name    [Style ▼]  [Translate All]  [...] │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌─────────────────────────┐ ┌─────────────────────────┐ ┌──────┐ │
│  │                         │ │                         │ │      │ │
│  │     Original PDF        │ │   Translated Preview    │ │Side  │ │
│  │                         │ │                         │ │Panel │ │
│  │  ┌───────────────────┐  │ │  ┌───────────────────┐  │ │      │ │
│  │  │                   │  │ │  │                   │  │ │ QA   │ │
│  │  │   Page Content    │  │ │  │   Page Content    │  │ │      │ │
│  │  │                   │  │ │  │                   │  │ │ TM   │ │
│  │  │  [Segment 1] ────────────▶ [Translation 1]   │  │ │      │ │
│  │  │  [Segment 2] ────────────▶ [Translation 2]   │  │ │ Rev  │ │
│  │  │                   │  │ │  │                   │  │ │      │ │
│  │  └───────────────────┘  │ │  └───────────────────┘  │ │      │ │
│  │                         │ │                         │ │      │ │
│  │  Page: [1] of 24        │ │  100% ▼  [Export ▼]     │ │      │ │
│  └─────────────────────────┘ └─────────────────────────┘ └──────┘ │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Progress: ████████████░░░ 78%  |  Tokens: 12.5k  |  $0.45   │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

### 3.10 Responsive Breakpoints

```css
/* Mobile First */
--screen-sm: 640px;   /* Small tablets */
--screen-md: 768px;   /* Tablets */
--screen-lg: 1024px;  /* Small laptops */
--screen-xl: 1280px;  /* Desktops */
--screen-2xl: 1536px; /* Large screens */
```

### 3.11 Микро-взаимодействия

| Елемент | Действие | Анимация |
|---------|----------|----------|
| Button | Hover | Scale 1.02, shadow increase |
| Button | Click | Scale 0.98 |
| Card | Hover | Lift (translateY -2px), shadow |
| Input | Focus | Border color, ring glow |
| Checkbox | Toggle | Checkmark draw animation |
| Switch | Toggle | Smooth slide with bounce |
| Dropdown | Open | Scale + fade from origin |
| Modal | Open | Backdrop fade + content scale |
| Toast | Appear | Slide in from right |
| Segment | Approve | Green pulse effect |
| Progress | Update | Smooth width transition |

---

## 4. PDF Layout Preservation

### 4.1 Процес на Обработка

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Upload    │───▶│   Parse     │───▶│   Extract   │───▶│   Group     │
│    PDF      │    │   Pages     │    │  Elements   │    │  Segments   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                │
┌─────────────┐    ┌─────────────┐    ┌─────────────┐           │
│   Export    │◀───│  Assemble   │◀───│  Translate  │◀──────────┘
│  Final PDF  │    │    PDF      │    │  Segments   │
└─────────────┘    └─────────────┘    └─────────────┘
```

### 4.2 Data Structures

```typescript
interface PDFDocument {
  id: string;
  filename: string;
  pages: PDFPage[];
  metadata: PDFMetadata;
  fonts: EmbeddedFont[];
}

interface PDFPage {
  pageNumber: number;
  width: number;      // points
  height: number;     // points
  rotation: number;   // 0, 90, 180, 270
  textElements: PDFTextElement[];
  images: PDFImage[];
  vectors: PDFVector[];  // Lines, shapes
}

interface PDFTextElement {
  id: string;
  pageNumber: number;

  // Bounding box
  x: number;
  y: number;
  width: number;
  height: number;

  // Typography
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: RGBColor;
  backgroundColor?: RGBColor;

  // Layout
  textAlign: 'left' | 'center' | 'right' | 'justify';
  lineHeight: number;
  letterSpacing: number;

  // Content
  originalText: string;
  translatedText?: string;

  // Grouping
  segmentId?: string;
  paragraphIndex?: number;
}

interface PDFImage {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  imageData: Buffer;
  mimeType: 'image/png' | 'image/jpeg';
  rotation?: number;
  opacity?: number;
}

interface PDFVector {
  id: string;
  pageNumber: number;
  type: 'line' | 'rect' | 'path';
  path: string;  // SVG path data
  stroke?: RGBColor;
  fill?: RGBColor;
  strokeWidth?: number;
}

interface RGBColor {
  r: number;  // 0-255
  g: number;
  b: number;
}
```

### 4.3 Font Handling

```typescript
interface FontManager {
  // Вградени fallback шрифтове
  systemFonts: {
    serif: 'Times New Roman',
    sansSerif: 'Helvetica',
    monospace: 'Courier'
  };

  // Mapping на PDF шрифтове към системни
  fontMapping: Map<string, string>;

  // Unicode поддръжка за Cyrillic
  cyrillicFonts: ['DejaVu Sans', 'Noto Sans', 'Liberation Sans'];
}

// Алгоритъм за избор на шрифт
function selectFont(originalFont: string, targetLanguage: string): string {
  // 1. Проверка за Cyrillic
  if (targetLanguage === 'bg' || targetLanguage === 'ru') {
    return findCyrillicEquivalent(originalFont);
  }

  // 2. Директен mapping
  if (fontMapping.has(originalFont)) {
    return fontMapping.get(originalFont);
  }

  // 3. Fallback по категория
  return getFallbackByCategory(originalFont);
}
```

### 4.4 Text Fitting Algorithm

```typescript
interface TextFitter {
  // Вписване на преведен текст в оригиналния box
  fitText(
    translatedText: string,
    originalBox: BoundingBox,
    originalStyle: TextStyle
  ): FittedText;
}

interface FittedText {
  text: string;
  fontSize: number;      // Може да е намален
  lineBreaks: number[];  // Позиции на пренасяне
  overflow: boolean;     // Ако текстът не се побира
}

// Стъпки на алгоритъма:
// 1. Опит с оригинален размер
// 2. Ако не се побира - намаляване до 70% от оригинала
// 3. Ако пак не се побира - добавяне на line breaks
// 4. Ако пак не - маркиране като overflow за ръчна корекция
```

---

## 5. Speech-to-Text Module

### 5.1 Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                    Speech-to-Text Module                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │   Browser    │    │   Whisper    │    │    Hybrid    │   │
│  │  Recording   │    │     API      │    │   Pipeline   │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│         │                   │                   │            │
│         ▼                   ▼                   ▼            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Audio Processing Pipeline               │    │
│  │  - Format conversion (WebM → MP3)                   │    │
│  │  - Noise reduction                                   │    │
│  │  - Chunking for long audio                          │    │
│  └─────────────────────────────────────────────────────┘    │
│                            │                                 │
│                            ▼                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Transcription Engine                    │    │
│  │  - Whisper API (primary)                            │    │
│  │  - Web Speech API (fallback/real-time)              │    │
│  └─────────────────────────────────────────────────────┘    │
│                            │                                 │
│                            ▼                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Post-processing                         │    │
│  │  - Punctuation restoration                          │    │
│  │  - Speaker diarization (optional)                   │    │
│  │  - Timestamp alignment                              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Поддържани Формати

| Формат | Разширение | Макс. размер | Макс. дължина |
|--------|------------|--------------|---------------|
| MP3 | .mp3 | 25 MB | 60 мин |
| WAV | .wav | 25 MB | 30 мин |
| WebM | .webm | 25 MB | 60 мин |
| M4A | .m4a | 25 MB | 60 мин |
| FLAC | .flac | 25 MB | 30 мин |
| MP4 (video) | .mp4 | 100 MB | 60 мин |
| MOV (video) | .mov | 100 MB | 60 мин |

### 5.3 API Interfaces

```typescript
// Whisper API Configuration
interface WhisperConfig {
  model: 'whisper-1';
  language?: string;        // ISO-639-1 код или 'auto'
  prompt?: string;          // Контекст за по-добро разпознаване
  temperature?: number;     // 0-1, по-ниска = по-детерминистично
  responseFormat: 'json' | 'verbose_json' | 'srt' | 'vtt';
}

// Transcription Result
interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
  segments: TranscriptionSegment[];
  words?: WordTimestamp[];  // При verbose_json
}

interface TranscriptionSegment {
  id: number;
  start: number;      // секунди
  end: number;
  text: string;
  confidence: number; // 0-1
  speaker?: string;   // При diarization
}

interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  confidence: number;
}
```

### 5.4 Real-time Recording UI

```tsx
<SpeechRecorder>
  {/* Recording Controls */}
  <RecordButton
    state={recording ? 'recording' : 'idle'}
    onClick={toggleRecording}
  />

  {/* Waveform Visualization */}
  <Waveform
    audioData={audioBuffer}
    currentTime={currentTime}
  />

  {/* Live Transcription */}
  <TranscriptionPreview
    text={partialTranscription}
    isProcessing={isProcessing}
  />

  {/* Timer */}
  <RecordingTimer
    duration={recordingDuration}
    maxDuration={MAX_RECORDING_TIME}
  />
</SpeechRecorder>
```

### 5.5 Поддържани Езици за Speech

| Език | Код | Whisper Качество |
|------|-----|------------------|
| English | en | ⭐⭐⭐⭐⭐ Отлично |
| German | de | ⭐⭐⭐⭐⭐ Отлично |
| French | fr | ⭐⭐⭐⭐⭐ Отлично |
| Spanish | es | ⭐⭐⭐⭐⭐ Отлично |
| Bulgarian | bg | ⭐⭐⭐⭐ Много добро |
| Russian | ru | ⭐⭐⭐⭐⭐ Отлично |
| Italian | it | ⭐⭐⭐⭐⭐ Отлично |
| Portuguese | pt | ⭐⭐⭐⭐⭐ Отлично |
| Chinese | zh | ⭐⭐⭐⭐ Много добро |
| Japanese | ja | ⭐⭐⭐⭐ Много добро |

---

*Продължава в следващата част...*
