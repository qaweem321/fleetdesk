// Every amount is stored as a whole number of the currency's smallest unit (cents for USD,
// yen for JPY), so adding prices never produces rounding errors like 0.1 + 0.2.

const moneyFormatters = new Map<string, Intl.NumberFormat>();

function moneyFormatter(currency: string) {
  let found = moneyFormatters.get(currency);
  if (!found) {
    found = new Intl.NumberFormat("en-US", { style: "currency", currency });
    moneyFormatters.set(currency, found);
  }
  return found;
}

// 2 for USD and EUR (cents), 0 for JPY, 3 for KWD.
export function currencyDecimals(currency: string) {
  return moneyFormatter(currency).resolvedOptions().maximumFractionDigits ?? 2;
}

export function isValidCurrency(code: string) {
  return /^[A-Z]{3}$/.test(code) && Intl.supportedValuesOf("currency").includes(code);
}

// 4999 USD -> "$49.99"
export function formatMoney(amount: number, currency: string) {
  return moneyFormatter(currency).format(amount / 10 ** currencyDecimals(currency));
}

// "49.99" typed into a form -> 4999. Null for anything that isn't a plain amount
// (negative, letters, too many decimals).
export function parseMoney(text: string, currency: string): number | null {
  const value = text.trim().replaceAll(",", "");
  const decimals = currencyDecimals(currency);
  const pattern = decimals > 0 ? new RegExp(`^\\d{1,9}(\\.\\d{1,${decimals}})?$`) : /^\d{1,12}$/;
  if (!pattern.test(value)) {
    return null;
  }
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 10 ** decimals + Number(fraction.padEnd(decimals, "0") || 0);
}

// 4999 -> "49.99", the value to put back into a form field.
export function moneyInputValue(amount: number, currency: string) {
  const decimals = currencyDecimals(currency);
  return (amount / 10 ** decimals).toFixed(decimals);
}
