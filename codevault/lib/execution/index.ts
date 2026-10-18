import type { ExecutionProvider } from "./types";
import { pistonProvider } from "./piston";
import { judge0Provider } from "./judge0";

const providers: Record<string, ExecutionProvider> = {
  piston: pistonProvider,
  judge0: judge0Provider,
};

export function getProvider(): ExecutionProvider {
  const name = process.env.EXECUTION_PROVIDER || "piston";
  const p = providers[name];
  if (!p) throw new Error(`Unknown EXECUTION_PROVIDER: ${name}`);
  return p;
}

export type { ExecuteRequest, ExecuteResult } from "./types";
