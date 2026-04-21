/**
 * Typed fetch helper for the paid-calendly API.
 *
 * All requests go through this wrapper so we get:
 *  - Consistent JSON error parsing
 *  - Automatic inclusion of the x-wallet-address header when provided
 *  - A single place to swap base URL / add auth tokens later
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Wallet address for x-wallet-address authenticated routes. */
  walletAddress?: string;
  /** Query params — appended to the URL. */
  query?: Record<string, string | number | undefined>;
  /** Skip the base URL — pass a full URL instead. */
  absolute?: boolean;
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, walletAddress, query, absolute } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (walletAddress) {
    headers["x-wallet-address"] = walletAddress;
  }

  const url = new URL(absolute ? path : `${API_BASE}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    // Network-level failure — backend down, CORS blocked, etc.
    throw new ApiError(
      0,
      e instanceof Error ? e.message : "Network request failed",
    );
  }

  let payload: unknown = undefined;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    payload = await response.json().catch(() => undefined);
  }

  if (!response.ok) {
    const message =
      (payload as { error?: string } | undefined)?.error ??
      `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, payload);
  }

  return payload as T;
}