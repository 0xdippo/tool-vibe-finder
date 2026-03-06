import fs from "node:fs/promises";
import path from "node:path";

export async function ensureDirectory(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

export async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await ensureDirectory(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function appendJsonLine(filePath: string, value: unknown): Promise<void> {
  await ensureDirectory(path.dirname(filePath));
  await fs.appendFile(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

export async function ensureTextFile(filePath: string, defaultContents = ""): Promise<void> {
  if (await fileExists(filePath)) {
    return;
  }
  await ensureDirectory(path.dirname(filePath));
  await fs.writeFile(filePath, defaultContents, "utf8");
}
