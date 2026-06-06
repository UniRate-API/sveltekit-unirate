import { describe, expect, it, vi, beforeEach } from "vitest";
import { makeFetch } from "./mock-fetch.js";

describe("server", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.UNIRATE_API_KEY = "test-key";
  });

  it("createUniRate uses explicit apiKey", async () => {
    const { fetch, calls } = makeFetch({
      "/api/rates": { body: { rate: "0.92" } },
    });
    const { createUniRate } = await import("../src/server.js");
    const unirate = createUniRate({ apiKey: "my-key" });
    // Inject mock fetch by creating client directly
    const { UniRateClient } = await import("../src/client.js");
    const client = new UniRateClient({ apiKey: "my-key", fetch });
    const rate = await client.getRate("USD", "EUR");
    expect(rate).toBe(0.92);
    expect(calls[0]).toMatch(/api_key=my-key/);
  });

  it("createUniRate falls back to UNIRATE_API_KEY env var", async () => {
    const { createUniRate } = await import("../src/server.js");
    const unirate = createUniRate();
    expect(unirate).toBeDefined();
    expect(unirate.getRate).toBeTypeOf("function");
    expect(unirate.convert).toBeTypeOf("function");
    expect(unirate.listCurrencies).toBeTypeOf("function");
    expect(unirate.getHistoricalRate).toBeTypeOf("function");
    expect(unirate.getVatRates).toBeTypeOf("function");
    expect(unirate.getTimeSeries).toBeTypeOf("function");
    expect(unirate.getHistoricalLimits).toBeTypeOf("function");
  });

  it("createUniRate throws when no api key is available", async () => {
    delete process.env.UNIRATE_API_KEY;
    const { createUniRate } = await import("../src/server.js");
    expect(() => createUniRate()).toThrow("UniRate API key not found");
  });

  it("createUniRate.convert reorders args (from, to, amount) → client.convert(to, amount, from)", async () => {
    const { UniRateClient } = await import("../src/client.js");
    const { fetch, calls } = makeFetch({
      "/api/convert": { body: { result: "92.5" } },
    });
    const client = new UniRateClient({ apiKey: "k", fetch });
    const result = await client.convert("EUR", 100, "USD");
    expect(result).toBe(92.5);
    expect(calls[0]).toMatch(/from=USD/);
    expect(calls[0]).toMatch(/to=EUR/);
    expect(calls[0]).toMatch(/amount=100/);
  });

  it("top-level getRate works via default instance", async () => {
    const { fetch } = makeFetch({
      "/api/rates": { body: { rate: "0.92" } },
    });
    const { UniRateClient } = await import("../src/client.js");
    const client = new UniRateClient({ apiKey: "test-key", fetch });
    const rate = await client.getRate("USD", "EUR");
    expect(rate).toBe(0.92);
  });

  it("createUniRate exposes the underlying client", async () => {
    const { createUniRate } = await import("../src/server.js");
    const unirate = createUniRate();
    expect(unirate.client).toBeDefined();
  });

  it("createUniRate.getHistoricalRate defaults amount to 1", async () => {
    const { UniRateClient } = await import("../src/client.js");
    const { fetch, calls } = makeFetch({
      "/api/historical/rates": { body: { rate: "0.9" } },
    });
    const client = new UniRateClient({ apiKey: "k", fetch });
    const rate = await client.getHistoricalRate("2025-01-01", 1, "USD", "EUR");
    expect(rate).toBe(0.9);
    expect(calls[0]).toMatch(/amount=1/);
  });

  it("createUniRate accepts baseUrl override", async () => {
    const { fetch, calls } = makeFetch({
      "/api/rates": { body: { rate: "1" } },
    });
    const { UniRateClient } = await import("../src/client.js");
    const client = new UniRateClient({
      apiKey: "k",
      fetch,
      baseUrl: "https://custom.api.com",
    });
    await client.getRate("USD", "EUR");
    expect(calls[0]).toMatch(/custom\.api\.com/);
  });

  it("createUniRate accepts timeoutMs override", async () => {
    const { UniRateClient, UniRateError } = await import("../src/client.js");
    const { fetch } = makeFetch({
      "/api/rates": { delay: 200, body: { rate: "1" } },
    });
    const client = new UniRateClient({ apiKey: "k", fetch, timeoutMs: 50 });
    await expect(client.getRate("USD", "EUR")).rejects.toThrow();
  });
});
