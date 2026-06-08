"use client";

import React from "react";
import { I } from "./icons";
import { type Project, type Spec } from "@/lib/data";

export interface TopBarProps {
  project: Project;
  specs: Spec[];
  onExport: () => void;
}

export function TopBar({ project, specs, onExport }: TopBarProps) {
  return (
    <div className="topbar">
      <div className="brand">
        <img
          className="brand-appmark"
          src="/logo_long.jpg"
          alt="uDefine"
          onError={(e) => { 
            const target = e.target as HTMLImageElement; 
            target.style.display = "none"; 
            const sibling = target.nextElementSibling as HTMLElement | null;
            if (sibling) sibling.style.display = "grid"; 
          }}
        />
        <div className="brand-mark" style={{ display: "none" }}><span>u</span></div>
        <span className="brand-divider" />
        <span className="brand-sub">Req-to-Spec SAP</span>
      </div>
      <div className="proj-chip">
        <span className="dot" />
        <span><b>{project.customer}</b> <span className="muted">· {project.engagement}</span></span>
        <span className="loc">{project.location}</span>
      </div>

      <div className="topbar-spacer" />

      <button className="cta-btn" onClick={onExport} disabled={specs.length === 0}>
        {I.doc} Generar doc <span className="count">{specs.length}</span>
      </button>
    </div>
  );
}
