import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { HttpError, joinUrl, requestJson } from "./http.js";
import type { LlmConfig, LlmMessage, LlmTextOptions } from "../types.js";

let cachedConfig: LlmConfig | null | undefined;

interface OpenAiResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

interface OllamaResponse {
  message?: {
    content?: string;
  };
}

function pickString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseConfigObject(raw: unknown): LlmConfig | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const value = raw as Record<string, unknown>;
  const provider = pickString(value.provider);
  const baseUrl = pickString(value.baseUrl) ?? pickString(value.base_url) ?? pickString(value.host);
  const model = pickString(value.model) ?? pickString(value.name);
  const apiKey = pickString(value.apiKey) ?? pickString(value.api_key) ?? pickString(value.token);

  if (!baseUrl || !model) {
    return null;
  }

  if (provider === "ollama" || /11434/.test(baseUrl)) {
    return {
      provider: "ollama",
      baseUrl,
      model,
      source: "openclaw-config",
    };
  }

  return {
    provider: "openai",
    baseUrl,
    model,
    apiKey,
    source: "openclaw-config",
  };
}

async function readOpenClawConfig(): Promise<LlmConfig | null> {
  try {
    const configPath = path.join(os.homedir(), ".openclaw", "config.json");
    const content = await fs.readFile(configPath, "utf8");
    const config = JSON.parse(content) as Record<string, unknown>;

    return (
      parseConfigObject(config.llm) ??
      parseConfigObject(config.model) ??
      parseConfigObject(config.models) ??
      parseConfigObject(config.providers) ??
      parseConfigObject(config.openai) ??
      parseConfigObject(config.ollama) ??
      parseConfigObject(
        ((config.agents as Record<string, unknown> | undefined)?.defaults as Record<string, unknown> | undefined)?.model,
      )
    );
  } catch {
    return null;
  }
}

export async function resolveLlmConfig(): Promise<LlmConfig | null> {
  if (cachedConfig !== undefined) {
    return cachedConfig;
  }

  if (process.env.VIBE_FINDER_LLM_MODEL && process.env.VIBE_FINDER_LLM_BASE_URL) {
    cachedConfig = {
      provider: "openai",
      model: process.env.VIBE_FINDER_LLM_MODEL,
      baseUrl: process.env.VIBE_FINDER_LLM_BASE_URL,
      apiKey: process.env.VIBE_FINDER_LLM_API_KEY,
      source: "env",
    };
    return cachedConfig;
  }

  if (process.env.OPENAI_MODEL && (process.env.OPENAI_BASE_URL || process.env.OPENAI_API_KEY)) {
    cachedConfig = {
      provider: "openai",
      model: process.env.OPENAI_MODEL,
      baseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
      apiKey: process.env.OPENAI_API_KEY,
      source: "env",
    };
    return cachedConfig;
  }

  if (process.env.OLLAMA_MODEL) {
    cachedConfig = {
      provider: "ollama",
      model: process.env.OLLAMA_MODEL,
      baseUrl: process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434",
      source: "env",
    };
    return cachedConfig;
  }

  cachedConfig = await readOpenClawConfig();
  return cachedConfig;
}

function extractText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : ""))
      .join("\n")
      .trim();
  }

  return "";
}

function buildMessages(options: LlmTextOptions): LlmMessage[] {
  const messages: LlmMessage[] = [];

  if (options.systemPrompt) {
    messages.push({
      role: "system",
      content: options.systemPrompt,
    });
  }

  messages.push({
    role: "user",
    content: options.userPrompt,
  });

  return messages;
}

export async function generateText(options: LlmTextOptions): Promise<string | null> {
  const config = await resolveLlmConfig();
  if (!config) {
    return null;
  }

  const messages = buildMessages(options);

  try {
    if (config.provider === "ollama") {
      const response = await requestJson<OllamaResponse>(joinUrl(config.baseUrl, "/api/chat"), {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          stream: false,
          messages,
          options: {
            temperature: options.temperature ?? 0.8,
            num_predict: options.maxTokens ?? 1600,
          },
        }),
      });

      return extractText(response.message?.content);
    }

    const headers: Record<string, string> = {
      "content-type": "application/json",
    };

    if (config.apiKey) {
      headers.authorization = `Bearer ${config.apiKey}`;
    }

    const response = await requestJson<OpenAiResponse>(joinUrl(config.baseUrl, "/chat/completions"), {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: config.model,
        temperature: options.temperature ?? 0.6,
        max_tokens: options.maxTokens ?? 1600,
        messages,
      }),
    });

    return extractText(response.choices?.[0]?.message?.content);
  } catch (error) {
    if (error instanceof HttpError && error.isRateLimited) {
      throw error;
    }
    return null;
  }
}

function extractJsonBlock(raw: string): string {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return raw.slice(start, end + 1);
  }

  return raw.trim();
}

export async function generateJson<T>(options: LlmTextOptions): Promise<T | null> {
  const raw = await generateText(options);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(extractJsonBlock(raw)) as T;
  } catch {
    return null;
  }
}
