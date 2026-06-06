import {
  UniRateClient,
  type UniRateClientOptions,
  type VATRatesAll,
  type VATRateOne,
  type HistoricalLimitsResponse,
} from "./client.js";

export interface UniRateSvelteKitOptions {
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
}

function resolveApiKey(opts?: UniRateSvelteKitOptions): string {
  const key = opts?.apiKey ?? process.env.UNIRATE_API_KEY;
  if (!key) {
    throw new Error(
      "UniRate API key not found. Set UNIRATE_API_KEY env var or pass apiKey to createUniRate().",
    );
  }
  return key;
}

export function createUniRate(opts?: UniRateSvelteKitOptions) {
  const clientOpts: UniRateClientOptions = {
    apiKey: resolveApiKey(opts),
    baseUrl: opts?.baseUrl,
    timeoutMs: opts?.timeoutMs,
    userAgent: "@unirate/sveltekit/0.1.0",
  };

  const client = new UniRateClient(clientOpts);

  return {
    client,

    getRate(from: string, to?: string): Promise<number | Record<string, number>> {
      return client.getRate(from, to);
    },

    convert(from: string, to: string, amount: number): Promise<number> {
      return client.convert(to, amount, from);
    },

    listCurrencies(): Promise<string[]> {
      return client.listCurrencies();
    },

    getHistoricalRate(
      date: string,
      from: string,
      to?: string,
      amount?: number,
    ): Promise<number | Record<string, number>> {
      return client.getHistoricalRate(date, amount ?? 1, from, to);
    },

    getVatRates(country?: string): Promise<VATRatesAll | VATRateOne> {
      return country ? client.getVatRates(country) : client.getVatRates();
    },

    getTimeSeries(
      startDate: string,
      endDate: string,
      base?: string,
      currencies?: string[],
      amount?: number,
    ): Promise<Record<string, Record<string, number>>> {
      return client.getTimeSeries(startDate, endDate, amount, base, currencies);
    },

    getHistoricalLimits(): Promise<HistoricalLimitsResponse> {
      return client.getHistoricalLimits();
    },
  };
}

const defaultInstance = /* @__PURE__ */ (() => {
  let instance: ReturnType<typeof createUniRate> | undefined;
  return () => {
    if (!instance) instance = createUniRate();
    return instance;
  };
})();

export const getRate: ReturnType<typeof createUniRate>["getRate"] = (...args) =>
  defaultInstance().getRate(...args);

export const convert: ReturnType<typeof createUniRate>["convert"] = (...args) =>
  defaultInstance().convert(...args);

export const listCurrencies: ReturnType<typeof createUniRate>["listCurrencies"] = (...args) =>
  defaultInstance().listCurrencies(...args);

export const getHistoricalRate: ReturnType<typeof createUniRate>["getHistoricalRate"] = (...args) =>
  defaultInstance().getHistoricalRate(...args);

export const getVatRates: ReturnType<typeof createUniRate>["getVatRates"] = (...args) =>
  defaultInstance().getVatRates(...(args as [string]));

export const getTimeSeries: ReturnType<typeof createUniRate>["getTimeSeries"] = (...args) =>
  defaultInstance().getTimeSeries(...args);

export const getHistoricalLimits: ReturnType<typeof createUniRate>["getHistoricalLimits"] = (
  ...args
) => defaultInstance().getHistoricalLimits(...args);
