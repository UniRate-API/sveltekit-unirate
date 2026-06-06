# @unirate/sveltekit

SvelteKit integration for the [UniRate](https://unirateapi.com) currency exchange API.

Server-side `getRate`/`convert` helpers for load functions, a `createCurrencyHandle()` geo-detection hook, an API route proxy that keeps your key server-side, and `<Currency>` + `<Rate>` Svelte 5 components. Zero runtime dependencies.

## Install

```bash
npm install @unirate/sveltekit
```

## Quick start

### 1. Set your API key

```bash
# .env
UNIRATE_API_KEY=your-api-key-here
```

Get a free key at [unirateapi.com](https://unirateapi.com).

### 2. Load data in a server load function

```ts
// src/routes/+page.server.ts
import { getRate, convert, listCurrencies } from '@unirate/sveltekit/server';

export async function load() {
  const [rate, price, currencies] = await Promise.all([
    getRate('USD', 'EUR'),
    convert('USD', 'EUR', 99.99),
    listCurrencies(),
  ]);
  return { rate, price, currencies };
}
```

### 3. Display with components

```svelte
<!-- src/routes/+page.svelte -->
<script>
  import Currency from '@unirate/sveltekit/Currency.svelte';
  import Rate from '@unirate/sveltekit/Rate.svelte';

  let { data } = $props();
</script>

<p>1 USD = <Rate from="USD" to="EUR" rate={data.rate} /> EUR</p>
<p>Price: <Currency amount={data.price} currency="EUR" /></p>
```

## API

### Server helpers (`@unirate/sveltekit/server`)

```ts
import { createUniRate, getRate, convert, listCurrencies } from '@unirate/sveltekit/server';
```

#### `createUniRate(options?)`

Factory that returns an object with all API methods bound to a single client instance.

```ts
const unirate = createUniRate({
  apiKey: 'your-key',   // defaults to UNIRATE_API_KEY env var
  baseUrl: '...',       // defaults to https://api.unirateapi.com
  timeoutMs: 10_000,    // defaults to 30_000
});

const rate = await unirate.getRate('USD', 'EUR');
```

#### Top-level convenience functions

These use a default `createUniRate()` instance (reads `UNIRATE_API_KEY` from env):

| Function | Returns |
|---|---|
| `getRate(from, to?)` | `number` (single pair) or `Record<string, number>` (all pairs) |
| `convert(from, to, amount)` | `number` |
| `listCurrencies()` | `string[]` |
| `getHistoricalRate(date, from, to?, amount?)` | `number` or `Record<string, number>` |
| `getVatRates(country?)` | VAT data |
| `getTimeSeries(startDate, endDate, base?, currencies?, amount?)` | `Record<string, Record<string, number>>` |
| `getHistoricalLimits()` | `HistoricalLimitsResponse` |

> Historical and time-series endpoints require a [Pro subscription](https://unirateapi.com).

### Currency detection hook (`@unirate/sveltekit/hooks`)

```ts
// src/hooks.server.ts
import { createCurrencyHandle } from '@unirate/sveltekit/hooks';

const currencyHandle = createCurrencyHandle({
  defaultCurrency: 'USD',    // fallback when no signal detected
  cookieName: 'unirate_currency',
  cookieMaxAge: 365 * 24 * 60 * 60,
});

export const handle = currencyHandle;
// or compose with sequence():
// export const handle = sequence(currencyHandle, otherHandle);
```

The hook detects currency from:
1. Existing cookie (highest priority)
2. `Accept-Language` header region subtag (e.g., `en-GB` → GBP)
3. `Accept-Language` language fallback (e.g., `ja` → JPY)
4. `defaultCurrency` option (default: USD)

It sets `event.locals.currency` and persists the detected currency in a cookie. Add the type to your `app.d.ts`:

```ts
// src/app.d.ts
declare global {
  namespace App {
    interface Locals {
      currency: string;
    }
  }
}
```

### API route proxy (`@unirate/sveltekit/api`)

Keep your API key server-side by proxying client requests through a SvelteKit endpoint:

```ts
// src/routes/api/unirate/+server.ts
import { createUniRateRequestHandler } from '@unirate/sveltekit/api';

export const GET = createUniRateRequestHandler({
  allowedPaths: ['/api/rates', '/api/convert', '/api/currencies'],
});
```

Client-side usage:

```ts
const res = await fetch('/api/unirate?path=/api/rates&from=USD&to=EUR');
const { rate } = await res.json();
```

### Components

#### `<Currency>`

Formats a numeric amount as a localized currency string.

```svelte
<script>
  import Currency from '@unirate/sveltekit/Currency.svelte';
</script>

<Currency amount={99.99} currency="EUR" />
<!-- renders: €99.99 -->

<Currency amount={1234.5} currency="JPY" decimals={0} locale="ja-JP" />
<!-- renders: ￥1,235 -->
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `amount` | `number` | required | The numeric value to format |
| `currency` | `string` | required | ISO 4217 currency code |
| `decimals` | `number` | `2` | Fraction digits |
| `locale` | `string` | browser default | BCP 47 locale tag |

#### `<Rate>`

Formats an exchange rate number.

```svelte
<script>
  import Rate from '@unirate/sveltekit/Rate.svelte';
</script>

<Rate from="USD" to="EUR" rate={0.9245} />
<!-- renders: 0.9245 -->
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `from` | `string` | required | Source currency code |
| `to` | `string` | required | Target currency code |
| `rate` | `number` | required | The exchange rate value |
| `decimals` | `number` | `4` | Fraction digits |
| `locale` | `string` | browser default | BCP 47 locale tag |

## Error handling

All errors extend `UniRateError`:

```ts
import {
  UniRateError,
  AuthenticationError,   // 401
  ProRequiredError,      // 403
  InvalidCurrencyError,  // 404
  InvalidRequestError,   // 400
  RateLimitError,        // 429
} from '@unirate/sveltekit';
```

## Related packages

- [`unirate-api`](https://www.npmjs.com/package/unirate-api) — standalone Node.js/browser client
- [`@unirate/react`](https://www.npmjs.com/package/@unirate/react) — React hooks + components
- [`@unirate/next`](https://www.npmjs.com/package/@unirate/next) — Next.js App Router integration
- [`@unirate/astro`](https://www.npmjs.com/package/@unirate/astro) — Astro integration
- [`@unirate/nestjs`](https://www.npmjs.com/package/@unirate/nestjs) — NestJS module
- [`@unirate/mcp`](https://www.npmjs.com/package/@unirate/mcp) — Model Context Protocol server

## License

MIT
