<script>
  /** @type {{ from: string, to: string, rate: number, decimals?: number, locale?: string }} */
  let { from, to, rate, decimals = 4, locale = undefined } = $props();
</script>

{new Intl.NumberFormat(locale, {
  minimumFractionDigits: decimals,
  maximumFractionDigits: decimals,
}).format(rate)}
