export {
  AuthenticationError,
  InvalidCurrencyError,
  InvalidRequestError,
  ProRequiredError,
  RateLimitError,
  UniRateClient,
  UniRateError,
  type HistoricalLimitsResponse,
  type UniRateClientOptions,
  type VATEntry,
  type VATRateOne,
  type VATRatesAll,
} from "./client.js";

export {
  createUniRate,
  getRate,
  convert,
  listCurrencies,
  getHistoricalRate,
  getVatRates,
  getTimeSeries,
  getHistoricalLimits,
  type UniRateSvelteKitOptions,
} from "./server.js";

export {
  createCurrencyHandle,
  UNIRATE_CURRENCY_COOKIE,
  type CurrencyHandleOptions,
  type HandleEvent,
  type HandleInput,
} from "./hooks.js";

export {
  createUniRateRequestHandler,
  type UniRateHandlerOptions,
  type RequestEvent,
} from "./api.js";
