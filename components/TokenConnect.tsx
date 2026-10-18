"use client";

import { useEffect, useState } from "react";

export default function TokenConnect({ onStatus }: { onStatus?: (hasToken: boolean) => void }) {
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  function update(v: boolean) {
    setHasToken(v);
    onStatus?.(v);
  }

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => update(!!d.hasToken))
      .catch(() => update(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connect() {
    setStatus("Validating…");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: tokenInput.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setTokenInput("");
      setStatus(null);
      update(true);
    } else {
      setStatus(data.error ?? "Failed");
    }
  }

  async function disconnect() {
    await fetch("/api/auth", { method: "DELETE" });
    update(false);
  }

  if (hasToken === null) return null;

  if (hasToken) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <span className="text-emerald-400">GitHub connected ✓</span>
        <button onClick={disconnect} className="underline hover:text-zinc-200">Disconnect</button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded border border-amber-800 bg-amber-950 p-2 text-sm">
      <input
        type="password"
        value={tokenInput}
        onChange={(e) => setTokenInput(e.target.value)}
        placeholder="GitHub token (gist permission)"
        className="w-56 rounded bg-zinc-950 px-2 py-1 text-sm"
      />
      <button onClick={connect} className="rounded bg-emerald-700 px-3 py-1 text-white hover:bg-emerald-600">Connect</button>
      {status && <span className="text-zinc-300">{status}</span>}
    </div>
  );
}
