"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Editor from "@/components/Editor";
import StdinPanel from "@/components/StdinPanel";
import OutputPanel, { OutputData } from "@/components/OutputPanel";
import TokenConnect from "@/components/TokenConnect";
import { LANGUAGES, getLanguage } from "@/lib/languages";

export default function NewPage() {
  const router = useRouter();
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(getLanguage("python")!.sample);
  const [stdin, setStdin] = useState("");
  const [stdinOpen, setStdinOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [expiresInDays, setExpiresInDays] = useState<number | "">("");
  const [output, setOutput] = useState<OutputData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [saving, setSaving] = useState(false);

  function changeLanguage(next: string) {
    // Swap in the new language's sample only if the user hasn't written their own code.
    const untouched = !code.trim() || code === getLanguage(language)?.sample;
    setLanguage(next);
    if (untouched) setCode(getLanguage(next)?.sample ?? "");
  }

  async function run() {
    setLoading(true); setError(null); setOutput(null);
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code, stdin }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Execution failed.");
      else setOutput(data);
    } catch {
      setError("Network error. Is the execution engine reachable?");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/gists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code, description: description || undefined, expiresInDays: expiresInDays || undefined }),
      });
      const data = await res.json();
      if (res.ok) router.push(`/s/${data.gistId}`);
      else setError(data.error ?? "Save failed.");
    } catch {
      setError("Network error while saving.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-6">
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-emerald-400">CodeVault</h1>
        <TokenConnect onStatus={setHasToken} />
      </header>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <select
          value={language}
          onChange={(e) => changeLanguage(e.target.value)}
          className="rounded border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm"
        >
          {LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
        <button onClick={() => setStdinOpen(!stdinOpen)} className="rounded border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800">
          {stdinOpen ? "Hide" : "Show"} stdin
        </button>
        <button
          onClick={run}
          disabled={loading}
          className="rounded bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
        >
          {loading ? "Running…" : "Run"}
        </button>
        <button
          onClick={save}
          disabled={saving || !hasToken}
          className="rounded bg-zinc-700 px-4 py-1.5 text-sm font-semibold hover:bg-zinc-600 disabled:opacity-50"
          title={!hasToken ? "Connect a GitHub token to save" : ""}
        >
          {saving ? "Saving…" : "Save & Share"}
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-3 text-sm">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="min-w-[200px] flex-1 rounded border border-zinc-800 bg-zinc-950 px-3 py-1.5"
        />
        <select
          value={expiresInDays}
          onChange={(e) => setExpiresInDays(e.target.value === "" ? "" : Number(e.target.value))}
          className="rounded border border-zinc-800 bg-zinc-950 px-3 py-1.5"
        >
          <option value="">Never expires</option>
          <option value={1}>Expires in 1 day</option>
          <option value={7}>Expires in 7 days</option>
          <option value={30}>Expires in 30 days</option>
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="min-w-0">
          <StdinPanel stdin={stdin} onChange={setStdin} open={stdinOpen} />
          <Editor language={language} value={code} onChange={setCode} />
        </div>
        <OutputPanel output={output} loading={loading} error={error} />
      </div>
    </main>
  );
}
