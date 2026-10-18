import type { ExecutionProvider, ExecuteRequest, ExecuteResult, ResolvedRuntime } from "./types";

const base = () => process.env.JUDGE0_BASE_URL || "https://judge0-ce.p.rapidapi.com";

function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const key = process.env.JUDGE0_API_KEY;
  if (key) {
    h["X-RapidAPI-Key"] = key;
    h["X-RapidAPI-Host"] = new URL(base()).host;
  }
  return h;
}

interface Judge0Language {
  id: number;
  name: string;
}

// Name prefixes as they appear in Judge0's /languages list, e.g. "Python (3.8.1)".
const NAME_PREFIX: Record<string, string> = {
  python: "python (",
  javascript: "javascript (",
  typescript: "typescript (",
  java: "java (",
  c: "c (",
  cpp: "c++ (",
  csharp: "c# (",
  go: "go (",
  rust: "rust (",
  php: "php (",
  ruby: "ruby (",
  kotlin: "kotlin (",
};

let langsCache: Judge0Language[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function fetchLanguages(): Promise<Judge0Language[]> {
  if (langsCache && Date.now() - cacheTime < CACHE_TTL) return langsCache;
  const res = await fetch(`${base()}/languages`, { headers: headers(), cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Judge0 languages fetch failed: ${res.status}`);
  langsCache = (await res.json()) as Judge0Language[];
  cacheTime = Date.now();
  return langsCache;
}

export const judge0Provider: ExecutionProvider = {
  name: "judge0",

  async resolveRuntime(lang: string): Promise<ResolvedRuntime | null> {
    const langs = await fetchLanguages();
    const prefix = NAME_PREFIX[lang.toLowerCase()] ?? `${lang.toLowerCase()} (`;
    const matches = langs.filter((l) => l.name.toLowerCase().startsWith(prefix));
    if (!matches.length) {
      console.warn(`[judge0] no language resolved for "${lang}"`);
      return null;
    }
    const best = [...matches].sort((a, b) => b.id - a.id)[0]; // highest id ~ newest
    return { language: String(best.id), version: best.name };
  },

  // Submit + poll internally; the exported interface stays a single await.
  async execute(req: ExecuteRequest): Promise<ExecuteResult> {
    const started = Date.now();
    try {
      const runtime = await this.resolveRuntime(req.language);
      if (!runtime) {
        return { stdout: "", stderr: `Language "${req.language}" is not available on this provider.`, compileOutput: "", status: "error", timeMs: 0 };
      }
      const submit = await fetch(`${base()}/submissions?base64_encoded=false&wait=false`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          source_code: req.code,
          language_id: parseInt(runtime.language, 10),
          stdin: req.stdin ?? "",
          cpu_time_limit: Math.ceil((req.timeoutMs ?? 10000) / 1000),
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!submit.ok) throw new Error(`Judge0 submit failed: ${submit.status}`);
      const { token } = await submit.json();

      const deadline = Date.now() + 15000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 500));
        const poll = await fetch(`${base()}/submissions/${token}?base64_encoded=false`, { headers: headers(), cache: "no-store" });
        if (!poll.ok) continue;
        const data = await poll.json();
        if (data.status?.id <= 2) continue; // 1 = queued, 2 = processing

        const id: number = data.status?.id;
        const status: ExecuteResult["status"] = id === 3 ? "ok" : id === 5 ? "timeout" : "error";
        return {
          stdout: data.stdout ?? "",
          stderr: data.stderr ?? "",
          compileOutput: data.compile_output ?? "",
          status,
          timeMs: data.time ? Math.round(parseFloat(data.time) * 1000) : Date.now() - started,
        };
      }
      return { stdout: "", stderr: "Execution timed out.", compileOutput: "", status: "timeout", timeMs: Date.now() - started };
    } catch {
      return { stdout: "", stderr: "", compileOutput: "", status: "provider_error", timeMs: Date.now() - started };
    }
  },

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${base()}/languages`, { headers: headers(), cache: "no-store", signal: AbortSignal.timeout(5000) });
      return res.ok;
    } catch {
      return false;
    }
  },
};
