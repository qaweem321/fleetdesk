// Small helpers for list pages that keep their options in the URL (?sort=new&page=2).

export type SearchParamValue = string | string[] | undefined;
export type RawSearchParams = Record<string, SearchParamValue>;

// A repeated parameter (?a=1&a=2) arrives as an array; lists only use the first value.
export function firstParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export function parsePage(value: SearchParamValue) {
  const page = Number.parseInt(firstParam(value) ?? "", 10);
  return Number.isSafeInteger(page) && page > 1 ? page : 1;
}

// Builds "/base?x=1" from the given values, leaving out empty ones and those equal to their
// default, so links stay short and clean.
export function buildHref(
  base: string,
  values: Record<string, string | number | null>,
  defaults: Record<string, string | number | null> = {},
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== null && value !== "" && value !== defaults[key]) {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `${base}?${query}` : base;
}
