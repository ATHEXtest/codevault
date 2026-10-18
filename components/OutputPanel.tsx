export interface OutputData {
  stdout: string;
  stderr: string;
  compileOutput: string;
  status: string;
  timeMs: number;
}

function Section({ title, text, tone }: { title: string; text: string; tone: string }) {
  if (!text) return null;
  return (
    <div className="mb-3">
      <div className={`mb-1 text-xs font-semibold uppercase tracking-wide ${tone}`}>{title}</div>
      <pre className="whitespace-pre-wrap break-words rounded bg-zinc-950 p-3 text-sm text-zinc-200">{text}</pre>
    </div>
  );
}

export default function OutputPanel({ output, loading, error }: {
  output: OutputData | null;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="min-h-[300px] overflow-auto rounded-md border border-zinc-800 bg-zinc-900 p-4">
      {loading && <div className="animate-pulse text-zinc-400">Running…</div>}
      {error && <div className="rounded border border-red-800 bg-red-950 p-3 text-sm text-red-300">{error}</div>}
      {output && !loading && (
        <>
          <div className="mb-3 text-xs text-zinc-500">
            Status:{" "}
            <span className={output.status === "ok" ? "text-green-400" : "text-red-400"}>{output.status}</span> · {output.timeMs}ms
          </div>
          <Section title="stdout" text={output.stdout} tone="text-green-400" />
          <Section title="stderr" text={output.stderr} tone="text-red-400" />
          <Section title="compile output" text={output.compileOutput} tone="text-yellow-400" />
          {!output.stdout && !output.stderr && !output.compileOutput && (
            <div className="text-sm text-zinc-500">(no output)</div>
          )}
        </>
      )}
      {!output && !loading && !error && <div className="text-sm text-zinc-500">Press Run to execute your code.</div>}
    </div>
  );
}
