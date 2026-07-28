import type { BugContext } from "./types";

/** Client-side context auto-capture for reviewable bug reports. */
export function captureClientContext(overrides?: Partial<BugContext>): BugContext {
  if (typeof window === "undefined") return { ...overrides };

  return {
    pageUrl: window.location.href,
    pageTitle: document.title,
    userAgent: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    screen:
      typeof screen !== "undefined"
        ? `${screen.width}x${screen.height}`
        : undefined,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    referrer: document.referrer || undefined,
    ...overrides,
  };
}
