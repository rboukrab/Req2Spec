"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { I } from "./icons";
import { MODULES, type Spec } from "@/lib/data";

export function ModuleTag({ mod }: { mod: string }) {
  const m = MODULES[mod] || MODULES.S4;
  return (
    <span className="tag module" style={{ background: m.bg, color: m.ink }}>
      <span className="mini">{m.key}</span>{m.name}
    </span>
  );
}

export function Dots({ n, max = 4, warn }: { n: number; max?: number; warn?: boolean }) {
  return (
    <span className={"dots" + (warn ? " warn" : "")}>
      {Array.from({ length: max }).map((_, i) => (
        <i key={i} className={i < n ? "on" : ""} />
      ))}
    </span>
  );
}

export interface SpecState {
  status?: "draft" | "approved" | "flagged";
}

function SpecCard({
  spec, state, onApprove, onFlag, onEdit, highlight,
}: { spec: Spec; state: SpecState; onApprove: (id: string) => void; onFlag: (id: string) => void; onEdit: (id: string, spec: Spec) => void; highlight?: boolean; }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Spec>({ ...spec });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlight && ref.current) {
      ref.current.style.boxShadow = "0 0 0 3px var(--accent-soft), var(--shadow)";
      const t = setTimeout(() => { if (ref.current) ref.current.style.boxShadow = ""; }, 1400);
      return () => clearTimeout(t);
    }
  }, [highlight]);

  const startEdit = () => {
    setDraft({ ...spec });
    setEditing(true);
  };

  const saveEdit = () => {
    onEdit(spec.id, draft);
    setEditing(false);
  };

  const cancelEdit = () => {
    setDraft({ ...spec });
    setEditing(false);
  };

  const update = <K extends keyof Spec>(key: K, value: Spec[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const arrFromLines = (text: string) => text.split("\n").map((s) => s.trim()).filter(Boolean);
  const linesFromArr = (arr: string[]) => (arr || []).join("\n");

  const cls = "spec-card" + (state.status === "approved" ? " approved" : state.status === "flagged" ? " flagged" : "");

  if (editing) {
    return (
      <div className={cls + " spec-card-editing"} ref={ref} id={"card-" + spec.id}>
        <div className="spec-card-top">
          <div style={{ flex: 1 }}>
            <span className="spec-id">{spec.id} · Prioridad {draft.priority}</span>
            <input className="spec-input title-input" value={draft.title} onChange={(e) => update("title", e.target.value)} placeholder="Título" />
          </div>
        </div>

        <div className="spec-form-grid">
          <label>
            <span>Módulo</span>
            <select className="spec-input" value={draft.module} onChange={(e) => update("module", e.target.value)}>
              {Object.entries(MODULES).map(([key, m]) => (
                <option key={key} value={key}>{m.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Tipo</span>
            <input className="spec-input" value={draft.type} onChange={(e) => update("type", e.target.value)} placeholder="Funcional / Técnica" />
          </label>
          <label>
            <span>Fit</span>
            <input className="spec-input" value={draft.fit} onChange={(e) => update("fit", e.target.value)} placeholder="GAP / Fit-to-Standard" />
          </label>
          <label className="spec-check">
            <input type="checkbox" checked={draft.custom} onChange={(e) => update("custom", e.target.checked)} />
            <span>Desarrollo a medida</span>
          </label>
          <label>
            <span>Complejidad</span>
            <select className="spec-input" value={draft.complexity} onChange={(e) => update("complexity", Number(e.target.value))}>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Esfuerzo</span>
            <input className="spec-input" value={draft.effort} onChange={(e) => update("effort", e.target.value)} placeholder="0 JP" />
          </label>
          <label>
            <span>Prioridad</span>
            <select className="spec-input" value={draft.priority} onChange={(e) => update("priority", e.target.value)}>
              <option>Alta</option>
              <option>Media</option>
              <option>Baja</option>
            </select>
          </label>
          <label>
            <span>Fuente</span>
            <input className="spec-input" value={draft.source} onChange={(e) => update("source", e.target.value)} placeholder="Fuente del requisito" />
          </label>
        </div>

        <div className="spec-section">
          <h4>Descripción</h4>
          <textarea className="spec-desc-edit" rows={8} value={draft.description} onChange={(e) => update("description", e.target.value)} placeholder="Soporta markdown: ## encabezados, listas, tablas, etc." />
        </div>

        <div className="spec-section">
          <h4>Objetos SAP (uno por línea)</h4>
          <textarea className="spec-desc-edit" rows={3} value={linesFromArr(draft.objects)} onChange={(e) => update("objects", arrFromLines(e.target.value))} />
        </div>

        <div className="spec-section">
          <h4>Criterios de aceptación (uno por línea)</h4>
          <textarea className="spec-desc-edit" rows={4} value={linesFromArr(draft.acceptance)} onChange={(e) => update("acceptance", arrFromLines(e.target.value))} />
        </div>

        <div className="spec-form-grid two-col">
          <label>
            <span>Proceso</span>
            <input className="spec-input" value={draft.process || ""} onChange={(e) => update("process", e.target.value)} />
          </label>
          <label>
            <span>Subproceso</span>
            <input className="spec-input" value={draft.subProcess || ""} onChange={(e) => update("subProcess", e.target.value)} />
          </label>
        </div>

        <div className="spec-section">
          <h4>Pregunta abierta</h4>
          <input className="spec-input" value={draft.question || ""} onChange={(e) => update("question", e.target.value)} placeholder="Pregunta para aclarar" />
        </div>

        <div className="spec-actions">
          <button className="spec-act primary" onClick={saveEdit}>{I.check} Guardar</button>
          <button className="spec-act" onClick={cancelEdit}>Cancelar</button>
        </div>
      </div>
    );
  }

  return (
    <div className={cls} ref={ref} id={"card-" + spec.id}>
      <div className="spec-card-top">
        <div style={{ flex: 1 }}>
          <span className="spec-id">{spec.id} · Prioridad {spec.priority}</span>
          <h3 className="spec-card-title">{spec.title}</h3>
        </div>
        {state.status === "approved" && <div className="spec-status-ic approved">{I.check}</div>}
        {state.status === "flagged" && <div className="spec-status-ic flagged">{I.flag}</div>}
      </div>

      <div className="spec-meta">
        <ModuleTag mod={spec.module} />
        <span className={`tag level-${spec.level}`}>{spec.level === "task" ? "Tarea" : "Subtarea"}</span>
        <span className="tag type">{spec.type}</span>
        <span className={"tag " + (spec.custom ? "custom" : "fit")}>{spec.fit}</span>
      </div>

      <div className="spec-section">
        <h4>Descripción</h4>
        <div className="spec-desc markdown-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{spec.description || ""}</ReactMarkdown>
        </div>
      </div>

      <div className="spec-section">
        <h4>Objetos SAP</h4>
        <div className="obj-list">
          {(spec.objects || []).map((o) => <span className="obj" key={o}>{o}</span>)}
        </div>
      </div>

      <div className="spec-section">
        <h4>Criterios de aceptación</h4>
        <ul className="ac-list">
          {(spec.acceptance || []).map((a, i) => (
            <li key={i}><span className="tick">{I.check}</span>{a}</li>
          ))}
        </ul>
      </div>

      {spec.question && (
        <div className="spec-section">
          <div className="open-q">
            <span className="qic">{I.q}</span>
            <span><b>Pregunta abierta · </b>{spec.question}</span>
          </div>
        </div>
      )}

      <div className="spec-stats">
        <div className="stat"><div className="k">Complejidad</div><div className="v"><Dots n={spec.complexity} warn={spec.complexity >= 4} /></div></div>
        <div className="stat"><div className="k">Esfuerzo est.</div><div className="v">{spec.effort}</div></div>
        <div className="stat"><div className="k">Entrega</div><div className="v" style={{ fontSize: 13 }}>{spec.custom ? "Desarrollo a medida" : "Configuración"}</div></div>
      </div>

      <div className="spec-actions">
        <button className={"spec-act " + (state.status === "approved" ? "on-approved" : "primary")} onClick={() => onApprove(spec.id)}>
          {I.check} {state.status === "approved" ? "Aprobada" : "Aprobar"}
        </button>
        <button className="spec-act" onClick={startEdit}>
          {I.edit} Editar
        </button>
        <button className={"spec-act " + (state.status === "flagged" ? "on-flagged" : "")} onClick={() => onFlag(spec.id)}>
          {I.flag} {state.status === "flagged" ? "Marcada" : "Marcar"}
        </button>
      </div>
    </div>
  );
}

function SpecEmpty() {
  return (
    <div className="spec-empty">
      <div className="icon" style={{ color: "var(--ink-3)" }}>{I.list}</div>
      <h3>Aún no hay especificaciones</h3>
      <p>A medida que captures requisitos en la conversación, las especificaciones técnicas aparecerán aquí — listas para revisar, editar y aprobar.</p>
    </div>
  );
}

/* ========================= Tree View ========================= */

interface TreeNode {
  name: string;
  children: TreeNode[];
  spec?: Spec;
}

function buildTree(specs: Spec[]): TreeNode[] {
  const specMap = new Map(specs.map((s) => [s.id, s]));
  const rootSpecs = specs.filter((s) => !s.parentId);

  function buildNode(spec: Spec): TreeNode {
    const children = specs.filter((s) => s.parentId === spec.id);
    return {
      name: spec.title,
      spec,
      children: children.map(buildNode),
    };
  }

  return rootSpecs.map(buildNode);
}

function levelLabel(level: string) {
  if (level === "task") return "Tarea";
  if (level === "subtask") return "Subtarea";
  return level;
}

function TreeView({ specs, onSelect }: { specs: Spec[]; onSelect: (spec: Spec) => void }) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const tree = useMemo(() => buildTree(specs), [specs]);

  const toggle = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const renderNode = (node: TreeNode, path: string, depth: number) => {
    const currentPath = path ? `${path} > ${node.name}` : node.name;
    const isExpanded = expandedPaths.has(currentPath);
    const hasChildren = node.children.length > 0;
    const hasSpec = !!node.spec;
    const level = node.spec?.level || "task";

    return (
      <div key={currentPath} className="tree-node">
        <div
          className={`tree-header tree-level-${level} ${hasSpec ? "tree-leaf" : "tree-branch"}`}
          style={{ paddingLeft: depth * 20 + 12 }}
        >
          {hasChildren && (
            <span className="tree-chevron" onClick={() => toggle(currentPath)}>
              {isExpanded ? "▼" : "▶"}
            </span>
          )}
          {!hasChildren && !hasSpec && <span className="tree-chevron-placeholder" />}
          <span
            className="tree-label"
            onClick={() => (hasSpec ? onSelect(node.spec!) : hasChildren ? toggle(currentPath) : undefined)}
            style={{ cursor: hasSpec || hasChildren ? "pointer" : "default", flex: 1 }}
          >
            {hasSpec ? (
              <>
                <span className={`tree-badge tree-badge-${level}`}>{levelLabel(level)}</span>
                <span className="tree-spec-id">{node.spec!.id}</span>
                <span className="tree-spec-priority"> · Prioridad {node.spec!.priority}</span>
                <span className="tree-spec-title"> · {node.name}</span>
                <span className="tree-spec-effort"> · {node.spec!.effort}</span>
              </>
            ) : (
              <span className="tree-branch-label">{node.name}</span>
            )}
          </span>
        </div>
        {hasChildren && isExpanded && (
          <div className="tree-children">
            {node.children.map((child) => renderNode(child, currentPath, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return <div className="tree-view">{tree.map((node) => renderNode(node, "", 0))}</div>;
}

/* ========================= SpecPanel ========================= */

export interface SpecPanelProps {
  specs: Spec[];
  states: Record<string, SpecState>;
  actions: { approve: (id: string) => void; flag: (id: string) => void; edit: (id: string, spec: Spec) => void; };
  layout: string;
  drawerOpen: boolean;
  onCloseDrawer: () => void;
  highlightId: string | null;
}

export function SpecPanel({ specs, states, actions, layout, drawerOpen, onCloseDrawer, highlightId }: SpecPanelProps) {
  const [viewingSpecId, setViewingSpecId] = useState<string | null>(null);

  const viewingSpec = viewingSpecId ? specs.find((s) => s.id === viewingSpecId) : null;

  return (
    <div className={"spec-panel" + (layout === "focus" && drawerOpen ? " open" : "")}>
      <div className="spec-head">
        <div style={{ width: 30, height: 30, borderRadius: 9, background: "var(--accent-soft)", color: "var(--accent-ink)", display: "grid", placeItems: "center" }}>{I.list}</div>
        <div>
          <h2>Especificaciones</h2>
          <div className="sub">{specs.length} capturadas · {specs.filter((s) => states[s.id]?.status === "approved").length} aprobadas</div>
        </div>
        {layout === "focus"
          ? <button className="close-drawer" onClick={onCloseDrawer}>{I.x}</button>
          : <span className="spec-count-badge">{specs.length}</span>}
      </div>

      <div className="spec-scroll scroll">
        {specs.length === 0 ? (
          <SpecEmpty />
        ) : viewingSpec ? (
          <div className="spec-detail-view">
            <button className="spec-back" onClick={() => setViewingSpecId(null)}>
              ← Volver al árbol
            </button>
            <SpecCard
              spec={viewingSpec}
              state={states[viewingSpec.id] || {}}
              onApprove={actions.approve}
              onFlag={actions.flag}
              onEdit={actions.edit}
              highlight={highlightId === viewingSpec.id}
            />
          </div>
        ) : (
          <TreeView specs={specs} onSelect={(spec) => setViewingSpecId(spec.id)} />
        )}
      </div>
    </div>
  );
}
