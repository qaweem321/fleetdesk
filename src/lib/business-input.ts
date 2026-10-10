import { normalizeHexColor } from "@/lib/branding";
import { isValidEmail } from "@/lib/email-address";
import { isValidCurrency } from "@/lib/money";
import { isValidTimeZone } from "@/lib/time-zone";

export const BUSINESS_NAME_MAX = 80;

export type BusinessInput = {
  businessName: string;
  currency: string;
  timeZone: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  brandColor: string | null;
};

type Read = (name: string) => string;

// Reads a form field as trimmed text ("" when missing).
export function formReader(formData: FormData): Read {
  return (name) => String(formData.get(name) ?? "").trim();
}

const optional = (value: string) => value || null;

// Checks the business details from the setup wizard and the Settings page.
export function parseBusinessInput(read: Read): { values: BusinessInput } | { error: string } {
  const businessName = read("businessName");
  const currency = read("currency").toUpperCase();
  const timeZone = read("timeZone");
  const contactEmail = read("contactEmail").toLowerCase();
  const contactPhone = read("contactPhone");
  const address = read("address");
  const color = normalizeHexColor(read("brandColor"));

  if (!businessName) {
    return { error: "Please enter your business name." };
  }
  if (businessName.length > BUSINESS_NAME_MAX) {
    return { error: `The business name can be at most ${BUSINESS_NAME_MAX} characters.` };
  }
  if (!isValidCurrency(currency)) {
    return { error: "Please choose a currency." };
  }
  if (!isValidTimeZone(timeZone)) {
    return { error: "Please choose a time zone." };
  }
  if (contactEmail && !isValidEmail(contactEmail)) {
    return { error: "Please enter a valid contact email, or leave it empty." };
  }
  if (contactPhone.length > 40) {
    return { error: "The phone number is too long." };
  }
  if (address.length > 300) {
    return { error: "The address is too long (300 characters at most)." };
  }
  if ("error" in color) {
    return color;
  }

  return {
    values: {
      businessName,
      currency,
      timeZone,
      contactEmail: optional(contactEmail),
      contactPhone: optional(contactPhone),
      address: optional(address),
      brandColor: color.color,
    },
  };
}
