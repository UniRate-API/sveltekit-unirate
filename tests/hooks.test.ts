import { describe, expect, it, vi } from "vitest";
import {
  createCurrencyHandle,
  UNIRATE_CURRENCY_COOKIE,
  type HandleEvent,
} from "../src/hooks.js";

function makeEvent(overrides: {
  cookies?: Record<string, string>;
  acceptLanguage?: string;
} = {}): HandleEvent {
  const cookieStore = { ...(overrides.cookies ?? {}) };
  const headers = new Headers();
  if (overrides.acceptLanguage) {
    headers.set("accept-language", overrides.acceptLanguage);
  }
  return {
    request: new Request("http://localhost/", { headers }),
    cookies: {
      get: (name: string) => cookieStore[name],
      set: vi.fn((name: string, value: string) => {
        cookieStore[name] = value;
      }),
    },
    locals: {},
  };
}

const resolveOk = async () => new Response("OK");

describe("createCurrencyHandle", () => {
  it("defaults to USD when no signals present", async () => {
    const handle = createCurrencyHandle();
    const event = makeEvent();
    await handle({ event, resolve: resolveOk });
    expect(event.locals.currency).toBe("USD");
  });

  it("reads currency from cookie", async () => {
    const handle = createCurrencyHandle();
    const event = makeEvent({ cookies: { [UNIRATE_CURRENCY_COOKIE]: "gbp" } });
    await handle({ event, resolve: resolveOk });
    expect(event.locals.currency).toBe("GBP");
  });

  it("detects currency from Accept-Language region", async () => {
    const handle = createCurrencyHandle();
    const event = makeEvent({ acceptLanguage: "en-GB,en;q=0.9" });
    await handle({ event, resolve: resolveOk });
    expect(event.locals.currency).toBe("GBP");
  });

  it("detects currency from Accept-Language lang fallback", async () => {
    const handle = createCurrencyHandle();
    const event = makeEvent({ acceptLanguage: "ja;q=0.8" });
    await handle({ event, resolve: resolveOk });
    expect(event.locals.currency).toBe("JPY");
  });

  it("sets cookie when not already set", async () => {
    const handle = createCurrencyHandle();
    const event = makeEvent();
    await handle({ event, resolve: resolveOk });
    expect(event.cookies.set).toHaveBeenCalledWith(
      UNIRATE_CURRENCY_COOKIE,
      "USD",
      expect.objectContaining({ path: "/", sameSite: "lax" }),
    );
  });

  it("does not overwrite existing cookie", async () => {
    const handle = createCurrencyHandle();
    const event = makeEvent({ cookies: { [UNIRATE_CURRENCY_COOKIE]: "EUR" } });
    await handle({ event, resolve: resolveOk });
    expect(event.cookies.set).not.toHaveBeenCalled();
  });

  it("respects custom defaultCurrency", async () => {
    const handle = createCurrencyHandle({ defaultCurrency: "CAD" });
    const event = makeEvent();
    await handle({ event, resolve: resolveOk });
    expect(event.locals.currency).toBe("CAD");
  });

  it("respects custom cookieName", async () => {
    const handle = createCurrencyHandle({ cookieName: "my_currency" });
    const event = makeEvent({ cookies: { my_currency: "CHF" } });
    await handle({ event, resolve: resolveOk });
    expect(event.locals.currency).toBe("CHF");
  });

  it("calls resolve and returns its response", async () => {
    const handle = createCurrencyHandle();
    const event = makeEvent();
    const body = "hello";
    const response = await handle({
      event,
      resolve: async () => new Response(body),
    });
    expect(await response.text()).toBe(body);
  });

  it("respects custom localeCurrencyMap", async () => {
    const handle = createCurrencyHandle({
      localeCurrencyMap: { XX: "XTS" },
    });
    const event = makeEvent({ acceptLanguage: "en-XX" });
    await handle({ event, resolve: resolveOk });
    expect(event.locals.currency).toBe("XTS");
  });
});
