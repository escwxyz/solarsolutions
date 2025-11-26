import { BASE_URL } from "./constants";
import type { Category } from "./types";

const URL_ESCAPE_REGEX = /[-/\\^$*+?.()|[\]{}]/g;

export function escapeForRegex(value: string) {
  return value.replace(URL_ESCAPE_REGEX, "\\$&");
}

export function resolveUrl(url: string) {
  try {
    return new URL(url).toString();
  } catch {
    return new URL(url, `${BASE_URL}/`).toString();
  }
}

export function normalizeCategory(raw: string): Category {
  const normalized = raw.toLowerCase();

  if (normalized.includes("hersteller")) {
    return "Hersteller";
  }
  if (
    normalized.includes("großhändler") ||
    normalized.includes("grosshaendler")
  ) {
    return "Großhändler";
  }
  if (normalized.includes("installations")) {
    return "Installationsunternehmen";
  }
  if (normalized.includes("epc")) {
    return "EPC-Unternehmen";
  }
  if (normalized.includes("finanz")) {
    return "Finanzdienstleister";
  }
  if (normalized.includes("beratung")) {
    return "Beratungsunternehmen";
  }

  if (normalized.trim().length === 0) {
    return "Unknown";
  }

  return "Sonstige";
}
