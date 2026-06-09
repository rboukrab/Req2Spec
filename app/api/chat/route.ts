import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import mammoth from "mammoth";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ================================================================
   Base context
   ================================================================ */
const BASE_CONTEXT = `Contexto del proyecto:
- Cliente: Construcciones y Auxiliar de Ferrocarriles
- Engagement: S/4HANA Greenfield
- Fase: Taller Fit-to-Standard
- Ubicación: Presencial · Barcelona

Módulos SAP:
- MM: Gestión de Materiales
- SD: Ventas y Distribución
- FI: Finanzas (FI/CO)
- PP: Planificación Producción
- ABAP: Desarrollo / ABAP
- S4: Núcleo S/4HANA`;

/* ================================================================
   Pass 1 — Breadth-first breakdown: free markdown sections
   ================================================================ */
const BREAKDOWN_PROMPT = `${BASE_CONTEXT}

Eres un arquitecto de especificaciones SAP senior. Tu única función es descomponer el requisito del usuario en BLOQUES DE TRABAJO INDEPENDIENTES. Cada bloque = una sección markdown con su propio ID.

FORMATO OBLIGATORIO — cada bloque de trabajo es una sección:

## SPEC-001: [Título del bloque 1]
[Descripción completa en markdown del bloque 1. Qué se hace, cómo, entregables, riesgos, dependencias, objetos SAP.]

## SPEC-002: [Título del bloque 2]
[Descripción completa en markdown del bloque 2.]

## SPEC-003: [Título del bloque 3 — standalone]
[Descripción completa en markdown del bloque 3.]

REGLAS ESTRICTAS:
1. PROHIBIDO crear una sola sección que "analice todo". Si el input tiene N bloques funcionales, debes generar N secciones.
2. PROHIBIDO poner tablas de resumen, estimaciones globales o conclusiones generales como una SPEC. Esas van FUERA de las secciones o no van.
3. Cada bloque funcional identificable = su propia SPEC con su propio ID consecutivo.
4. Usa ## para TODAS las tareas. Solo primer nivel, SIN subtareas.
5. PROHIBIDO usar ### o cualquier nivel de heading mayor que ##. No generes subtareas.
6. Las descripciones deben ser completas y detalladas. Mínimo 3-4 párrafos por bloque. NO resumas en 2 frases.
7. Al final de CADA sección, incluye obligatoriamente una línea exactamente así: **Esfuerzo:** X JP (donde X es un número entero realista de jornadas-persona estimadas para implementar ESTE bloque completo).
8. Escribe en español.
9. Después de todas las secciones, puedes incluir opcionalmente un bloque JSON con sugerencias de seguimiento.

EJEMPLO DE LO QUE NO DEBES HACER (MAL):
## SPEC-001: Análisis completo del requerimiento
[Aquí pones TODO el análisis, tablas, estimaciones... ESO ESTÁ PROHIBIDO.]

EJEMPLO DE LO QUE SÍ DEBES HACER (BIEN):
## SPEC-001: Programa Z de selección y validaciones
[Descripción del programa de selección, dynpro, variantes...]
**Esfuerzo:** 5 JP

## SPEC-002: Lógica where-used para localizar PBOM afectadas
[Descripción de la lógica de búsqueda, tablas estándar, filtros...]
**Esfuerzo:** 8 JP

## SPEC-003: ALV interactivo de resultados
[Descripción del ALV, toolbar, selección múltiple...]
**Esfuerzo:** 4 JP`;

/* ================================================================
   Pass 2 — Expand task into subtasks with effort estimation
   ================================================================ */
function expandTaskPrompt(task: any) {
  return `${BASE_CONTEXT}

Eres un experto en estimación de desarrollo SAP. Descompón la siguiente tarea en bloques de trabajo coherentes y de tamaño significativo. Cada subtarea debe representar un entregable funcional completo, NO un paso técnico minúsculo.

TAREA PADRE:
- ID: ${task.id}
- Título: ${task.title}
- Descripción completa:
${task.description}

FORMATO OBLIGATORIO — cada subtarea es una sección:

### ${task.id}-1: [Título de la subtarea]
[Descripción completa en markdown de la subtarea. Qué se hace, cómo, entregables, riesgos, dependencias, objetos SAP.]
**Esfuerzo:** X JP

### ${task.id}-2: [Título de otra subtarea]
[Descripción completa...]
**Esfuerzo:** Y JP

REGLAS ESTRICTAS:
1. Genera SOLO subtareas (###). No repitas la tarea padre.
2. IDs de subtareas: ${task.id}-1, ${task.id}-2, etc. Consecutivos.
3. LÍMITE ABSOLUTO: genera entre 3 y 5 subtareas, NUNCA más de 5. Si la tarea es pequeña, genera solo 2-3.
4. Cada subtarea debe ser un BLOQUE FUNCIONAL GENERAL. Agrupa temas relacionados en una sola subtarea. NO generes subtareas para micro-tareas como: textos de selección, labels, validaciones unitarias, clases de mensajes, normalizaciones, etc.
5. Escribe en español.
6. No incluyas conclusiones generales, tablas de resumen ni totales fuera de las secciones.
7. Al final de CADA subtarea, incluye obligatoriamente: **Esfuerzo:** X JP
8. REPARTO OBLIGATORIO: la suma de los esfuerzos de TODAS las subtareas debe ser EXACTAMENTE ${task.effort} (el esfuerzo de la tarea padre). Reparte este total entre las subtareas proporcionalmente a su complejidad.`;
}

function parseSubtasks(text: string): ParsedSpec[] {
  const lines = text.split("\n");
  const specs: ParsedSpec[] = [];
  let current: { id: string; title: string; bodyLines: string[] } | null = null;

  for (const line of lines) {
    const match = line.match(/^(#{3})\s+(SPEC-\d+(?:-\d+)*):\s*(.*)$/);
    if (match) {
      if (current) {
        const rawBody = current.bodyLines.join("\n").trim();
        specs.push({
          id: current.id,
          title: current.title,
          description: stripEffortLine(rawBody),
          level: "subtask",
          effort: extractEffort(rawBody),
        });
      }
      current = {
        id: match[2],
        title: match[3].trim(),
        bodyLines: [],
      };
    } else if (current) {
      current.bodyLines.push(line);
    }
  }

  if (current) {
    const rawBody = current.bodyLines.join("\n").trim();
    specs.push({
      id: current.id,
      title: current.title,
      description: stripEffortLine(rawBody),
      level: "subtask",
      effort: extractEffort(rawBody),
    });
  }

  return specs;
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
    const childrenSum = children.reduce((sum, child) => sum + getEffort(child), 0);
    return childrenSum > 0 ? childrenSum : parseJP(spec.effort);
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
  const isReasoning = model.startsWith("o") || (model.startsWith("gpt-5") && model !== "gpt-5-chat-latest");
  const params: any = {
    model,
    messages: [{ role: "system", content: system }, ...messages],
  };
  if (isReasoning) {
    params.max_completion_tokens = max_tokens;
  } else {
    params.temperature = temperature;
    params.max_tokens = max_tokens;
  }
  const completion = await openai.chat.completions.create(params);
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

interface ParsedSpec {
  id: string;
  title: string;
  description: string;
  level: "task" | "subtask";
  effort: string;
}

function getParentId(id: string): string | undefined {
  const lastDash = id.lastIndexOf("-");
  if (lastDash === -1 || id.slice(0, lastDash) === "SPEC") return undefined;
  return id.slice(0, lastDash);
}

function extractEffort(text: string): string {
  // Busca **Esfuerzo:** X JP permitiendo saltos de línea entre la etiqueta y el número
  const match = text.match(/Esfuerzo[^\d]*?(\d+)\s*JP/i);
  if (!match) return "0 JP";

  let n = parseInt(match[1], 10);
  // Corrección de sobre-estimación: GPT tiende a sobrestimar
  if (n >= 1 && n < 5) n = Math.max(1, n - 1);
  else if (n >= 5 && n < 10) n = Math.max(1, n - 2);
  else if (n >= 10) n = Math.max(1, n - 4);

  return `${n} JP`;
}

function stripEffortLine(text: string): string {
  return text.replace(/\*\*Esfuerzo:\*\*\s*\d+\s*JP\s*\n?/gi, "").trim();
}

function parseMarkdownSpecs(text: string): ParsedSpec[] {
  const lines = text.split("\n");
  const specs: ParsedSpec[] = [];
  let current: { level: number; id: string; title: string; bodyLines: string[] } | null = null;

  for (const line of lines) {
    const match = line.match(/^(#{2})\s+(SPEC-\d+):\s*(.*)$/);
    if (match) {
      if (current) {
        const rawBody = current.bodyLines.join("\n").trim();
        specs.push({
          id: current.id,
          title: current.title,
          description: stripEffortLine(rawBody),
          level: current.level === 2 ? "task" : "subtask",
          effort: extractEffort(rawBody),
        });
      }
      current = {
        level: match[1].length,
        id: match[2],
        title: match[3].trim(),
        bodyLines: [],
      };
    } else if (current) {
      current.bodyLines.push(line);
    }
  }

  if (current) {
    const rawBody = current.bodyLines.join("\n").trim();
    specs.push({
      id: current.id,
      title: current.title,
      description: stripEffortLine(rawBody),
      level: current.level === 2 ? "task" : "subtask",
      effort: extractEffort(rawBody),
    });
  }

  return specs;
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
    parentId: spec.parentId || getParentId(spec.id) || undefined,
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
    let model = "gpt-5.4";

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const messagesJson = formData.get("messages") as string;
      if (messagesJson) messages = JSON.parse(messagesJson);
      const modelParam = formData.get("model") as string | null;
      if (modelParam) model = modelParam;
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
      if (body.model) model = body.model;
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

          /* -------- Pass 1: Free markdown breakdown -------- */
          sendEvent(controller, { type: "progress", message: "Analizando requisitos y descomponiendo en bloques…" });
          const breakdownRaw = await callOpenAI({
            model,
            system: BREAKDOWN_PROMPT,
            messages: [{ role: "user", content: `Mensaje del usuario:\n${lastUserMsg}${docCtx}` }],
            max_tokens: 4000,
          });

          const parsedSpecs = parseMarkdownSpecs(breakdownRaw);

          /* -------- Pass 2: Expand each task into subtasks -------- */
          const expandedSubtasks: ParsedSpec[] = [];
          if (parsedSpecs.length > 0) {
            sendEvent(controller, { type: "progress", message: `Desglosando ${parsedSpecs.length} tarea${parsedSpecs.length > 1 ? "s" : ""} en subtareas…` });
            for (let i = 0; i < parsedSpecs.length; i++) {
              const task = parsedSpecs[i];
              sendEvent(controller, { type: "progress", message: `Desglosando tarea ${i + 1} de ${parsedSpecs.length}: ${task.title}…` });
              const expandRaw = await callOpenAI({
                model,
                system: expandTaskPrompt(task),
                messages: [{ role: "user", content: `Descompón la tarea ${task.id} en subtareas con estimación precisa de esfuerzo.` }],
                max_tokens: 4000,
              });
              let subtasks = parseSubtasks(expandRaw);

              // Fallback: si GPT no repartió el esfuerzo, distribuir el de la tarea padre
              const totalSubEffort = subtasks.reduce((sum, s) => sum + parseJP(s.effort), 0);
              const parentEffort = parseJP(task.effort);
              if (subtasks.length > 0 && totalSubEffort === 0 && parentEffort > 0) {
                const base = Math.floor(parentEffort / subtasks.length);
                const remainder = parentEffort % subtasks.length;
                subtasks = subtasks.map((s, idx) => ({
                  ...s,
                  effort: formatJP(base + (idx < remainder ? 1 : 0)),
                }));
              } else if (subtasks.length > 0 && totalSubEffort !== parentEffort && parentEffort > 0) {
                // Ajustar proporcionalmente para que sume exactamente el padre
                const ratio = parentEffort / totalSubEffort;
                let distributed = 0;
                subtasks = subtasks.map((s, idx) => {
                  const adjusted = idx === subtasks.length - 1
                    ? parentEffort - distributed
                    : Math.max(1, Math.round(parseJP(s.effort) * ratio));
                  distributed += adjusted;
                  return { ...s, effort: formatJP(adjusted) };
                });
              }

              expandedSubtasks.push(...subtasks);
            }
          }

          /* -------- Combine & normalize -------- */
          sendEvent(controller, { type: "progress", message: "Consolidando especificaciones…" });
          const allSpecs = [...parsedSpecs, ...expandedSubtasks].map(normalizeSpec);

          /* -------- Suggestions (optional) -------- */
          let suggestions = null;
          const suggJson = extractJsonBlock(breakdownRaw);
          if (suggJson?.suggestions) suggestions = suggJson.suggestions;

          sendEvent(controller, {
            type: "result",
            text: breakdownRaw,
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
