# TranslatePro v4.0

Professional document translation platform powered by Claude AI with layout preservation, speech-to-text, and modern UI.

## Features

### Core Translation
- **Claude AI Translation** - High-quality translation using Claude Sonnet 4 and Opus 4
- **10 Translation Styles** - Standard, Formal, Technical, Legal, Medical, Marketing, and more
- **20+ Languages** - Full support for European and Asian languages

### PDF Layout Preservation
- **Exact Layout Match** - Translated PDFs maintain original formatting
- **Font & Style Preservation** - Fonts, colors, sizes preserved
- **Image Retention** - All images stay in their original positions
- **Smart Text Fitting** - Automatic text adjustment for different text lengths

### Speech-to-Text
- **Whisper API Integration** - OpenAI's state-of-the-art speech recognition
- **Live Recording** - Record directly from browser
- **Audio File Upload** - MP3, WAV, M4A support
- **Timestamped Segments** - Word-level timing

### Translation Memory (TM)
- **Automatic Matching** - Suggest previous translations
- **Fuzzy Matching** - Find similar segments (50-99%)
- **TMX Import/Export** - Standard TM format support
- **Cost Reduction** - Reuse translations, save money

### Quality Assurance (QA)
- **12 QA Checks** - Numbers, terminology, punctuation, and more
- **Real-time Validation** - Issues highlighted as you work
- **Glossary Enforcement** - Ensure consistent terminology

### Batch Processing
- **Multiple Files** - Upload up to 50 documents
- **Parallel Processing** - Fast batch translation
- **Unified Settings** - Apply same settings to all

### Modern UI/UX
- **Dark/Light Mode** - System preference or manual
- **Keyboard Shortcuts** - Full keyboard navigation
- **Responsive Design** - Works on all screen sizes
- **Accessibility** - WCAG 2.1 AA compliant

## Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/translatepro.git
cd translatepro

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env and add your API keys

# Start development server
npm run dev
```

## Requirements

- Node.js 20+
- Anthropic API Key (Claude)
- OpenAI API Key (Whisper - optional)
- poppler-utils (for PDF processing)

## Documentation

See the [docs/](./docs/) folder for full technical specification:
- [Full Specification Part 1](./docs/SPECIFICATION_v4_FULL.md) - Architecture, UI/UX, PDF, Speech
- [Full Specification Part 2](./docs/SPECIFICATION_v4_PART2.md) - Translation, TM, QA, Batch, Analytics
- [Full Specification Part 3](./docs/SPECIFICATION_v4_PART3.md) - API, Components, Shortcuts, Security

## Tech Stack

**Backend:**
- Node.js 20+ / Express.js
- SQLite (better-sqlite3)
- pdf-lib, pdf2json (PDF processing)
- Socket.io (real-time)

**Frontend:**
- React 18 / Vite
- Tailwind CSS / Radix UI
- Zustand (state)
- Framer Motion (animations)

**AI:**
- Anthropic Claude API
- OpenAI Whisper API

## License

MIT

---

*Version 4.0 - January 2026*
