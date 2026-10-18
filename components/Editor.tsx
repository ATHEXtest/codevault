"use client";

import { useEffect, useRef } from "react";
import type { EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";

async function langExtension(language: string): Promise<Extension | null> {
  switch (language) {
    case "python": return (await import("@codemirror/lang-python")).python();
    case "javascript": return (await import("@codemirror/lang-javascript")).javascript();
    case "typescript": return (await import("@codemirror/lang-javascript")).javascript({ typescript: true });
    case "java": return (await import("@codemirror/lang-java")).java();
    case "c":
    case "cpp": return (await import("@codemirror/lang-cpp")).cpp();
    case "rust": return (await import("@codemirror/lang-rust")).rust();
    case "php": return (await import("@codemirror/lang-php")).php();
    case "go": return (await import("@codemirror/lang-go")).go();
    default: return null; // C#, Ruby, Kotlin: plain text highlighting
  }
}

export default function Editor({ language, value, onChange, readOnly = false }: {
  language: string;
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;

  // (Re)create the editor when the language changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ EditorView: EV, basicSetup }, { oneDark }, ext] = await Promise.all([
        import("codemirror"),
        import("@codemirror/theme-one-dark"),
        langExtension(language),
      ]);
      if (cancelled || !containerRef.current) return;

      const view = new EV({
        doc: valueRef.current,
        extensions: [
          basicSetup,
          oneDark,
          ...(ext ? [ext] : []),
          EV.editable.of(!readOnly),
          EV.updateListener.of((u) => {
            if (u.docChanged) onChangeRef.current?.(u.state.doc.toString());
          }),
        ],
        parent: containerRef.current,
      });
      viewRef.current = view;
    })();
    return () => {
      cancelled = true;
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, [language, readOnly]);

  // Sync external value changes (gist load, language sample swap).
  useEffect(() => {
    const view = viewRef.current;
    if (view && view.state.doc.toString() !== value) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
    }
  }, [value]);

  return <div ref={containerRef} className="min-h-[300px] overflow-auto rounded-md border border-zinc-800 text-sm" />;
}
