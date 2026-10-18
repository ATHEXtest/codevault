export default function StdinPanel({ stdin, onChange, open }: {
  stdin: string;
  onChange: (v: string) => void;
  open: boolean;
}) {
  if (!open) return null;
  return (
    <div className="mb-3">
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-400">stdin</label>
      <textarea
        value={stdin}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder="Input for interactive programs (e.g. Java Scanner)…"
        className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-3 font-mono text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
      />
    </div>
  );
}
