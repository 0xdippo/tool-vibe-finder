export function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9,\s-]/g, " ").replace(/\s+/g, " ").trim();
}

export function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

export function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) {
      continue;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(normalized);
  }

  return result;
}

export function parseListInput(value: string | string[] | undefined): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return uniqueStrings(value);
  }

  return uniqueStrings(
    value
      .split(/,|\n| and /gi)
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

export function looksLikePositiveFeedback(value: string): boolean {
  return /love|liked|great|perfect|amazing|nailed it|exactly|so good/i.test(value);
}

export function looksLikeNegativeFeedback(value: string): boolean {
  return /too|less|don'?t|didn'?t|hate|dislike|not enough|cheesy|boring|bad|awful|never/i.test(value);
}

export function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
