# uDefine Req-to-Spec

An AI-powered chatbot that converts natural language SAP requirements into structured, hierarchical technical specifications.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?logo=openai)

## How it works

1. **Describe** your requirement in plain language (or upload a `.docx` brief).
2. **AI analyzes** the input using a 2-pass architecture:
   - **Breakdown**: GPT-4o identifies standalone tasks and epic-level requirements.
   - **Expansion**: Each epic is decomposed into tasks and subtasks with full technical detail.
3. **Review & edit** the generated specs in an interactive tree view — every field is editable.
4. **Approve or flag** specs, then export to Excel, Word, Jira, or SAP Solution Manager.

## Features

- **Hierarchical specs**: Epics → Tasks → Subtasks with automatic effort rollup (JP — Jornada-Persona).
- **SAP-aware**: Auto-tags modules (MM, SD, FI, PP, ABAP, S/4HANA).
- **Document upload**: Parses `.docx` files via Mammoth for additional context.
- **Real-time progress**: Streaming backend shows exactly what the AI is doing — no more staring at a typing indicator.
- **Full inline editing**: Modify any spec field — title, module, effort, acceptance criteria, objects, priority, etc.
- **Suggestion chips**: AI proposes follow-up actions and clarifying questions.
- **Export-ready**: One-click export to multiple formats.
- **Customizable UI**: Switch between split, focus, and workspace layouts; choose accent colors, fonts, and density.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js](https://nextjs.org/) 15 (App Router) |
| UI | [React](https://react.dev/) 19 + TypeScript |
| AI | [OpenAI](https://openai.com/) GPT-4o |
| Styling | CSS custom properties (no UI framework) |
| Parsing | [Mammoth](https://github.com/mwilliamson/mammoth.js) (.docx → text) |
| Markdown | [react-markdown](https://github.com/remarkjs/react-markdown) + remark-gfm |

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) (recommended) or npm
- An [OpenAI API key](https://platform.openai.com/api-keys)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd udefine-req-to-spec

# Install dependencies
pnpm install

# Create environment file
cp .env.example .env
```

### Environment variables

Add your OpenAI API key to `.env`:

```env
OPENAI_API_KEY=sk-...
```

### Run locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for production

```bash
pnpm build
```

## Project structure

```
├── app/
│   ├── api/chat/route.ts      # OpenAI streaming API (2-pass spec generation)
│   ├── components/
│   │   ├── chat.tsx           # Chat panel & message rendering
│   │   ├── spec-panel.tsx     # Tree view & spec detail cards
│   │   ├── export-modal.tsx   # Export options UI
│   │   ├── tweaks.tsx         # Theme customization panel
│   │   └── icons.tsx          # SVG icon components
│   ├── page.tsx               # Main page layout
│   ├── layout.tsx             # Root layout
│   └── globals.css            # Design system & component styles
├── lib/
│   └── data.ts                # Spec types, SAP module metadata, sample data
├── public/
│   └── logo_*.jpg             # Brand assets
├── next.config.ts
├── package.json
└── tsconfig.json
```

## Architecture

### 2-pass spec generation

The backend uses a two-phase approach to ensure high-quality, hierarchical specifications:

1. **Breakdown pass**: The user's message (plus any uploaded `.docx` context) is sent to GPT-4o with a prompt that instructs it to produce:
   - `standaloneSpecs` — fully detailed tasks that don't need decomposition
   - `epicShells` — high-level epics that require further breakdown

2. **Expansion pass**: For each epic shell, a second GPT-4o call generates the full task/subtask tree with `parentId` relationships. Effort is estimated only on leaf nodes; parent effort is automatically rolled up as the sum of children.

### Streaming progress

Instead of a generic "typing" indicator, the API streams NDJSON events so the frontend can display real-time progress messages:

```
→ Analizando requisitos y contexto del proyecto…
→ Estructurando épicas y tareas independientes…
→ Desglosando épica 1 de 3: Gestión de compras…
→ Calculando esfuerzo y consolidando especificaciones…
```

## Deployment

### Vercel (recommended)

1. Push to GitHub
2. Import into [Vercel](https://vercel.com/)
3. Add `OPENAI_API_KEY` under **Settings → Environment Variables**
4. Deploy

> ⚠️ **Note on timeouts**: The API makes multiple sequential calls to OpenAI. On Vercel's free (Hobby) plan, serverless functions time out after **10 seconds**, which may not be enough for complex prompts with multiple epics. Consider upgrading to Pro (60s timeout) if you hit this limit.

## License

MIT
