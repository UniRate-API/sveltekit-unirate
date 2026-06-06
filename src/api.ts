import { UniRateError } from "./client.js";

export interface UniRateHandlerOptions {
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
  allowedPaths?: string[];
}

const DEFAULT_ALLOWED = [
  "/api/rates",
  "/api/convert",
  "/api/currencies",
  "/api/vat/rates",
  "/api/historical/rates",
  "/api/historical/timeseries",
  "/api/historical/limits",
];

export interface RequestEvent {
  url: URL;
  request: Request;
}

export function createUniRateRequestHandler(opts: UniRateHandlerOptions = {}) {
  const apiKey = opts.apiKey ?? process.env.UNIRATE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "UniRate API key not found. Set UNIRATE_API_KEY env var or pass apiKey to createUniRateRequestHandler().",
    );
  }
  const baseUrl = (opts.baseUrl ?? "https://api.unirateapi.com").replace(/\/+$/, "");
  const allowed = new Set(opts.allowedPaths ?? DEFAULT_ALLOWED);
  const timeoutMs = opts.timeoutMs ?? 30_000;

  return async function GET({ url }: RequestEvent): Promise<Response> {
    const path = url.searchParams.get("path");
    if (!path) {
      return new Response(JSON.stringify({ error: "Missing 'path' query parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiPath = path.startsWith("/") ? path : `/${path}`;
    if (!allowed.has(apiPath)) {
      return new Response(JSON.stringify({ error: `Path not allowed: ${apiPath}` }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const target = new URL(baseUrl + apiPath);
    target.searchParams.set("api_key", apiKey);
    for (const [k, v] of url.searchParams.entries()) {
      if (k !== "path") target.searchParams.set(k, v);
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);

    try {
      const upstream = await fetch(target.toString(), {
        headers: {
          Accept: "application/json",
          "User-Agent": "@unirate/sveltekit/0.1.0",
        },
        signal: ctrl.signal,
      });
      clearTimeout(timer);

      const body = await upstream.text();
      return new Response(body, {
        status: upstream.status,
        headers: {
          "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      });
    } catch (err) {
      clearTimeout(timer);
      const message = err instanceof Error ? err.message : String(err);
      return new Response(JSON.stringify({ error: `Upstream request failed: ${message}` }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }
  };
}
