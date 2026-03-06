import { createHash } from "node:crypto";

export function hashText(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export function redactText(value: string): string {
  return `sha256:${hashText(value)}`;
}

export function summarizeText(value: string): { hash: string; chars: number; words: number } {
  const normalized = value.trim();
  return {
    hash: hashText(normalized),
    chars: normalized.length,
    words: normalized ? normalized.split(/\s+/).length : 0,
  };
}

export function extractStoryTitle(value: string): string | undefined {
  const match = value.match(/^Title:\s*(.+)$/im);
  return match?.[1]?.trim();
}
