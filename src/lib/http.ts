const DEFAULT_RETRIES = 3;

export class HttpError extends Error {
  readonly status: number;
  readonly body?: string;
  readonly isRateLimited: boolean;

  constructor(message: string, status: number, body?: string) {
    super(message);
    this.status = status;
    this.body = body;
    this.isRateLimited = status === 429;
  }
}

function joinUrl(baseUrl: string, pathName: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${pathName.replace(/^\/+/, "")}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchWithRetry(url: string, init: RequestInit = {}, retries = DEFAULT_RETRIES): Promise<Response> {
  let attempt = 0;

  while (true) {
    const response = await fetch(url, init);
    if (response.ok) {
      return response;
    }

    const shouldRetry = response.status === 429 || response.status >= 500;
    if (!shouldRetry || attempt >= retries - 1) {
      const body = await response.text().catch(() => "");
      throw new HttpError(`Request failed with status ${response.status}`, response.status, body);
    }

    const waitMs = 400 * 2 ** attempt;
    attempt += 1;
    await sleep(waitMs);
  }
}

export async function requestJson<T>(url: string, init?: RequestInit, retries = DEFAULT_RETRIES): Promise<T> {
  const response = await fetchWithRetry(url, init, retries);
  return (await response.json()) as T;
}

export async function requestText(url: string, init?: RequestInit, retries = DEFAULT_RETRIES): Promise<string> {
  const response = await fetchWithRetry(url, init, retries);
  return response.text();
}

export { joinUrl };
