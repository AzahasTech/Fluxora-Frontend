import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatUsdc } from "../formatters";

describe("formatUsdc formatter", () => {
  let originalLanguage: string | undefined;

  beforeEach(() => {
    originalLanguage = navigator.language;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalLanguage !== undefined) {
      Object.defineProperty(navigator, "language", {
        value: originalLanguage,
        configurable: true,
      });
    }
  });

  it("formats USDC with default en-US locale", () => {
    Object.defineProperty(navigator, "language", {
      value: "en-US",
      configurable: true,
    });
    expect(formatUsdc(12345.67)).toBe("12,345.67 USDC");
    expect(formatUsdc(48500)).toBe("48,500 USDC");
  });

  it("formats USDC with non-en-US locale (e.g. de-DE)", () => {
    Object.defineProperty(navigator, "language", {
      value: "de-DE",
      configurable: true,
    });
    expect(formatUsdc(48500)).toBe("48.500 USDC");
  });

  it("formats USDC with non-en-US locale (e.g. fr-FR)", () => {
    Object.defineProperty(navigator, "language", {
      value: "fr-FR",
      configurable: true,
    });
    const formatted = formatUsdc(48500);
    // fr-FR uses narrow non-breaking space or space as thousand separator
    expect(formatted).toMatch(/48[\s\u202f\u00a0]500 USDC/);
  });
});
