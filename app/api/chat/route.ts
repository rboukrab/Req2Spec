import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import mammoth from "mammoth";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ================================================================
   Base context shared across all passes
   ================================================================ */
const BASE_CONTEXT = `Contexto del proyecto:
- Cliente: Nordwind Manufacturing GmbH
- Engagement: S/4HANA Greenfield
- Fase: Taller Fit-to-Standard
- Ubicación: Presencial · Hamburgo

Módulos SAP:
- MM: Gestión de Materiales
- SD: Ventas y Distribución
- FI: Finanzas (FI/CO)
- PP: Planificación Producción
- ABAP: Desarrollo / ABAP
- S4: Núcleo S/4HANA`;

/* ================================================================
   Pass 1 — Breakdown: standalone specs + epic shells
   ================================================================ */
const BREAKDOWN_PROMPT = `${BASE_CONTEXT}

Eres un arquitecto de especificaciones SAP. Analiza el requisito del usuario y descompónlo en:

1. **Tareas standalone** — requisitos concretos, granulares y bien acotados que NO necesitan descomposición. Genera cada una como un Spec COMPLETO (level: "task", sin parentId).
2. **Épicas** — requisitos de alto nivel que DEBEN descomponerse en múltiples tareas. Genera solo la CÁSCARA de cada épica (id, title, description, module, type, fit, custom, priority, source, process, subProcess, level: "epic", parentId: null). NO generes las tareas de la épica todavía.

Reglas de IDs:
- Standalone tasks: SPEC-001, SPEC-002, etc.
- Épicas: SPEC-001, SPEC-002, etc. (consecutivos con los standalone).

El campo "effort" debe ser en Jornadas-Persona (JP). Para standalone tasks estima el esfuerzo realista. Para épicas pon "0 JP" (se calculará automáticamente).

Devuelve ÚNICAMENTE un objeto JSON:
\`\`\`json
{"standaloneSpecs": [{"id":"SPEC-001","title":"...","module":"MM|SD|FI|PP|ABAP|S4","type":"Funcional|Técnica","fit":"Configuración estándar|...","custom":false,"complexity":2,"effort":"4 JP","priority":"Alta|Media|Baja","source":"...","description":"...","objects":["..."],"acceptance":["..."],"question":"...","process":"...","subProcess":"...","level":"task"}], "epicShells": [{"id":"SPEC-002","title":"...","module":"MM","type":"Funcional","fit":"Configuración estándar","custom":false,"priority":"Alta","source":"...","description":"...","process":"...","subProcess":"...","level":"epic"}]}
\`\`\``;

/* ================================================================
   Pass 2 — Expand epic: tasks + subtasks for one epic
   ================================================================ */
function expandEpicPrompt(epic: any) {
  return `${BASE_CONTEXT}

Eres un experto en especificaciones SAP. Te dan una épica y debes descomponerla en TODAS las tareas y subtareas necesarias para implementarla completamente.

ÉPICA:
- ID: ${epic.id}
- Título: ${epic.title}
- Módulo: ${epic.module}
- Descripción: ${epic.description}
- Proceso: ${epic.process || "N/A"}
- Subproceso: ${epic.subProcess || "N/A"}

Reglas:
1. Genera tareas (level: "task") y, solo si es necesario, subtareas (level: "subtask").
2. Cada tarea debe tener parentId: "${epic.id}".
3. Las subtareas deben tener parentId apuntando a su tarea padre.
4. IDs de tareas: ${epic.id}-1, ${epic.id}-2, etc.
5. IDs de subtareas: ${epic.id}-1-1, ${epic.id}-1-2, etc.
6. El campo "effort" debe ser en JP. Solo las HOJAS (tareas sin subtareas y subtareas) llevan esfuerzo estimado. Los padres llevan "0 JP".
7. Completa TODOS los campos de Spec (type, fit, custom, complexity, priority, source, description, objects, acceptance, question, process, subProcess).

Devuelve ÚNICAMENTE un objeto JSON:
\`\`\`json
{"specs": [{"id":"${epic.id}-1","title":"...","module":"${epic.module}","type":"Funcional|Técnica","fit":"...","custom":false,"complexity":2,"effort":"X JP","priority":"Alta|Media|Baja","source":"...","description":"...","objects":["..."],"acceptance":["..."],"question":"...","process":"...","subProcess":"...","parentId":"${epic.id}","level":"task"}]}
\`\`\``;
}

/* ================================================================
   Helpers
   ================================================================ */
async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

function parseJP(effort: string): number {
  const match = effort.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function formatJP(n: number): string {
  return `${n} JP`;
}

function rollupEffort(specs: any[]): any[] {
  const childrenMap = new Map<string, any[]>();
  for (const spec of specs) {
    if (spec.parentId) {
      const siblings = childrenMap.get(spec.parentId) || [];
      siblings.push(spec);
      childrenMap.set(spec.parentId, siblings);
    }
  }

  function getEffort(spec: any): number {
    const children = childrenMap.get(spec.id) || [];
    if (children.length === 0) return parseJP(spec.effort);
    return children.reduce((sum, child) => sum + getEffort(child), 0);
  }

  return specs.map((spec) => {
    const children = childrenMap.get(spec.id) || [];
    if (children.length > 0) {
      return { ...spec, effort: formatJP(getEffort(spec)) };
    }
    return spec;
  });
}

async function callOpenAI({
  model,
  system,
  messages,
  temperature = 0.7,
  max_tokens = 4000,
}: {
  model: string;
  system: string;
  messages: any[];
  temperature?: number;
  max_tokens?: number;
}) {
  const completion = await openai.chat.completions.create({
    model,
    messages: [{ role: "system", content: system }, ...messages],
    temperature,
    max_tokens,
  });
  return completion.choices[0].message.content || "";
}

function extractJsonBlock(text: string): any | null {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function cleanText(text: string): string {
  return text.replace(/```json\s*[\s\S]*?\s*```/g, "").trim();
}

function normalizeSpec(spec: any): any {
  return {
    id: spec.id || "SPEC-???",
    title: spec.title || "Sin título",
    module: spec.module || "S4",
    type: spec.type || "Funcional",
    fit: spec.fit || "Configuración estándar",
    custom: !!spec.custom,
    complexity: typeof spec.complexity === "number" ? spec.complexity : 2,
    effort: spec.effort || "0 JP",
    priority: spec.priority || "Media",
    source: spec.source || "",
    description: spec.description || "",
    objects: Array.isArray(spec.objects) ? spec.objects : [],
    acceptance: Array.isArray(spec.acceptance) ? spec.acceptance : [],
    question: spec.question || undefined,
    process: spec.process || undefined,
    subProcess: spec.subProcess || undefined,
    parentId: spec.parentId || undefined,
    level: spec.level || "task",
  };
}

/* ================================================================
   Streaming helpers
   ================================================================ */
const encoder = new TextEncoder();

function sendEvent(controller: ReadableStreamDefaultController, data: any) {
  controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
}

/* ================================================================
   Main handler — streaming NDJSON
   ================================================================ */
export async function POST(req: NextRequest) {
  try {
    /* -------- Parse request -------- */
    let messages: any[] = [];
    let documentText: string | null = null;

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const messagesJson = formData.get("messages") as string;
      if (messagesJson) messages = JSON.parse(messagesJson);
      const file = formData.get("file") as File | null;
      if (file) {
        const buffer = Buffer.from(await file.arrayBuffer());
        if (file.name.endsWith(".docx")) {
          documentText = await extractDocxText(buffer);
        } else {
          return NextResponse.json(
            { text: "Solo se aceptan archivos .docx. Convierte el archivo y vuelve a subirlo.", specs: [], suggestions: null },
            { status: 400 }
          );
        }
      }
    } else {
      const body = await req.json();
      messages = body.messages || [];
    }

    const lastUserMsg = messages.filter((m: any) => m.role === "user").pop()?.content || "";
    const docCtx = documentText
      ? `\n\nDOCUMENTO ADJUNTO:\n---\n${documentText.slice(0, 12000)}\n---\n`
      : "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (documentText) {
            sendEvent(controller, { type: "progress", message: "Extrayendo contenido del documento adjunto…" });
          }

          sendEvent(controller, { type: "progress", message: "Analizando requisitos y contexto del proyecto…" });

          /* -------- Pass 1: Breakdown -------- */
          sendEvent(controller, { type: "progress", message: "Estructurando épicas y tareas independientes…" });
          const breakdownRaw = await callOpenAI({
            model: "gpt-4o",
            system: BREAKDOWN_PROMPT,
            messages: [{ role: "user", content: `Mensaje del usuario:\n${lastUserMsg}${docCtx}` }],
          });

          const breakdownJson = extractJsonBlock(breakdownRaw) || {};
          let standaloneSpecs: any[] = breakdownJson.standaloneSpecs || [];
          const epicShells: any[] = breakdownJson.epicShells || [];

          /* -------- Pass 2: Expand each epic -------- */
          const expandedEpicSpecs: any[] = [];
          if (epicShells.length > 0) {
            sendEvent(controller, { type: "progress", message: `Desglosando ${epicShells.length} épica${epicShells.length > 1 ? "s" : ""} en tareas y subtareas…` });
            for (let i = 0; i < epicShells.length; i++) {
              const epic = epicShells[i];
              sendEvent(controller, { type: "progress", message: `Desglosando épica ${i + 1} de ${epicShells.length}: ${epic.title}…` });
              const expandRaw = await callOpenAI({
                model: "gpt-4o",
                system: expandEpicPrompt(epic),
                messages: [{ role: "user", content: `Descompón la épica ${epic.id} en tareas y subtareas.` }],
              });
              const expandJson = extractJsonBlock(expandRaw);
              if (expandJson?.specs && Array.isArray(expandJson.specs)) {
                expandedEpicSpecs.push(...expandJson.specs);
              }
            }
          }

          /* -------- Combine, normalize & rollup -------- */
          sendEvent(controller, { type: "progress", message: "Calculando esfuerzo y consolidando especificaciones…" });
          let allSpecs = [...standaloneSpecs, ...epicShells, ...expandedEpicSpecs].map(normalizeSpec);
          allSpecs = rollupEffort(allSpecs);

          /* -------- Suggestions (optional) -------- */
          let suggestions = null;
          const suggMatch = breakdownRaw.match(/```json\s*([\s\S]*?)\s*```/);
          if (suggMatch) {
            try {
              const parsed = JSON.parse(suggMatch[1]);
              if (parsed.suggestions) suggestions = parsed.suggestions;
            } catch { /* ignore */ }
          }

          const responseText = cleanText(breakdownRaw) || "He analizado tu requisito y generado las especificaciones correspondientes.";

          sendEvent(controller, {
            type: "result",
            text: responseText,
            specs: allSpecs,
            suggestions,
          });
          controller.close();
        } catch (err: any) {
          console.error("Stream error:", err);
          sendEvent(controller, {
            type: "result",
            text: "Lo siento, ha ocurrido un error al procesar tu mensaje. Por favor, inténtalo de nuevo.",
            specs: [],
            suggestions: null,
          });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("OpenAI API error:", error);
    return NextResponse.json(
      { text: "Lo siento, ha ocurrido un error al procesar tu mensaje. Por favor, inténtalo de nuevo.", specs: [], suggestions: null },
      { status: 500 }
    );
  }
}
