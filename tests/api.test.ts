import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("createUniRateRequestHandler", () => {
  const originalFetch = globalThis.fetch;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.UNIRATE_API_KEY = "test-key";
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.resetModules();
  });

  it("returns 400 when path param is missing", async () => {
    const { createUniRateRequestHandler } = await import("../src/api.js");
    const handler = createUniRateRequestHandler();
    const url = new URL("http://localhost/api/unirate");
    const response = await handler({
      url,
      request: new Request(url),
    });
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/Missing/);
  });

  it("returns 403 for disallowed paths", async () => {
    const { createUniRateRequestHandler } = await import("../src/api.js");
    const handler = createUniRateRequestHandler();
    const url = new URL("http://localhost/api/unirate?path=/api/secret");
    const response = await handler({
      url,
      request: new Request(url),
    });
    expect(response.status).toBe(403);
  });

  it("proxies allowed path to upstream", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ rate: "0.92" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const { createUniRateRequestHandler } = await import("../src/api.js");
    const handler = createUniRateRequestHandler();
    const url = new URL("http://localhost/api/unirate?path=/api/rates&from=USD&to=EUR");
    const response = await handler({
      url,
      request: new Request(url),
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { rate: string };
    expect(body.rate).toBe("0.92");
    const calledUrl = new URL(mockFetch.mock.calls[0][0]);
    expect(calledUrl.pathname).toBe("/api/rates");
    expect(calledUrl.searchParams.get("api_key")).toBe("test-key");
    expect(calledUrl.searchParams.get("from")).toBe("USD");
  });

  it("sets cache-control headers on proxied response", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("{}", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const { createUniRateRequestHandler } = await import("../src/api.js");
    const handler = createUniRateRequestHandler();
    const url = new URL("http://localhost/api/unirate?path=/api/rates");
    const response = await handler({
      url,
      request: new Request(url),
    });
    expect(response.headers.get("Cache-Control")).toMatch(/s-maxage=60/);
  });

  it("returns 502 on upstream network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const { createUniRateRequestHandler } = await import("../src/api.js");
    const handler = createUniRateRequestHandler();
    const url = new URL("http://localhost/api/unirate?path=/api/rates");
    const response = await handler({
      url,
      request: new Request(url),
    });
    expect(response.status).toBe(502);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/ECONNREFUSED/);
  });

  it("throws when no API key available", async () => {
    delete process.env.UNIRATE_API_KEY;
    const { createUniRateRequestHandler } = await import("../src/api.js");
    expect(() => createUniRateRequestHandler()).toThrow("UniRate API key not found");
  });

  it("respects custom allowedPaths", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("{}", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const { createUniRateRequestHandler } = await import("../src/api.js");
    const handler = createUniRateRequestHandler({
      allowedPaths: ["/api/rates"],
    });
    const url = new URL("http://localhost/api/unirate?path=/api/convert");
    const response = await handler({
      url,
      request: new Request(url),
    });
    expect(response.status).toBe(403);
  });

  it("respects custom baseUrl", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("{}", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const { createUniRateRequestHandler } = await import("../src/api.js");
    const handler = createUniRateRequestHandler({
      baseUrl: "https://custom.api.com",
    });
    const url = new URL("http://localhost/api/unirate?path=/api/rates");
    await handler({ url, request: new Request(url) });
    const calledUrl = new URL(mockFetch.mock.calls[0][0]);
    expect(calledUrl.hostname).toBe("custom.api.com");
  });
});
