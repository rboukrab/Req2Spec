"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { I } from "./icons";
import { ModuleTag } from "./spec-panel";
import { type Spec, type Suggestion } from "@/lib/data";

export interface MessageData {
  role: "user" | "bot";
  text: string;
  specs?: Spec[];
  fileName?: string;
}

function SpecInline({ spec, onView }: { spec: Spec; onView: (id: string) => void }) {
  return (
    <div className="spec-inline">
      <div className="spec-inline-top">
        <span className="spec-id">{spec.id}</span>
        <ModuleTag mod={spec.module} />
      </div>
      <div className="spec-inline-body">
        <div className="spec-inline-title">{spec.title}</div>
        <div className="spec-inline-desc">{spec.description.slice(0, 130)}…</div>
      </div>
      <div className="spec-inline-foot">
        <span className={"tag " + (spec.custom ? "custom" : "fit")}>{spec.fit}</span>
        <span className="tag type">{spec.effort}</span>
        <button className="spec-inline-view" onClick={() => onView(spec.id)}>
          Ver en la lista {I.arrow}
        </button>
      </div>
    </div>
  );
}

function Message({ msg, onView }: { msg: MessageData; onView: (id: string) => void }) {
  const isUser = msg.role === "user";
  return (
    <div className={"msg " + (isUser ? "user" : "bot")}>
      <div className={"avatar " + (isUser ? "me" : "bot")}>
        {isUser ? "Tú" : <img src="/logo_short.jpg" alt="uDefine" style={{ width: 34, height: 34, borderRadius: 10, objectFit: 'cover' }} />}
      </div>
      <div className="bubble-wrap">
        {isUser ? (
          <div className="bubble">
            {msg.fileName && (
              <div className="msg-attachment">
                {I.paperclip} <span>{msg.fileName}</span>
              </div>
            )}
            <span dangerouslySetInnerHTML={{ __html: msg.text }} />
          </div>
        ) : (
          <div className="md-content">
            {msg.fileName && (
              <div className="msg-attachment">
                {I.paperclip} <span>{msg.fileName}</span>
              </div>
            )}
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
            {msg.specs && msg.specs.map((s) => <SpecInline key={s.id} spec={s} onView={onView} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressMessage({ text }: { text: string }) {
  return (
    <div className="msg bot">
      <div className="avatar bot">
        <img src="/logo_short.jpg" alt="uDefine" style={{ width: 34, height: 34, borderRadius: 10, objectFit: 'cover' }} />
      </div>
      <div className="bubble-wrap">
        <div className="bubble progress-bubble">
          <span className="progress-spinner" />
          <span className="progress-text">{text}</span>
        </div>
      </div>
    </div>
  );
}

export interface ChatPanelProps {
  messages: MessageData[];
  progress: string | null;
  suggestion: Suggestion | null;
  onSend: (text: string, file?: File) => void;
  onChip: {
    pick: (text: string) => void;
    export: () => void;
    view: (id: string) => void;
  };
  layout: string;
  specCount: number;
  onOpenDrawer: () => void;
}

export function ChatPanel({ messages, progress, suggestion, onSend, onChip, layout, specCount, onOpenDrawer }: ChatPanelProps) {
  const [val, setVal] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const busy = !!progress;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, progress, suggestion]);

  const submit = () => {
    const t = val.trim();
    if ((!t && !file) || busy) return;
    onSend(t, file || undefined);
    setVal("");
    setFile(null);
    if (taRef.current) taRef.current.style.height = "auto";
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  const grow = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setVal(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const canSend = (val.trim() || file) && !busy;

  return (
    <div className="chat-panel">
      {layout === "focus" && specCount > 0 && (
        <button className="ghost-btn" style={{ position: "absolute", top: 14, right: 18, zIndex: 5 }} onClick={onOpenDrawer}>
          {I.panel} {specCount} {specCount > 1 ? "especificaciones" : "especificación"}
        </button>
      )}
      <div className="chat-scroll scroll" ref={scrollRef}>
        <div className="chat-inner">
          {messages.map((m, i) => <Message key={i} msg={m} onView={onChip.view} />)}
          {progress && <ProgressMessage text={progress} />}
        </div>
      </div>

      {suggestion && !busy && (
        <div className="suggest-rail">
          <div className="suggest-inner">
            <div className="suggest-label">{I.spark} {suggestion.label}</div>
            <div className="chips" style={{ paddingBottom: 4 }}>
              {suggestion.items.map((it, i) => (
                <button key={i} className={"chip" + (it.accent ? " accent" : "")}
                        onClick={() => it.action === "export" ? onChip.export() : onChip.pick(it.text)}>
                  {it.accent && <span className="ic">{I.doc}</span>}{it.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="composer">
        <div className="composer-inner">
          {file && (
            <div className="attachment-chip">
              {I.paperclip}
              <span className="attachment-name">{file.name}</span>
              <button className="attachment-remove" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                {I.x}
              </button>
            </div>
          )}
          <div className="composer-box">
            <input
              type="file"
              ref={fileInputRef}
              accept=".doc,.docx"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <button
              className="attach-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Adjuntar documento"
            >
              {I.paperclip}
            </button>
            <textarea
              ref={taRef}
              rows={1}
              placeholder={file ? "Añade un mensaje opcional…" : "Escribe el requisito del cliente en lenguaje natural…"}
              value={val}
              onChange={grow}
              onKeyDown={onKey}
              disabled={busy}
            />
            <button className="send-btn" disabled={!canSend} onClick={submit}>{I.send}</button>
          </div>
          <div className="composer-hint">
            <kbd>Intro</kbd> para enviar · <kbd>Mayús</kbd>+<kbd>Intro</kbd> para una nueva línea · {file ? ".doc/.docx adjunto" : "uDefine redacta la especificación SAP"}
          </div>
        </div>
      </div>
    </div>
  );
}
