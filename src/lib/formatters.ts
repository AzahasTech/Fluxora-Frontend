/**
 * Formats a numeric amount into a locale-aware USDC string representation.
 * Uses `navigator.language` if available, falling back to "en-US".
 */
export function formatUsdc(amount: number): string {
  const locale =
    typeof navigator !== "undefined" && navigator.language
      ? navigator.language
      : "en-US";

  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
  }).format(amount)} USDC`;
}
