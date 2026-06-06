const LOCALE_CURRENCY: Record<string, string> = {
  US: "USD", GB: "GBP", AU: "AUD", CA: "CAD", NZ: "NZD",
  JP: "JPY", CN: "CNY", HK: "HKD", SG: "SGD", TW: "TWD",
  KR: "KRW", IN: "INR", PH: "PHP", TH: "THB", MY: "MYR",
  ID: "IDR", VN: "VND",
  CH: "CHF", NO: "NOK", SE: "SEK", DK: "DKK", PL: "PLN",
  CZ: "CZK", HU: "HUF", RO: "RON", BG: "BGN", HR: "EUR",
  AT: "EUR", BE: "EUR", CY: "EUR", EE: "EUR", FI: "EUR",
  FR: "EUR", DE: "EUR", GR: "EUR", IE: "EUR", IT: "EUR",
  LV: "EUR", LT: "EUR", LU: "EUR", MT: "EUR", NL: "EUR",
  PT: "EUR", SK: "EUR", SI: "EUR", ES: "EUR",
  BR: "BRL", MX: "MXN", AR: "ARS", CL: "CLP", CO: "COP",
  PE: "PEN", UY: "UYU",
  ZA: "ZAR", NG: "NGN", KE: "KES", GH: "GHS", EG: "EGP",
  MA: "MAD", TN: "TND",
  AE: "AED", SA: "SAR", QA: "QAR", KW: "KWD", BH: "BHD",
  OM: "OMR", JO: "JOD", IL: "ILS", TR: "TRY",
  RU: "RUB", UA: "UAH", KZ: "KZT",
  PK: "PKR", BD: "BDT", LK: "LKR",
};

const LANG_CURRENCY: Record<string, string> = {
  en: "USD", ja: "JPY", zh: "CNY", ko: "KRW", de: "EUR",
  fr: "EUR", es: "EUR", it: "EUR", pt: "BRL", nl: "EUR",
  sv: "SEK", no: "NOK", da: "DKK", fi: "EUR", pl: "PLN",
  cs: "CZK", hu: "HUF", ro: "RON", bg: "BGN", hr: "EUR",
  tr: "TRY", ar: "SAR", he: "ILS", hi: "INR", th: "THB",
  vi: "VND", ms: "MYR", id: "IDR", ru: "RUB", uk: "UAH",
};

export const UNIRATE_CURRENCY_COOKIE = "unirate_currency";

export interface CurrencyHandleOptions {
  defaultCurrency?: string;
  cookieName?: string;
  cookieMaxAge?: number;
  localeCurrencyMap?: Record<string, string>;
}

export interface HandleEvent {
  request: Request;
  cookies: {
    get(name: string): string | undefined;
    set(name: string, value: string, opts?: Record<string, unknown>): void;
  };
  locals: Record<string, unknown>;
}

export interface HandleInput {
  event: HandleEvent;
  resolve: (event: HandleEvent) => Promise<Response>;
}

function detectCurrency(
  event: HandleEvent,
  opts: CurrencyHandleOptions,
): string {
  const cookieName = opts.cookieName ?? UNIRATE_CURRENCY_COOKIE;
  const cookie = event.cookies.get(cookieName);
  if (cookie) return cookie.toUpperCase();

  const accept = event.request.headers.get("accept-language");
  if (accept) {
    const map = opts.localeCurrencyMap ?? LOCALE_CURRENCY;
    const parts = accept.split(",");
    for (const part of parts) {
      const tag = part.split(";")[0].trim();
      const region = tag.split("-")[1]?.toUpperCase();
      if (region && map[region]) return map[region];
      const lang = tag.split("-")[0].toLowerCase();
      if (LANG_CURRENCY[lang]) return LANG_CURRENCY[lang];
    }
  }

  return (opts.defaultCurrency ?? "USD").toUpperCase();
}

export function createCurrencyHandle(opts: CurrencyHandleOptions = {}) {
  const cookieName = opts.cookieName ?? UNIRATE_CURRENCY_COOKIE;
  const maxAge = opts.cookieMaxAge ?? 365 * 24 * 60 * 60;

  return async function currencyHandle({ event, resolve }: HandleInput): Promise<Response> {
    const currency = detectCurrency(event, opts);
    event.locals.currency = currency;

    if (!event.cookies.get(cookieName)) {
      event.cookies.set(cookieName, currency, {
        path: "/",
        maxAge,
        sameSite: "lax",
        httpOnly: false,
      });
    }

    return resolve(event);
  };
}
