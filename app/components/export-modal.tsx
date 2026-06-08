"use client";

import React from "react";
import { I } from "./icons";
import { ModuleTag } from "./spec-panel";
import { type Spec, type Project } from "@/lib/data";

export interface ExportModalProps {
  specs: Spec[];
  states: Record<string, { status?: string }>;
  project: Project;
  onClose: () => void;
  onExported: (name: string) => void;
}

export function ExportModal({ specs, states, project, onClose, onExported }: ExportModalProps) {
  const approved = specs.filter((s) => states[s.id]?.status === "approved").length;
  const effort = specs
    .filter((s) => !s.parentId)
    .reduce((a, s) => a + parseInt(s.effort, 10), 0);
  const custom = specs.filter((s) => s.custom).length;
  const opts = [
    { name: "Excel", desc: "Spec tracker (.xlsx)", color: "#1f7a44" },
    { name: "Word", desc: "Blueprint doc (.docx)", color: "#2b5797" },
    { name: "Jira", desc: "Historias de backlog", color: "#2a72d6" },
    { name: "Solution Mgr", desc: "SAP SolMan / Signavio", color: "#0a8f8f" },
  ];
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal scroll" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="doc-ic">{I.doc}</div>
          <div>
            <h2>Documento de Especificaciones</h2>
            <p>{project.customer} · {project.engagement} · {project.phase}</p>
          </div>
          <button className="modal-close" onClick={onClose}>{I.x}</button>
        </div>
        <div className="modal-body scroll">
          <div className="doc-summary">
            <div className="sumcard"><div className="big">{specs.length}</div><div className="lbl">Especificaciones</div></div>
            <div className="sumcard"><div className="big">{approved}</div><div className="lbl">Aprobadas</div></div>
            <div className="sumcard"><div className="big">{custom}</div><div className="lbl">Desarrollos a medida</div></div>
            <div className="sumcard"><div className="big">{effort}<span style={{ fontSize: 14, color: "var(--ink-3)" }}> JP</span></div><div className="lbl">Esfuerzo est.</div></div>
          </div>

          <div className="export-label">Contenido del documento</div>
          <div className="doc-toc">
            {specs.map((s) => (
              <div className="doc-toc-row" key={s.id}>
                <span className="tid">{s.id}</span>
                <span className="ttl">{s.title}</span>
                <span className="tmod"><ModuleTag mod={s.module} /></span>
              </div>
            ))}
          </div>

          <div className="export-label">Exportar a</div>
          <div className="export-grid">
            {opts.map((o) => (
              <button className="export-opt" key={o.name} onClick={() => onExported(o.name)}>
                <div className="xic" style={{ color: o.color }}>{I.download}</div>
                <div className="xname">{o.name}</div>
                <div className="xdesc">{o.desc}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="modal-foot">
          <span className="note">{I.q} 3 preguntas abiertas están marcadas en el documento para que el cliente las confirme.</span>
          <div style={{ flex: 1 }} />
          <button className="cta-btn" onClick={() => onExported("Excel")}>{I.download} Exportar todo</button>
        </div>
      </div>
    </div>
  );
}
