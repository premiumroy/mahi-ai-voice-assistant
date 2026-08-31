/** Environment-config helpers. */

function getApiKey(): string {
  if (typeof window !== "undefined" && (window as any).__GEMINI_API_KEY) {
    return (window as any).__GEMINI_API_KEY;
  }
  try {
    const stored = localStorage.getItem("GEMINI_API_KEY");
    if (stored) return stored;
  } catch {}
  return "";
}

export const GEMINI_API_KEY = getApiKey();

/**
 * gemini-3.1-flash-live-preview may not be available in all regions.
 * Using gemini-2.5-flash-native-audio-preview which has broader availability.
 */
export const GEMINI_MODEL = "gemini-2.5-flash-native-audio-preview";
