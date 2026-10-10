// Small helpers for reading form fields on the server. Every form action uses them, so
// trimming and number checks work the same everywhere.

export type Read = (name: string) => string;

// Reads a form field as trimmed text ("" when missing).
export function formReader(formData: FormData): Read {
  return (name) => String(formData.get(name) ?? "").trim();
}

// "" -> null, so empty optional fields are stored as NULL rather than empty text.
export function optionalText(value: string) {
  return value || null;
}

// A whole number between min and max ("12" -> 12). Null for anything else ("", "1.5", "abc").
export function parseWholeNumber(text: string, min: number, max: number): number | null {
  if (!/^\d{1,9}$/.test(text)) {
    return null;
  }
  const value = Number(text);
  return value >= min && value <= max ? value : null;
}

// A checkbox is "on" when ticked and missing when not.
export function isChecked(formData: FormData, name: string) {
  return formData.get(name) === "on";
}
