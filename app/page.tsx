"use client";

import React, { useState, useEffect, useCallback } from "react";
import { TopBar } from "./components/top-bar";
import { ChatPanel, type MessageData } from "./components/chat";
import { SpecPanel, type SpecState } from "./components/spec-panel";
import { ExportModal } from "./components/export-modal";
import { TweaksPanel, TweakSection, TweakRadio, TweakSelect, TweakToggle, TweakColor, useTweaks } from "./components/tweaks";
import { UD, type Spec, type Suggestion } from "@/lib/data";

/* accent palettes for Tweaks */
const ACCENTS = {
  green:  { "--accent": "#9eb90e", "--accent-press": "#7d9209", "--accent-soft": "#f2f5da", "--accent-ink": "#5f6f08", "--mint": "#cfe06a" },
  teal:   { "--accent": "#29c4a9", "--accent-press": "#1d9684", "--accent-soft": "#daf4ef", "--accent-ink": "#0f7a68", "--mint": "#8fe3d4" },
  orange: { "--accent": "#ff6900", "--accent-press": "#cc5400", "--accent-soft": "#ffe9d8", "--accent-ink": "#c25200", "--mint": "#ffb27a" },
};

const FONTS = {
  udefine: '"Open Sans", system-ui, sans-serif',
  source:  '"Source Sans 3", system-ui, sans-serif',
  system:  'system-ui, -apple-system, sans-serif',
};

const TWEAK_DEFAULTS = {
  layout: "split" as const,
  accent: "green" as const,
  font: "udefine" as const,
  density: "regular" as const,
  showInlineSpecs: true,
  model: "gpt-4o" as const,
};

export default function Home() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  /* migrate invalid saved models */
  useEffect(() => {
    const validModels = ["gpt-5.5", "gpt-5.4", "gpt-5.4-mini", "gpt-5.2", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "gpt-4o", "gpt-4o-mini", "o3", "o3-mini"];
    if (!validModels.includes(t.model)) {
      setTweak("model", TWEAK_DEFAULTS.model);
    }
  }, [t.model, setTweak]);

  const [messages, setMessages] = useState<MessageData[]>([{ role: "bot", text: UD.greeting.text }]);
  const [apiMessages, setApiMessages] = useState<{ role: string; content: string }[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [states, setStates] = useState<Record<string, SpecState>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion | null>(null);

  const layout = t.layout;

  /* apply theme vars */
  useEffect(() => {
    const root = document.documentElement;
    const pal = ACCENTS[t.accent as keyof typeof ACCENTS] || ACCENTS.green;
    Object.entries(pal).forEach(([k, v]) => root.style.setProperty(k, v));
    root.style.setProperty("--font", FONTS[t.font as keyof typeof FONTS] || FONTS.udefine);
    root.setAttribute("data-density", t.density === "compact" ? "compact" : "regular");
  }, [t.accent, t.font, t.density]);

  const toastMsg = useCallback((m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  }, []);

  const addBotMessage = useCallback((text: string, newSpecs?: Spec[], newSuggestions?: Suggestion | null) => {
    const m: MessageData = { role: "bot", text };
    if (newSpecs && newSpecs.length > 0 && t.showInlineSpecs) m.specs = newSpecs;
    if (newSpecs && newSpecs.length > 0 && !t.showInlineSpecs) m.text = text + " (« " + newSpecs.length + " especificaciones añadidas" + " →";
    setMessages((prev) => [...prev, m]);
    if (newSpecs && newSpecs.length > 0) {
      setSpecs((prev) => {
        const existingIds = new Set(prev.map((s) => s.id));
        const toAdd = newSpecs.filter((s) => !existingIds.has(s.id));
        return [...prev, ...toAdd];
      });
      setStates((prev) => {
        const next = { ...prev };
        newSpecs.forEach((spec) => {
          if (!next[spec.id]) {
            next[spec.id] = { status: "draft" };
          }
        });
        return next;
      });
      if (layout === "focus") setTimeout(() => setDrawerOpen(true), 250);
    }
    setSuggestions(newSuggestions || null);
  }, [layout, t.showInlineSpecs]);

  const send = useCallback(async (text: string, file?: File) => {
    setMessages((prev) => [...prev, { role: "user", text, fileName: file?.name }]);
    setSuggestions(null);
    const updatedMessages = [...apiMessages, { role: "user", content: text }];
    setApiMessages(updatedMessages);
    setProgress("Enviando…");

    try {
      let res: Response;
      if (file) {
        const formData = new FormData();
        formData.append("messages", JSON.stringify(updatedMessages));
        formData.append("file", file);
        formData.append("model", t.model);
        res = await fetch("/api/chat", {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: updatedMessages, model: t.model }),
        });
      }

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalResult: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (event.type === "progress" && event.message) {
              setProgress(event.message);
            }
            if (event.type === "result") {
              finalResult = event;
            }
          } catch {
            // ignore malformed lines
          }
        }
      }

      setProgress(null);

      if (finalResult) {
        addBotMessage(finalResult.text, finalResult.specs, finalResult.suggestions);
        setApiMessages((prev) => [...prev, { role: "assistant", content: finalResult.text }]);
      } else {
        addBotMessage("He recibido tu mensaje, pero no pude generar una respuesta completa. Inténtalo de nuevo.");
        setApiMessages((prev) => [...prev, { role: "assistant", content: "Error de respuesta" }]);
      }
    } catch {
      setProgress(null);
      setMessages((prev) => [...prev, { role: "bot", text: "Lo siento, ha ocurrido un error al procesar tu mensaje. Por favor, inténtalo de nuevo." }]);
    }
  }, [apiMessages, addBotMessage, t.model]);

  const actions = {
    approve: (id: string) => setStates((p) => ({ ...p, [id]: { ...p[id], status: p[id]?.status === "approved" ? "draft" : "approved" } })),
    flag:    (id: string) => setStates((p) => ({ ...p, [id]: { ...p[id], status: p[id]?.status === "flagged" ? "draft" : "flagged" } })),
    edit:    (id: string, spec: Spec) => { setSpecs((prev) => prev.map((s) => (s.id === id ? spec : s))); toastMsg("Especificación actualizada"); },
  };

  const chipHandlers = {
    pick: (text: string) => send(text),
    export: () => setShowExport(true),
    view: (id: string) => {
      if (layout === "focus") setDrawerOpen(true);
      setHighlightId(id);
      setTimeout(() => {
        const el = document.getElementById("card-" + id);
        const sc = el?.closest(".spec-scroll") as HTMLElement | null;
        if (el && sc) sc.scrollTop = el.offsetTop - sc.offsetTop - 12;
      }, layout === "focus" ? 360 : 40);
      setTimeout(() => setHighlightId(null), 1600);
    },
  };

  return (
    <div className="app">
      <TopBar project={UD.project} specs={specs} onExport={() => setShowExport(true)} />
      <div className="ribbon"><div className="fill" style={{ width: Math.min(specs.length / 4, 1) * 100 + "%" }} /></div>

      <div className={"stage " + layout}>
        {layout === "focus" && (
          <div className={"drawer-scrim" + (drawerOpen ? " show" : "")} onClick={() => setDrawerOpen(false)} />
        )}
        <ChatPanel
          messages={messages}
          progress={progress}
          suggestion={suggestions}
          onSend={send}
          onChip={chipHandlers}
          layout={layout}
          specCount={specs.length}
          onOpenDrawer={() => setDrawerOpen(true)}
        />
        <SpecPanel
          specs={specs}
          states={states}
          actions={actions}
          layout={layout}
          drawerOpen={drawerOpen}
          onCloseDrawer={() => setDrawerOpen(false)}
          highlightId={highlightId}
        />
      </div>

      {showExport && (
        <ExportModal
          specs={specs}
          states={states as Record<string, { status?: string }>}
          project={UD.project}
          onClose={() => setShowExport(false)}
          onExported={(name) => { setShowExport(false); toastMsg("Exportación a " + name + " lista — descargando…"); }}
        />
      )}

      {toast && <div className="toast"><span className="ok">✓</span>{toast}</div>}

      <TweaksPanel>
        <TweakSection label="Disposición" />
        <TweakRadio label="Vista" value={t.layout}
          options={[{ value: "split", label: "Dividida" }, { value: "focus", label: "Enfoque" }, { value: "workspace", label: "Espacio" }]}
          onChange={(v) => { setTweak("layout", v); setDrawerOpen(false); }} />
        <TweakSection label="Apariencia" />
        <TweakColor label="Color de acento"
          value={(ACCENTS[t.accent as keyof typeof ACCENTS] || ACCENTS.green)["--accent"]}
          options={[ACCENTS.green["--accent"], ACCENTS.teal["--accent"], ACCENTS.orange["--accent"]]}
          onChange={(hex) => {
            const key = (Object.keys(ACCENTS) as Array<keyof typeof ACCENTS>).find((k) => ACCENTS[k]["--accent"] === hex) || "green";
            setTweak("accent", key);
          }} />
        <TweakSelect label="Tipografía" value={t.font}
          options={[{ value: "udefine", label: "Open Sans (marca)" }, { value: "source", label: "Source Sans 3" }, { value: "system", label: "Sistema" }]}
          onChange={(v) => setTweak("font", v)} />
        <TweakRadio label="Densidad" value={t.density}
          options={[{ value: "regular", label: "Normal" }, { value: "compact", label: "Compacta" }]} onChange={(v) => setTweak("density", v)} />
        <TweakSection label="Comportamiento" />
        <TweakToggle label="Mostrar vista previa en el chat" value={t.showInlineSpecs}
          onChange={(v) => setTweak("showInlineSpecs", v)} />
        <TweakSection label="Modelo de IA" />
        <TweakSelect label="Modelo GPT" value={t.model}
          options={[
            { value: "gpt-4o", label: "GPT-4o  —  $2.50 / $10  ✅ recomendado" },
            { value: "gpt-4.1", label: "GPT-4.1  —  $2 / $8" },
            { value: "gpt-4.1-mini", label: "GPT-4.1 Mini  —  $0.40 / $1.60" },
            { value: "gpt-4.1-nano", label: "GPT-4.1 Nano  —  $0.10 / $0.40" },
            { value: "gpt-4o-mini", label: "GPT-4o Mini  —  $0.15 / $0.60" },
            { value: "gpt-5.5", label: "GPT-5.5  —  $5 / $30  🐌 muy lento, timeout" },
            { value: "gpt-5.4", label: "GPT-5.4  —  $2.50 / $15  🐌 muy lento, timeout" },
            { value: "gpt-5.4-mini", label: "GPT-5.4 Mini  —  $0.75 / $4.50  🐌 muy lento, timeout" },
            { value: "gpt-5.2", label: "GPT-5.2  —  $0.88 / $7  🐌 muy lento, timeout" },
            { value: "o3", label: "o3  —  $2 / $8  ⚠️ reasoning tokens" },
            { value: "o3-mini", label: "o3-mini  —  $1.10 / $4.40  ⚠️ reasoning tokens" },
          ]}
          onChange={(v) => setTweak("model", v)} />
      </TweaksPanel>
    </div>
  );
}
