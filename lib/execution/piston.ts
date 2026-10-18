import type { ExecutionProvider, ExecuteRequest, ExecuteResult, ResolvedRuntime } from "./types";
import { getLanguage } from "../languages";

const base = () => process.env.PISTON_BASE_URL || "https://emkc.org/api/v2/piston";

interface PistonRuntime {
  language: string;
  version: string;
  aliases?: string[];
}

let runtimesCache: PistonRuntime[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function fetchRuntimes(): Promise<PistonRuntime[]> {
  if (runtimesCache && Date.now() - cacheTime < CACHE_TTL) return runtimesCache;
  const res = await fetch(`${base()}/runtimes`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Piston runtimes fetch failed: ${res.status}`);
  runtimesCache = (await res.json()) as PistonRuntime[];
  cacheTime = Date.now();
  return runtimesCache;
}

const byVersionDesc = (a: PistonRuntime, b: PistonRuntime) =>
  b.version.localeCompare(a.version, undefined, { numeric: true });

export const pistonProvider: ExecutionProvider = {
  name: "piston",

  async resolveRuntime(lang: string): Promise<ResolvedRuntime | null> {
    const runtimes = await fetchRuntimes();
    const norm = lang.toLowerCase();
    const matches = runtimes.filter((r) => r.language === norm || r.aliases?.includes(norm));
    if (matches.length === 0) {
      console.warn(`[piston] no runtime resolved for "${lang}"`);
      return null;
    }
    const best = [...matches].sort(byVersionDesc)[0];
    return { language: best.language, version: best.version };
  },

  async execute(req: ExecuteRequest): Promise<ExecuteResult> {
    const started = Date.now();
    try {
      const runtime = await this.resolveRuntime(req.language);
      if (!runtime) {
        return { stdout: "", stderr: `Language "${req.language}" is not available on this provider.`, compileOutput: "", status: "error", timeMs: 0 };
      }
      const filename = getLanguage(req.language)?.filename ?? "main.txt";
      const res = await fetch(`${base()}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: runtime.language,
          version: runtime.version,
          files: [{ name: filename, content: req.code }],
          stdin: req.stdin ?? "",
          compile_timeout: 10000,
          run_timeout: Math.min(req.timeoutMs ?? 10000, 10000),
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        return { stdout: "", stderr: "", compileOutput: "", status: "provider_error", timeMs: Date.now() - started };
      }

      const data = await res.json();
      const compileOutput = `${data.compile?.stdout ?? ""}${data.compile?.stderr ?? ""}`;
      const compileFailed = data.compile && data.compile.code !== 0;
      const killed = data.run?.signal === "SIGKILL";
      return {
        stdout: data.run?.stdout ?? "",
        stderr: data.run?.stderr ?? "",
        compileOutput,
        status: killed ? "timeout" : !compileFailed && data.run?.code === 0 ? "ok" : "error",
        timeMs: Date.now() - started,
      };
    } catch (e) {
      if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
        return { stdout: "", stderr: "Execution timed out.", compileOutput: "", status: "timeout", timeMs: Date.now() - started };
      }
      return { stdout: "", stderr: "", compileOutput: "", status: "provider_error", timeMs: Date.now() - started };
    }
  },

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${base()}/runtimes`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
      return res.ok;
    } catch {
      return false;
    }
  },
};
