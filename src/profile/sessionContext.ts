import type { SessionContext } from "../types.js";

let runtimeSessionContext: SessionContext = {};

export function loadSessionContext(): SessionContext {
  return { ...runtimeSessionContext };
}

export function saveSessionContext(nextContext: SessionContext): void {
  runtimeSessionContext = { ...nextContext };
}

export function resetSessionContext(): void {
  runtimeSessionContext = {};
}
