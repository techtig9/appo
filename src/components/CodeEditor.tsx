"use client";

import { useState } from "react";
import Editor from "@monaco-editor/react";

interface CodeEditorProps {
  files: { path: string; content: string }[];
  onSave: (files: { path: string; content: string }[]) => void;
}

/**
 * Monaco ships with built-in ESLint/JSON/TS diagnostics — the "In-Editor
 * Linting & Auto-Formatting" zero-cost feature is simply enabling those
 * built-in language services (formatOnSave below), not a separate paid
 * integration.
 */
export function CodeEditor({ files, onSave }: CodeEditorProps) {
  const [activePath, setActivePath] = useState(files[0]?.path ?? "");
  const [localFiles, setLocalFiles] = useState(files);

  const activeFile = localFiles.find((f) => f.path === activePath);

  function updateContent(content: string | undefined) {
    if (content === undefined) return;
    const next = localFiles.map((f) => (f.path === activePath ? { ...f, content } : f));
    setLocalFiles(next);
    onSave(next); // autosave on every change, per Phase 1.5's Definition of Done
  }

  return (
    <div className="glass-card flex h-[600px] overflow-hidden">
      <aside className="w-56 shrink-0 overflow-y-auto border-r border-white/10 p-3">
        {localFiles.map((f) => (
          <button
            key={f.path}
            onClick={() => setActivePath(f.path)}
            className={`block w-full truncate rounded-lg px-2 py-1 text-left text-sm ${
              f.path === activePath ? "bg-violet/10 font-medium text-violet" : "text-slate-400"
            }`}
          >
            {f.path}
          </button>
        ))}
      </aside>
      <div className="flex-1">
        <Editor
          height="100%"
          language={languageFromPath(activePath)}
          value={activeFile?.content ?? ""}
          onChange={updateContent}
          options={{
            fontSize: 13,
            minimap: { enabled: false },
            formatOnPaste: true,
            formatOnType: true,
          }}
        />
      </div>
    </div>
  );
}

function languageFromPath(path: string): string {
  if (path.endsWith(".tsx") || path.endsWith(".ts")) return "typescript";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".js") || path.endsWith(".jsx")) return "javascript";
  return "plaintext";
}
