/**
 * Safe fetch that never throws on invalid JSON and returns a clear error for the UI.
 * Use this for all API calls so the app doesn’t crash when the server returns HTML or empty body.
 */

export type FetchResult<T> =
  | { ok: true; data: T; error?: undefined }
  | { ok: false; error: string; status?: number };

/** Type guard: use so TypeScript narrows FetchResult in else branches. */
export function isFetchError<T>(r: FetchResult<T>): r is { ok: false; error: string; status?: number } {
  return !r.ok;
}

export async function fetchJson<T>(url: string, options?: RequestInit): Promise<FetchResult<T>> {
  try {
    const res = await fetch(url, options);
    const text = await res.text();

    if (!res.ok) {
      let error = `Request failed (${res.status})`;
      try {
        const parsed = JSON.parse(text);
        if (parsed?.error) error = parsed.error;
      } catch {
        if (text.trim()) error = text.slice(0, 200);
      }
      return { ok: false, error, status: res.status };
    }

    if (!text.trim()) {
      return { ok: true, data: undefined as unknown as T };
    }

    try {
      const data = JSON.parse(text) as T;
      return { ok: true, data };
    } catch {
      return { ok: false, error: "Invalid response from server" };
    }
  } catch {
    return {
      ok: false,
      error: "Could not connect. Is the server running? Is the database running?",
      status: 0,
    };
  }
}
