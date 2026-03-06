import fs from "node:fs/promises";
import { FEEDBACK_LOG_PATH, RECOMMENDATION_LOG_PATH, STORY_LOG_PATH } from "../lib/paths.js";
import { extractStoryTitle, summarizeText } from "../lib/privacy.js";

interface UnknownRecord {
  [key: string]: unknown;
}

function safeParse(line: string): UnknownRecord | null {
  try {
    return JSON.parse(line) as UnknownRecord;
  } catch {
    return null;
  }
}

function hasSummary(value: unknown): value is { hash: string; chars: number; words: number } {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.hash === "string" &&
    typeof candidate.chars === "number" &&
    typeof candidate.words === "number"
  );
}

async function rewriteJsonl(filePath: string, transform: (record: UnknownRecord) => UnknownRecord | null): Promise<void> {
  let content = "";

  try {
    content = await fs.readFile(filePath, "utf8");
  } catch {
    return;
  }

  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return;
  }

  const nextLines = lines
    .map((line) => safeParse(line))
    .filter((record): record is UnknownRecord => Boolean(record))
    .map(transform)
    .filter((record): record is UnknownRecord => Boolean(record))
    .map((record) => JSON.stringify(record));

  await fs.writeFile(filePath, nextLines.length > 0 ? `${nextLines.join("\n")}\n` : "", "utf8");
}

function sanitizeRecommendationRecord(record: UnknownRecord): UnknownRecord {
  const input =
    hasSummary(record.input) ? record.input : summarizeText(String(record.message ?? record.input ?? ""));
  const output =
    hasSummary(record.output) ? record.output : summarizeText(String(record.reply ?? record.output ?? ""));

  return {
    createdAt: record.createdAt ?? new Date().toISOString(),
    mode: record.mode ?? "system",
    input,
    output,
    titles: Array.isArray(record.titles) ? record.titles : [],
  };
}

function sanitizeStoryRecord(record: UnknownRecord): UnknownRecord {
  const base = sanitizeRecommendationRecord(record);
  const reply = String(record.reply ?? "");

  return {
    ...base,
    storyTitle:
      typeof record.storyTitle === "string" && record.storyTitle.trim()
        ? record.storyTitle
        : extractStoryTitle(reply) ?? "Untitled",
  };
}

function sanitizeFeedbackRecord(record: UnknownRecord): UnknownRecord {
  const feedbackValue =
    hasSummary(record.feedback)
      ? record.feedback
      : summarizeText(String(record.message ?? record.feedback ?? ""));

  return {
    createdAt: record.createdAt ?? new Date().toISOString(),
    intent: record.intent ?? "feedback_refinement",
    feedback: feedbackValue,
    mode: record.mode ?? null,
  };
}

export async function migrateLegacyLogs(): Promise<void> {
  await rewriteJsonl(RECOMMENDATION_LOG_PATH, sanitizeRecommendationRecord);
  await rewriteJsonl(STORY_LOG_PATH, sanitizeStoryRecord);
  await rewriteJsonl(FEEDBACK_LOG_PATH, sanitizeFeedbackRecord);
}
