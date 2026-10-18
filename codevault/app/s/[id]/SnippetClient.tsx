"use client";

import { useEffect, useState } from "react";
import Editor from "@/components/Editor";
import StdinPanel from "@/components/StdinPanel";
import OutputPanel, { OutputData } from "@/components/OutputPanel";
import TokenConnect from "@/components/TokenConnect";

interface SnippetData {
  metadataOnly?: boolean;
  error?: string;
  code?: string;
  gistUrl?: string;
  message?: string;
  version?: string | null;
  pinned?: boolean;
  canEdit?: boolean;
}

export default function SnippetClient({ gistId, language, filename, description, revision, rev }: {
  gistId: string;
  language: string;
  filename: string;
  description: string | null;
  revision: number;
  rev?: string;
}) {
  const [data, setData] = useState<SnippetData | null>(null);
  const [code, setCode] = useState("");
  const [stdin, setStdin] = useState("");
  const [stdinOpen, setStdinOpen] = useState(false);
  const [output, setOutput] = useState<OutputData | null>(null);
  const [loading, setLoading] = useState(false);
  const [execError, setExecError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [currentRevision, setCurrentRevision] = useState(revision);

  useEffect(() => {
    fetch(`/api/gists/${gistId}${rev ? `?rev=${rev}` : ""}`)
      .then((r) => r.json())
      .then((d: SnippetData) => {
        if (d.error) { setNotice(d.error); return; }
        setData(d);
        setCode(d.code ?? "");
        if (d.metadataOnly) setNotice(d.message ?? null);
        else if (d.pinned) setNotice("Viewing a pinned revision. Open the unpinned link for the latest version.");
      })
      .catch(() => setNotice("Failed to load snippet."));
  }, [gistId, rev, reloadKey]);

  async function run() {
    setLoading(true); setExecError(null); setOutput(null);
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code, stdin }),
      });
      const d = await res.json();
      if (!res.ok) setExecError(d.error ?? "Execution failed.");
      else setOutput(d);
    } catch {
      setExecError("Network error. Is the execution engine reachable?");
    } finally {
      setLoading(false);
    }
  }

  async function fork() {
    setSaving(true);
    try {
      const res = await fetch("/api/gists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code, description: `Fork of ${gistId}` }),
      });
      const d = await res.json();
      if (res.ok) window.location.href = `/s/${d.gistId}`;
      else setNotice(d.error ?? "Fork failed. Connect a GitHub token first.");
    } finally {
      setSaving(false);
    }
  }

  async function saveRevision() {
    setSaving(true);
    try {
      const res = await fetch(`/api/gists/${gistId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const d = await res.json();
      if (res.ok) {
        setCurrentRevision(d.revision);
        setNotice("Saved as a new revision ✓");
        setReloadKey((k) => k + 1);
      } else {
        setNotice(d.error ?? "Failed to update.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function copy(link: string, msg: string) {
    try {
      await navigator.clipboard.writeText(link);
      setNotice(msg);
    } catch {
      setNotice(link);
    }
  }

  const base = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-6">
      <header className="mb-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-bold text-emerald-400">
            {description || filename} <span className="font-normal text-zinc-500">· rev {currentRevision}</span>
          </h1>
          <TokenConnect onStatus={() => setReloadKey((k) => k + 1)} />
        </div>
        {notice && <div className="rounded border border-amber-800 bg-amber-950 p-2 text-sm text-amber-200">{notice}</div>}
      </header>

      <div className="mb-3 flex flex-wrap gap-3 text-sm">
        <button
          onClick={run}
          disabled={loading || data?.metadataOnly || !data}
          className="rounded bg-emerald-700 px-4 py-1.5 font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
        >
          {loading ? "Running…" : "Run"}
        </button>
        <button onClick={() => setStdinOpen(!stdinOpen)} className="rounded border border-zinc-700 px-3 py-1.5 hover:bg-zinc-800">
          {stdinOpen ? "Hide" : "Show"} stdin
        </button>
        <button
          onClick={() => copy(`${base}/s/${gistId}`, "Share link copied ✓")}
          className="rounded border border-zinc-700 px-3 py-1.5 hover:bg-zinc-800"
        >
          Copy share link
        </button>
        {data?.version && (
          <button
            onClick={() => copy(`${base}/s/${gistId}?rev=${data.version}`, "Pinned-revision link copied ✓")}
            className="rounded border border-zinc-700 px-3 py-1.5 hover:bg-zinc-800"
          >
            Copy pinned link
          </button>
        )}
        {data?.canEdit && (
          <button
            onClick={saveRevision}
            disabled={saving}
            className="rounded bg-zinc-700 px-4 py-1.5 font-semibold hover:bg-zinc-600 disabled:opacity-50"
          >
            Save revision
          </button>
        )}
        <button
          onClick={fork}
          disabled={saving || data?.metadataOnly || !data}
          className="rounded border border-zinc-700 px-3 py-1.5 hover:bg-zinc-800 disabled:opacity-50"
        >
          Fork →
        </button>
        {data?.gistUrl && (
          <a href={data.gistUrl} target="_blank" rel="noopener noreferrer" className="rounded border border-zinc-700 px-3 py-1.5 hover:bg-zinc-800">
            View on GitHub ↗
          </a>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="min-w-0">
          <StdinPanel stdin={stdin} onChange={setStdin} open={stdinOpen} />
          <Editor language={language} value={code} onChange={setCode} readOnly={!!data?.metadataOnly} />
        </div>
        <OutputPanel output={output} loading={loading} error={execError} />
      </div>
    </main>
  );
}
