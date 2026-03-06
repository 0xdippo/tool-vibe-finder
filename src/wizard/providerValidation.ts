import { HttpError, requestJson } from "../lib/http.js";
import type { ProviderValidationResult } from "../types.js";

export async function validateTmdbToken(token: string): Promise<ProviderValidationResult> {
  try {
    await requestJson("https://api.themoviedb.org/3/configuration", {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
      },
    });

    return {
      valid: true,
      message: "TMDB token saved.",
    };
  } catch (error) {
    if (error instanceof HttpError) {
      return {
        valid: false,
        message: error.isRateLimited
          ? "TMDB is rate limiting requests right now. Try again in a minute."
          : "TMDB token validation failed. Double-check the token and try again.",
      };
    }

    return {
      valid: false,
      message: "TMDB token validation failed.",
    };
  }
}

export async function validateWatchmodeKey(apiKey: string): Promise<ProviderValidationResult> {
  try {
    await requestJson(`https://api.watchmode.com/v1/sources/?apiKey=${encodeURIComponent(apiKey)}`);

    return {
      valid: true,
      message: "Watchmode key saved.",
    };
  } catch (error) {
    if (error instanceof HttpError) {
      return {
        valid: false,
        message: error.isRateLimited
          ? "Watchmode is rate limiting requests right now. Try again in a minute."
          : "Watchmode key validation failed. Double-check the API key and try again.",
      };
    }

    return {
      valid: false,
      message: "Watchmode key validation failed.",
    };
  }
}
