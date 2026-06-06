<script>
  /** @type {{ amount: number, currency: string, decimals?: number, locale?: string }} */
  let { amount, currency, decimals = 2, locale = undefined } = $props();
</script>

{new Intl.NumberFormat(locale, {
  style: 'currency',
  currency,
  minimumFractionDigits: decimals,
  maximumFractionDigits: decimals,
}).format(amount)}
