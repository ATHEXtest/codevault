export interface ExecuteRequest {
  language: string; // normalized: "python", "java", ...
  code: string;
  stdin?: string;
  timeoutMs?: number; // default 10000
}

export interface ExecuteResult {
  stdout: string;
  stderr: string;
  compileOutput: string;
  status: "ok" | "error" | "timeout" | "provider_error";
  timeMs: number;
}

export interface ResolvedRuntime {
  language: string; // provider-specific identifier (Piston name / Judge0 id)
  version: string;
}

export interface ExecutionProvider {
  name: string;
  resolveRuntime(lang: string): Promise<ResolvedRuntime | null>;
  execute(req: ExecuteRequest): Promise<ExecuteResult>;
  healthCheck(): Promise<boolean>;
}
