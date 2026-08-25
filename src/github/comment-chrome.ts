import { sanitizeContent } from "./utils/sanitizer";

export const TRACKING_MARKER = "<!-- grok-build-action -->";

export const GROK_ICON_URL =
  "https://raw.githubusercontent.com/sandsaber/grok-build-action/main/assets/grok-icon.png";

export function grokLead(rest: string): string {
  return `<img src="${GROK_ICON_URL}" width="18" height="18" alt="Grok" /> ${rest}`;
}

export function withGrokChrome(body: string, title = "**Grok**"): string {
  const cleaned = sanitizeContent(body).replaceAll(TRACKING_MARKER, "").trim();
  const headed = cleaned.includes(GROK_ICON_URL) ? cleaned : `${grokLead(title)}\n\n${cleaned}`;
  return `${headed}\n\n${TRACKING_MARKER}`;
}
